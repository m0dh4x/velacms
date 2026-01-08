import { Database } from "bun:sqlite";

export const db = new Database("./data/vela.db", { create: true });

db.exec("PRAGMA journal_mode = WAL;");
