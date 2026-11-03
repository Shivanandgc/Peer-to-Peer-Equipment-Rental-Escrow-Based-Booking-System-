import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;

    const db = client.db(process.env.MONGODB_DB);

    const result = await db.command({ ping: 1 });

    return Response.json({
      success: true,
      message: "MongoDB connected successfully!",
      database: process.env.MONGODB_DB,
      result,
    });
  } catch (error) {
    console.error("MongoDB error:", error);

    return Response.json(
      {
        success: false,
        message: "MongoDB connection failed",
      },
      { status: 500 }
    );
  }
}