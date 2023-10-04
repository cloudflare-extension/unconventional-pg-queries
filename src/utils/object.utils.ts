import { SqlType } from "../types/db.types";
import { TypeDescriptor } from "../types/general.types";

/** Matches a date string in the ISO format YYYY-MM-DDTHH:MM:SS.sssZ */
const datePattern = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d{3}Z/;

/** Converts a JavaScript value to a SQL type */
export function getType(value: any) {
  if (value == null) return '';

  switch (typeof value) {
    case 'boolean': return SqlType.Boolean;
    case 'number': return Number.isSafeInteger(value) ? SqlType.Int : SqlType.Float;
    case 'string': return datePattern.test(value) ? SqlType.Timestamp : SqlType.Text;
    case 'object': return SqlType.Jsonb;
    default: return '';
  }
}

/** Ascertains the type of a given value and returns a list of booleans for each possibility */
export function describeType(value: string | number | null): TypeDescriptor {
  return {
    isString: value ? value.toString().startsWith("'") : false,
    isNumber: value ? !isNaN(+value) : false,
    isBoolean: value ? value.toString().toLowerCase() === 'true' || value.toString().toLowerCase() === 'false' : false,
    isNull: value == null
  };
}

/** Returns true if the given object has no enumerable properties */
export function isEmpty(obj: any) {
  for (const key in obj) return false;
  return true;
}