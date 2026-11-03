
import clientPromise from "@/lib/mongodb";

export async function getMongoDb() {
  const client = await clientPromise;

  return client.db(
    process.env.MONGODB_DB || "rentmate_nosql"
  );
}

export async function createActivityLog({
  userId,
  action,
  entityType,
  entityId,
  details = {},
}) {
  const db = await getMongoDb();

  return db.collection("activity_logs").insertOne({
    userId: Number(userId),
    action,
    entityType,
    entityId: entityId ? Number(entityId) : null,
    details,
    timestamp: new Date(),
  });
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedBookingId = null,
}) {
  const db = await getMongoDb();

  return db.collection("notifications").insertOne({
    userId: Number(userId),
    type,
    title,
    message,
    relatedBookingId: relatedBookingId
      ? Number(relatedBookingId)
      : null,
    isRead: false,
    createdAt: new Date(),
  });
}
