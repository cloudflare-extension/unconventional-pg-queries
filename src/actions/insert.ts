import { Client } from "pg";
import { PGQuery } from "../types/db.types";

/** Inserts one record into a PostgreSQL database */
export async function insert(client: Client, body: PGQuery) {
  if (!body.data) throw new Error('No data provided');

  const data = Array.isArray(body.data) ? body.data : [body.data];
  const conflictResolver = body.conflict;

  let columns: string[] = [],
    values: any[] = [],
    valueHolders = '',
    upsertSet = '',
    numValues = 0;

  data.forEach((record, recordIndex) => {
    let recordValueHolders = '';

    Object.entries(record).forEach(([key, value]) => {
      // Exclude relations
      if (body.expand?.[key]) return;

      // Collect column names on first pass through
      if (recordIndex === 0) {
        columns.push(`"${key}"`);
        if (conflictResolver) upsertSet += `,"${key}" = EXCLUDED."${key}"`;
      }

      // Collect values
      recordValueHolders += `,$${++numValues}`;
      values.push(value ?? null);
    });

    if (numValues / columns.length !== recordIndex + 1)
      throw new Error(`All records must have the same number of non-relational properties. Record ${recordIndex} is misshapen.`);

    // Append value placeholders
    valueHolders += `,(${recordValueHolders.slice(1)})`;
  });

  // Recover from conflicts
  let onConflict = '';
  if (conflictResolver?.constraint?.length) {
    const constraintKeys = conflictResolver.constraint.reduce((acc, key, index) => `${acc}${index > 0 ? ',' : ''}"${key}"`, '')
    onConflict = `ON CONFLICT (${constraintKeys}) ${conflictResolver.action} ${upsertSet.slice(1)}`
  }

  // Execute query
  const text = `INSERT INTO ${body.table} (${columns.join()}) VALUES ${valueHolders.slice(1)} ${onConflict} RETURNING *`;
  const response = await client.query(text, values);

  return Array.isArray(body.data) ? response.rows : response.rows[0];
}