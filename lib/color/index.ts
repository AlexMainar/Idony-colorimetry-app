import { converter } from "culori";
import colorimetry from "@/lib/mapping/colorimetry.json";

const toOklab = converter("oklab");



export function averageRgb(pixels: Uint8ClampedArray): [number, number, number] {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    n++;
  }

  let avg: [number, number, number] = [r / n, g / n, b / n];

  // ✅ Normalize for exposure (gray-world assumption)
  const grayMean = (avg[0] + avg[1] + avg[2]) / 3;
  avg = [
    Math.min(255, (avg[0] / grayMean) * 128),
    Math.min(255, (avg[1] / grayMean) * 128),
    Math.min(255, (avg[2] / grayMean) * 128),
  ];

  // ✅ Gamma correction
  const corrected = avg.map(v => Math.pow(v / 255, 2.2)) as [number, number, number];

  return [
    Math.max(0, Math.min(255, corrected[0] * 255)),
    Math.max(0, Math.min(255, corrected[1] * 255)),
    Math.max(0, Math.min(255, corrected[2] * 255)),
  ];
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

/**
 * Normalize lighting and white balance for skin detection.
 *  - Removes warm/yellow indoor bias
 *  - Scales exposure so average brightness ~ midtone
 */
export function normalizeLighting([r, g, b]: [number, number, number]): [number, number, number] {
  // Convert to linear light space
  const lin = [r, g, b].map(v => Math.pow(v / 255, 2.2));

  // Avoid invalid NaNs
  if (lin.some(v => isNaN(v))) return [r, g, b];

  // Compute brightness (exposure)
  const brightness = (lin[0] + lin[1] + lin[2]) / 3;

  // White balance adjustments
  const rgRatio = lin[0] / (lin[1] + 1e-6);
  const bgRatio = lin[2] / (lin[1] + 1e-6);

  // Fine-tuned correction for iPhone warm bias
  const redCorr = rgRatio > 1.1 ? 0.9 / rgRatio : 1;
  const blueCorr = bgRatio < 0.95 ? 1.1 / bgRatio : 1;

  // Exposure normalization (bring average brightness near 0.55)
  const exposure = 0.55 / Math.max(0.1, brightness);

  // Apply corrections
  const corrected = [
    Math.min(1, lin[0] * exposure * redCorr),
    Math.min(1, lin[1] * exposure),
    Math.min(1, lin[2] * exposure * blueCorr),
  ];

  // Convert back to gamma-encoded sRGB
  const srgb = corrected.map(v => Math.pow(v, 1 / 2.2) * 255);

  // Clamp + ensure valid numbers
  return srgb.map(v => Math.max(0, Math.min(255, v))) as [number, number, number];
}

export function classifyCategoryFromSkinRGB(
  [r, g, b]: [number, number, number]
):
  | "Primavera Brillante"
  | "Primavera Cálida"
  | "Primavera Clara"
  | "Invierno Brillante"
  | "Invierno Frío"
  | "Invierno Profundo"
  | "Verano Claro"
  | "Verano Frío"
  | "Verano Suave"
  | "Otoño Suave"
  | "Otoño Cálido"
  | "Otoño Profundo" {



  const lab = toOklab({
    mode: "rgb",
    r: r / 255,
    g: g / 255,
    b: b / 255,
  }) as any;

  const L = lab.L; // lightness
  const a = lab.a; // green ↔ red
  const b_ = lab.b; // blue ↔ yellow
  const chroma = Math.sqrt(a * a + b_ * b_);
  const hueAngle = Math.atan2(b_, a) * (180 / Math.PI); // -180° to +180°

  let warmthCategory: "warm" | "cool" | "neutral";
  if (hueAngle > 25 && hueAngle < 135) warmthCategory = "warm";
  else if (hueAngle < -25 && hueAngle > -135) warmthCategory = "cool";
  else warmthCategory = "neutral";

  // --- Normalized lightness ---
  const L_norm = Math.min(1, Math.max(0, (L - 0.3) / 0.5)); // scales 0.3–0.8 → 0–1

  // 🧩 DEBUG OUTPUT (safe guard)
  console.log("🎨 Skin metrics →", {
    RGB: [r?.toFixed?.(1) ?? "?", g?.toFixed?.(1) ?? "?", b?.toFixed?.(1) ?? "?"],
    OKLab: {
      L: typeof L === "number" ? L.toFixed(3) : "?",
      a: typeof a === "number" ? a.toFixed(3) : "?",
      b: typeof b_ === "number" ? b_.toFixed(3) : "?",
    },
    chroma: typeof chroma === "number" ? chroma.toFixed(3) : "?",
    hueAngle: typeof hueAngle === "number" ? hueAngle.toFixed(1) : "?",
    warmthCategory,
    L_norm: typeof L_norm === "number" ? L_norm.toFixed(3) : "?",
  });

  // --- Classification logic ---
  if (warmthCategory === "warm") {
    if (L_norm > 0.75 && chroma > 0.14) return "Primavera Brillante";
    if (L_norm > 0.6) return "Primavera Clara";
    if (L_norm > 0.4 && chroma > 0.12) return "Otoño Cálido";
    if (L_norm < 0.35) return "Otoño Profundo";
    return "Otoño Suave";
  }

  if (warmthCategory === "cool") {
    if (L_norm > 0.75 && chroma > 0.14) return "Invierno Brillante";
    if (L_norm > 0.6) return "Verano Claro";
    if (L_norm > 0.4 && chroma > 0.12) return "Invierno Frío";
    if (L_norm < 0.35) return "Invierno Profundo";
    return "Verano Suave";
  }

  // ✅ Neutral fallback — no longer biased to Otoño
  if (L_norm > 0.7) return "Primavera Clara";
  if (L_norm > 0.55) return "Verano Suave";
  if (L_norm > 0.4) return "Invierno Frío";
  return "Otoño Suave";
}

