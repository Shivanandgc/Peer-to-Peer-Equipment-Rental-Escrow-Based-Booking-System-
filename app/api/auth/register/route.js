import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;
    const password = body.password;
    const role = body.role;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Name, email, password and role are required." },
        { status: 400 }
      );
    }

    if (name.length > 100 || email.length > 100) {
      return NextResponse.json(
        { success: false, message: "Name or email is too long." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!["owner", "renter", "both"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role." },
        { status: 400 }
      );
    }

    const [existingUsers] = await pool.execute(
      "SELECT user_id FROM Users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO Users (name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, passwordHash, role]
    );

    return NextResponse.json(
      { success: true, message: "Registration successful. You can now log in." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      { success: false, message: "Registration failed." },
      { status: 500 }
    );
  }
}