// scripts/csv-to-json.ts
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type Row = Record<string, string>;

function splitList(s: string | undefined): string[] {
  if (!s) return [];
  // split on commas or newlines, trim, drop empties
  return s
    .split(/[,|\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractHexes(s: string | undefined): string[] {
  if (!s) return [];
  const matches = s.match(/#[0-9A-Fa-f]{3,6}/g);
  return matches ? matches.map((h) => h.toUpperCase()) : [];
}

function parseProducts(cell: string | undefined): { id: string; name: string }[] {
  if (!cell) return [];

  // Normalize: unify separators and spacing
  const normalized = cell
    .replace(/\r?\n/g, ",")
    .replace(/;/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/,+/g, ",")
    .trim();

  const parts = normalized.split(",");
  const results: { id: string; name: string }[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Find the first space: everything before = ID, after = name
    const firstSpace = trimmed.indexOf(" ");
    if (firstSpace === -1) continue; // skip malformed entries

    const id = trimmed.slice(0, firstSpace).trim();
    const name = trimmed.slice(firstSpace + 1).trim();

    if (id && name) {
      results.push({ id, name });
    }
  }

  if (results.length === 0) {
    console.warn("⚠️ No products parsed for cell:", cell);
  } else {
    console.log(`✅ Parsed ${results.length} products`);
  }

  return results;
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error(
      "Usage: npx ts-node scripts/csv-to-json.ts \"GUIA COLORIMETRIA IDONY - Sheet1 (2).csv\""
    );
    process.exit(1);
  }

  const csvPath = path.isAbsolute(inputArg)
    ? inputArg
    : path.join(process.cwd(), inputArg);

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const csvData = fs.readFileSync(csvPath, "utf8");

  const rows = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
    delimiter: ",",
  }) as Row[];

  const out: Record<
    string,
    {
      description: string;
      comments: string;
      recommended_colors: string;
      avoid_colors: string;
      recommended_products: { name: string; id: string }[];
      palette_description: string;
      swatches: string[];
    }
  > = {};

  for (const r of rows) {
    const categoria =
      r["Categoría"]?.trim() ||
      r["Categoria"]?.trim() ||
      r["Category"]?.trim();
    if (!categoria) continue;

    const descripcion =
      r["Descripción categoría"]?.trim() ||
      r["Descripcion categoria"]?.trim() ||
      r["Descripción"]?.trim() ||
      "";

    const comentarios =
      r["Comentarios de Idony"]?.trim() ||
      r["Comentarios"]?.trim() ||
      "";

    const coloresRecomendados =
      r["Colores recomendados"]?.trim() || r["Recomendados"]?.trim() || "";

    const coloresEvitar =
      r["Colores a evitar"]?.trim() || r["Evitar"]?.trim() || "";

    const productosNombres =
      r["Productos Idony recomendados"]?.trim() ||
      r["Productos IDONY recomendados"]?.trim() ||
      r["Productos recomendados"]?.trim() ||
      "";

    const paletteDescription =
      r["Color Palette (descriptiva)"]?.trim() ||
      r["Paleta descriptiva"]?.trim() ||
      "";

    const paletteStr = r["Color Palette"]?.trim() || r["Paleta"]?.trim() || "";

    const paletteHex =
      r["Color Palette (HEX solo)"]?.trim() ||
      r["Color Palette"]?.trim() ||
      "";
       
    const swatches = extractHexes(paletteStr);

    const recommended_products = parseProducts(productosNombres);

    out[categoria] = {
      description: descripcion,
      comments: comentarios,
      recommended_colors: coloresRecomendados,
      avoid_colors: coloresEvitar,
      recommended_products,
      swatches: extractHexes(paletteHex),
      palette_description: paletteDescription,
    };
  }

  const outPath = path.join(
    process.cwd(),
    "lib",
    "mapping",
    "colorimetry.json"
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ Generated ${outPath}`);
}

main();