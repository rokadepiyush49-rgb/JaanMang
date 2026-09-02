/**
 * The two languages the council speaks.
 *
 * Deliberately a closed union rather than an open string. The locale is not
 * only a UI concern — it selects a persona set, a keyword dictionary and a
 * voice map on the server, and every one of those is a `Record<Locale, …>`
 * that must stay exhaustive. Adding a third language should fail the build in
 * each place that has not been translated, which a `string` would not do.
 *
 * Keep this file free of server-only *and* client-only imports: it is read by
 * route handlers, by the provider, and by the persona files.
 */

export const LOCALES = ["en", "hi"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** What the switcher shows. Each language is named in itself, never translated. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
};

/** Short form for the collapsed switcher button. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  hi: "हिं",
};

/** BCP-47 tag, for `lang` attributes and `toLocaleTimeString`. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Narrows anything off the wire or out of storage to a usable locale. */
export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
