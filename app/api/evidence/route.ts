import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-forgetrack-role");
  if (role !== "technician" && role !== "readiness-manager" && role !== "administrator") return NextResponse.json({ error: "Authorized role required" }, { status: 403 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 10_000_000) return NextResponse.json({ error: "Evidence must be a PDF, PNG, JPEG, or WebP no larger than 10 MB" }, { status: 400 });
  const key = `version-evidence/${crypto.randomUUID()}`;
  await env.ATTACHMENTS!.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name } });
  return NextResponse.json({ objectKey: key, filename: file.name, contentType: file.type }, { status: 201 });
}
