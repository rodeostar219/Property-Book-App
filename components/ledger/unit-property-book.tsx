"use client";

import { useMemo, useState } from "react";
import { Filter, MapPin, Plus, Search, UserRound } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { PageHeader } from "@/components/ledger/page-header";
import { PropertyTable } from "@/components/ledger/property-table";
import { NOT_WIRED, STATUS_LABEL } from "@/lib/ledger/copy";
import type { AccountabilityStatus, PropertyItem } from "@/lib/ledger/types";

const filters: Array<"All status" | AccountabilityStatus> = [
  "All status",
  "signed_for",
  "on_hand",
  "needs_serial_check",
  "shortage_recorded",
];

export function UnitPropertyBook({ items }: { items: PropertyItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All status");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const visible = useMemo(
    () =>
      items.filter((item) => {
        const matchesFilter = filter === "All status" || item.status === filter;
        const haystack =
          `${item.name} ${item.serial ?? ""} ${item.nsn} ${item.assignedToName ?? ""} ${item.location}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [filter, items, query],
  );

  return (
    <>
      <PageHeader
        title="Unit property"
        description="Hand-receipt lines for the organization. Accountability class and SIPR/NIPR are separate columns."
        actions={
          <DisabledAction
            label="Add property"
            reason={NOT_WIRED.addProperty}
            icon={<Plus />}
          />
        }
      />
      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search />
            <input
              aria-label="Search property"
              placeholder="Search NSN, serial, item, person, or location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="filter">
            <Filter />
            <select
              aria-label="Filter property status"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as (typeof filters)[number])
              }
            >
              {filters.map((value) => (
                <option key={value} value={value}>
                  {value === "All status" ? "All status" : STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <span>{visible.length} records shown</span>
        </div>
        {selectedCount > 0 ? (
          <div className="bulk">
            <b>{selectedCount} selected</b>
            <DisabledAction
              label="Update custody"
              reason={NOT_WIRED.custody}
              icon={<UserRound />}
              size="sm"
            />
            <DisabledAction
              label="Move location"
              reason={NOT_WIRED.location}
              icon={<MapPin />}
              variant="outline"
              size="sm"
            />
            <button type="button" onClick={() => setSelected({})}>
              Clear
            </button>
          </div>
        ) : null}
        <PropertyTable
          items={visible}
          empty="No unit property matches this filter."
          selected={selected}
          onToggle={(id) =>
            setSelected((current) => ({ ...current, [id]: !current[id] }))
          }
        />
      </section>
    </>
  );
}
