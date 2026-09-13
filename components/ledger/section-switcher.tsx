import Link from "next/link";
import { Lock } from "lucide-react";
import type { SectionCard } from "@/lib/oda/workspace";

export function SectionSwitcher({
  sections,
  active,
}: {
  sections: SectionCard[];
  active?: string | null;
}) {
  return (
    <nav className="section-switcher" aria-label="ODA section switcher">
      <small>SECTION</small>
      <div>
        {sections.map((section) => {
          const selected = active === section.letter;
          if (!section.visible) {
            return (
              <span key={section.letter} className="section-chip locked" title="Section isolation">
                <Lock />
                {section.letter}
              </span>
            );
          }
          return (
            <Link
              key={section.letter}
              href={`/sections/${section.letter}`}
              className={`section-chip ${selected ? "selected" : ""}`}
            >
              {section.letter}
              <em>{section.specialty}</em>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
