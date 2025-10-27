import { NextResponse } from "next/server";
import { addToKlaviyoList } from "@/lib/klaviyo";

export async function POST(req: Request) {
  try {
    const { email, consent, event = "ColorimetrySignup",
      properties = {} } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }
    // ✅ Step 1: Ensure profile exists
    const added = await addToKlaviyoList(email, consent);
    if (!added) {
      return NextResponse.json({ success: false, message: "Failed to add to list" }, { status: 500 });
    }
    // ✅ Step 2: Build event payload
    console.log("📦 Sending Klaviyo event:", {
      email,
      event,
      properties,
    });
    const response = await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
        "Content-Type": "application/json",
        accept: "application/json",
        revision: "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            metric: {
              data: {
                type: "metric",
                attributes: { name: event },
              },
            },
            profile: {
              data: {
                type: "profile",
                attributes: { email },
              },
            },
            properties: properties || {},
            time: new Date().toISOString(),
          },
        },
      }),
    });

    // 🧾 SECOND LOG — after the fetch
    console.log("📩 Klaviyo event response status:", response.status);
    const text = await response.text();
    console.log("🧾 Klaviyo event response body:", text);

    if (!response.ok) {
      console.error("Failed to send event to Klaviyo:", text);
      console.log("🧩 Final JSON sent to Klaviyo:", JSON.stringify({
        data: {
          type: "event",
          attributes: {
            metric: { data: { type: "metric", attributes: { name: event } } },
            profile: { data: { type: "profile", attributes: { email } } },
            properties: properties || {},
            time: new Date().toISOString(),
          },
        },
      }, null, 2));
      return NextResponse.json({ success: false, message: text }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("💥 API error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}