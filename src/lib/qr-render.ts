// Styled QR SVG renderer — pure TypeScript, no Node APIs, so it runs both
// server-side (exports) and client-side (live previews).
import QRCode from "qrcode";

export const MODULE_SHAPES = [
  "square",
  "rounded",
  "dots",
  "classy",
  "classy-rounded",
  "extra-rounded",
] as const;
export type ModuleShape = (typeof MODULE_SHAPES)[number];

export const SHAPE_LABELS: Record<ModuleShape, string> = {
  square: "Square",
  rounded: "Rounded",
  dots: "Dots",
  classy: "Classy",
  "classy-rounded": "Classy R.",
  "extra-rounded": "Extra R.",
};

type RenderOptions = {
  fg?: string;
  bg?: string;
  ecLevel?: string;
  shape?: string;
  /** Logo must be pre-inlined as a data: URL — external hrefs don't load in
   *  <img>-embedded SVGs or in sharp. */
  logoDataUrl?: string | null;
  /** Pixel size written to the svg width/height attributes. */
  size?: number;
};

const MARGIN = 2;

const clampShape = (s?: string): ModuleShape =>
  (MODULE_SHAPES as readonly string[]).includes(s ?? "") ? (s as ModuleShape) : "square";

const level = (ec?: string) =>
  (["L", "M", "Q", "H"].includes(ec ?? "") ? ec : "M") as "L" | "M" | "Q" | "H";

/** Rounded-rect path with per-corner radii (unit cell at x,y). */
function cellPath(
  x: number,
  y: number,
  w: number,
  h: number,
  [tl, tr, br, bl]: [number, number, number, number]
): string {
  return (
    `M${x + tl},${y}` +
    `h${w - tl - tr}` +
    (tr ? `a${tr},${tr} 0 0 1 ${tr},${tr}` : "") +
    `v${h - tr - br}` +
    (br ? `a${br},${br} 0 0 1 ${-br},${br}` : "") +
    `h${-(w - br - bl)}` +
    (bl ? `a${bl},${bl} 0 0 1 ${-bl},${-bl}` : "") +
    `v${-(h - bl - tl)}` +
    (tl ? `a${tl},${tl} 0 0 1 ${tl},${-tl}` : "") +
    "z"
  );
}

export function renderQrSvg(content: string, opts: RenderOptions = {}): string {
  const fg = opts.fg ?? "#111827";
  const bg = opts.bg ?? "#FFFFFF";
  const shape = clampShape(opts.shape);
  // A centered logo hides modules — always render with maximum error correction.
  const ec = opts.logoDataUrl ? "H" : level(opts.ecLevel);
  const size = opts.size ?? 1024;

  const qr = QRCode.create(content, { errorCorrectionLevel: ec });
  const n = qr.modules.size;
  const total = n + MARGIN * 2;

  const finders: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  const inFinder = (r: number, c: number) =>
    finders.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);

  const dark = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < n && c < n && !inFinder(r, c) && !!qr.modules.get(r, c);

  // --- data modules ---
  const paths: string[] = [];
  const circles: string[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue;
      const x = c + MARGIN;
      const y = r + MARGIN;

      if (shape === "square") {
        paths.push(cellPath(x, y, 1, 1, [0, 0, 0, 0]));
        continue;
      }
      if (shape === "dots") {
        // r must stay close to 0.5 — smaller dots darken too little of each
        // module and strict decoders fail to binarize the grid.
        circles.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.48"/>`);
        continue;
      }

      const up = dark(r - 1, c);
      const down = dark(r + 1, c);
      const left = dark(r, c - 1);
      const right = dark(r, c + 1);

      let radii: [number, number, number, number];
      if (shape === "rounded" || shape === "extra-rounded") {
        const rad = shape === "rounded" ? 0.38 : 0.5;
        radii = [
          !up && !left ? rad : 0,
          !up && !right ? rad : 0,
          !down && !right ? rad : 0,
          !down && !left ? rad : 0,
        ];
      } else {
        // classy / classy-rounded: leaf shape — strong rounding on the
        // top-left & bottom-right diagonal, optional soft opposite corners.
        const soft = shape === "classy-rounded" ? 0.24 : 0;
        radii = [
          !up && !left ? 0.5 : 0,
          !up && !right ? soft : 0,
          !down && !right ? 0.5 : 0,
          !down && !left ? soft : 0,
        ];
      }
      paths.push(cellPath(x, y, 1, 1, radii));
    }
  }

  // --- finder eyes: extra-rounded frame + rounded ball (sharp for square) ---
  const eyeParts: string[] = [];
  const frameR = shape === "square" ? 0 : 2.2;
  const innerR = shape === "square" ? 0 : 1.5;
  const ballR = shape === "square" ? 0 : shape === "dots" ? 1.5 : 1.1;
  for (const [fr, fc] of finders) {
    const x = fc + MARGIN;
    const y = fr + MARGIN;
    eyeParts.push(
      `<rect x="${x}" y="${y}" width="7" height="7" rx="${frameR}" fill="${fg}"/>`,
      `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="${innerR}" fill="${bg}"/>`,
      shape === "dots"
        ? `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${fg}"/>`
        : `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${ballR}" fill="${fg}"/>`
    );
  }

  // --- centered logo with a bg knockout so it stays readable ---
  let logo = "";
  if (opts.logoDataUrl) {
    const logoSize = total * 0.22;
    const pad = logoSize * 0.12;
    const lx = (total - logoSize) / 2;
    logo =
      `<rect x="${lx - pad}" y="${lx - pad}" width="${logoSize + pad * 2}" height="${logoSize + pad * 2}" rx="${(logoSize + pad * 2) * 0.18}" fill="${bg}"/>` +
      `<image x="${lx}" y="${lx}" width="${logoSize}" height="${logoSize}" href="${opts.logoDataUrl}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="geometricPrecision">` +
    `<rect width="${total}" height="${total}" fill="${bg}"/>` +
    (paths.length ? `<path d="${paths.join("")}" fill="${fg}"/>` : "") +
    (circles.length ? `<g fill="${fg}">${circles.join("")}</g>` : "") +
    eyeParts.join("") +
    logo +
    `</svg>`
  );
}

