import { NextResponse } from "next/server";
import { addToKlaviyoList } from "@/lib/klaviyo";

export async function POST(req: Request) {
  try {
    const { email, consent } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    const success = await addToKlaviyoList(email, consent);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: "Failed to add to list" }, { status: 500 });
    }
  } catch (err) {
    console.error("💥 API error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}