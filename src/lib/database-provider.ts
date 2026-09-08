export function databaseProvider(url: string): "postgresql" | "sqlite" {
  if (/^postgres(ql)?:\/\//.test(url)) return "postgresql";
  if (url.startsWith("file:")) return "sqlite";
  throw new Error("DATABASE_URL must use postgresql://, postgres://, or file:");
}
