export enum SqlWhereOperator {
  Eq = '=',
  Neq = '<>',
  Gt = '>',
  Gte = '>=',
  Lt = '<',
  Lte = '<=',
  Like = 'LIKE',
  ILike = 'ILIKE',
  NotLike = 'NOT LIKE',
  In = 'IN',
  NotIn = 'NOT IN',
  IsNull = 'IS NULL',
  IsNotNull = 'IS NOT NULL',
  BitwiseAnd = '&'
}

export const ValidSqlOperators = Object.values<string>(SqlWhereOperator);
export const NullSqlOperators: string[] = [SqlWhereOperator.IsNull, SqlWhereOperator.IsNotNull];

export enum SqlDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export const ValidSortDirections = Object.values<string>(SqlDirection);

export enum SqlAction {
  Select = 'SELECT',
  Insert = 'INSERT',
  Update = 'UPDATE',
  Delete = 'DELETE'
}

export enum OneOrMany {
  One = 'one',
  Many = 'many'
}

export enum SqlType {
  Text = 'text',
  Int = 'int',
  Float = 'float',
  Boolean = 'boolean',
  Timestamp = 'timestamp',
  Jsonb = 'jsonb'
}

export enum AndOr {
  And = 'AND',
  Or = 'OR'
}

export const andOrPattern = /\s(?=AND|OR)/;

export interface Expansion {
  type: OneOrMany;
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  throughTable?: string;
  throughFromField?: string;
  throughToField?: string;
  expand?: Record<string, Expansion>;
}

export interface SqlOrder {
  field: string;
  jsonPath?: string[];
  direction: SqlDirection;
}

export interface SqlWhere {
  field: string;
  jsonPath?: string[];
  operator: SqlWhereOperator;
  value: string | number | null;
  andOr?: AndOr;
}

export interface SqlPaginate {
  field: string;
  cursor: string | number;
}

export enum ConflictResolution {
  doNothing = 'DO NOTHING',
  doUpdate = 'DO UPDATE SET'
}
export interface SqlConflict {
  action: ConflictResolution;
  constraint?: string[];
}

export interface QueryDefinition {
  table: string;
  expand?: Record<string, Expansion>;
  where?: SqlWhere[];
  conflict?: SqlConflict;
  order?: SqlOrder[];
  page?: SqlPaginate;
  limit?: number;
  data?: Object | Object[];
  count?: boolean;
}