// ---------------------
// NUEVO: ojos + cabello
// ---------------------

export type ColorOjos = "azules" | "grises" | "verdes" | "avellana" | "marrones" | "negros";
export type ColorCabello = "rubio" | "rubio-ceniza" | "castaño" | "negro" | "rojo" | "blanco" | "dorado";

export function familiaDesdeCategoria(cat: string): "Primavera" | "Verano" | "Otoño" | "Invierno" {
  if (cat.startsWith("Primavera")) return "Primavera";
  if (cat.startsWith("Verano")) return "Verano";
  if (cat.startsWith("Otoño")) return "Otoño";
  if (cat.startsWith("Invierno")) return "Invierno";
  return "Verano";
}

export function familiaDesdeOjos(ojos: ColorOjos): "Primavera" | "Verano" | "Otoño" | "Invierno" {
  switch (ojos) {
    case "azules":
    case "grises":
      return "Verano";
    case "verdes":
    case "avellana":
      return "Primavera";
    case "marrones":
    case "negros":
      return "Invierno";
    default:
      return "Verano";
  }
}

export function familiaDesdeCabello(cabello: ColorCabello): "Primavera" | "Verano" | "Otoño" | "Invierno" {
  switch (cabello) {
    case "rubio":
    case "rubio-ceniza":
      return "Verano";
    case "castaño":
    case "negro":
      return "Invierno";
    case "rojo":
    case "dorado":
      return "Otoño";
    default:
      return "Verano";
  }
}

export function familiaFinal(catPiel: string, ojos: ColorOjos, cabello: ColorCabello) {
  const puntajes = { Primavera: 0, Verano: 0, Otoño: 0, Invierno: 0 };

  const baseFam = familiaDesdeCategoria(catPiel);
  const isNeutralSkin = ["Verano Suave", "Otoño Suave"].includes(catPiel);

  puntajes[baseFam] += 0.5;
  puntajes[familiaDesdeOjos(ojos)] += isNeutralSkin ? 0.25 : 0.3;
  puntajes[familiaDesdeCabello(cabello)] += isNeutralSkin ? 0.25 : 0.2;

  let ganador: keyof typeof puntajes = "Verano";
  let max = -1;
  for (const fam in puntajes) {
    if (puntajes[fam as keyof typeof puntajes] > max) {
      ganador = fam as keyof typeof puntajes;
      max = puntajes[ganador];
    }
  }
  return ganador;
}

export function refinarCategoria(catPiel: string, ojos: ColorOjos, cabello: ColorCabello): string {
  const fam = familiaDesdeCategoria(catPiel);
  console.log("Base family from skin:", fam);

  // Eyes → depth
  let depth: "Light" | "Deep" | "Soft" = "Soft";
  if (["azules", "grises", "verdes"].includes(ojos)) depth = "Light";
  else if (["marrones", "negros"].includes(ojos)) depth = "Deep";
  else if (ojos === "avellana") depth = "Soft";
  console.log("Depth from eyes:", ojos, "=>", depth);

  // Hair → chroma
  let chroma: "Bright" | "Soft" = "Soft";
  if (["rubio", "dorado", "rojo", "blanco"].includes(cabello)) chroma = "Bright";
  else if (["rubio-ceniza", "castaño", "negro"].includes(cabello)) chroma = "Soft";
  console.log("Chroma from hair:", cabello, "=>", chroma);

  // Map fam + depth + chroma
  let result: string;
  switch (fam) {
    case "Primavera":
      if (depth === "Light") result = "Primavera Clara";
      else if (chroma === "Bright") result = "Primavera Brillante";
      else result = "Primavera Cálida";
      break;
    case "Verano":
      if (depth === "Light") result = "Verano Claro";
      else if (chroma === "Soft") result = "Verano Suave";
      else result = "Verano Frío";
      break;
    case "Otoño":
      if (depth === "Deep") result = "Otoño Profundo";
      else if (chroma === "Soft") result = "Otoño Suave";
      else result = "Otoño Cálido";
      break;
    case "Invierno":
      if (depth === "Deep") result = "Invierno Profundo";
      else if (chroma === "Bright") result = "Invierno Brillante";
      else result = "Invierno Frío";
      break;
    default:
      result = "Verano Frío";
  }

  console.log("Final refined category:", result);
  return result;
}

/**
 * Devuelve la paleta (swatches) de una categoría desde colorimetry.json
 */
export function paletteForSeason(category: string): string[] {
  return (colorimetry as any)[category]?.swatches || [];
}