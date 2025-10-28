import { NextResponse } from "next/server";
import { upsertProfileAndList } from "@/lib/klaviyo";

export async function POST(req: Request) {
  try {
    const { email, consent = true } = await req.json();
    if (!email) return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });

    const success = await upsertProfileAndList(email, consent);
    return NextResponse.json({ success });
  } catch (err) {
    console.error("💥 Error in /api/klaviyo/profile:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}