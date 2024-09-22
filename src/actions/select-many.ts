import { QueryDefinition, SubAction } from "../types/db.types";
import { Client } from "pg";
import { isEmpty } from "../utils/object.utils";
import { FromAlias, compileOrder, compileWhere, withRelations } from "../utils/query.utils";

/** Retrieves multiple records from a PostgreSQL database */
export async function selectMany(client: Client, body: QueryDefinition) {
  const where = compileWhere(body.where, body.page, body.order);
  const limit = body.limit ? `LIMIT ${body.limit}` : '';
  const order = compileOrder(body.order);
  const count = body.subAction === SubAction.Count;
  const target = count ? 'COUNT(*)' : '*';

  // Retrieve main records
  const mainRes = await client.query(`SELECT ${target} FROM ${body.table} ${FromAlias} ${where} ${order} ${limit}`);
  if (mainRes.rowCount === 0) return null;
  const main = mainRes.rows;

  if (count) return main[0];

  const expansions = body.expand;
  return expansions && !isEmpty(expansions) ? await withRelations(client, main, expansions) : main;
}