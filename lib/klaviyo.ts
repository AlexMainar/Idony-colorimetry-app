// /lib/klaviyo.ts
export async function addToKlaviyoList(email: string, consent: boolean = true) {
  const apiKey = process.env.KLAVIYO_API_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;

  console.log("🔑 Klaviyo env check:", {
    apiKey: !!apiKey,
    listId,
  });

  if (!apiKey || !listId) {
    console.error("❌ Missing Klaviyo API key or list ID");
    return false;
  }

  try {
    // ✅ Step 1: Create or update the profile in Klaviyo
    console.log("🧩 Creating Klaviyo profile with email:", email);
    const profileResponse = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email,
            properties: {
              marketing_consent: consent ? "subscribed" : "unsubscribed",
              source: "Colorimetry App",
            },
          },
        },
      }),
    });

    if (!profileResponse.ok) {
      console.error("❌ Failed to create profile:", await profileResponse.text());
      return false;
    }

    const profileData = await profileResponse.json();
    const profileId = profileData?.data?.id;

    // ✅ Step 2: Add profile to specific list
    const listResponse = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-02-15",
      },
      body: JSON.stringify({
        data: [{ type: "profile", id: profileId }],
      }),
    });

    if (!listResponse.ok) {
      console.error("❌ Failed to add profile to list:", await listResponse.text());
      return false;
    }

    // ✅ Step 3: Track custom event
    await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            metric: { data: { type: "metric", attributes: { name: "ColorimetrySignup" } } },
            profile: { data: { type: "profile", attributes: { email } } },
            properties: { source: "Colorimetry App" },
            time: new Date().toISOString(),
          },
        },
      }),
    });

    console.log("✅ Klaviyo profile created and added to list");
    return true;
  } catch (err) {
    console.error("💥 Klaviyo API error:", err);
    return false;
  }
}