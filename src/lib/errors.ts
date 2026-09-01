export type ErrorCode = "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const validationError = (details?: unknown) => new AppError("VALIDATION_ERROR", "Request validation failed", 422, details);
export const unauthenticatedError = () => new AppError("UNAUTHENTICATED", "Authentication is required", 401);
export const forbiddenError = () => new AppError("FORBIDDEN", "You do not have permission to perform this action", 403);
export const notFoundError = () => new AppError("NOT_FOUND", "The requested resource was not found", 404);

export function errorResponse(error: unknown, requestId: string) {
  const appError = error instanceof AppError ? error : new AppError("INTERNAL_ERROR", error instanceof Error ? error.message : "An unexpected error occurred", 500);
  return Response.json({ success: false, error: { code: appError.code, message: appError.message, details: appError.details }, requestId }, { status: appError.status });
}
