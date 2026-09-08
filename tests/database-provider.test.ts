import { describe, expect, it } from "vitest";
import { databaseProvider } from "../src/lib/database-provider";
import { readFileSync } from "node:fs";

describe("database provider compatibility", () => {
  it.each(["postgresql://user:pass@host/db", "postgres://user:pass@host/db"])(
    "uses PostgreSQL authentication for %s",
    (url) => expect(databaseProvider(url)).toBe("postgresql"),
  );
  it("keeps local SQLite authentication working", () => {
    expect(databaseProvider("file:./dev.db")).toBe("sqlite");
  });
  it.each(["", "mysql://host/db", "https://host/db"])("rejects unsupported URL %s", (url) => {
    expect(() => databaseProvider(url)).toThrow("DATABASE_URL");
  });
  it("keeps every PostgreSQL model identical to the local schema", () => {
    const canonical = readFileSync("prisma/schema.prisma", "utf8").replace(/\r\n/g, "\n");
    const deployed = readFileSync("prisma/postgresql/schema.prisma", "utf8").replace(/\r\n/g, "\n");
    expect(deployed).toBe(canonical.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));
  });
});
