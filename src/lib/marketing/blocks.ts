// Shared content-block model for docs and blog pages.
// Inline syntax supported by the renderer: **bold** and `code`.

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "tip"; text: string }
  | { t: "warn"; text: string }
  | { t: "table"; headers: string[]; rows: string[][] };

export type Faq = { q: string; a: string };

/** Strip inline markers for plain-text contexts (JSON-LD, meta descriptions). */
export function plainText(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1");
}
