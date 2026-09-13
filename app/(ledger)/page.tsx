import { CompanionBanner } from "@/components/ledger/companion-banner";
import { PmHome } from "@/components/ledger/home-pm";
import { SoldierHome } from "@/components/ledger/home-soldier";
import { getActor } from "@/lib/ledger/identity";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);

  if (actor.role === "pm") {
    return (
      <>
        <CompanionBanner persistence={workspace.persistence} />
        <PmHome
          actor={actor}
          signedFor={workspace.items.filter((item) => item.assignedToId === actor.id)}
          exceptionCount={workspace.exceptions.length}
          exceptions={workspace.exceptions}
          sections={workspace.sections}
        />
      </>
    );
  }

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <SoldierHome
        actor={actor}
        items={workspace.items}
        exceptions={workspace.exceptions}
        sections={workspace.sections}
      />
    </>
  );
}
