import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyAuth, hasRole } from "@/lib/auth";

export async function GET(request) {
  try {
    const currentUser = verifyAuth(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // Only owners can view the complete user list.
    if (!hasRole(currentUser, ["owner", "both"])) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to view all users.",
        },
        { status: 403 }
      );
    }

    const [users] = await pool.execute(`
      SELECT
        user_id,
        name,
        email,
        phone,
        role,
        created_at
      FROM Users
      ORDER BY user_id DESC
    `);

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Users API error:", error);

    return NextResponse.json(
      { success: false, message: "Could not load users." },
      { status: 500 }
    );
  }
}