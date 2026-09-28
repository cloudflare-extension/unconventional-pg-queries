import { Expansion, SqlOrder, SqlPaginate, SqlType } from "../types/db.types";

export interface TypeDescriptor {
  isString: boolean;
  isNumber: boolean;
  isBoolean: boolean;
  isNull: boolean;
}

export interface FieldModifiers {
  jsonPath?: string[];
  type?: SqlType;
}

export interface CompiledWhere {
  /** The parameterized WHERE (and any relation JOINs) clause text */
  text: string;
  /** Ordered values to pass alongside the text to `client.query(text, values)` */
  values: unknown[];
}

export interface CompileWhereOptions {
  pagination?: SqlPaginate;
  order?: SqlOrder[];
  expand?: Record<string, Expansion>;
  /** Parameters compiled before the WHERE clause, such as an UPDATE's SET values. */
  values?: readonly unknown[];
}
