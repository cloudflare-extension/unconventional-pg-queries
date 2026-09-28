import { QueryDefinition } from "../types/db.types";
import { Client, escapeIdentifier } from "pg";
import { FromAlias, IdField, TempFromAlias } from "../utils/query.utils";

/** Updates many records in a PostgreSQL database */
export async function updateMany(client: Client, body: QueryDefinition): Promise<any> {
  if (!body.data) throw new Error('No data provided');
  const data = Array.isArray(body.data) ? body.data : [body.data];

  let columns: string[] = [],
    setClause = '',
    values: any[] = [],
    valueHolders = '',
    numValues = 0;

  data.forEach((record, recordIndex) => {
    let recordValueHolders = '';

    Object.entries(record).forEach(([key, value]) => {
      // Exclude relations
      if (body.expand?.[key]) return;

      // Collect column names on first pass through
      if (recordIndex === 0) {
        columns.push(escapeIdentifier(key));

        // Form set clause for all columns but id
        if (key !== IdField)
          setClause += `,${escapeIdentifier(key)} = ${TempFromAlias}.${escapeIdentifier(key)}`;
      }

      // Collect values, left untyped so Postgres parses each one as its column's type
      recordValueHolders += `,$${++numValues}`;
      values.push(value ?? null);
    });

    if (numValues / columns.length !== recordIndex + 1)
      throw new Error(`All records must have the same number of non-relational properties. Record ${recordIndex} is misshapen.`);

    // Append value placeholders
    valueHolders += `,(${recordValueHolders.slice(1)})`;
  });

  // A leading row of typed nulls gives every column its table type, even when all its values are null; its null id matches nothing
  const typedRow = `(${columns.map((column) => `(SELECT ${column} FROM ${body.table} WHERE false)`).join()})`;

  const text = `UPDATE ${body.table} ${FromAlias} SET ${setClause.slice(1)} from (values ${typedRow}${valueHolders}) as ${TempFromAlias}(${columns.join()}) WHERE ${FromAlias}."${IdField}" = ${TempFromAlias}."${IdField}" RETURNING ${FromAlias}.*`;
  const response = await client.query(text, values);

  return response.rows;
}
