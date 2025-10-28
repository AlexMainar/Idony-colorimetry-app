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
  const mean = (r + g + b) / 3;

  // ✅ If lighting is within a normal range, skip correction
  if (mean > 35 && mean < 200) {
    return [r, g, b];
    const k = 0.2; // gentler than 0.25
    const target = 128;
    const adj = (v: number) => Math.max(0, Math.min(255, v + (target - mean) * k));
    return [adj(r), adj(g), adj(b)] as [number, number, number];
  }

  // ✅ Apply mild normalization only for poor lighting
  const correctionFactor = 0.25;
  const adjusted = [r, g, b].map(v => v + (128 - mean) * correctionFactor);

  // Clamp values to 0–255
  return adjusted.map(v => Math.max(0, Math.min(255, v))) as [number, number, number];
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

  // --- Undertone detection (better than hueAngle only) ---
  let warmthCategory: "warm" | "cool" | "neutral" = "neutral";
  const rgRatio = r / Math.max(1, g);
  const rbDiff = r - b;

  // explicit neutral band + olive (g≥r and g≥b with decent brightness)
  const isOlive = g >= r && g >= b && (r + g + b) / 3 > 60;

  if (rgRatio > 1.12 && rbDiff > 6) warmthCategory = "warm";
  else if (rgRatio < 0.92 && b > r + 6) warmthCategory = "cool";
  else if (isOlive) warmthCategory = "warm";
  else warmthCategory = "neutral";

  // --- Chroma detection (muted vs bright): use RGB variance ---
  const m = (r + g + b) / 3;
  const varRGB = ((r - m) ** 2 + (g - m) ** 2 + (b - m) ** 2) / 3;
  const stdRGB = Math.sqrt(varRGB);
  // normalize by brightness so dark faces don’t look “muted” by default
  const chromaNorm = stdRGB / Math.max(1, m);
  const chromaLevel = chromaNorm < 0.22 ? "soft" : "bright";

  // --- Depth detection ---
  const L_norm = Math.min(1, Math.max(0, (L - 0.28) / 0.55)); // 0.25–0.8 normalized

  // 🧠 Refined classification logic
  if (warmthCategory === "warm") {
    if (L_norm < 0.35) return chromaLevel === "bright" ? "Otoño Profundo" : "Otoño Suave";
    if (L_norm < 0.55) return "Otoño Suave";
    if (L_norm < 0.7) return "Primavera Cálida";
    return "Primavera Clara";
  }

  if (warmthCategory === "cool") {
    if (L_norm < 0.35) return "Invierno Profundo";
    if (L_norm < 0.55) return "Verano Suave";
    if (L_norm < 0.7) return "Verano Claro";
    return "Invierno Brillante";
  }

  // Neutral fallback
  if (L_norm < 0.4) return "Otoño Suave";
  if (L_norm < 0.6) return "Verano Suave";
  return "Primavera Clara";

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