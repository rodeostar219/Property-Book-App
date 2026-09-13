# QA / Definition of Done (Chelse)

Independent QA. A successful UI message does **not** prove the transaction. Verify DB state and history whenever a path is claimed done.

## Constants (every sprint)

- toast ≠ commit
- Confirm before write (Cancel = zero rows)
- Section isolation — no cross-section writes (Bravo–Fox)
- History retained; prior snapshots queryable
- Conflict → discrepancy; never auto-merge
- Companion to GCSS/APSR — PDF/inject never invents formal accountability alone
- Photo / common name = visual layer only (does not change accountability)
- Serial blank = `null` / "not recorded" — never fake `"—"`
- Lanes stay separate: HR accountability ≠ responsibility/custody ≠ packing/1750 ≠ components/CHR ≠ visual ID
- Soldier UI language: COEI / BII / AAL / CHR — not BOM
- Doc types: DA Form 2062 ≠ DD Form 1750

## Sprint 1 — done on `main` (PR #2 / `2c9df4d`)

Cleared:

1. Section isolation (server + UI)
2. Picture book photo/common name = visual only
3. Electronic SHR inject = versioned change feed; prior queryable; **not** Accept theater
4. Source conflict → discrepancy
5. toast≠commit (D1 down disables mutations; Accept/Resolve stay disabled where unwired)

## Sprint 2 — in progress

Sequence: **2062 in** → **2062 out + return** → **box → editable 1750** → **component CHR import**

### 2062 in (current slice)

- Electronic **and** scanned/OCR paths both hit Confirm — never auto-write
- Confirm shows issuer, gaining party (ODA / section), lines (Official + Actual if known, NSN, serial or not recorded, qty), parse warnings
- Per-line accept / skip / flag discrepancy
- Bad/partial parse never silent-commits
- Wrong section/UIC → deny, no rows
- Cancel leaves zero rows
- Success asserts DB + history (or disabled if D1 down)
- Success = add to signed-for + history — **not** Accept theater

### Abuse cases to run

- Truncated / garbage PDF
- Duplicate serial / blank serial
- Wrong-section identity attempting write
- Double-submit / network drop mid-confirm
- Mislabeled 1750 uploaded as 2062
- Conflict with existing HR/tracker → discrepancy, not merge

### Later Sprint 2 slices

- **Out:** destinations = person / section / organization only; return date **required**; temp ≤30d and past due = **warn only** (no force turn-in)
- **DD 1750:** packing/container layer only; editable in-app before print/download; never flips signed-for
- **Component CHR:** COEI/BII/AAL language; shortages on CHR/shortage listing; last in sequence

## Clear / blocker rule

- Clear only after independent verification of the gates above
- Screenshots alone are insufficient when a write is claimed
- Non-blockers (e.g. copy typos) may ship with follow-up; gate failures block merge
