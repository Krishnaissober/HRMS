INSERT INTO "Permission" ("id", "name", "description", "createdAt")
VALUES ('phase11_reports_export', 'reports.export', 'Export organization-scoped reports', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT DISTINCT rp."roleId", p_export."id"
FROM "RolePermission" rp
JOIN "Permission" p_existing ON p_existing."id" = rp."permissionId"
CROSS JOIN "Permission" p_export
WHERE p_existing."name" IN ('dashboard.hr.read', 'payroll.reports', 'audit.read')
  AND p_export."name" = 'reports.export'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
