import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { PageHeader } from "@/components/ledger/page-header";
import { getActor } from "@/lib/ledger/identity";
import { UNIT } from "@/lib/ledger/copy";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function SectionsPage() {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title="ODA sections"
        description={`${UNIT.uic} → ${UNIT.name} hand receipt → Bravo / Charlie / Delta / Echo / Fox Sub-hand receipts (SHR).`}
        meta={`${UNIT.group} · ${UNIT.installation} · section isolation is enforced on the server`}
      />
      <div className="section-grid">
        {workspace.sections.map((section) => (
          <article key={section.letter} className={`panel section-card ${section.visible ? "" : "locked"}`}>
            <div className="section-card-head">
              <span>{section.letter}</span>
              <div>
                <h2>{section.title}</h2>
                <p>
                  {section.mos} · SHR holder {section.holderName}
                </p>
              </div>
            </div>
            <p>
              {section.lineCount} accountability line{section.lineCount === 1 ? "" : "s"} on this
              section Sub-hand receipt (SHR).
            </p>
            {section.visible ? (
              <Link href={`/sections/${section.letter}`}>Open section SHR</Link>
            ) : (
              <p className="locked-note">
                <Lock />
                Isolated — this identity cannot see or edit {section.letter} lines.
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="slice-stub">
        <Users /> UIC {UNIT.uic} remains the parent. Section SHR holders do not get another
        section’s book without an explicit ODA / PM role.
      </p>
    </>
  );
}
