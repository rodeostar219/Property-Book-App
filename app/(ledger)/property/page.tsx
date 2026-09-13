import { UnitPropertyBook } from "@/components/ledger/unit-property-book";
import { requirePm } from "@/lib/ledger/identity";
import { getUnitProperty } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function UnitPropertyPage() {
  await requirePm();
  return <UnitPropertyBook items={getUnitProperty()} />;
}
