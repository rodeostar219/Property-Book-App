import { endItemCountNote, serialGridRows, type SerialCell } from "@/lib/oda/months";

export function SerialGridTable({ cells }: { cells: SerialCell[] | null }) {
  const rows = serialGridRows(cells);
  if (!rows) {
    return (
      <p>
        This end item does not identify SerNo or RegNo separately from LotNo, so it has no serial count.
      </p>
    );
  }
  if (rows.length === 0) {
    return <p>No SerNo or RegNo cells on this end item.</p>;
  }
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
        {rows.map((row, index) => (
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

export function EndItemCount({ ohQty, serialCells }: { ohQty: number; serialCells: SerialCell[] | null }) {
  return <p>{endItemCountNote({ ohQty, serialCells })}</p>;
}
