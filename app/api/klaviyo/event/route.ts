import { NextResponse } from "next/server";
import { recordColorimetryCompleted } from "@/lib/klaviyo";

export async function POST(req: Request) {
  try {
    const { email, properties } = await req.json();
    if (!email) return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });

    const success = await recordColorimetryCompleted(email, properties);
    return NextResponse.json({ success });
  } catch (err) {
    console.error("💥 Error in /api/klaviyo/event:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}