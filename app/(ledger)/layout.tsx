import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { AppShell } from "@/components/ledger/app-shell";
import { getActor, getChatGPTUserSafe } from "@/lib/ledger/identity";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  const user = await getChatGPTUserSafe();
  const workspace = await loadWorkspace(actor);

  return (
    <AppShell
      actor={actor}
      exceptionCount={workspace.exceptions.length}
      signedIn={Boolean(user)}
      signInHref={chatGPTSignInPath("/")}
      signOutHref={chatGPTSignOutPath("/")}
    >
      {children}
    </AppShell>
  );
}
