import { QueryDefinition } from "../types/db.types";
import { Client } from "pg";
import { FromAlias, compileWhere } from "../utils/query.utils";

/** Updates one record in a PostgreSQL database */
export async function update(client: Client, body: QueryDefinition) {
  if (!body.data) throw new Error('No data provided');
  const data = Array.isArray(body.data) ? body.data[0] : body.data;

  if (!body.where) throw new Error('No id provided');
  const where = compileWhere(body.where);

  let columns = '',
    values: any[] = [];

  // Concatenate field names and values
  Object.entries(data).forEach(([key, value], index) => {
    if (body.expand?.[key]) return; // Exclude relations

    columns += `, "${key}" = $${index + 1}`;
    values.push(value ?? null);
  });

  const text = `UPDATE ${body.table} ${FromAlias} SET ${columns.slice(2)} ${where} RETURNING *`;
  const response = await client.query(text, values);

  return response.rowCount === 1 ? response.rows[0] : response.rows;
}