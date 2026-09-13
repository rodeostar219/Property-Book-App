import { redirect } from "next/navigation";
import { UnitPropertyBook } from "@/components/ledger/unit-property-book";
import { getActor } from "@/lib/ledger/identity";
import { getUnitProperty } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function UnitPropertyPage() {
  const actor = await getActor();
  if (actor.role !== "pm") {
    redirect("/");
  }

  const items = getUnitProperty();
  return <UnitPropertyBook items={items} />;
}
