import { converter } from "culori";
import colorimetry from "@/lib/mapping/colorimetry.json";


type ColorimetryMap = Record<
  string,
  {
    swatches: string[];
    description?: string;
    comments?: string;
    recommended_colors?: string;
    avoid_colors?: string;
    recommended_products?: { id?: string; title?: string; handle?: string; image?: string }[];
  }
>;

const colorimetryTyped = colorimetry as ColorimetryMap;

// --- Converters ---
const toOklab = converter("oklab");
const GAMMA = 2.2;

const clamp = (v: number) => Math.max(0, Math.min(255, v));
const srgbToLinear = (v: number) => Math.pow(v / 255, GAMMA);
const linearToSrgb = (v: number) => Math.pow(Math.max(v, 0), 1 / GAMMA) * 255;
const meanChannel = ([r, g, b]: [number, number, number]) => (r + g + b) / 3;


// -----------------------------
// Utilities
// -----------------------------
export function averageRgb(pixels: Uint8ClampedArray): [number, number, number] {
  let rLin = 0, gLin = 0, bLin = 0, n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    rLin += srgbToLinear(pixels[i]);
    gLin += srgbToLinear(pixels[i + 1]);
    bLin += srgbToLinear(pixels[i + 2]);
    n++;
  }
  const avgLinear: [number, number, number] = [rLin / n, gLin / n, bLin / n];
  // Convert back to display sRGB so thresholds remain meaningful
  const corrected = avgLinear.map(linearToSrgb) as [number, number, number];
  return [clamp(corrected[0]), clamp(corrected[1]), clamp(corrected[2])];
}

export function normalizeLighting([r, g, b]: [number, number, number]): [number, number, number] {
  const mean = meanChannel([r, g, b]);
  if (mean > 35 && mean < 200) {
    const k = 0.35;
    const target = 128;
    const adj = (v: number) => clamp(v + (target - mean) * k);
    return [adj(r), adj(g), adj(b)];
  }
  const k = 0.25;
  const target = 128;
  const adj = (v: number) => clamp(v + (target - mean) * k);
  return [adj(r), adj(g), adj(b)];
}

//-----------------------------
// Core classifier
// -----------------------------
type AnchorSample = { rgb: [number, number, number]; label: string };
export type ClassificationResult = { label: string; confidence: number };

const colorAnchors: AnchorSample[] = [
  // 🌸 Primavera (base set)
  { rgb: [230, 200, 185], label: "Primavera Clara" },
  { rgb: [215, 160, 120], label: "Primavera Cálida" },
  { rgb: [245, 180, 120], label: "Primavera Brillante" },
  // 🌊 Verano
  { rgb: [195, 185, 200], label: "Verano Claro" },
  { rgb: [170, 155, 160], label: "Verano Suave" },
  { rgb: [150, 160, 190], label: "Verano Frío" },
  { rgb: [160, 150, 175], label: "Verano Suave" },
  { rgb: [140, 150, 190], label: "Verano Frío" },
  // 🍁 Otoño
  { rgb: [155, 115, 90], label: "Otoño Suave" },
  { rgb: [175, 105, 70], label: "Otoño Cálido" },
  { rgb: [120, 65, 50], label: "Otoño Profundo" },
  { rgb: [90, 45, 35], label: "Otoño Profundo" },
  // ❄️ Invierno
  { rgb: [150, 160, 200], label: "Invierno Brillante" },
  { rgb: [110, 130, 180], label: "Invierno Frío" },
  { rgb: [80, 60, 70], label: "Invierno Profundo" },
  { rgb: [90, 100, 150], label: "Invierno Frío" },
  // 🧪 Validated samples
  { rgb: [107, 50, 33], label: "Otoño Cálido" },
  { rgb: [132, 74, 57], label: "Primavera Cálida" },
  { rgb: [180, 175, 170], label: "Primavera Clara" },
  { rgb: [120, 130, 160], label: "Verano Suave" },
  { rgb: [90, 70, 60], label: "Otoño Suave" },
  { rgb: [200, 170, 160], label: "Primavera Clara" },
  // ➕ Additional warm anchors
  { rgb: [150, 90, 65], label: "Otoño Cálido" },
  { rgb: [165, 110, 80], label: "Otoño Cálido" },
  { rgb: [170, 110, 85], label: "Primavera Cálida" },
  { rgb: [185, 130, 100], label: "Primavera Cálida" },
  { rgb: [200, 150, 120], label: "Primavera Cálida" },
  { rgb: [150, 100, 80], label: "Primavera Cálida" },
  { rgb: [145, 100, 80], label: "Otoño Cálido" },
  // ➕ Additional cool anchors
  { rgb: [155, 145, 165], label: "Verano Suave" },
  { rgb: [215, 210, 235], label: "Verano Claro" },
  { rgb: [70, 55, 85], label: "Invierno Profundo" },
  { rgb: [120, 100, 140], label: "Verano Frío" },
  { rgb: [90, 80, 120], label: "Invierno Frío" },
  { rgb: [40, 50, 90], label: "Invierno Profundo" },
  { rgb: [40, 30, 20], label: "Otoño Profundo" },
  { rgb: [200, 180, 190], label: "Primavera Clara" },
  { rgb: [190, 160, 130], label: "Primavera Clara" },
];

