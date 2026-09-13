import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { AppShell } from "@/components/ledger/app-shell";
import { getActor, getChatGPTUserSafe } from "@/lib/ledger/identity";
import { getExceptionsFor } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  const user = await getChatGPTUserSafe();
  const exceptionCount = getExceptionsFor(actor).length;

  return (
    <AppShell
      actor={actor}
      exceptionCount={exceptionCount}
      signedIn={Boolean(user)}
      signInHref={chatGPTSignInPath("/")}
      signOutHref={chatGPTSignOutPath("/")}
    >
      {children}
    </AppShell>
  );
}
