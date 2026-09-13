import { Download, Plus, UploadCloud } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { PageHeader } from "@/components/ledger/page-header";
import { PropertyTable } from "@/components/ledger/property-table";
import { NOT_WIRED } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function MyPropertyPage() {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);
  const items = workspace.items;

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title={actor.scope === "section" ? "My section" : "My property"}
        description={
          actor.role === "pm"
            ? "End items you personally signed for. The ODA book is under ODA property."
            : `End items on the ${actor.sectionLetter ? `${actor.sectionLetter} section` : ""} Sub-hand receipt (SHR). A SHR does not replace the ODA book.`
        }
        meta={
          items.length === 0
            ? "No section lines visible to this identity"
            : `${items.length} line${items.length === 1 ? "" : "s"} · section isolation is on`
        }
        actions={
          <>
            <DisabledAction
              label="Export"
              reason={NOT_WIRED.export}
              icon={<Download />}
              variant="outline"
            />
            {actor.role === "pm" ? (
              <DisabledAction
                label="Add property"
                reason={NOT_WIRED.addProperty}
                icon={<Plus />}
              />
            ) : (
              <DisabledAction
                label="Import COEI / BII / AAL"
                reason={NOT_WIRED.importComponents}
                icon={<UploadCloud />}
                variant="outline"
              />
            )}
          </>
        }
      />
      <section className="panel">
        <PropertyTable
          items={items}
          empty={
            actor.role === "pm"
              ? "This Property Manager identity has no personal signed-for lines. Use ODA property for the book."
              : "No property is visible on this section Sub-hand receipt (SHR)."
          }
        />
      </section>
    </>
  );
}
