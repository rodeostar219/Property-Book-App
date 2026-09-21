# Terminology & Army vs local vs improve

**Owner:** Debra (Property Accountability SME)  
**Product:** ODA operational property workspace — **companion to GCSS-Army / APSR**, not a system of record.

Update after major Ryan decisions. Keep concise.

---

## Companion rule (non-negotiable)

This app helps an ODA **see, organize, move, and document** property. It does **not** replace GCSS-Army / the APSR as the formal accountable property system of record.

- Scanned or electronic DA Form 2062 / SHR injects support the **workspace** and create **history** here.
- They do **not** by themselves invent or overwrite APSR accountability.
- When sources disagree → **open a discrepancy**; never silent merge / auto-pick a winner.

---

## Army-required vs ODA local practice vs app improvement

| Kind | Meaning | Examples in this product |
|------|---------|---------------------------|
| **Army-required** | Respect in design; cite AR 710-4 / AR 735-5 when claiming “the Army requires” | Formal accountability in APSR; hand receipt / sub-hand receipt responsibility; shortage documentation; companion (not SoR) |
| **ODA local practice** | How *this* team runs — configurable / product, not “Army requires” | Bravo–Fox section SHRs; picture book; monthly electronic SHR refresh as inject; 23E01… packing boxes; computer tracker |
| **App improvement** | Reduce Soldier workload without weakening accountability | Enter once / reuse; Official + Actual + photo on HR line; Confirm before write; discrepancy on conflict; editable 1750 packing list |

Never present local practice or app improvement as regulatory requirement.

---

## Core labels (Soldier-facing)

| Use | Do not use |
|-----|------------|
| **Hand receipt** | “Monthly SHR” as Accept ceremony / ground-truth theater |
| **Sub-hand receipt (SHR)** — spell out on first use | SHR for primary hand receipt or whole ODA book |
| **Sub-hand receipt update** (electronic inject) | “Accept as current monthly SHR” |
| **DA Form 2062** — Hand Receipt / Shortage Listing | Treating 2062 as a packing list |
| **DD Form 1750** — Packing List | **DA** Form 1750; calling 1750 a hand receipt |
| **COEI / BII / AAL** / **component hand receipt (CHR)** | **BOM** in Soldier UI |
| **Official name** + **Actual / common name** + **photo** | Photo as proof of accountability |
| **Signed for** / **with person** / **in box** as separate facts | One flattened “status” chip for all three |

---

## Document lanes

### DA Form 2062 (responsibility)

- **In:** add property under signed-for location (ODA / section / person as product allows) after **Confirm**.
- **Out:** temporary custody / signed-out location + **required return date**.
- Temp hand receipt intent (AR 710-4): ≤ **30 days** then withdraw or convert — product treats past due / ≤30d as **warn only** (Ryan lock), not force turn-in.
- Six-month rule in AR 710-4 is **change-document posting** to the HR — not “2062 expires every six months.”

### DD Form 1750 (packing)

- Answers: **what is in which box/kit** for movement.
- Every packed item belongs on the list — **not just serialized**.
- Page ≠ container (multi-page 1750 can be one box).
- Supporting doc to property books / component listing — **never** creates hand-receipt responsibility alone.

### Electronic Sub-hand receipt (18E / APSR-style)

- Formal **accountability baseline** for what the section/ODA is tracking from the source system.
- Inject = **versioned change feed** (“Sub-hand receipt update”), not Accept theater.
- Prior snapshots stay queryable.

### Picture book

- Visual ID aid: Official + Actual + photo on the **HR line**.
- Replace photo / edit common name = **visual layer only** — does not invent accountability.

### Local trackers (e.g. computer tracker)

- Operational who / where / on-HR convenience.
- Example of Soldier needs — **not** the database schema and not SoR.

---

## Component language

- End item vs **COEI** (Components of End Item) vs **BII** (Basic Issue Items) vs **AAL** (Additional Authorization List) vs locally added accessory vs packing-list-only item.
- Shortages: record on CHR / shortage listing; do not accept “everything present” by silence.
- Import path (Sprint 2 last): **component CHR import** — Soldier UI never says “BOM.”

---

## Sprint 2 terminology checklist (2062 in → out → 1750 → CHR)

1. Confirm screen before any write (electronic **and** OCR).
2. Success copy: add to signed-for / add temporary hand receipt / history — **not** “Accepted as current.”
3. Out destinations (v1): person / section / organization only.
4. 1750: packing layer; editable in-app before print/download.
5. Companion banner / copy remains true on every flow.

---

## Controlling pubs (reference)

| Pub | Role |
|-----|------|
| **AR 710-4** (15 Apr 2026) | Property Accountability — HR/SHR, components, inventories |
| **AR 735-5** (30 Apr 2026) | Relief of responsibility / LDDT / FLIPL |
| **DA Form 2062** | Hand Receipt/Shortage Listing (prescribed by AR 710-4) |
| **DD Form 1750** | Packing List (ACTIVE) |

Paragraph-level Accept/CHR ceremony is **backlog risk**, not a Sprint 1/2 ship gate unless Ryan reopens it.
