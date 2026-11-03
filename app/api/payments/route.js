
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import {
  createActivityLog,
  createNotification,
} from "@/lib/mongo-helpers";

export const runtime = "nodejs";

// GET: Fetch payments belonging to the logged-in user
export async function GET(request) {
  try {
    const currentUser = verifyAuth(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const userId = currentUser.userId ?? currentUser.user_id;
    const role = currentUser.role;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, message: "Invalid user session." },
        { status: 401 }
      );
    }

    const [payments] = await pool.execute(
      `SELECT DISTINCT
          p.payment_id,
          p.booking_id,
          p.amount,
          p.payment_method,
          p.payment_date,
          et.escrow_id,
          et.status AS escrow_status,
          et.platform_fee_percent,
          et.platform_fee_amount,
          et.released_at,
          b.status AS booking_status
       FROM Payment p
       JOIN Booking b
         ON p.booking_id = b.booking_id
       LEFT JOIN Escrow_Transaction et
         ON p.payment_id = et.payment_id
       LEFT JOIN Renter_Profile rp
         ON b.renter_id = rp.renter_id
       LEFT JOIN Equipment e
         ON b.equipment_id = e.equipment_id
       LEFT JOIN Owner_Profile op
         ON e.owner_id = op.owner_id
       WHERE
         (? IN ('renter', 'both') AND rp.user_id = ?)
         OR
         (? IN ('owner', 'both') AND op.user_id = ?)
       ORDER BY p.payment_id DESC`,
      [role, userId, role, userId]
    );

    return NextResponse.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Payments API GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not load payment records.",
      },
      { status: 500 }
    );
  }
}

