import { PmHome } from "@/components/ledger/home-pm";
import { SoldierHome } from "@/components/ledger/home-soldier";
import { getActor } from "@/lib/ledger/identity";
import {
  getExceptionsFor,
  getLoans,
  getMyProperty,
  getUnitProperty,
} from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const actor = await getActor();
  const exceptions = getExceptionsFor(actor);

  if (actor.role === "pm") {
    return (
      <PmHome
        actor={actor}
        itemCount={getUnitProperty().length}
        exceptionCount={exceptions.length}
        exceptions={exceptions}
        renewSoon={getLoans().filter((loan) => loan.status === "Renew soon")}
      />
    );
  }

  return (
    <SoldierHome
      actor={actor}
      items={getMyProperty(actor)}
      exceptions={exceptions}
    />
  );
}
