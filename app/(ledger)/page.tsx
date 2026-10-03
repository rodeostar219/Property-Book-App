import { CompanionBanner } from "@/components/ledger/companion-banner";
import { CommandHome } from "@/components/ledger/command-home";
import { getActor } from "@/lib/ledger/identity";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <CommandHome actor={actor} items={workspace.items} sections={workspace.sections} />
    </>
  );
}
