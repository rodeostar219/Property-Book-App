import { redirect } from "next/navigation";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { UnitPropertyBook } from "@/components/ledger/unit-property-book";
import { getActor } from "@/lib/ledger/identity";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function UnitPropertyPage() {
  const actor = await getActor();
  if (actor.role !== "pm") {
    redirect("/");
  }

  const workspace = await loadWorkspace(actor);
  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <UnitPropertyBook items={workspace.items} />
    </>
  );
}
