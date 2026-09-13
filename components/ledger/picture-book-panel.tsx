"use client";

import { useState, useTransition } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { ActionResultNote } from "@/components/ledger/action-result";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Button } from "@/components/ui/button";
import { replaceLinePhoto, updateCommonName, type ActionResult } from "@/lib/oda/actions";
import { PICTURE_BOOK_NOTICE } from "@/lib/oda/picture-book";
import type { PersistenceMode } from "@/lib/oda/store";
import type { LayeredLine } from "@/lib/oda/workspace";

export function PictureBookPanel({
  line,
  persistence,
  canEdit,
}: {
  line: LayeredLine;
  persistence: PersistenceMode;
  canEdit: boolean;
}) {
  const [commonName, setCommonName] = useState(line.commonName ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = persistence !== "d1" || !canEdit;

  function onPhoto(formData: FormData) {
    startTransition(async () => {
      setResult(await replaceLinePhoto(line.id, formData));
    });
  }

  function onName() {
    startTransition(async () => {
      setResult(await updateCommonName(line.id, commonName));
    });
  }

  return (
    <section className="panel picture-book">
      <div className="panel-head">
        <div>
          <h2>Picture book · visual ID</h2>
          <p>{PICTURE_BOOK_NOTICE}</p>
        </div>
      </div>
      <div className="picture-book-grid">
        <figure>
          {line.photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={line.photoData} alt={`${line.commonName ?? line.name} visual ID`} />
          ) : (
            <div className="photo-empty">No photo on this line</div>
          )}
          <figcaption>Photo replace does not invent accountability</figcaption>
        </figure>
        <div className="picture-book-fields">
          <label>
            Official name
            <input value={line.officialName ?? line.name} readOnly />
          </label>
          <label>
            Common / actual name
            <input
              value={commonName}
              onChange={(event) => setCommonName(event.target.value)}
              disabled={blocked || pending}
            />
          </label>
          <div className="picture-book-actions">
            {blocked ? (
              <DisabledAction
                label="Save actual name"
                reason={
                  !canEdit
                    ? "Section isolation: this identity cannot edit another section’s line."
                    : "D1 is unavailable. Visual name was not written."
                }
                size="sm"
              />
            ) : (
              <Button type="button" size="sm" onClick={onName} disabled={pending}>
                Save actual name
              </Button>
            )}
          </div>
          {blocked ? (
            <DisabledAction
              label="Add / replace photo"
              reason={
                !canEdit
                  ? "Section isolation: this identity cannot edit another section’s picture book."
                  : "D1 is unavailable. Photo was not written."
              }
              icon={<Camera />}
            />
          ) : (
            <form action={onPhoto} className="photo-form">
              <input type="hidden" name="commonName" value={commonName} />
              <label className="photo-file">
                <Camera />
                <span>Choose photo</span>
                <input type="file" name="photo" accept="image/*" />
              </label>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                <RefreshCw />
                Add / replace photo
              </Button>
            </form>
          )}
          <ActionResultNote result={result} />
        </div>
      </div>
    </section>
  );
}
