import Link from "next/link";
import { PackageOpen } from "lucide-react";

export default function LedgerNotFound() {
  return (
    <section className="empty">
      <PackageOpen />
      <h2>Not found</h2>
      <p>
        That property record or exception is not in the Slice A fixture set.{" "}
        <Link href="/">Return home</Link>
      </p>
    </section>
  );
}
