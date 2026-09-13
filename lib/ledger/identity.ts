import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { PEOPLE } from "@/lib/oda/catalog";
import { DEMO_IDENTITY_COOKIE, DEMO_ROLE_COOKIE } from "./constants";
import type { Actor, AppRole, DemoIdentity } from "./types";

function isIdentity(value: string | undefined): value is DemoIdentity {
  return value === "echo" || value === "bravo" || value === "pm";
}

function isAppRole(value: string | undefined): value is AppRole {
  return value === "soldier" || value === "pm";
}

function looksLikePm(user: ChatGPTUser): boolean {
  const haystack = `${user.email} ${user.displayName} ${user.fullName ?? ""}`.toLowerCase();
  return haystack.includes("ortiz") || haystack.includes("property manager");
}

function actorFromIdentity(identity: DemoIdentity): Actor {
  if (identity === "bravo") {
    const person = PEOPLE.vargas;
    return {
      id: person.id,
      displayName: person.displayName,
      fullName: person.fullName,
      initials: person.initials,
      role: "soldier",
      email: person.email,
      grade: person.grade,
      mos: person.mos,
      sectionLetter: "B",
      scope: "section",
      identity: "bravo",
    };
  }
  if (identity === "pm") {
    const person = PEOPLE.ortiz;
    return {
      id: person.id,
      displayName: person.displayName,
      fullName: person.fullName,
      initials: person.initials,
      role: "pm",
      email: person.email,
      grade: person.grade,
      mos: person.mos,
      scope: "oda",
      identity: "pm",
    };
  }
  const person = PEOPLE.ryan;
  return {
    id: person.id,
    displayName: person.displayName,
    fullName: person.fullName,
    initials: person.initials,
    role: "soldier",
    email: person.email,
    grade: person.grade,
    mos: person.mos,
    sectionLetter: "E",
    scope: "section",
    identity: "echo",
  };
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
  const identityCookie = store.get(DEMO_IDENTITY_COOKIE)?.value;
  const roleCookie = store.get(DEMO_ROLE_COOKIE)?.value;
  const identity: DemoIdentity = isIdentity(identityCookie)
    ? identityCookie
    : isAppRole(roleCookie)
      ? roleCookie === "pm"
        ? "pm"
        : "echo"
      : user && looksLikePm(user)
        ? "pm"
        : "echo";
  return overlayIdentity(actorFromIdentity(identity), user);
}

export async function requirePm(): Promise<Actor> {
  const actor = await getActor();
  if (actor.role !== "pm") redirect("/");
  return actor;
}

export async function getChatGPTUserSafe(): Promise<ChatGPTUser | null> {
  return getChatGPTUser();
}
