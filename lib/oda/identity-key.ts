export function identityKey(input: {
  nsn?: string | null;
  serial?: string | null;
  lin?: string | null;
}): string {
  const nsn = (input.nsn ?? "").replace(/\s+/g, "").toUpperCase();
  const serial = (input.serial ?? "").trim().toUpperCase();
  const lin = (input.lin ?? "").trim().toUpperCase();
  if (serial) return `sn:${serial}`;
  if (nsn && lin) return `nsn:${nsn}|lin:${lin}`;
  if (nsn) return `nsn:${nsn}`;
  if (lin) return `lin:${lin}`;
  return "unknown";
}

export function sameIdentity(
  a: { nsn?: string | null; serial?: string | null; lin?: string | null },
  b: { nsn?: string | null; serial?: string | null; lin?: string | null },
): boolean {
  return identityKey(a) === identityKey(b);
}
