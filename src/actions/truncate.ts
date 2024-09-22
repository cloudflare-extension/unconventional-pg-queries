import { Client } from "pg";
import { QueryDefinition } from "../types/db.types";

/** Deletes all records and resets the primary key sequence */
export async function truncate(client: Client, body: QueryDefinition): Promise<any> {
  const text = `TRUNCATE TABLE ${body.table} RESTART IDENTITY CASCADE`;
  const response = await client.query(text);

  return response.rows;
}