import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, UserRound } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { LayeredFacts } from "@/components/ledger/layered-facts";
import { PageHeader } from "@/components/ledger/page-header";
import { PhrhChrome } from "@/components/ledger/phrh-note";
import { PictureBookPanel } from "@/components/ledger/picture-book-panel";
import { StatusChip } from "@/components/ledger/status-chip";
import { formatSerial, NOT_WIRED } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { canEditSection } from "@/lib/oda/access";
import { loadLine, loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function LinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);
  const item = await loadLine(actor, id);
  if (!item) notFound();

  const canEdit = item.sectionLetter ? canEditSection(actor, item.sectionLetter) : actor.role === "pm";

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title={item.commonName ?? item.name}
        description={`Official: ${item.officialName ?? item.name} · NSN ${item.nsn} · serial ${formatSerial(item.serial)}`}
        meta={`${item.sectionLetter ? `Section ${item.sectionLetter}` : "ODA"} · picture book is visual ID only`}
        actions={
          <>
            <DisabledAction
              label="Update custody"
              reason={NOT_WIRED.custody}
              icon={<UserRound />}
            />
            <DisabledAction
              label="Move location"
              reason={NOT_WIRED.location}
              icon={<MapPin />}
              variant="outline"
            />
          </>
        }
      />

      <PhrhChrome source={item} />
      <PictureBookPanel line={item} persistence={workspace.persistence} canEdit={canEdit} />
      <LayeredFacts line={item} />

      <div className="item-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Accountability layer</h2>
              <p>Hand-receipt facts — not overwritten by photo or common name</p>
            </div>
            <StatusChip item={item} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>NSN</dt>
              <dd>{item.nsn}</dd>
            </div>
            <div>
              <dt>Serial</dt>
              <dd>{formatSerial(item.serial)}</dd>
            </div>
            <div>
              <dt>Accountability class</dt>
              <dd>{item.accountabilityClass}</dd>
            </div>
            <div>
              <dt>Network classification</dt>
              <dd>{item.networkClassification}</dd>
            </div>
            <div>
              <dt>On hand</dt>
              <dd>
                {item.quantityOnHand} of {item.quantityRequired}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>Signed for</dt>
              <dd>{item.assignedToName ?? "not recorded"}</dd>
            </div>
            <div>
              <dt>Source receipt</dt>
              <dd>{item.sourceReceipt}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Other sources</h2>
              <p>Tracker and DD Form 1750 stay beside the hand receipt — never flattened</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>PHRH</dt>
              <dd>{item.phrhName}</dd>
            </div>
            <div>
              <dt>SHR holder</dt>
              <dd>{item.shrHolderName ?? "not recorded"}</dd>
            </div>
            <div>
              <dt>SHR document</dt>
              <dd>{item.shrDocument ?? "not recorded"}</dd>
            </div>
            <div>
              <dt>Tracker</dt>
              <dd>{item.trackerNote ?? "no tracker fact"}</dd>
            </div>
            <div>
              <dt>DD Form 1750</dt>
              <dd>{item.packingNote ?? "none present"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="panel item-components">
        <div className="panel-head">
          <div>
            <h2>Components · COEI / BII / AAL</h2>
            <p>Soldier component language — not a bill of materials (BOM)</p>
          </div>
          <DisabledAction
            label="Import COEI / BII / AAL"
            reason={NOT_WIRED.importComponents}
            variant="outline"
            size="sm"
          />
        </div>
        {item.components.length === 0 ? (
          <p className="table-empty">No COEI / BII / AAL lines on this item.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Nomenclature</th>
                  <th>Required</th>
                  <th>On hand</th>
                </tr>
              </thead>
              <tbody>
                {item.components.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="pill blue">{line.kind}</span>
                    </td>
                    <td>
                      <b>{line.nomenclature}</b>
                    </td>
                    <td>{line.requiredQuantity}</td>
                    <td>
                      {line.onHandQuantity}
                      {line.onHandQuantity < line.requiredQuantity ? (
                        <span className="pill amber">Shortage recorded</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="slice-stub">
        <p>
          Movement packages, Polar Dagger, and DD 1750 loadouts are out of Sprint 1.{" "}
          <Link href="/my-property">Back to my section</Link>
        </p>
      </section>
    </>
  );
}
