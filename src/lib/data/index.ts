import "server-only";
import type { Repository } from "./repository";
import { DemoRepository } from "./demo-repo";
import { SupabaseRepository } from "./supabase-repo";
import { createSupabaseServerClient, supabaseConfigured } from "../supabase/server";

/** Returns the signed-in user's repository, a demo repository, or null when signed out. */
export async function getRepository(): Promise<Repository | null> {
  if (!supabaseConfigured()) return new DemoRepository();
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return new SupabaseRepository(db, user.id);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
  }
}

export async function requireRepository(): Promise<Repository> {
  const repo = await getRepository();
  if (!repo) throw new UnauthorizedError();
  return repo;
}
