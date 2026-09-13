/**
 * Picture book is a visual identification layer on a hand-receipt line.
 * Replacing a photo or common/actual name must never invent accountability.
 */

export const PICTURE_BOOK_LAYER = "visual_id" as const;

export const PICTURE_BOOK_NOTICE =
  "Visual identification only. Adding or replacing a photo, official name display, or common/actual name does not create, change, or delete accountability.";

export type PictureBookWrite = {
  lineKey: string;
  officialName: string;
  commonName: string;
  photoStored: boolean;
};

export function pictureBookTouchesAccountability(): false {
  return false;
}

export function allowedPictureBookColumns(): readonly string[] {
  return [
    "accountability_line_key",
    "official_name",
    "common_name",
    "photo_key",
    "photo_data",
    "photo_content_type",
    "photo_updated_at",
    "photo_updated_by",
  ] as const;
}

export function forbiddenAccountabilityMutationFromPhoto(): readonly string[] {
  return [
    "quantity",
    "serial_number",
    "nsn",
    "lin",
    "accountability_code",
    "source_receipt_id",
  ] as const;
}

export function stencilSvg(commonName: string, officialName: string): string {
  const common = escapeXml(commonName || "Common name");
  const official = escapeXml(officialName || "Official name");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <rect width="640" height="400" fill="#173931"/>
  <rect x="24" y="24" width="592" height="352" fill="none" stroke="#d5a94b" stroke-width="3"/>
  <text x="320" y="160" text-anchor="middle" fill="#d5a94b" font-family="Georgia, serif" font-size="22">PICTURE BOOK</text>
  <text x="320" y="210" text-anchor="middle" fill="#e8f2ee" font-family="Inter, sans-serif" font-size="28">${common}</text>
  <text x="320" y="250" text-anchor="middle" fill="#92aaa2" font-family="Inter, sans-serif" font-size="14">${official}</text>
  <text x="320" y="310" text-anchor="middle" fill="#83a59a" font-family="Inter, sans-serif" font-size="12">Visual ID only — not accountability</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