const dist = (a: number[], b: number[]) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const normalizeByLuminance = (rgb: [number, number, number]) => {
  const mean = meanChannel(rgb) || 1;
  return rgb.map(ch => ch / mean) as [number, number, number];
};

const brightnessOf = (rgb: [number, number, number]) => meanChannel(rgb) / 255;
const lightnessOf = (rgb: [number, number, number]) => {
  const lab = toOklab({
    mode: "rgb",
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  }) as { l?: number } | null;
  return lab?.l ?? brightnessOf(rgb);
};

const preparedAnchors = colorAnchors.map(a => ({
  ...a,
  normalized: normalizeByLuminance(a.rgb),
  brightness: brightnessOf(a.rgb),
  lightness: lightnessOf(a.rgb),
}));

const LIGHTNESS_WEIGHT = 0.55;
const BRIGHTNESS_WEIGHT = 0.2;

export function classifyCategoryFromSkinRGB(rgb: [number, number, number]): ClassificationResult {
  const normalizedInput = normalizeByLuminance(rgb);
  const inputBrightness = brightnessOf(rgb);
  const inputLightness = lightnessOf(rgb);

  const distances = preparedAnchors
    .map(a => {
      const chromaDist = dist(normalizedInput, a.normalized);
      const lightnessDelta = Math.abs(inputLightness - a.lightness);
      const brightnessDelta = Math.abs(inputBrightness - a.brightness);
      const chromaPenalty =
        normalizedInput[2] >= normalizedInput[1] && a.label.startsWith("Primavera") ? 0.01 : 0;
      const weightedDistance =
        chromaDist + lightnessDelta * LIGHTNESS_WEIGHT +
        brightnessDelta * BRIGHTNESS_WEIGHT + chromaPenalty;
      return { label: a.label, d: weightedDistance };
    })
    .sort((a, b) => a.d - b.d);

  const top3 = distances.slice(0, 3);
  const weighted = new Map<string, number>();
  top3.forEach(({ label, d }) => {
    const w = 1 / (d + 1e-6);
    weighted.set(label, (weighted.get(label) || 0) + w);
  });

  let bestLabel = Array.from(weighted.entries()).sort((a, b) => b[1] - a[1])[0][0];

  // --- bias corrections ---
  const warmDominance = normalizedInput[0] - normalizedInput[2];
  const blueDominance = normalizedInput[2] - Math.max(normalizedInput[0], normalizedInput[1]);

  if (
    bestLabel === "Otoño Cálido" &&
    warmDominance >= 0.06 &&
    inputBrightness >= 0.43 &&
    inputLightness >= 0.43 &&
    rgb[2] >= 70 &&
    rgb[1] <= 105 &&
    rgb[0] <= 190
  ) {
    bestLabel = "Primavera Cálida";
  }

  if (bestLabel === "Primavera Cálida" && rgb[0] >= 170 && rgb[2] <= 75) {
    bestLabel = "Otoño Cálido";
  }

  if (bestLabel === "Otoño Suave" && warmDominance > 0.07 && inputBrightness >= 0.5) {
    bestLabel = "Otoño Cálido";
  }

  if (bestLabel === "Primavera Clara" && inputBrightness > 0.82 && blueDominance >= 0.02) {
    bestLabel = "Verano Claro";
  }

  if (bestLabel === "Primavera Cálida" && warmDominance < 0.03 && blueDominance >= 0.03) {
    bestLabel = "Verano Suave";
  }

  if (
    bestLabel.startsWith("Primavera") &&
    blueDominance >= 0.05 &&
    inputBrightness <= 0.7
  ) {
    bestLabel = "Verano Frío";
  }

  if (
    bestLabel === "Primavera Cálida" &&
    inputBrightness > 0.65 &&
    warmDominance < 0.05
  ) {
    bestLabel = "Primavera Clara";
  }

  if (bestLabel.startsWith("Invierno") && warmDominance > 0.02 && blueDominance < 0.01) {
    bestLabel = "Verano Frío";
  }

  if (bestLabel === "Invierno Profundo" && inputBrightness >= 0.32 && blueDominance < 0.04) {
    bestLabel = "Invierno Frío";
  }

  if (bestLabel.includes("Profundo") && inputBrightness > 0.58) {
    if (bestLabel.startsWith("Invierno")) {
      bestLabel = "Invierno Brillante";
    }
  }

  if (inputBrightness < 0.22) {
    bestLabel = warmDominance > 0 ? "Otoño Profundo" : "Invierno Profundo";
  }

  const totalWeight = Array.from(weighted.values()).reduce((sum, w) => sum + w, 0);
  const bestWeight = weighted.get(bestLabel) ?? 0;
  const confidence = totalWeight ? bestWeight / totalWeight : 0;

  return { label: bestLabel, confidence };
}

