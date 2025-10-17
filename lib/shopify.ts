// lib/shopify.ts

export interface ShopifyProduct {
  id: string;            // product gid
  variantId?: string;    // matching variant gid (by the SKU you passed)
  title: string;
  handle: string;
  featuredImage?: { url: string };
}

export async function fetchShopifyProducts(skus: string[]): Promise<ShopifyProduct[]> {
  if (!Array.isArray(skus) || skus.length === 0) {
    console.warn("⚠️ No SKUs provided to fetchShopifyProducts()");
    return [];
  }

  const validSkus = skus.filter(Boolean);
  const q = validSkus.map((s) => `variants.sku:${s}`).join(" OR ");
  console.log("🧩 Shopify query:", q);

  const query = `
    {
      products(first: 100, query: "${q}") {
        edges {
          node {
            id
            title
            handle
            featuredImage { url }
            variants(first: 20) {
              edges {
                node {
                  id
                  sku
                  title
                  image { url }
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("/api/shopify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    console.error("❌ Shopify fetch failed:", res.status, await res.text());
    return [];
  }

  const json = await res.json();

  if (json.errors) {
    console.error("❌ Shopify API error:", JSON.stringify(json.errors, null, 2));
    return [];
  }

  // 🧩 Filter strictly by exact SKU match
  const products: ShopifyProduct[] = [];

  for (const e of json.data?.products?.edges ?? []) {
    const node = e.node;
    for (const v of node.variants?.edges ?? []) {
      const variant = v.node;
      if (validSkus.includes(variant.sku)) {
        products.push({
          id: node.id,
          variantId: variant.id,
          title: `${node.title} - ${variant.title}`,
          handle: node.handle,
          featuredImage: variant.image ?? node.featuredImage,
        });
      }
    }
  }

  // 🧹 Deduplicate by variantId
  const deduped = Array.from(new Map(products.map((p) => [p.variantId, p])).values());

  console.log(`✅ Matched ${deduped.length} of ${validSkus.length} SKUs`);
  return deduped;
}