import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact preview lengths for mentor + student resource rows (not server caps). */
export const RESOURCE_CARD_MENTOR_SHARED_TITLE_MAX = 52;
export const RESOURCE_CARD_MENTOR_SHARED_LINK_MAX = 44;
export const RESOURCE_CARD_MENTOR_SHARED_FILENAME_MAX = 38;

/** Shorten for one-line UI; avoids huge URLs/filenames in cards. */
export function truncateDisplayEnd(text: string, maxChars: number): string {
  const s = text.trim();
  if (maxChars <= 0 || s.length === 0) return s;
  if (s.length <= maxChars) return s;
  if (maxChars <= 1) return "…";
  return s.slice(0, maxChars - 1).trimEnd() + "…";
}

/** Keep start + end so links stay recognizable. */
export function truncateDisplayMiddle(text: string, maxChars: number): string {
  const s = text.trim();
  if (maxChars <= 0 || s.length === 0) return s;
  if (s.length <= maxChars) return s;
  if (maxChars <= 3) return "…";
  const inner = maxChars - 1;
  const left = Math.ceil(inner / 2);
  const right = inner - left;
  return `${s.slice(0, left)}…${s.slice(s.length - right)}`;
}
