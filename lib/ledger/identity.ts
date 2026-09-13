import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { DEMO_ROLE_COOKIE } from "./constants";
import { DEMO_PM, DEMO_SOLDIER } from "./fixtures";
import type { Actor, AppRole } from "./types";

function isAppRole(value: string | undefined): value is AppRole {
  return value === "soldier" || value === "pm";
}

function looksLikePm(user: ChatGPTUser): boolean {
  const haystack = `${user.email} ${user.displayName} ${user.fullName ?? ""}`.toLowerCase();
  return haystack.includes("ortiz") || haystack.includes("property manager");
}

function overlayIdentity(base: Actor, user: ChatGPTUser | null): Actor {
  if (!user) return base;
  const fullName = user.fullName ?? user.displayName;
  const parts = fullName.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : fullName.slice(0, 2).toUpperCase();
  return {
    ...base,
    displayName: user.displayName,
    fullName,
    initials,
    email: user.email,
  };
}

export async function getActor(): Promise<Actor> {
  const user = await getChatGPTUser();
  const store = await cookies();
  const override = store.get(DEMO_ROLE_COOKIE)?.value;
  const role: AppRole = isAppRole(override)
    ? override
    : user && looksLikePm(user)
      ? "pm"
      : "soldier";

  const fixture = role === "pm" ? DEMO_PM : DEMO_SOLDIER;
  return overlayIdentity(fixture, user);
}

export async function requirePm(): Promise<Actor> {
  const actor = await getActor();
  if (actor.role !== "pm") redirect("/");
  return actor;
}

export async function getChatGPTUserSafe(): Promise<ChatGPTUser | null> {
  return getChatGPTUser();
}
