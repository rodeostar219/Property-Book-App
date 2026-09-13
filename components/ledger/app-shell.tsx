"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ClipboardCheck, Download, Menu } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Progress } from "@/components/ui/progress";
import { NOT_WIRED, UNIT } from "@/lib/ledger/copy";
import { setDemoIdentity } from "@/lib/ledger/demo-role";
import { navForRole, pageTitleForPath } from "@/lib/ledger/nav";
import type { Actor, DemoIdentity } from "@/lib/ledger/types";

type Props = {
  actor: Actor;
  exceptionCount: number;
  signedIn: boolean;
  signInHref: string;
  signOutHref: string;
  children: React.ReactNode;
};

export function AppShell({
  actor,
  exceptionCount,
  signedIn,
  signInHref,
  signOutHref,
  children,
}: Props) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [pending, startTransition] = useTransition();
  const nav = navForRole(actor.role);
  const title = pageTitleForPath(pathname);
  const roleLabel =
    actor.identity === "pm"
      ? "ODA / PM"
      : actor.sectionLetter === "B"
        ? "Bravo SHR"
        : "Echo 18E";

  function switchIdentity(identity: DemoIdentity) {
    startTransition(() => {
      void setDemoIdentity(identity);
    });
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <span>
            <ClipboardCheck />
          </span>
          <div>
            <b>ODA WORKSPACE</b>
            <small>
              {UNIT.uic} · {UNIT.name} · {UNIT.installation}
            </small>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                onClick={() => setMobile(false)}
              >
                <Icon />
                <span>{item.label}</span>
                {item.badgeKey === "exceptions" && exceptionCount > 0 ? (
                  <em>{exceptionCount}</em>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="accountability">
          <small>ODA HAND RECEIPT</small>
          <strong>
            {UNIT.receiptLabel} · {UNIT.document}
          </strong>
          <p>
            {UNIT.group} · PHRH {UNIT.name === "ODA-1223" ? "CPT A. Reyes" : "PHRH"}
          </p>
          <div>
            <span>Companion workspace</span>
            <b>not SoR</b>
          </div>
          <Progress value={100} />
        </div>
        <div className="user">
          <span>{actor.initials}</span>
          <div>
            <b>{actor.displayName}</b>
            <small>
              {actor.mos ? `${actor.mos} · ` : ""}
              {roleLabel}
            </small>
          </div>
          <ChevronDown />
        </div>
        <form className="role-switch">
          <small>Demo identity</small>
          <div className="identity-switch">
            <button
              type="button"
              disabled={pending || actor.identity === "echo"}
              className={actor.identity === "echo" ? "selected" : ""}
              onClick={() => switchIdentity("echo")}
            >
              Echo
            </button>
            <button
              type="button"
              disabled={pending || actor.identity === "bravo"}
              className={actor.identity === "bravo" ? "selected" : ""}
              onClick={() => switchIdentity("bravo")}
            >
              Bravo
            </button>
            <button
              type="button"
              disabled={pending || actor.identity === "pm"}
              className={actor.identity === "pm" ? "selected" : ""}
              onClick={() => switchIdentity("pm")}
            >
              ODA
            </button>
          </div>
          {signedIn ? (
            <a href={signOutHref} target="_top">
              Sign out
            </a>
          ) : (
            <a href={signInHref} target="_top">
              Sign in with ChatGPT
            </a>
          )}
        </form>
      </aside>
      <main>
        <header>
          <button
            className="hamburger"
            aria-label="Open menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div>
            <p>1ST SFG (A) · JBLM · OPERATIONAL PROPERTY</p>
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <DisabledAction
              label="Export"
              reason={NOT_WIRED.export}
              icon={<Download />}
              variant="outline"
            />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export function CurrentBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="current">
      <CheckCircle2 />
      {children}
    </span>
  );
}
