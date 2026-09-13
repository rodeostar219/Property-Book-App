import { Download, Plus, UploadCloud } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { PageHeader } from "@/components/ledger/page-header";
import { PropertyTable } from "@/components/ledger/property-table";
import { NOT_WIRED } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { getMyProperty } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function MyPropertyPage() {
  const actor = await getActor();
  const items = getMyProperty(actor);

  return (
    <>
      <PageHeader
        title="My property"
        description={
          actor.role === "pm"
            ? "End items you personally signed for. The unit book is under Unit property."
            : "End items on your Sub-hand receipt (SHR). A SHR does not replace the unit book."
        }
        meta={
          items.length === 0
            ? "No personal signed-for lines on this fixture"
            : `${items.length} signed-for end item${items.length === 1 ? "" : "s"}`
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
              ? "This Property Manager fixture has no personal signed-for lines. Use Unit property for the book."
              : "No property is assigned to this Soldier fixture."
          }
        />
      </section>
    </>
  );
}
