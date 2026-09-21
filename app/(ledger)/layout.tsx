import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { AppShell } from "@/components/ledger/app-shell";
import { getActor, getChatGPTUserSafe } from "@/lib/ledger/identity";
import { loadLedgerChrome } from "@/lib/oda/da2062-shell";

export const dynamic = "force-dynamic";

export default async function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  const user = await getChatGPTUserSafe();
  const workspace = await loadLedgerChrome(actor);

  return (
    <AppShell
      actor={actor}
      exceptionCount={workspace.exceptionCount}
      signedIn={Boolean(user)}
      signInHref={chatGPTSignInPath("/")}
      signOutHref={chatGPTSignOutPath("/")}
    >
      {children}
    </AppShell>
  );
}
