// /lib/klaviyo.ts
export async function upsertProfileAndList(
  email: string,
  consent: boolean = true,
) {
  const apiKey = process.env.KLAVIYO_API_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;

  console.log("🔑 Klaviyo env check:", { apiKey: !!apiKey, listId: !!listId });

  if (!apiKey || !listId) {
    console.error("❌ Missing Klaviyo API key or list ID");
    return false;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: "2024-02-15",
  } as const;

  try {
    const filter = encodeURIComponent(`equals(email,"${email}")`);
    const lookupRes = await fetch(
      `https://a.klaviyo.com/api/profiles?filter=${filter}`,
      { method: "GET", headers }
    );

    if (!lookupRes.ok) {
      console.error("❌ Failed to lookup profile:", await lookupRes.text());
      return false;
    }

    const lookupJson = await lookupRes.json();
    const existing = lookupJson?.data?.[0];

    const profileProps = {
      marketing_consent: consent ? "subscribed" : "unsubscribed",
      source: "Colorimetry App",
    };

    let profileId: string | undefined;

    if (existing) {
      profileId = existing.id;
      const patchRes = await fetch(
        `https://a.klaviyo.com/api/profiles/${profileId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            data: {
              type: "profile",
              id: profileId,
              attributes: {
                properties: profileProps,
              },
            },
          }),
        }
      );

      if (!patchRes.ok) {
        const text = await patchRes.text();
        if (patchRes.status !== 409) {
          console.error("❌ Failed to update profile:", text);
          return false;
        }
        console.warn("⚠️ Conflict updating profile, continuing:", text);
      }

      console.log("✅ Existing Klaviyo profile updated:", profileId);
    } else {
      const createRes = await fetch(`https://a.klaviyo.com/api/profiles/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            type: "profile",
            attributes: {
              email,
              properties: profileProps,
            },
          },
        }),
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        if (createRes.status !== 409) {
          console.error("❌ Failed to create profile:", text);
          return false;
        }

        const refetch = await fetch(
          `https://a.klaviyo.com/api/profiles?filter=${filter}`,
          { method: "GET", headers }
        );
        if (!refetch.ok) {
          console.error("❌ Failed to refetch profile after conflict:", await refetch.text());
          return false;
        }
        const refetchJson = await refetch.json();
        profileId = refetchJson?.data?.[0]?.id;
        if (!profileId) {
          console.error("❌ Profile not found after conflict");
          return false;
        }
        console.log("✅ Profile exists after conflict, id:", profileId);
      } else {
        const created = await createRes.json();
        profileId = created?.data?.id;
        if (!profileId) {
          console.error("❌ Created profile response missing ID");
          return false;
        }
        console.log("✅ Profile created:", profileId);
      }
    }

    if (!profileId) {
      console.error("❌ Missing profileId — aborting");
      return false;
    }

    const listRes = await fetch(
      `https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: [{ type: "profile", id: profileId }],
        }),
      }
    );

    if (!listRes.ok && listRes.status !== 409) {
      console.error("❌ Failed to add profile to list:", await listRes.text());
      return false;
    }
    if (listRes.ok) {
      console.log("✅ Profile added to list");
    } else {
      console.warn("⚠️ Profile likely already in list (409), continuing");
    }

    return true;
  } catch (err) {
    console.error("💥 Klaviyo API error in upsertProfileAndList:", err);
    return false;
  }
}
export async function recordColorimetryCompleted(
  email: string,
  properties: Record<string, any>
) {
  const apiKey = process.env.KLAVIYO_API_KEY;

  console.log("🔑 Klaviyo env check for event:", { apiKey: !!apiKey });

  if (!apiKey) {
    console.error("❌ Missing Klaviyo API key");
    return false;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: "2024-02-15",
  } as const;

  try {
    const filter = encodeURIComponent(`equals(email,"${email}")`);
    const lookupRes = await fetch(
      `https://a.klaviyo.com/api/profiles?filter=${filter}`,
      { method: "GET", headers }
    );

    if (!lookupRes.ok) {
      console.error("❌ Failed to lookup profile for event:", await lookupRes.text());
      return false;
    }

    const lookupJson = await lookupRes.json();
    const profile = lookupJson?.data?.[0];

    if (!profile) {
      console.error("❌ Profile not found for email:", email);
      return false;
    }

    const profileId = profile.id;


    const eventRes = await fetch(`https://a.klaviyo.com/api/events/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            profile: { data: { type: "profile", id: profileId } },
            metric: {
              data: { type: "metric", attributes: { name: "ColorimetryCompleted" } },
            },
            properties,
            time: new Date().toISOString(),
          },
        },
      }),
    });

    if (!eventRes.ok) {
      console.error("❌ Failed to send ColorimetryCompleted event:", await eventRes.text());
      return false;
    }

    console.log("✅ ColorimetryCompleted event sent for profile:", profileId);
    return true;
  } catch (err) {
    console.error("💥 Klaviyo API error in recordColorimetryCompleted:", err);

    return false;
  }
}