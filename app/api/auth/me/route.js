
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const authUser = verifyAuth(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const userId = authUser.userId ?? authUser.user_id;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication token." },
        { status: 401 }
      );
    }

    const [users] = await pool.execute(
      `SELECT user_id, name, email, role
       FROM Users
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return NextResponse.json(
      { success: false, message: "Could not verify session." },
      { status: 500 }
    );
  }
}