// ✅ Optional: expose for console testing
// @ts-ignore
if (typeof window !== "undefined") window.classifyCategoryFromSkinRGB = classifyCategoryFromSkinRGB;

// -----------------------------
// Eyes/Hair refinement
// -----------------------------
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
    case "dorado":
    case "rojo":
    case "blanco":
      return "Primavera";
    case "rubio-ceniza":
      return "Verano";
    case "castaño":
    case "negro":
      return "Invierno";
    default:
      return "Verano";
  }
}

export function refinarCategoria(catPiel: string, ojos: ColorOjos, cabello: ColorCabello): string {
  const fam = familiaDesdeCategoria(catPiel);

  // Eyes → depth
  let depth: "Light" | "Deep" | "Soft" = "Soft";
  if (["azules", "grises", "verdes"].includes(ojos)) depth = "Light";
  else if (["marrones", "negros"].includes(ojos)) depth = "Deep";
  else if (ojos === "avellana") depth = "Soft";

  // Hair → chroma
  let chroma: "Bright" | "Soft" = "Soft";
  if (["rubio", "dorado", "rojo", "blanco"].includes(cabello)) chroma = "Bright";
  else if (["rubio-ceniza", "castaño", "negro"].includes(cabello)) chroma = "Soft";

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
    case "Otoño": {
      const deepEyes = ["marrones", "negros"].includes(ojos);
      const deepHair = ["castaño", "negro"].includes(cabello);
      const veryDeep = deepEyes && deepHair;

      if (depth === "Deep") {
        // Deep + warm:
        // bright → Otoño Cálido; soft → Profundo only if eyes+hair are very deep, else Suave
        result = chroma === "Bright" ? "Otoño Cálido" : (veryDeep ? "Otoño Profundo" : "Otoño Suave");
      } else {
        // Not deep
        result = chroma === "Bright" ? "Otoño Cálido" : "Otoño Suave";
      }
      break;
    }

    case "Invierno": {
      const deepEyes = ["marrones", "negros"].includes(ojos);
      const deepHair = ["castaño", "negro"].includes(cabello);
      const veryDeep = deepEyes && deepHair;

      if (depth === "Deep") {
        // Deep + cool:
        // bright → Invierno Brillante; soft → Profundo only if eyes+hair are very deep, else Verano Suave
        result = chroma === "Bright" ? "Invierno Brillante" : (veryDeep ? "Invierno Profundo" : "Verano Suave");
      } else {
        // Not deep
        result = chroma === "Bright" ? "Invierno Brillante" : "Verano Claro";
      }
      break;
    }
  }

  return result;
}

/**
 * Devuelve la paleta (swatches) de una categoría desde colorimetry.json
 */
export function paletteForSeason(category: string): string[] {
  return colorimetryTyped[category]?.swatches || [];
}

// ✅ TEMPORARY — expose classifier to browser console for debugging
declare global {
  interface Window {
    classifyCategoryFromSkinRGB?: typeof classifyCategoryFromSkinRGB;
  }
}

if (typeof window !== "undefined") {
  window.classifyCategoryFromSkinRGB = classifyCategoryFromSkinRGB;
}
