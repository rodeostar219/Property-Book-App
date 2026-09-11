import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateVersionStatus } from "@/lib/version-status";

const payloadSchema = z.object({
  assetIds: z.array(z.number().int().positive()).min(1).max(250),
  componentName: z.string().min(1).max(160), componentType: z.string().min(1).max(80),
  installedVersion: z.string().min(1).max(120), approvedVersion: z.string().max(120).optional(),
  installationDate: z.string().date(), lastVerifiedDate: z.string().date().optional(),
  verificationMethod: z.string().max(120).optional(), verifiedBy: z.string().min(1).max(120),
  updateSource: z.string().max(240).optional(), applicability: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(), required: z.boolean().default(true),
  verificationIntervalDays: z.number().int().positive().max(366).default(30),
});

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-forgetrack-role");
  if (role !== "readiness-manager" && role !== "administrator") return NextResponse.json({ error: "Authorized readiness role required" }, { status: 403 });
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data; const now = new Date(); const recordedAt = now.toISOString(); const batchId = crypto.randomUUID();
  const status = calculateVersionStatus({ installedVersion: data.installedVersion, approvedVersion: data.approvedVersion, required: data.required, lastVerifiedDate: data.lastVerifiedDate, verificationIntervalDays: data.verificationIntervalDays, now });
  const statements = data.assetIds.flatMap((assetId) => [
    env.DB!.prepare("UPDATE component_version_history SET superseded_at = ? WHERE asset_id = ? AND component_name = ? AND superseded_at IS NULL").bind(recordedAt, assetId, data.componentName),
    env.DB!.prepare("INSERT INTO component_version_history (asset_id, component_name, component_type, installed_version, approved_version_snapshot, installation_date, last_verified_date, verification_method, verified_by, update_source, applicability, notes, status, recorded_at, recorded_by, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(assetId, data.componentName, data.componentType, data.installedVersion, data.approvedVersion ?? null, data.installationDate, data.lastVerifiedDate ?? null, data.verificationMethod ?? null, data.verifiedBy, data.updateSource ?? null, data.applicability ?? null, data.notes ?? null, status, recordedAt, data.verifiedBy, batchId),
  ]);
  await env.DB!.batch(statements);
  return NextResponse.json({ batchId, updatedAssets: data.assetIds.length, status }, { status: 201 });
}
