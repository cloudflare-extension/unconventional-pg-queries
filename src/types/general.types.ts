import { SqlType } from "../types/db.types";

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