
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAuth } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongo-helpers";

export const runtime = "nodejs";

// GET: Fetch notifications for logged-in user
export async function GET(request) {
  try {
    const user = verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const userId = Number(user.userId ?? user.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid user session." },
        { status: 401 }
      );
    }

    const db = await getMongoDb();

    const notifications = await db
      .collection("notifications")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const unreadCount = notifications.filter(
      (notification) => !notification.isRead
    ).length;

    return NextResponse.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch notifications." },
      { status: 500 }
    );
  }
}

// PATCH: Mark one or all notifications as read
export async function PATCH(request) {
  try {
    const user = verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const userId = Number(user.userId ?? user.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid user session." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const db = await getMongoDb();
    const collection = db.collection("notifications");

    // Handle mark all read BEFORE checking notificationId
    if (body.markAllRead === true) {
      const result = await collection.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
      );

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read.",
        modifiedCount: result.modifiedCount,
      });
    }

    // Handle one notification
    if (
      typeof body.notificationId !== "string" ||
      !ObjectId.isValid(body.notificationId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid notification ID." },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      {
        _id: new ObjectId(body.notificationId),
        userId,
      },
      {
        $set: { isRead: true },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error("Notifications PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Could not update notifications." },
      { status: 500 }
    );
  }
}
