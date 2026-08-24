# School CRM — Engineering & Architecture Guidelines

This project is a multi-tenant enterprise School Management System (CRM). All future development must strictly adhere to the following architecture and engineering guidelines.

---

## 1. Backend Architecture: Clean 5-Layer System

Every backend feature must be structured in 5 isolated layers:

1. **Route** (`routes/*.routes.js`):
   - Only defines HTTP paths, attaches middleware (`requireHR`, `requireSchoolAdmin`, `uploadFiles`, `convertImages`), and delegates to the controller.

2. **Middleware** (`middleware/*.js`):
   - JWT validation, RBAC checks, multipart file uploads, and WebP conversion.

3. **Controller** (`controllers/*.controller.js`):
   - Extracts request params/body, delegates to the service layer, and returns standardized response envelopes using `{ success, data, message }` or `sendSuccess` / `sendPaginated`.

4. **Service** (`services/*.service.js`):
   - Contains all domain business logic, validation rules, aggregations, and workflows.

5. **Repository** (`repositories/*.repository.js`):
   - Pure database access layer (Mongoose queries, `$group` pipelines, compound indexes, lean queries).

---

## 2. Mandatory Rules for Future Development

- **Automatic WebP Conversion**:
  - All file/photo upload routes must pass through `convertUploadedImageToWebp` / `convertAllUploadedImagesToWebp`. Raw JPG/PNG files must never be stored on disk.
- **Tenant Isolation**:
  - All tenant operations must query with `{ schoolId: req.user.schoolId }`. Never trust `schoolId` from request bodies.
- **ReDoS Prevention**:
  - Always sanitize regex queries with `escapeRegex(search)` from `backend/services/shared/sanitize.js`.
- **Bounded Pagination**:
  - Always enforce safe limits (`maxLimit: 100`) via `sanitizePagination()`.
- **Zero N+1 Queries**:
  - Never execute DB queries inside `.map()` loops. Use batch `$in` lookups or aggregation pipelines.
- **Zero Mock / Fallback Data**:
  - Every API and UI page must be 100% backend-driven connected directly to MongoDB.
