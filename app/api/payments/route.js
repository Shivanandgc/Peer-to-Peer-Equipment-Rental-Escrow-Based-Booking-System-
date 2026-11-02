
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

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
       JOIN Booking b ON p.booking_id = b.booking_id
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
      { success: false, message: "Could not load payment records." },
      { status: 500 }
    );
  }
}

// POST: Create payment and automatically create escrow record
export async function POST(request) {
  let connection;

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
        { success: false, message: "Only renters can make payments." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const bookingId = Number(body.booking_id);
    const paymentMethod = String(body.payment_method || "").toLowerCase();

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

    const [bookings] = await connection.execute(
      `SELECT
          b.booking_id,
          b.total_amount,
          b.status,
          rp.user_id
       FROM Booking b
       JOIN Renter_Profile rp ON b.renter_id = rp.renter_id
       WHERE b.booking_id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (bookings.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const booking = bookings[0];

    if (Number(booking.user_id) !== Number(userId)) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "You cannot pay for this booking." },
        { status: 403 }
      );
    }

    if (booking.status === "cancelled" || booking.status === "returned") {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "Payment cannot be created for this booking.",
        },
        { status: 409 }
      );
    }

    const [existingPayments] = await connection.execute(
      `SELECT payment_id
       FROM Payment
       WHERE booking_id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (existingPayments.length > 0) {
      await connection.rollback();

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

      return NextResponse.json(
        { success: false, message: "Invalid booking amount." },
        { status: 400 }
      );
    }

    const [paymentResult] = await connection.execute(
      `INSERT INTO Payment
        (booking_id, amount, payment_method)
       VALUES (?, ?, ?)`,
      [bookingId, amount, paymentMethod]
    );

    const platformFeePercent = 5;
    const platformFeeAmount = Number(
      ((amount * platformFeePercent) / 100).toFixed(2)
    );

    const [escrowResult] = await connection.execute(
      `INSERT INTO Escrow_Transaction
        (payment_id, status, platform_fee_percent, platform_fee_amount)
       VALUES (?, 'held', ?, ?)`,
      [
        paymentResult.insertId,
        platformFeePercent,
        platformFeeAmount,
      ]
    );

    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Payment recorded and escrow created successfully.",
        payment: {
          payment_id: paymentResult.insertId,
          booking_id: bookingId,
          amount,
          payment_method: paymentMethod,
          escrow_id: escrowResult.insertId,
          escrow_status: "held",
          platform_fee_percent: platformFeePercent,
          platform_fee_amount: platformFeeAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Payment creation error:", error);

    return NextResponse.json(
      { success: false, message: "Could not create payment." },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PATCH: Owner confirms return and releases escrow
export async function PATCH(request) {
  let connection;

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

    const [rows] = await connection.execute(
      `SELECT
          p.payment_id,
          et.escrow_id,
          et.status AS escrow_status,
          b.booking_id,
          b.equipment_id,
          b.status AS booking_status,
          op.user_id AS owner_user_id
       FROM Payment p
       JOIN Escrow_Transaction et
         ON p.payment_id = et.payment_id
       JOIN Booking b
         ON p.booking_id = b.booking_id
       JOIN Equipment e
         ON b.equipment_id = e.equipment_id
       JOIN Owner_Profile op
         ON e.owner_id = op.owner_id
       WHERE p.payment_id = ?
       FOR UPDATE`,
      [paymentId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Payment or escrow record not found." },
        { status: 404 }
      );
    }

    const record = rows[0];

    if (Number(record.owner_user_id) !== Number(userId)) {
      await connection.rollback();

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

      return NextResponse.json(
        {
          success: false,
          message: "This escrow is not currently held.",
        },
        { status: 409 }
      );
    }

    if (
      !["confirmed", "ongoing"].includes(record.booking_status)
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "Only confirmed or ongoing bookings can be marked as returned.",
        },
        { status: 409 }
      );
    }

    // Mark booking as returned
    await connection.execute(
      `UPDATE Booking
       SET status = 'returned'
       WHERE booking_id = ?`,
      [record.booking_id]
    );

    // Release escrow
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

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Booking marked as returned, escrow released, and equipment made available.",
      booking_id: record.booking_id,
      payment_id: paymentId,
      escrow_status: "released",
      equipment_availability: "available",
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Escrow release error:", error);

    return NextResponse.json(
      { success: false, message: "Could not release escrow." },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
