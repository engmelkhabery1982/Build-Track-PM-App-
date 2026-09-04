export type DataRow = object;

export interface ListOptions {
  orderBy?: string;
  ascending?: boolean;
}

export interface DataRepository {
  list<T extends DataRow>(
    tableName: string,
    options?: ListOptions
  ): Promise<T[]>;

  insert<T extends DataRow>(
    tableName: string,
    row: T
  ): Promise<T>;

  insertMany<T extends DataRow>(
    tableName: string,
    rows: T[]
  ): Promise<T[]>;

  update<T extends DataRow>(
    tableName: string,
    id: string,
    patch: Partial<T>
  ): Promise<T>;

  delete(
    tableName: string,
    id: string
  ): Promise<void>;
}

export class DataRepositoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DataRepositoryError";
  }
}
