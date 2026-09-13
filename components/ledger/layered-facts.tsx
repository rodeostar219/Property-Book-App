import type { LayeredLine } from "@/lib/oda/workspace";

const LABELS = [
  ["accountability", "Accountability"],
  ["responsibility", "Responsibility"],
  ["components", "Components"],
  ["packing", "Packing"],
  ["custody", "Custody"],
  ["visualId", "Visual ID"],
] as const;

export function LayeredFacts({ line }: { line: LayeredLine }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Layered facts</h2>
          <p>Sources stay separate. A mismatch opens a discrepancy — nothing is auto-merged.</p>
        </div>
      </div>
      <dl className="layer-list">
        {LABELS.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{line.layers[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
