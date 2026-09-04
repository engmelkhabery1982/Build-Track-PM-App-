import type { DataRepository, DataRow, ListOptions } from "./repository";

export class SqliteRepository implements DataRepository {
  private notEnabled(): never {
    throw new Error(
      "SQLite backend is intentionally not enabled in Phase 1A."
    );
  }

  async list<T extends DataRow = DataRow>(
    _tableName: string,
    _options?: ListOptions
  ): Promise<T[]> {
    return this.notEnabled();
  }

  async insert<T extends DataRow = DataRow>(
    _tableName: string,
    _row: T
  ): Promise<T> {
    return this.notEnabled();
  }

  async insertMany<T extends DataRow = DataRow>(
    _tableName: string,
    _rows: T[]
  ): Promise<T[]> {
    return this.notEnabled();
  }

  async update<T extends DataRow = DataRow>(
    _tableName: string,
    _id: string,
    _patch: Partial<T>
  ): Promise<T> {
    return this.notEnabled();
  }

  async delete(_tableName: string, _id: string): Promise<void> {
    return this.notEnabled();
  }
}
