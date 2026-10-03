"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardCheck, Menu } from "lucide-react";
import { setDemoIdentity } from "@/lib/ledger/demo-role";
import { isNavActive, navGroupsForRole, pageTitleForPath } from "@/lib/ledger/nav";
import { ODA } from "@/lib/oda/org";
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
  const groups = navGroupsForRole(actor.role);
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
      <a className="skip" href="#content">
        Skip to content
      </a>
      {mobile ? (
        <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobile(false)} />
      ) : null}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <span>
            <ClipboardCheck />
          </span>
          <div>
            <b>ODA-1223</b>
            <small>
              {ODA.uic} · {ODA.installation}
            </small>
          </div>
        </div>
        <nav aria-label="Primary">
          {groups.map((group) => (
            <div key={group.id} className="nav-group">
              <small>{group.label}</small>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href, pathname);
                const badge = item.badgeKey === "exceptions" ? exceptionCount : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobile(false)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    {badge > 0 ? <em>{badge}</em> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="accountability">
          <small>HAND RECEIPT</small>
          <strong>
            {ODA.document} · PHRH {ODA.phrhName}
          </strong>
          <p>Companion to GCSS-Army. Not a system of record.</p>
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
        </div>
        <form className="role-switch">
          <small>Demo identity</small>
          <div className="identity-switch">
            {(
              [
                ["echo", "Echo"],
                ["bravo", "Bravo"],
                ["pm", "ODA"],
              ] as const
            ).map(([identity, label]) => (
              <button
                key={identity}
                type="button"
                disabled={pending || actor.identity === identity}
                className={actor.identity === identity ? "selected" : ""}
                aria-pressed={actor.identity === identity}
                onClick={() => switchIdentity(identity)}
              >
                {label}
              </button>
            ))}
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
        <header className="topbar">
          <button className="hamburger" aria-label="Open menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">{ODA.name}</Link>
            <span aria-hidden="true">/</span>
            <span>{title}</span>
          </nav>
        </header>
        <div className="content" id="content">
          {children}
        </div>
      </main>
    </div>
  );
}

export function CurrentBadge({ children }: { children: React.ReactNode }) {
  return <span className="current">{children}</span>;
}
