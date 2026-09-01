import { z } from "zod";
import { validationError } from "@/lib/errors";

export function parseBody<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error.flatten());
  return result.data;
}

export function parseQuery<T extends z.ZodType>(schema: T, input: URLSearchParams): z.infer<T> {
  return parseBody(schema, Object.fromEntries(input.entries()));
}