/** Alignment-pattern center coordinates (mirrors the node-qrcode algorithm). */
function alignmentCoords(version: number, size: number): number[] {
  if (version === 1) return [];
  const posCount = Math.floor(version / 7) + 2;
  const intervals =
    size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
  const positions = [size - 7];
  for (let i = 1; i < posCount - 1; i++) {
    positions[i] = positions[i - 1] - intervals;
  }
  positions.push(6);
  return positions.reverse();
}

/** Halftone "photo QR": the user's image fills the code, every data module is
 *  reduced to a small center dot (dark or light) that scanners sample, and
 *  function patterns (finders, timing, alignment) stay full-strength. Always
 *  rendered at error-correction H. */
export function renderHalftoneQrSvg(
  content: string,
  opts: {
    imageDataUrl: string;
    fg?: string;
    bg?: string;
    logoDataUrl?: string | null;
    size?: number;
  }
): string {
  const fg = opts.fg ?? "#111827";
  const bg = opts.bg ?? "#FFFFFF";
  const size = opts.size ?? 1024;

  const qr = QRCode.create(content, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const total = n + MARGIN * 2;

  const finders: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  const inFinder = (r: number, c: number) =>
    finders.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);

  // Precompute alignment-pattern cells (5x5 blocks around each center pair,
  // skipping the three finder corners).
  const centers = alignmentCoords(qr.version, n);
  const alignCells = new Set<number>();
  for (const cr of centers) {
    for (const cc of centers) {
      if (inFinder(cr, cc)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          alignCells.add((cr + dr) * n + (cc + dc));
        }
      }
    }
  }

  const isFunction = (r: number, c: number) =>
    r === 6 || c === 6 || alignCells.has(r * n + c);

  const parts: string[] = [];
  // Background + photo across the module area.
  parts.push(`<rect width="${total}" height="${total}" fill="${bg}"/>`);
  parts.push(
    `<image x="${MARGIN}" y="${MARGIN}" width="${n}" height="${n}" href="${opts.imageDataUrl}" preserveAspectRatio="xMidYMid slice"/>`
  );

  // Solid backing behind each eye so it stays cleanly detectable.
  for (const [fr, fc] of finders) {
    parts.push(
      `<rect x="${fc + MARGIN - 0.6}" y="${fr + MARGIN - 0.6}" width="8.2" height="8.2" rx="2.6" fill="${bg}"/>`
    );
  }

  // Modules: function patterns full-size, data as center dots.
  const darkDots: string[] = [];
  const lightDots: string[] = [];
  const fullDark: string[] = [];
  const fullLight: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c)) continue;
      const x = c + MARGIN;
      const y = r + MARGIN;
      const isDark = !!qr.modules.get(r, c);
      if (isFunction(r, c)) {
        (isDark ? fullDark : fullLight).push(`M${x},${y}h1v1h-1z`);
      } else {
        (isDark ? darkDots : lightDots).push(
          `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.4"/>`
        );
      }
    }
  }
  if (fullLight.length) parts.push(`<path d="${fullLight.join("")}" fill="${bg}"/>`);
  if (fullDark.length) parts.push(`<path d="${fullDark.join("")}" fill="${fg}"/>`);
  if (lightDots.length) parts.push(`<g fill="${bg}">${lightDots.join("")}</g>`);
  if (darkDots.length) parts.push(`<g fill="${fg}">${darkDots.join("")}</g>`);

  // Styled eyes (rounded frame + ball, matching the shaped renderer).
  for (const [fr, fc] of finders) {
    const x = fc + MARGIN;
    const y = fr + MARGIN;
    parts.push(
      `<rect x="${x}" y="${y}" width="7" height="7" rx="2.2" fill="${fg}"/>`,
      `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.5" fill="${bg}"/>`,
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1.1" fill="${fg}"/>`
    );
  }

  // Optional centered logo on top, same treatment as the shaped renderer.
  if (opts.logoDataUrl) {
    const logoSize = total * 0.22;
    const pad = logoSize * 0.12;
    const lx = (total - logoSize) / 2;
    parts.push(
      `<rect x="${lx - pad}" y="${lx - pad}" width="${logoSize + pad * 2}" height="${logoSize + pad * 2}" rx="${(logoSize + pad * 2) * 0.18}" fill="${bg}"/>`,
      `<image x="${lx}" y="${lx}" width="${logoSize}" height="${logoSize}" href="${opts.logoDataUrl}" preserveAspectRatio="xMidYMid meet"/>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="geometricPrecision">` +
    parts.join("") +
    `</svg>`
  );
}
