// app/result/page.tsx
"use client";

import { useAppStore } from "@/lib/store";
import Link from "next/link";
import colorimetry from "@/lib/mapping/colorimetry.json";
import { paletteForSeason } from "@/lib/color";
import { motion } from "framer-motion";

export default function ResultPage() {
  const palette = useAppStore((s) => s.palette);

  if (!palette) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center text-center bg-white text-neutral-800">
        <div>
          <p className="mb-4 text-lg">Aún no has realizado tu análisis.</p>
          <Link
            href="/analyze"
            className="inline-block rounded-xl border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-100 transition"
          >
            Realizar análisis
          </Link>
        </div>
      </main>
    );
  }

  const category = palette.season;
  const info = (colorimetry as any)[category];

  if (!info) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center text-center bg-white text-neutral-800">
        <div>
          <p className="mb-4 text-lg">
            No hay datos disponibles para la categoría:{" "}
            <span className="font-semibold">{category}</span>
          </p>
          <Link
            href="/analyze"
            className="inline-block rounded-xl border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-100 transition"
          >
            Volver a analizar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col bg-white text-neutral-800">
      {/* Header */}
      <header className="w-full flex justify-start px-6 py-4">
        <img
          src="/Logos-01.svg"
          alt="Idony logo"
          className="w-40 h-auto opacity-90"
        />
      </header>

      {/* Main content */}
      <section className="flex flex-col items-center px-6 pb-16 text-center space-y-8 animate-fadeIn">
        <div>
          <h2 className="text-sm uppercase tracking-widest text-neutral-500">
            Tu análisis de colorimetría
          </h2>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-black mt-2 text-[#D94E37]"
          >
            {category}
          </motion.h1>
        </div>

        <motion.p
          className="max-w-md text-neutral-600 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {info.description}
        </motion.p>

        {/* Swatches */}
        <motion.div
          className="grid grid-cols-5 gap-2 mt-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { delayChildren: 0.3, staggerChildren: 0.1 },
            },
          }}
        >
          {paletteForSeason(category).map((hex: string) => (
            <motion.div
              key={hex}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="aspect-square rounded-xl border shadow-sm"
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </motion.div>

        {/* Info sections */}
        <div className="max-w-lg text-left space-y-6 mt-10">
          <div>
            <h3 className="font-semibold text-[#D94E37] mb-1">
              Tonos recomendados
            </h3>
            <p className="text-neutral-700 text-sm leading-relaxed">
              {info.recommended_colors}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#D94E37] mb-1">
              Colores a evitar
            </h3>
            <p className="text-neutral-700 text-sm leading-relaxed">
              {info.avoid_colors}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#D94E37] mb-1">
              Productos IDONY recomendados
            </h3>
              <ul className="space-y-1 text-sm text-neutral-700">
                {info.recommended_products.map((p: any) => (
                  <li key={p.id}>• {p.name}</li>
                ))}
              </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link
          href="/analyze"
          className="rounded-xl border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-100 transition">
          Volver a analizar
          </Link>

          {info.recommended_products && info.recommended_products.length > 0 && (
            <Link
              href={`https://2f16be.myshopify.com/cart/${info.recommended_products
                .map((p: any) => `${p.id}:1`)
                .join(",")}?utm_source=colorimetry`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#D94E37] text-white px-6 py-3 text-sm font-medium hover:opacity-90 transition"
            >
              Ver productos sugeridos
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}