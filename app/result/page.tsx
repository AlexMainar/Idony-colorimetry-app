"use client";


import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import colorimetry from "@/lib/mapping/colorimetry.json";
import { paletteForSeason } from "@/lib/color";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import KlaviyoForm from "@/components/KlaviyoForm";

const DISCOUNT_CODE = process.env.NEXT_PUBLIC_DISCOUNT_CODE || "PALETTE15";

export default function ResultPage() {
  const palette = useAppStore((s) => s.palette);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const category = palette?.season;
  const info = category ? (colorimetry as any)[category] : null;

  // If we already have an email (from previous step), immediately show results
  const [showResults, setShowResults] = useState<boolean>(false);

  // Initialize showResults based on stored email

  useEffect(() => {
    try {
      const hasEmail = !!localStorage.getItem("idony_email");
      setShowResults(hasEmail);
    } catch {
      setShowResults(false);
    }
  }, []);

  // Fire Meta Pixel when viewing results
  useEffect(() => {
    if (palette && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "ViewContent", {
        content_name: palette.season,
        content_category: "Colorimetry Result",
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
      try {
        window.localStream.getTracks().forEach((track) => track.stop());
      } catch { }
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
    .map((p) => `${p.variantId?.split("/").pop()}:1`)
    .join(",")}`;

  return (
    <main className="relative min-h-dvh bg-white text-black overflow-hidden">

      {/* LOGO (fixed) */}
      <img
        src="/Logos-01.svg"
        alt="Idony logo"
        className="absolute top-6 left-1/2 transform -translate-x-1/2 w-24 sm:w-28 h-auto opacity-90 sm:left-8 sm:translate-x-0"
      />

      {/* INLINE OVERLAY (shown until email is provided) */}
      {!showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-md p-6 w-full max-w-md relative">
            <KlaviyoForm onSuccess={() => setShowResults(true)} />
          </div>
        </div>

      )}

      {/* RESULTS (hidden until form success) */}
      {showResults && (
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-0 flex flex-col justify-start min-h-screen">
          {/* TITLE */}
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-snug mb-3">
            {category}
          </h1>

          {/* BODY */}
          <p className="text-sm sm:text-base leading-relaxed text-justify">{info.description}</p>
          <p className="text-sm sm:text-base leading-relaxed mt-1 text-justify">{info.comments}</p>

          <section className="mt-4">
            <h2 className="font-black text-base uppercase mb-1 tracking-tight">Tonos recomendados</h2>
            <p className="text-sm sm:text-base leading-relaxed text-justify">{info.recommended_colors}</p>
          </section>

          <section className="mt-3">
            <h2 className="font-black text-base uppercase mb-1 tracking-tight">Colores a evitar</h2>
            <p className="text-sm sm:text-base leading-relaxed text-justify">{info.avoid_colors}</p>
          </section>

          {/* PALETTE */}
          {category && (
            <section className="mt-4">
              <h2 className="font-black text-base uppercase mb-2 tracking-tight">Paleta de colores</h2>
              <div className="flex justify-start gap-2">
                {paletteForSeason(category).map((hex: string) => (
                  <div
                    key={hex}
                    className="w-16 h-16 sm:w-18 sm:h-18 border border-neutral-300"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* PRODUCTS */}
          <section className="mt-4">
            <h2 className="font-black text-base uppercase mb-2 tracking-tight">
              Productos Idony recomendados
            </h2>
            {loading ? (
              <p className="text-sm text-black">Cargando productos...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-3 justify-items-center w-full">
                {products.map((p) => (
                  <a
                    key={`${p.variantId || p.id}-${p.handle}`}
                    href={`https://idonycosmetics.com/products/${p.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-start text-left hover:opacity-90 transition mb-1"
                  >
                    <img
                      src={p.featuredImage?.url || "/placeholder.png"}
                      alt={p.title}
                      className="h-40 sm:h-48 w-auto object-contain"
                    />
                    <p className="text-[9px] sm:text-[10px] font-black mt-1 uppercase leading-tight text-center sm:text-left max-w-[90%] line-clamp-2">
                      {p.title}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* CTA */}
          {products.length > 0 && (
            <div className="mt-4 flex justify-center pb-6">
              <a
                href={cartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white font-black rounded-none py-2 px-10 uppercase tracking-wide hover:bg-neutral-800 transition text-sm shadow-md"
              >
                Los quiero
              </a>
            </div>
          )}
        </div>
      )}
    </main>
  );
}