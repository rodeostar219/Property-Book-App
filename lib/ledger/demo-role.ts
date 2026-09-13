"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_IDENTITY_COOKIE, DEMO_ROLE_COOKIE } from "./constants";
import type { AppRole, DemoIdentity } from "./types";

function roleForIdentity(identity: DemoIdentity): AppRole {
  return identity === "pm" ? "pm" : "soldier";
}

export async function setDemoIdentity(identity: DemoIdentity) {
  const store = await cookies();
  store.set(DEMO_IDENTITY_COOKIE, identity, {
    path: "/",
    sameSite: "lax",
  });
  store.set(DEMO_ROLE_COOKIE, roleForIdentity(identity), {
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setDemoRole(role: AppRole) {
  await setDemoIdentity(role === "pm" ? "pm" : "echo");
}