// POST: Create payment and automatically create escrow record
export async function POST(request) {
  let connection;
  let transactionStarted = false;

  try {
    const currentUser = verifyAuth(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const userId = currentUser.userId ?? currentUser.user_id;
    const role = currentUser.role;

    if (!userId || !["renter", "both"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only renters can make payments.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const bookingId = Number(body.booking_id);
    const paymentMethod = String(
      body.payment_method || ""
    ).toLowerCase();

    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0 ||
      !["card", "upi", "netbanking"].includes(paymentMethod)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid booking and payment method.",
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Fetch booking, renter and equipment owner details
    const [bookings] = await connection.execute(
      `SELECT
          b.booking_id,
          b.equipment_id,
          b.total_amount,
          b.status,
          rp.user_id AS renter_user_id,
          op.user_id AS owner_user_id
       FROM Booking b
       JOIN Renter_Profile rp
         ON b.renter_id = rp.renter_id
       JOIN Equipment e
         ON b.equipment_id = e.equipment_id
       JOIN Owner_Profile op
         ON e.owner_id = op.owner_id
       WHERE b.booking_id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const booking = bookings[0];

    // Verify that the logged-in user owns this booking
    if (Number(booking.renter_user_id) !== Number(userId)) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "You cannot pay for this booking.",
        },
        { status: 403 }
      );
    }

    if (
      ["cancelled", "returned"].includes(
        String(booking.status).toLowerCase()
      )
    ) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "Payment cannot be created for this booking.",
        },
        { status: 409 }
      );
    }

    // Prevent duplicate payments
    const [existingPayments] = await connection.execute(
      `SELECT payment_id
       FROM Payment
       WHERE booking_id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (existingPayments.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "A payment already exists for this booking.",
        },
        { status: 409 }
      );
    }

    const amount = Number(booking.total_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { success: false, message: "Invalid booking amount." },
        { status: 400 }
      );
    }

    // Insert payment into MySQL
    const [paymentResult] = await connection.execute(
      `INSERT INTO Payment
        (booking_id, amount, payment_method)
       VALUES (?, ?, ?)`,
      [bookingId, amount, paymentMethod]
    );

    const paymentId = paymentResult.insertId;

    // Calculate platform fee
    const platformFeePercent = 5;

    const platformFeeAmount = Number(
      ((amount * platformFeePercent) / 100).toFixed(2)
    );

    // Create escrow record in MySQL
    const [escrowResult] = await connection.execute(
      `INSERT INTO Escrow_Transaction
        (payment_id, status, platform_fee_percent, platform_fee_amount)
       VALUES (?, 'held', ?, ?)`,
      [
        paymentId,
        platformFeePercent,
        platformFeeAmount,
      ]
    );

    const escrowId = escrowResult.insertId;

    // Commit MySQL transaction first
    await connection.commit();
    transactionStarted = false;

    // MongoDB: record payment activity and notify owner
    const mongoResults = await Promise.allSettled([
      createActivityLog({
        userId,
        action: "PAYMENT_CREATED",
        entityType: "PAYMENT",
        entityId: paymentId,
        details: {
          bookingId,
          equipmentId: booking.equipment_id,
          amount,
          paymentMethod,
          escrowId,
          escrowStatus: "held",
          platformFeePercent,
          platformFeeAmount,
        },
      }),

      createNotification({
        userId: booking.owner_user_id,
        type: "PAYMENT_RECEIVED",
        title: "Payment received",
        message: `Payment for booking #${bookingId} has been recorded and is held in escrow.`,
        relatedBookingId: bookingId,
      }),
    ]);

    mongoResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          "MongoDB payment event failed:",
          result.reason
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Payment recorded and escrow created successfully.",
        payment: {
          payment_id: paymentId,
          booking_id: bookingId,
          amount,
          payment_method: paymentMethod,
          escrow_id: escrowId,
          escrow_status: "held",
          platform_fee_percent: platformFeePercent,
          platform_fee_amount: platformFeeAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error("Payment creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not create payment.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PATCH: Owner confirms return and releases escrow
export async function PATCH(request) {
  let connection;
  let transactionStarted = false;

  try {
    const currentUser = verifyAuth(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const userId = currentUser.userId ?? currentUser.user_id;
    const role = currentUser.role;

    if (!userId || !["owner", "both"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only the equipment owner can release escrow.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const paymentId = Number(body.payment_id);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid payment ID." },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Fetch payment, escrow, booking, owner and renter details
    const [rows] = await connection.execute(
      `SELECT
          p.payment_id,
          et.escrow_id,
          et.status AS escrow_status,
          b.booking_id,
          b.equipment_id,
          b.status AS booking_status,
          op.user_id AS owner_user_id,
          rp.user_id AS renter_user_id
       FROM Payment p
       JOIN Escrow_Transaction et
         ON p.payment_id = et.payment_id
       JOIN Booking b
         ON p.booking_id = b.booking_id
       JOIN Equipment e
         ON b.equipment_id = e.equipment_id
       JOIN Owner_Profile op
         ON e.owner_id = op.owner_id
       JOIN Renter_Profile rp
         ON b.renter_id = rp.renter_id
       WHERE p.payment_id = ?
       FOR UPDATE`,
      [paymentId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "Payment or escrow record not found.",
        },
        { status: 404 }
      );
    }

    const record = rows[0];

    // Verify equipment ownership
    if (Number(record.owner_user_id) !== Number(userId)) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "You are not the owner of this equipment.",
        },
        { status: 403 }
      );
    }

    if (record.escrow_status !== "held") {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "This escrow is not currently held.",
        },
        { status: 409 }
      );
    }

    if (
      !["confirmed", "ongoing"].includes(
        String(record.booking_status).toLowerCase()
      )
    ) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            "Only confirmed or ongoing bookings can be marked as returned.",
        },
        { status: 409 }
      );
    }

    // Mark booking as returned in MySQL
    await connection.execute(
      `UPDATE Booking
       SET status = 'returned'
       WHERE booking_id = ?`,
      [record.booking_id]
    );

    // Release escrow in MySQL
    await connection.execute(
      `UPDATE Escrow_Transaction
       SET status = 'released',
           released_at = CURRENT_TIMESTAMP
       WHERE escrow_id = ?`,
      [record.escrow_id]
    );

    // Make equipment available again
    await connection.execute(
      `UPDATE Equipment
       SET availability_status = 'available'
       WHERE equipment_id = ?`,
      [record.equipment_id]
    );

    // Commit MySQL transaction first
    await connection.commit();
    transactionStarted = false;

    // MongoDB: record escrow release and notify renter
    const mongoResults = await Promise.allSettled([
      createActivityLog({
        userId,
        action: "ESCROW_RELEASED",
        entityType: "ESCROW",
        entityId: record.escrow_id,
        details: {
          paymentId,
          bookingId: record.booking_id,
          equipmentId: record.equipment_id,
          previousEscrowStatus: "held",
          newEscrowStatus: "released",
          previousBookingStatus: record.booking_status,
          newBookingStatus: "returned",
        },
      }),

      createNotification({
        userId: record.renter_user_id,
        type: "ESCROW_RELEASED",
        title: "Escrow released",
        message: `Your booking #${record.booking_id} has been marked as returned and its escrow has been released.`,
        relatedBookingId: record.booking_id,
      }),
    ]);

    mongoResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          "MongoDB escrow event failed:",
          result.reason
        );
      }
    });

    return NextResponse.json({
      success: true,
      message:
        "Booking marked as returned, escrow released, and equipment made available.",
      booking_id: record.booking_id,
      payment_id: paymentId,
      escrow_status: "released",
      equipment_availability: "available",
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error("Escrow release error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not release escrow.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
