import { FileArchive, UploadCloud } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { PageHeader } from "@/components/ledger/page-header";
import { NOT_WIRED } from "@/lib/ledger/copy";
import { requirePm } from "@/lib/ledger/identity";
import { getDocuments } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  await requirePm();
  const rows = getDocuments();

  return (
    <>
      <PageHeader
        title="Documents"
        description="Source hand receipts and electronic Sub-hand receipts (SHR). Scanned DA Form 2062 attach is Sprint 2."
        actions={
          <DisabledAction
            label="Import document"
            reason={NOT_WIRED.importDocument}
            icon={<UploadCloud />}
          />
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
      </div>
    </>
  );
}
