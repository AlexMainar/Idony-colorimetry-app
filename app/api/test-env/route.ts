import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    domain: process.env.SHOPIFY_STORE_DOMAIN,
    discount: process.env.DISCOUNT_CODE,
    // Never return the storefront token to the browser! (it stays server-side)
    tokenExists: Boolean(process.env.SHOPIFY_STOREFRONT_TOKEN),
  });
}