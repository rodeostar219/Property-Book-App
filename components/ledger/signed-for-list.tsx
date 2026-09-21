import Link from "next/link";
import { StatusChip } from "@/components/ledger/status-chip";
import { formatSerial } from "@/lib/ledger/copy";
import type { PropertyItem } from "@/lib/ledger/types";

export function SignedForList({
  items,
  empty,
}: {
  items: PropertyItem[];
  empty: string;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>My signed-for</h2>
          <p>
            Tap a line for Official name, Actual / common name, and photo. Photo is visual ID
            only and never implies Accept.
          </p>
        </div>
        <Link href="/my-property">Open my section</Link>
      </div>
      {items.length === 0 ? (
        <p className="table-empty">{empty}</p>
      ) : (
        <ul className="home-item-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.detailHref ?? `/lines/${item.id}`}>
                <b>{item.commonName ?? item.name}</b>
                <span>
                  {item.officialName ?? item.name} · {formatSerial(item.serial)}
                  {item.returnDate ? ` · return ${item.returnDate}` : ""}
                </span>
              </Link>
              <StatusChip item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
