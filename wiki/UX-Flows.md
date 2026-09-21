# UX Flows (Ben)

Living soldier / section UX for Property-Book-App. Ben owns this page.

**On `main`:** Sprint 1 section-first flows.  
**Locked next:** Sprint 2 **2062 out** Confirm screen (temporary hand receipt). 2062 in Confirm is locked and building on PR #3.

---

## Product stance

This is an **ODA operational property workspace** — a companion to GCSS-Army / APSR. It is **not** a system of record and **not** a GCSS replacement.

**Primary design target:** 18E on ODA 1223 (section Echo), 1st SFG (A), JBLM.

Lanes stay separate. Do not flatten them in copy or UI:

| Lane | Means | Does not mean |
|------|--------|----------------|
| Accountability (HR) | What the hand receipt / APSR says | Who is holding it today |
| Responsibility / signed-for | Who signed the HR or SHR | Physical custody |
| Custody / with-person | Who has it / where it is (tracker) | Formal accountability |
| Packing / in-box (1750) | DD Form 1750 container / kit | Hand-receipt responsibility |
| Components | COEI / BII / AAL / CHR on an end item | A bill of materials (never lead with BOM) |
| Visual ID | Official name + Actual/common name + photo | Accept, or any accountability change |

---

## Sprint 1 (on main) — section-first

Shipped on `main` via PR #2. Default identity is Echo (Ryan, 18E). Demo switcher: Echo · Bravo · PM.

### Home

Route: `/`

- Bravo–Fox **section switcher** plus **My signed-for** list first. Home is **not** the unit-wide book.
- Soldier Home: this identity’s section SHR lines. PM Home: personal signed-for; ODA book lives under `/property`.
- Section chips the identity cannot view are **locked** (visible, not tappable). Echo cannot open Bravo–Fox SHRs.
- **Needs attention** lists source-conflict discrepancies and links to `/exceptions`. Resolve stays disabled.
- Companion banner on every ledger page.

### Section Sub-hand receipt (SHR)

Route: `/sections/[B-F]`  
Also: `/my-property` (this identity’s visible section lines) · `/sections` (section index)

- PHRH remains visible when an SHR exists. SHR does not relieve the PHRH.
- Search: **NSN / serial / common name / section**.
- Inject label is **Sub-hand receipt update** (electronic 18E). Writes a versioned snapshot; prior inject stays queryable at `/receipts/history/[id]`.
- **Accept as current** stays disabled. Inject is not Accept theater.
- Cross-section identities get the isolation empty state — no SHR lines, no inject write.

### HR line / picture book

Route: `/lines/[id]`  
`/items/[id]` redirects here.

- **Official name** (read-only) + **Actual / common name** + **photo add/replace**.
- Photo and common name are **visual ID only**. They never imply Accept and never change accountability, quantity, serial, NSN, or source receipt.
- Layered facts stay separate on the line: signed for · location · tracker · DD Form 1750 note · COEI · BII · AAL.
- Custody / location / component-import actions stay disabled (not Sprint 1 writes).

---

## Sprint 2 (in progress)

### 2062 in (PR #3) — Confirm screen (locked)

DA Form 2062 = Hand Receipt/Shortage Listing. Electronic extract and scanned/OCR share **one** Confirm screen.

1. Upload electronic or scanned/OCR DA Form 2062.
2. Always land on **Confirm**. Parse never auto-writes rows — even on a perfect parse.
3. Confirm always shows:
   - issuer
   - gaining party (ODA, or section Bravo–Fox)
   - each line: Official + Actual if known + NSN + serial or **not recorded** (never `—`) + qty
   - parse warnings
4. Per line: **accept** / **skip** / **flag discrepancy**.
5. Primary CTA: **Add to signed-for** (section-isolated). **Cancel** leaves zero rows.
6. Success → that section’s SHR + a versioned history entry. Companion write only — not Accept theater, not APSR accountability.

Rejects with **no rows**: wrong section, Echo targeting ODA HR, cross-UIC, D1 down.

### 2062 out (building) — Confirm screen (locked)

Temporary hand receipt / DA Form 2062 signed-out. Electronic extract and scanned/OCR share **one** Confirm screen.

1. Upload electronic or scanned/OCR DA Form 2062 out.
2. Always land on **Confirm**. Parse never auto-writes rows — even on a perfect parse.
3. Confirm always shows:
   - issuer
   - destination (**person / section / organization** only)
   - each line: Official + Actual if known + NSN + serial or **not recorded** (never `—`) + qty
   - **return date** (required)
   - parse warnings, including past due / ≤30-day awareness
4. Per line: **accept** / **skip** / **flag discrepancy**.
5. Primary CTA: **Add temporary hand receipt** (Sign out). **Cancel** leaves zero rows.
6. Success → history + signed-out state with return date visible. Companion custody only — not Accept theater, not an APSR drop.

Past due and ≤30-day temp HR = **warn only**. No force turn-in or convert.

Rejects with **no rows**: wrong section, cross-UIC, destination outside person/section/organization, missing return date on write, D1 down.

### Box → editable DD 1750 (later in Sprint 2)

- Packing layer only — never creates hand-receipt responsibility.
- Select property into a box/package → edit the packing list in-app → print/download.
- Label is **DD Form 1750** (not DA).

### Component CHR import (last)

- Soldier language: **COEI / BII / AAL / component hand receipt (CHR)**.
- Never lead with BOM. Import attaches to the end-item line, after 2062 and 1750.

---

## Constants for all flows

- **toast ≠ commit.** D1 down → disable mutations. No fake success.
- **Section isolation.** Bravo–Fox stay separate; no cross-section view or write.
- **Conflict between sources → discrepancy.** Never silent merge (HR vs tracker vs picture book vs 1750).
- **Companion banner** on ledger surfaces. This app is not the system of record.

Related: [LAYERED-MODEL.md](./LAYERED-MODEL.md) · [QA-DOD.md](./QA-DOD.md) · [SPRINTS.md](./SPRINTS.md)
