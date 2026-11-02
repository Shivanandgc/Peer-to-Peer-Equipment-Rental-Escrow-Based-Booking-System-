
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";

// GET: Fetch bookings belonging to the logged-in user
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

    const [rows] = await pool.execute(
      `SELECT DISTINCT
          b.*,
          e.title AS equipment_title,
          op.user_id AS equipment_owner_user_id
       FROM Booking b
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
       ORDER BY b.booking_id DESC`,
      [role, userId, role, userId]
    );

    return NextResponse.json({
      success: true,
      count: rows.length,
      bookings: rows,
    });
  } catch (error) {
    console.error("Bookings query failed:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch bookings." },
      { status: 500 }
    );
  }
}

// POST: Create a new booking
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

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, message: "Invalid user session." },
        { status: 401 }
      );
    }

    if (!["renter", "both"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only renters can create bookings.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const equipmentId = Number(body.equipment_id);
    const startDate = body.start_date;
    const endDate = body.end_date;

    const validDate = (value) => {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return false;
      }

      const date = new Date(`${value}T00:00:00Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (
      !Number.isInteger(equipmentId) ||
      equipmentId <= 0 ||
      !validDate(startDate) ||
      !validDate(endDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select valid equipment and rental dates.",
        },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          message: "End date cannot be before start date.",
        },
        { status: 400 }
      );
    }

    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    if (startDate < todayString) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select today or a future start date.",
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [equipmentRows] = await connection.execute(
      `SELECT equipment_id, price_per_day, availability_status
       FROM Equipment
       WHERE equipment_id = ?
       FOR UPDATE`,
      [equipmentId]
    );

    if (equipmentRows.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Equipment not found." },
        { status: 404 }
      );
    }

    const equipment = equipmentRows[0];

    if (
      String(equipment.availability_status).toLowerCase() !== "available"
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "This equipment is not currently available.",
        },
        { status: 409 }
      );
    }

    const [conflicts] = await connection.execute(
      `SELECT booking_id
       FROM Booking
       WHERE equipment_id = ?
         AND status IN ('pending', 'confirmed', 'ongoing')
         AND NOT (end_date < ? OR start_date > ?)
       LIMIT 1`,
      [equipmentId, startDate, endDate]
    );

    if (conflicts.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "This equipment is already booked for those dates.",
        },
        { status: 409 }
      );
    }

    const [profiles] = await connection.execute(
      `SELECT renter_id
       FROM Renter_Profile
       WHERE user_id = ?
       ORDER BY renter_id
       LIMIT 1`,
      [userId]
    );

    let renterId;

    if (profiles.length > 0) {
      renterId = profiles[0].renter_id;
    } else {
      const [profileResult] = await connection.execute(
        `INSERT INTO Renter_Profile (user_id)
         VALUES (?)`,
        [userId]
      );

      renterId = profileResult.insertId;
    }

    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);

    const rentalDays = Math.floor(
      (end - start) / 86400000
    ) + 1;

    const totalAmount =
      Number(equipment.price_per_day) * rentalDays;

    const [bookingResult] = await connection.execute(
      `INSERT INTO Booking
       (equipment_id, renter_id, start_date, end_date, total_amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        equipmentId,
        renterId,
        startDate,
        endDate,
        totalAmount,
      ]
    );

    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Booking created successfully.",
        booking: {
          booking_id: bookingResult.insertId,
          equipment_id: equipmentId,
          renter_id: renterId,
          start_date: startDate,
          end_date: endDate,
          rental_days: rentalDays,
          total_amount: totalAmount,
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Booking creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not create booking.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PATCH: Owner confirms or rejects a booking
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
          message: "Only equipment owners can manage bookings.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const bookingId = Number(body.booking_id);
    const action = body.action;

    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0 ||
      !["confirm", "reject"].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID or action.",
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT
          b.booking_id,
          b.equipment_id,
          b.status,
          e.owner_id,
          op.user_id AS owner_user_id
       FROM Booking b
       INNER JOIN Equipment e
         ON b.equipment_id = e.equipment_id
       INNER JOIN Owner_Profile op
         ON e.owner_id = op.owner_id
       WHERE b.booking_id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const booking = rows[0];

    if (Number(booking.owner_user_id) !== Number(userId)) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to manage this booking.",
        },
        { status: 403 }
      );
    }

    if (String(booking.status).toLowerCase() !== "pending") {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "Only pending bookings can be confirmed or rejected.",
        },
        { status: 409 }
      );
    }

    if (action === "confirm") {
      await connection.execute(
        `UPDATE Booking
         SET status = 'confirmed'
         WHERE booking_id = ?`,
        [bookingId]
      );

      await connection.execute(
        `UPDATE Equipment
         SET availability_status = 'booked'
         WHERE equipment_id = ?`,
        [booking.equipment_id]
      );
    } else {
      await connection.execute(
        `UPDATE Booking
         SET status = 'cancelled'
         WHERE booking_id = ?`,
        [bookingId]
      );

      await connection.execute(
        `UPDATE Equipment
         SET availability_status = 'available'
         WHERE equipment_id = ?`,
        [booking.equipment_id]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message:
        action === "confirm"
          ? `Booking #${bookingId} confirmed successfully.`
          : `Booking #${bookingId} rejected successfully.`,
      booking: {
        booking_id: bookingId,
        status: action === "confirm" ? "confirmed" : "cancelled",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Booking action failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not update booking.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
