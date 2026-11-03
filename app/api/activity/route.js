
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongo-helpers";

export const runtime = "nodejs";

// GET: Fetch activity logs or an aggregated summary
export async function GET(request) {
  try {
    const user = verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const db = await getMongoDb();
    const collection = db.collection("activity_logs");

    const { searchParams } = new URL(request.url);

    // MongoDB aggregation
    if (searchParams.get("summary") === "true") {
      const summary = await collection.aggregate([
        {
          $match: {
            userId: Number(user.userId),
          },
        },
        {
          $group: {
            _id: "$action",
            total: { $sum: 1 },
          },
        },
        {
          $sort: { total: -1 },
        },
      ]).toArray();

      return NextResponse.json({
        success: true,
        summary,
      });
    }

    // Fetch normal activity history
    const activities = await collection
      .find({ userId: Number(user.userId) })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      count: activities.length,
      activities,
    });

  } catch (error) {
    console.error("Fetch activity error:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch activities." },
      { status: 500 }
    );
  }
}

// POST: Create a new activity log
export async function POST(request) {
  try {
    const user = verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { action, entityType, entityId, details = {} } =
      await request.json();

    if (
      typeof action !== "string" ||
      !action.trim() ||
      typeof entityType !== "string" ||
      !entityType.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Action and entityType are required.",
        },
        { status: 400 }
      );
    }

    if (
      details === null ||
      typeof details !== "object" ||
      Array.isArray(details)
    ) {
      return NextResponse.json(
        { success: false, message: "Details must be an object." },
        { status: 400 }
      );
    }

    const db = await getMongoDb();

    const activity = {
      userId: Number(user.userId),
      action: action.trim(),
      entityType: entityType.trim(),
      entityId: entityId ?? null,
      details,
      timestamp: new Date(),
    };

    const result = await db
      .collection("activity_logs")
      .insertOne(activity);

    return NextResponse.json(
      {
        success: true,
        message: "Activity logged successfully.",
        activity: {
          ...activity,
          _id: result.insertedId,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Create activity error:", error);

    return NextResponse.json(
      { success: false, message: "Could not log activity." },
      { status: 500 }
    );
  }
}
