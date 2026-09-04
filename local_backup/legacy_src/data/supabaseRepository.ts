import { supabase } from "@/lib/supabase";
import type { DataRepository, ListOptions } from "./repository";
import { DataRepositoryError } from "./repository";

export class SupabaseRepository implements DataRepository {
  async list<T extends object>(
    tableName: string,
    options: ListOptions = {}
  ): Promise<T[]> {
    try {
      const orderBy = options.orderBy ?? "created_at";
      const ascending = options.ascending ?? false;

      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order(orderBy, { ascending });

      if (error) throw error;

      return (data ?? []) as T[];
    } catch (error) {
      throw new DataRepositoryError(
        `Failed to load data from "${tableName}".`,
        error
      );
    }
  }

  async insert<T extends object>(
    tableName: string,
    row: T
  ): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert(row as any)
        .select()
        .single();

      if (error) throw error;

      return data as T;
    } catch (error) {
      throw new DataRepositoryError(
        `Failed to insert data into "${tableName}".`,
        error
      );
    }
  }

  async insertMany<T extends object>(
    tableName: string,
    rows: T[]
  ): Promise<T[]> {
    try {
      if (rows.length === 0) return [];

      const { data, error } = await supabase
        .from(tableName)
        .insert(rows as any)
        .select();

      if (error) throw error;

      return (data ?? []) as T[];
    } catch (error) {
      throw new DataRepositoryError(
        `Failed to insert data into "${tableName}".`,
        error
      );
    }
  }

  async update<T extends object>(
    tableName: string,
    id: string,
    patch: Partial<T>
  ): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return data as T;
    } catch (error) {
      throw new DataRepositoryError(
        `Failed to update data in "${tableName}".`,
        error
      );
    }
  }

  async delete(
    tableName: string,
    id: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      throw new DataRepositoryError(
        `Failed to delete data from "${tableName}".`,
        error
      );
    }
  }
}

export const supabaseRepository = new SupabaseRepository();
