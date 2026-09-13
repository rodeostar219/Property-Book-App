"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusChip } from "@/components/ledger/status-chip";
import { formatSerial } from "@/lib/ledger/copy";
import type { PropertyItem } from "@/lib/ledger/types";

export function PropertyTable({
  items,
  empty,
  selected,
  onToggle,
}: {
  items: PropertyItem[];
  empty: string;
  selected?: Record<string, boolean>;
  onToggle?: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="table-empty">{empty}</p>;
  }

  const selectable = Boolean(onToggle && selected);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {selectable ? <th></th> : null}
            <th>NSN / official name</th>
            <th>Actual name</th>
            <th>Serial number</th>
            <th>Section</th>
            <th>Accountability</th>
            <th>Network</th>
            <th>SHR holder</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {selectable ? (
                <td>
                  <Checkbox
                    checked={!!selected?.[item.id]}
                    onCheckedChange={() => onToggle?.(item.id)}
                    aria-label={`Select ${item.serial ?? item.name}`}
                  />
                </td>
              ) : null}
              <td>
                <Link href={`/lines/${item.id}`} className="item-link">
                  <code>{item.nsn}</code>
                  <b>{item.officialName ?? item.name}</b>
                </Link>
              </td>
              <td>{item.commonName ?? "not recorded"}</td>
              <td>
                <strong>{formatSerial(item.serial)}</strong>
              </td>
              <td>{item.sectionLetter ?? "ODA"}</td>
              <td>{item.accountabilityClass}</td>
              <td>{item.networkClassification}</td>
              <td>{item.shrHolderName ?? "not recorded"}</td>
              <td>
                <small>{item.sourceReceipt}</small>
              </td>
              <td>
                <StatusChip item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
