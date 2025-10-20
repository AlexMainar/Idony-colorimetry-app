"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import colorimetry from "@/lib/mapping/colorimetry.json";
import { paletteForSeason } from "@/lib/color";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
declare global {
  interface Window {
    localStream?: MediaStream;
  }
}
const DISCOUNT_CODE = process.env.NEXT_PUBLIC_DISCOUNT_CODE || "PALETTE15";

export default function ResultPage() {
  const palette = useAppStore((s) => s.palette);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const category = palette?.season;
  const info = category ? (colorimetry as any)[category] : null;

  useEffect(() => {
    if (palette && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: palette.season,
        content_category: 'Colorimetry Result',
      });
    }
  }, [palette]);

  if (!palette) {
    return (
      <main className="min-h-dvh bg-white text-black flex flex-col items-center px-6 pt-8 pb-16 space-y-6">
        <p className="text-lg text-black">NO SE ENCONTRÓ ANÁLISIS</p>
      </main>
    );
  }

  // Stop camera stream when entering result page
  useEffect(() => {
    if (window.localStream) {
      window.localStream.getTracks().forEach((track) => track.stop());
      console.log("📷 Camera stopped");
      window.localStream = undefined;
    }
  }, []);

  useEffect(() => {
    async function load() {
      if (!info?.recommended_products) return;
      const ids = info.recommended_products.map((p: any) => p.id);
      const shopifyData = await fetchShopifyProducts(ids);
      setProducts(shopifyData);
      setLoading(false);
    }
    load();
  }, [category]);

  if (!info)
    return (
      <main className="min-h-dvh grid place-items-center text-black">
        <p>No data for category: {category}</p>
      </main>
    );

  const cartUrl = `https://www.idonycosmetics.com/cart/${products
    .map(p => `${p.variantId?.split("/").pop()}:1`)
    .join(",")}`;

  return (
    <main className="min-h-dvh flex flex-col items-center bg-white text-black px-6 py-4 overflow-y-auto">
      {/* Header */}
      <header className="w-full flex flex-col items-center text-center px-4 py-3 space-y-2 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-3">
  <img
    src="/Logos-01.svg"
    alt="Idony logo"
    className="w-28 sm:w-36 h-auto opacity-90 mx-auto sm:mx-0"
  />
  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-1 sm:mt-0">
    {category}
  </h1>
</header>

      {/* Main Content */}
      <div className="max-w-5xl w-full text-center text-black space-y-2 leading-tight mt-4">
        <p className="text-base text-black mx-auto max-w-4xl">{info.description}</p>
        <p className="text-base text-black mx-auto max-w-4xl">{info.comments}</p>

        <div>
          <h2 className="font-black text-base uppercase mb-1 tracking-tight">Tonos recomendados</h2>
          <p className="text-base">{info.recommended_colors}</p>
        </div>

        <div>
          <h2 className="font-black text-base uppercase mb-1 tracking-tight">Colores a evitar</h2>
          <p className="text-base">{info.avoid_colors}</p>
        </div>



        {/* Color palette */}
        {category && (
          <div>
            <h2 className="font-black text-base uppercase mb-1 tracking-tight">
              Paleta de colores
            </h2>
            <div className="flex justify-center gap-2 mt-2">
              {paletteForSeason(category).map((hex: string) => (
                <div
                  key={hex}
                  className="w-18 h-18 rounded-none border border-neutral-300"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div>
          <h2 className="font-black text-base uppercase mb-2 tracking-tight">
            Productos Idony recomendados
          </h2>
          {loading ? (
            <p className="text-base text-black">Cargando productos...</p>
          ) : (
            <div className="flex flex-wrap justify-center items-start gap-0 mt-2">
              {products.map((p) => (
                <a
                  key={`${p.variantId || p.id}-${p.handle}`}
                  href={`https://idonycosmetics.com/products/${p.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center w-1/2 sm:w-1/4 px-1 hover:opacity-90 transition"
                >
                  <img
                    src={p.featuredImage?.url || "/placeholder.png"}
                    alt={p.title}
                    className="h-52 w-auto object-contain m-0 p-0 align-top"
                  />
                  <p className="text-[11px] font-black mt-1 uppercase leading-tight text-center">
                    {p.title}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        {products.length > 0 && (
          <a
            href={cartUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mx-auto mt-4 bg-black text-white font-black rounded-none py-2 px-10 uppercase tracking-wide hover:bg-neutral-800 transition"
          >
            Los quiero
          </a>
        )}
      </div>
    </main>
  );
}