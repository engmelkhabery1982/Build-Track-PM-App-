import type { DataRepository } from "./repository";
import { supabaseRepository } from "./supabaseRepository";

export type { DataRepository } from "./repository";
export { DataRepositoryError } from "./repository";
export { SupabaseRepository } from "./supabaseRepository";
export { SqliteRepository } from "./sqliteRepository";

export const dataRepository: DataRepository = supabaseRepository;
