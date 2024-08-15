import { Client } from "pg";
import { FromAlias, compileWhere } from "../utils/query.utils";
import { QueryDefinition } from "../types/db.types";

/** Deletes records from a PostgreSQL database */
export async function destroy(client: Client, body: QueryDefinition): Promise<any> {
  if (!body.where) throw new Error('No id provided');

  const where = compileWhere(body.where);

  const text = `DELETE FROM ${body.table} ${FromAlias} ${where} RETURNING *`;
  const response = await client.query(text);

  return response.rows;
}