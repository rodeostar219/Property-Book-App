/** Minimal PDF build/extract for fillable-style and scanned/OCR 2062 fixtures. */

export function pdfEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function pdfUnescape(value: string): string {
  return value.replaceAll("\\(", "(").replaceAll("\\)", ")").replaceAll("\\\\", "\\");
}

function latin1Decode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

function latin1Encode(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function extractLiteral(raw: string): string {
  return pdfUnescape(raw);
}

export function extractPdfPayload(bytes: Uint8Array): {
  text: string;
  fields: Record<string, string>;
} {
  const raw = latin1Decode(bytes);
  const fields: Record<string, string> = {};

  for (const match of raw.matchAll(
    /\/T\s*\(((?:\\.|[^\\)])*)\)[\s\S]{0,240}?\/V\s*\(((?:\\.|[^\\)])*)\)/g,
  )) {
    const name = extractLiteral(match[1] ?? "");
    const value = extractLiteral(match[2] ?? "");
    if (name && value) fields[name] = value;
  }
  for (const match of raw.matchAll(
    /\/V\s*\(((?:\\.|[^\\)])*)\)[\s\S]{0,240}?\/T\s*\(((?:\\.|[^\\)])*)\)/g,
  )) {
    const value = extractLiteral(match[1] ?? "");
    const name = extractLiteral(match[2] ?? "");
    if (name && value && !fields[name]) fields[name] = value;
  }

  const strings: string[] = [];
  for (const match of raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    const value = extractLiteral(match[1] ?? "").trim();
    if (value) strings.push(value);
  }

  return {
    text: [...Object.entries(fields).map(([k, v]) => `${k}=${v}`), ...strings].join("\n"),
    fields,
  };
}

export function buildMinimalPdf(input: {
  lines: string[];
  fields?: Record<string, string>;
  title?: string;
}): Uint8Array {
  const title = input.title ?? "DA Form 2062";
  const contentOps = input.lines
    .map((line, index) => {
      const y = 720 - index * 16;
      return `BT /F1 10 Tf 48 ${y} Td (${pdfEscape(line)}) Tj ET`;
    })
    .join("\n");
  const stream = contentOps;
  const fieldNames = Object.keys(input.fields ?? {});
  const fieldObjects = fieldNames.map((name, index) => {
    const id = 10 + index;
    const value = input.fields?.[name] ?? "";
    return {
      id,
      body: `${id} 0 obj\n<< /Type /Annot /Subtype /Widget /FT /Tx /T (${pdfEscape(name)}) /V (${pdfEscape(value)}) /Ff 1 >>\nendobj\n`,
    };
  });
  const fieldRefs = fieldObjects.map((field) => `${field.id} 0 R`).join(" ");
  const acro = fieldObjects.length
    ? ` /AcroForm << /Fields [${fieldRefs}] /NeedAppearances true >>`
    : "";

  const objects: string[] = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R${acro} >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `6 0 obj\n<< /Title (${pdfEscape(title)}) >>\nendobj\n`,
    ...fieldObjects.map((field) => field.body),
  ];

  let cursor = `%PDF-1.4\n`.length;
  const offsets = [0];
  let body = "%PDF-1.4\n";
  for (const object of objects) {
    offsets.push(cursor);
    body += object;
    cursor += object.length;
  }
  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return latin1Encode(body + xref + trailer);
}
