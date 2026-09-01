import { forbiddenError } from "@/lib/errors";

export function assertTenantMatch(requestOrganizationId: string, recordOrganizationId: string) {
  if (requestOrganizationId !== recordOrganizationId) throw forbiddenError();
  return true;
}
