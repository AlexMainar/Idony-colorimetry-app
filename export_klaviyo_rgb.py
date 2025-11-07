import requests
import csv
from collections import defaultdict

# ---- Configuration ----
API_KEY = "pk_e9dda4eaacbad2d3b0249ec686bc3194b1"  # replace if needed
METRIC_NAME = "ColorimetryCompleted"
OUTPUT_FILE = "colorimetry_training_data.csv"
PAGE_SIZE = 100

headers = {
    "Authorization": f"Klaviyo-API-Key {API_KEY}",
    "accept": "application/json",
    "revision": "2024-02-15",
}

def fetch_events(url=None):
    """Fetch one page of ColorimetryCompleted events."""
    if not url:
        url = f"https://a.klaviyo.com/api/events/?filter=equals(metric.name,\"{METRIC_NAME}\")&page[size]={PAGE_SIZE}"
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    return r.json()

rows = []
url = None
page = 1

while True:
    data = fetch_events(url)
    events = data.get("data", [])
    print(f"📦 Page {page}: {len(events)} events")

    for item in events:
        props = item["attributes"]["event_properties"]
        rgb = props.get("rgb")
        season = props.get("season") or props.get("skin_season")
        confidence = props.get("skin_season_confidence")
        email = item["attributes"].get("profile", {}).get("email")

        if rgb and season:
            rows.append({
                "email": email,
                "r": rgb[0],
                "g": rgb[1],
                "b": rgb[2],
                "season": season,
                "confidence": confidence
            })

    next_link = data.get("links", {}).get("next")
    if not next_link:
        break
    url = next_link
    page += 1

# ---- Save raw data ----
with open(OUTPUT_FILE, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["email", "r", "g", "b", "season", "confidence"])
    writer.writeheader()
    writer.writerows(rows)

print(f"✅ Exported {len(rows)} samples to {OUTPUT_FILE}")

# ---- Compute per-season averages ----
season_data = defaultdict(list)
for row in rows:
    if row["season"]:
        season_data[row["season"]].append((row["r"], row["g"], row["b"]))

print("\n🎨 Average RGB per season:")
for season, rgbs in season_data.items():
    avg_r = sum(r for r, _, _ in rgbs) / len(rgbs)
    avg_g = sum(g for _, g, _ in rgbs) / len(rgbs)
    avg_b = sum(b for _, _, b in rgbs) / len(rgbs)
    print(f"{season:20s} → [{avg_r:.1f}, {avg_g:.1f}, {avg_b:.1f}] (n={len(rgbs)})")