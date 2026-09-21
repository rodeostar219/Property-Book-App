import Link from "next/link";
import { FileArchive, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ledger/page-header";
import { requirePm } from "@/lib/ledger/identity";
import { getDocuments } from "@/lib/ledger/queries";
import { Button } from "@/components/ui/button";
import { loadWorkspace } from "@/lib/oda/workspace";
import { CompanionBanner } from "@/components/ledger/companion-banner";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const actor = await requirePm();
  const workspace = await loadWorkspace(actor);
  const rows = getDocuments();

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title="Documents"
        description="Source hand receipts, electronic Sub-hand receipts (SHR), and confirmed DA Form 2062 PDFs."
        actions={
          <div className="split-actions">
            <Button asChild variant="outline">
              <Link href="/receipts/2062-in">
                <UploadCloud />
                Import DA 2062 in
              </Link>
            </Button>
            <Button asChild>
              <Link href="/receipts/2062-out">
                <UploadCloud />
                Sign out 2062
              </Link>
            </Button>
          </div>
        }
      />
      <div className="receipt-list">
        {rows.map((doc) => (
          <article className="panel" key={doc.id}>
            <span className="document-icon">
              <FileArchive />
            </span>
            <div className="receipt-name">
              <h3>{doc.filename}</h3>
              <p>{doc.kindLabel}</p>
            </div>
            <div>
              <small>Date</small>
              <b>{doc.date}</b>
            </div>
            <div>
              <small>Notes</small>
              <b>{doc.notes}</b>
            </div>
          </article>
        ))}
        {workspace.da2062Imports.map((row) => (
          <article className="panel" key={`da2062-${row.id}`}>
            <span className="document-icon">
              <FileArchive />
            </span>
            <div className="receipt-name">
              <h3>
                <Link href={row.direction === "out" ? `/receipts/2062-out/history/${row.id}` : `/receipts/2062-in/history/${row.id}`}>{row.filename}</Link>
              </h3>
              <p>
                DA Form 2062 {row.direction === "out" ? "out" : "in"} · {row.parsePath}
                {row.returnDate ? ` · return ${row.returnDate}` : ""}
              </p>
            </div>
            <div>
              <small>Date</small>
              <b>{row.importedAt.slice(0, 10)}</b>
            </div>
            <div>
              <small>Notes</small>
              <b>
                {row.lineCount} lines · {row.hasPdf ? "PDF attached" : "no PDF"} ·{" "}
                {row.discrepancyCount} discrepancies
              </b>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
