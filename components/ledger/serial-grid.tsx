import { endItemCountNote, serialGridRows, type SerialCell } from "@/lib/oda/months";

function markedValue(cell: SerialCell | undefined): string {
  if (!cell?.value) return "";
  if (cell.kind === "serNo") return `SerNo ${cell.value}`;
  if (cell.kind === "regNo") return `RegNo ${cell.value}`;
  return cell.value;
}

export function SerialGridTable({ cells }: { cells: SerialCell[] | null }) {
  const classified = serialGridRows(cells);
  if (classified && classified.length > 0) {
    return (
      <table>
        <thead>
          <tr>
            <th>SerNo</th>
            <th>RegNo</th>
            <th>LotNo</th>
          </tr>
        </thead>
        <tbody>
          {classified.map((row, index) => (
            <tr key={`${row.serNo ?? ""}-${row.regNo ?? ""}-${row.lotNo ?? ""}-${index}`}>
              <td>{row.serNo ?? ""}</td>
              <td>{row.regNo ?? ""}</td>
              <td>{row.lotNo ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (!cells || cells.length === 0) {
    return <p>No filled cells on this end item.</p>;
  }
  const rows: SerialCell[][] = [];
  for (let index = 0; index < cells.length; index += 3) {
    rows.push(cells.slice(index, index + 3));
  }
  return (
    <table>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td>{markedValue(row[0])}</td>
            <td>{markedValue(row[1])}</td>
            <td>{markedValue(row[2])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EndItemCount({ ohQty, serialCells }: { ohQty: number; serialCells: SerialCell[] | null }) {
  return <p>{endItemCountNote({ ohQty, serialCells })}</p>;
}
