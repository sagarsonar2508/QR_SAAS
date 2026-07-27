import { customAlphabet } from "nanoid";

// No ambiguous characters (0/O, 1/l/I) — these codes get read aloud and typed.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

export const newShortCode = customAlphabet(alphabet, 7);

// Path segments that can never be QR short codes (they collide with app routes).
export const RESERVED_CODES = new Set([
  "api",
  "login",
  "signup",
  "dashboard",
  "qrcodes",
  "files",
  "pricing",
  "billing",
  "restaurant",
  "print",
  "f",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);
