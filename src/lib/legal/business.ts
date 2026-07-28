/**
 * Business identity used across the legal pages.
 *
 * ⚠️ THIS IS THE ONE FILE YOU NEED TO EDIT. Every legal page reads from here,
 * so filling these in updates Terms, Privacy, Refund and Contact at once.
 *
 * Anything left as a TODO_ value renders a visible placeholder on the live site,
 * so an unfilled field is obvious rather than silently wrong.
 *
 * These pages are a solid starting draft, not legal advice. Have someone
 * qualified review them before you take real money — especially if you start
 * selling outside India.
 */

export const BUSINESS = {
  /** Product/brand name. */
  name: "QRVeda",

  /** The legal person behind the service. For a sole proprietor in India this
   *  is your own full name — a proprietorship is not a separate registration,
   *  you are a proprietor by default the moment you trade as an individual. */
  legalName: "TODO_LEGAL_NAME",

  /** "proprietor" | "company" | "llp" — controls the wording used. */
  entityType: "proprietor" as "proprietor" | "company" | "llp",

  /** Where you operate from. A city and state is the minimum; payment gateways
   *  generally want a full address during KYC. */
  address: "TODO_ADDRESS",

  /** Support address customers and gateways can actually reach. */
  supportEmail: "TODO_SUPPORT_EMAIL",

  /** Optional. Leave empty to omit from the pages. */
  phone: "",

  /** GST identification number. Empty means "not GST registered", and the pages
   *  adapt: no GST claims are made and prices are described as final. */
  gstin: "",

  /** Courts of this city govern disputes. Normally where you're based. */
  jurisdiction: "TODO_CITY",

  /** Country of operation. */
  country: "India",

  /** Shown as "last updated" on each policy. Bump when you change the text. */
  lastUpdated: "28 July 2026",
} as const;

/** True when a field still holds its placeholder. */
export function isUnset(value: string): boolean {
  return !value || value.startsWith("TODO_");
}

/** Render a value, or a visible marker so unfilled details can't slip by. */
export function show(value: string, fallback = "[to be completed]"): string {
  return isUnset(value) ? fallback : value;
}

/** How the responsible party is described in prose. */
export function entityDescription(): string {
  const who = show(BUSINESS.legalName);
  switch (BUSINESS.entityType) {
    case "company":
      return `${who}, a company registered in ${BUSINESS.country}`;
    case "llp":
      return `${who}, a limited liability partnership registered in ${BUSINESS.country}`;
    default:
      return `${who}, a sole proprietor operating in ${BUSINESS.country}`;
  }
}

/** Every placeholder still outstanding — surfaced in the admin System page so
 *  unfinished legal pages are visible rather than forgotten. */
export function outstandingFields(): string[] {
  const required: [string, string][] = [
    ["legalName", BUSINESS.legalName],
    ["address", BUSINESS.address],
    ["supportEmail", BUSINESS.supportEmail],
    ["jurisdiction", BUSINESS.jurisdiction],
  ];
  return required.filter(([, v]) => isUnset(v)).map(([k]) => k);
}
