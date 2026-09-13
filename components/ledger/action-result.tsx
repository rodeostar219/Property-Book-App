"use client";

export function ActionResultNote({
  result,
}: {
  result: { ok: boolean; message: string } | null;
}) {
  if (!result) return null;
  return (
    <p className={`action-result ${result.ok ? "ok" : "fail"}`} role="status">
      {result.message}
    </p>
  );
}
