import type { DataRepository } from "./repository";
import { supabaseRepository } from "./supabaseRepository";

export type { DataRepository } from "./repository";
export { DataRepositoryError } from "./repository";
export { SupabaseRepository } from "./supabaseRepository";
export { SqliteRepository } from "./sqliteRepository";
export { selectPrimaryContracts } from "./contractRules";
export { assertValidHierarchyChange } from "./hierarchyRules";
export {
  assertCodeCanBeLocked,
  assertCodeUpdateAllowed,
  createCodeDraft,
  getCodeControl,
  prepareCodeControlledInsert,
} from "./codeControls";

export const dataRepository: DataRepository = supabaseRepository;
