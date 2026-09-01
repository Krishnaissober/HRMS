# AI DEVELOPMENT RULES

1. SRS.md is the functional source of truth.
2. ARCHITECTURE.md is the technical source of truth.
3. Do not invent requirements.
4. Do not use fake APIs or fake production data.
5. Do not hardcode business data.
6. Do not bypass authentication or authorization.
7. Do not bypass tenant isolation.
8. Do not put business logic inside UI components.
9. Do not access the database directly from UI components.
10. Reuse existing functionality before creating new functionality.
11. Every database change requires a migration.
12. Every API requires validation and authorization.
13. Every completed feature must be tested.
14. Never silently remove existing functionality.
15. Never silently change API contracts.
16. Keep documentation synchronized with implementation.
17. Do not mark a feature complete without verification.
18. Prefer simple, maintainable solutions over unnecessary complexity.
