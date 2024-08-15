import { QueryDefinition } from "../types/db.types";
import { Client } from "pg";
import { FromAlias, IdField, TempFromAlias } from "../utils/query.utils";
import { getType } from "../utils/object.utils";

/** Updates one record in a PostgreSQL database */
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
        columns.push(`"${key}"`);

        // Form set clause for all columns but id
        if (key !== IdField)
          setClause += `,"${key}" = ${TempFromAlias}."${key}"`;
      }

      // Collect values
      const cast = getType(value);
      recordValueHolders += `,$${++numValues}${cast ? `::${cast}` : ''}`;
      values.push(value ?? null);
    });

    if (numValues / columns.length !== recordIndex + 1)
      throw new Error(`All records must have the same number of non-relational properties. Record ${recordIndex} is misshapen.`);

    // Append value placeholders
    valueHolders += `,(${recordValueHolders.slice(1)})`;
  });

  const text = `UPDATE ${body.table} ${FromAlias} SET ${setClause.slice(1)} from (values ${valueHolders.slice(1)}) as ${TempFromAlias}(${columns.join()}) WHERE ${FromAlias}."${IdField}" = ${TempFromAlias}."${IdField}" RETURNING *`;
  const response = await client.query(text, values);

  return response.rows;
}