"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_ROLE_COOKIE } from "./constants";
import type { AppRole } from "./types";

export async function setDemoRole(role: AppRole) {
  const store = await cookies();
  store.set(DEMO_ROLE_COOKIE, role, {
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
