"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PropertyTable } from "@/components/ledger/property-table";
import type { PropertyItem } from "@/lib/ledger/types";

export function PropertySearch({
  items,
  empty,
}: {
  items: PropertyItem[];
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const haystack = [
        item.nsn,
        item.serial ?? "",
        item.commonName ?? "",
        item.officialName ?? item.name,
        item.sectionLetter ?? "",
        item.shrHolderName ?? "",
        item.signedOutTo ?? "",
        item.returnDate ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, query]);

  return (
    <section className="panel">
      <div className="toolbar">
        <label className="search">
          <Search />
          <input
            aria-label="Search NSN, serial, common name, or section"
            placeholder="Search NSN / serial / common name / section"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span>{visible.length} records shown</span>
      </div>
      <PropertyTable items={visible} empty={empty} />
    </section>
  );
}
