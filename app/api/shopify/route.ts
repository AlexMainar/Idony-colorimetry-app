import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { query } = await request.json();

  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN!;

  const res = await fetch(`https://${domain}/api/2024-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}