import { QueryDefinition } from "../types/db.types";
import { Client } from "pg";
import { isEmpty } from "../utils/object.utils";
import { FromAlias, compileWhere, withRelations } from "../utils/query.utils";

/** Retrieves one record from a PostgreSQL database */
export async function selectOne(client: Client, body: QueryDefinition) {
  const where = compileWhere(body.where);

  const mainRes = await client.query(`SELECT * FROM ${body.table} ${FromAlias} ${where} LIMIT 1`);
  const main = mainRes.rows[0];
  if (!main) return null;

  const expansions = body.expand;
  if (expansions && !isEmpty(expansions)) {
    const expanded = await withRelations(client, [main], expansions);
    return expanded[0];
  }

  return main;
}