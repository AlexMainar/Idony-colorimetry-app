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
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [sentCompleted, setSentCompleted] = useState(false);
  const category = palette?.season;
  const info = category ? (colorimetry as any)[category] : null;
  useEffect(() => {
    try {
      const emailLS =
        localStorage.getItem("idony_email") || localStorage.getItem("klaviyo_email");
      if (emailLS) setStoredEmail(emailLS);
    } catch {
      /* ignore */
    }
  }, []);

  // If we already have an email (from previous step), immediately show results
  const [showResults, setShowResults] = useState<boolean>(false);

  // Initialize showResults based on stored email
  useEffect(() => {
    try {
      const emailLS =
        localStorage.getItem("idony_email") || localStorage.getItem("klaviyo_email");
      setShowResults(!!emailLS);
      if (emailLS) setStoredEmail(emailLS);
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
  // Send ColorimetryCompleted to Klaviyo once we have email + results and the user can see results
  // ✅ Send ColorimetryCompleted event once when results + email are ready
  useEffect(() => {
    if (!showResults || !palette?.season || !storedEmail || sentCompleted) return;

    const infoLocal = (colorimetry as any)[palette.season] || {};
    const productsLocal =
      infoLocal?.recommended_products?.map((p: any) => ({
        title: p.title,
        handle: p.handle,
        image: p.image,
        url: `https://idonycosmetics.com/products/${p.handle}`,
      })) || [];

    const payload = {
      email: storedEmail,
      event: "ColorimetryCompleted",
      properties: {
        season: palette.season,
        description: infoLocal?.description,
        comments: infoLocal?.comments,
        recommended_colors: infoLocal?.recommended_colors,
        avoid_colors: infoLocal?.avoid_colors,
        palette: palette.swatches,
        products: productsLocal,
      },
    };

    console.log("📤 Sending /api/klaviyo/event:", payload);

    // 🚀 Fire Meta Pixel event for analytics
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "ColorimetryCompleted", {
        season: palette.season,
        description: infoLocal?.description,
        comments: infoLocal?.comments,
      });
      console.log("📡 Meta Pixel ColorimetryCompleted fired");
    }

    fetch("/api/klaviyo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        console.log("📩 /api/klaviyo/event status:", res.status);
        setSentCompleted(true);
        return res.text().catch(() => "");
      })
      .then((txt) => {
        if (txt) console.log("🧾 /api/klaviyo/event response:", txt);
      })
      .catch((err) => {
        console.error("❌ Error sending ColorimetryCompleted:", err);
      });
  }, [showResults, storedEmail, palette, sentCompleted]);

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
            <KlaviyoForm onSuccess={(email) => { setStoredEmail(email); setShowResults(true); }} />
          </div>
        </div>

      )}

      {/* RESULTS (hidden until form success) */}
      {showResults && (
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-0 flex flex-col justify-start min-h-screen">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-snug mb-4 text-center">
            AQUÍ TIENES TU ESTUDIO PERSONALIZADO
          </h2>
          {/* TITLE */}
          <h2 className="text-xl sm:text-xl font-black uppercase tracking-tight leading-relaxed mb-4">
            {category}
          </h2>

          {/* BODY */}
          <p className="text-sm sm:text-base leading-snug text-justify">{info.description}</p>
          <p className="text-sm sm:text-base leading-snug mt-1 text-justify">{info.comments}</p>

          <section className="mt-4">
            <h2 className="font-black text-base uppercase mb-1 tracking-tight">Tonos recomendados</h2>
            <p className="text-sm sm:text-base leading-snug text-justify">{info.recommended_colors}</p>
          </section>

          <section className="mt-3">
            <h2 className="font-black text-base uppercase mb-1 tracking-tight">Colores a evitar</h2>
            <p className="text-sm sm:text-base leading-snug text-justify">{info.avoid_colors}</p>
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
              Potencia tu colorimetría con:
            </h2>
              <div className="mb-6">
                <p className="text-[14px] sm:text-[10px] mt-1 uppercase italic leading-tight text-justify-left sm:text-left max-w-[90%] line-clamp-2">
                <span className="text-black-900">Tu pack personalizado con </span>
                <span className="text-red-700 font-bold">-20% de descuento</span>
                </p>
            </div>
            
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