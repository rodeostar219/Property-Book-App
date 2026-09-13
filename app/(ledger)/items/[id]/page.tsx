import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, UserRound } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { PageHeader } from "@/components/ledger/page-header";
import { PhrhChrome } from "@/components/ledger/phrh-note";
import { StatusChip } from "@/components/ledger/status-chip";
import { NOT_WIRED } from "@/lib/ledger/copy";
import { getPropertyItem } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getPropertyItem(id);
  if (!item) notFound();

  const components = item.components;
  const hasShr = Boolean(item.shrHolderName);

  return (
    <>
      <PageHeader
        title={item.name}
        description={`${item.nsn} · serial ${item.serial ?? "not recorded"}`}
        meta="Slice A chrome only. Overview / Custody / History land in Slice B."
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

      <div className="item-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Overview</h2>
              <p>Identity and accountability — Slice B will expand this tab</p>
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
              <dd>{item.serial ?? "—"}</dd>
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
              <dd>{item.assignedToName ?? "—"}</dd>
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
              <h2>Receipt holders</h2>
              <p>
                {hasShr
                  ? "Sub-hand receipt (SHR) is present; PHRH remains accountable"
                  : "No Sub-hand receipt (SHR) on this end item"}
              </p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>PHRH</dt>
              <dd>{item.phrhName}</dd>
            </div>
            <div>
              <dt>SHR holder</dt>
              <dd>{item.shrHolderName ?? "—"}</dd>
            </div>
            <div>
              <dt>SHR document</dt>
              <dd>{item.shrDocument ?? "—"}</dd>
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
        {components.length === 0 ? (
          <p className="table-empty">No COEI / BII / AAL lines on this fixture item.</p>
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
                {components.map((line) => (
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
          Custody and history tabs are reserved for Slice B.{" "}
          <Link href="/my-property">Back to my property</Link>
        </p>
      </section>
    </>
  );
}
