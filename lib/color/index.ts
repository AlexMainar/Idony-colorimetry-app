import { converter } from "culori";
import colorimetry from "@/lib/mapping/colorimetry.json";

const toOklab = converter("oklab");

function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

export function averageRgb(pixels: Uint8ClampedArray): [number, number, number] {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    n++;
  }

  const avg: [number, number, number] = [r / n, g / n, b / n];
  return [clamp(avg[0]), clamp(avg[1]), clamp(avg[2])];
}

/**
 * Clasifica la piel en una de las 12 categorías usando OKLab
 */
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

  // --- Adjusted thresholds ---
  const NEUTRAL_BAND = 0.04;
  const WARM_BIAS = b_ > 0.05;
  const COOL_BIAS = b_ < -0.05;

  let warmthCategory: "warm" | "cool" | "neutral";
  if (a > NEUTRAL_BAND || WARM_BIAS) warmthCategory = "warm";
  else if (a < -NEUTRAL_BAND || COOL_BIAS) warmthCategory = "cool";
  else warmthCategory = "neutral";

  // --- Classification logic ---
  if (warmthCategory === "warm") {
    if (L > 0.7 && chroma > 0.13) return "Primavera Brillante";
    if (L > 0.65 && chroma <= 0.13) return "Primavera Clara";
    if (L <= 0.65 && chroma > 0.13) return "Primavera Cálida";
    return "Otoño Suave";
  }

  if (warmthCategory === "cool") {
    if (L > 0.7 && chroma > 0.13) return "Invierno Brillante";
    if (L > 0.65 && chroma <= 0.13) return "Verano Claro";
    if (L <= 0.65 && chroma > 0.13) return "Invierno Frío";
    if (L <= 0.65 && chroma <= 0.13) return "Invierno Profundo";
  }

  // Neutral fallback
  if (L > 0.65) return "Verano Suave";
  return "Otoño Suave";
}

// ---------------------
// NUEVO: ojos + cabello
// ---------------------

export type ColorOjos = "azules" | "grises" | "verdes" | "avellana" | "marrones" | "negros";
export type ColorCabello = "rubio" | "rubio-ceniza" | "castaño" | "negro" | "rojo" | "dorado";

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

  puntajes[familiaDesdeCategoria(catPiel)] += 0.4;
  puntajes[familiaDesdeOjos(ojos)] += 0.3;
  puntajes[familiaDesdeCabello(cabello)] += 0.3;

  let ganador: "Primavera" | "Verano" | "Otoño" | "Invierno" = "Verano";
  let max = -1;
  for (const fam of Object.keys(puntajes) as (keyof typeof puntajes)[]) {
    if (puntajes[fam] > max) {
      ganador = fam;
      max = puntajes[fam];
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
  if (["rubio", "dorado", "rojo"].includes(cabello)) chroma = "Bright";
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