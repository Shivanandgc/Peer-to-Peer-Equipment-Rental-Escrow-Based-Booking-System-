
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM available_equipment_view
    `);

    return NextResponse.json({
      success: true,
      count: rows.length,
      equipment: rows,
    });
  } catch (error) {
    console.error("Equipment query failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Could not fetch equipment." },
      { status: 500 }
    );
  }
}
