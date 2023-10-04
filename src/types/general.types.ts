import { SqlType } from "../types/db.types";
import { Client } from "pg";

export interface Env {
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_PORT: string;
}

export type PgFunction<In, Out = any> = (client: Client, outline: In) => Promise<Out>;

export interface CallConfig {
  transaction?: boolean;
}

export interface TextRequestBody {
  text: string;
}

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