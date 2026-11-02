
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS databaseName"
    );

    const [tables] = await pool.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME`
    );

    return NextResponse.json({
      success: true,
      database: rows[0].databaseName,
      tables: tables.map((table) => table.TABLE_NAME),
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Database connection failed." },
      { status: 500 }
    );
  }
}
