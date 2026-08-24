# School CRM — Backend Architecture & Engineering Standards

Every new backend module, endpoint, service, or feature created in this repository MUST strictly comply with these standards.

---

## 1. Clean Layered Architecture Rule
Every feature must follow this unidirectional flow with strict separation of concerns:

```text
Route (HTTP method & middleware binding only)
  ↓
Middleware (Auth, RBAC, File Uploads, WebP Conversion, Validation)
  ↓
Controller (Request extraction & response envelope formatting)
  ↓
Service (Business logic, calculations, domain rules, orchestration)
  ↓
Repository (MongoDB queries, aggregations, lean projections)
  ↓
Database (MongoDB multi-tenant scoped collection)
```

- **Routes**: No business logic.
- **Controllers**: Receive input, call service, return JSON envelope. Use `asyncHandler` or centralized try/catch.
- **Services**: All business validation, transactions, and state changes.
- **Repositories**: Pure database operations.

---

## 2. Mandatory Image Upload Rule (Automatic WebP)
- **Zero Raw Uncompressed Images**: Never save raw JPEG, PNG, or GIF files to disk.
- Any new endpoint receiving image files MUST use the standard upload middleware (`upload.utils.js` / `convertAllUploadedImagesToWebp`).
- Sharp automatically auto-rotates, strips metadata, limits dimensions to &le; 2048px, and outputs `.webp` (`quality: 82`).

---

## 3. Strict Multi-Tenant Isolation
- Every database query for tenant data MUST filter by `schoolId`.
- **Never trust `req.body.schoolId` or `req.query.schoolId`** for authorization. Always extract `schoolId` from verified JWT:
  ```js
  const schoolId = req.user.schoolId;
  ```

---

## 4. Search & Pagination Standards
- **ReDoS Prevention**: Never pass raw user search strings into `new RegExp()` or `$regex`. Always use:
  ```js
  import { escapeRegex } from '../../../shared/sanitize.js';
  const safe = escapeRegex(search);
  query.$or = [{ name: { $regex: safe, $options: 'i' } }];
  ```
- **Bounded Pagination**: Never allow unbounded queries like `limit=100000`. Always use `sanitizePagination({ page, limit, maxLimit: 100 })`.

---

## 5. Zero N+1 Queries & High Performance
- Avoid executing database queries inside loops (`.map(async () => ...)`).
- Use batch `$in` queries (`findYearsByIds`, `findClassesByIds`) or MongoDB `$group` aggregation pipelines.
- Use `Promise.all` for independent DB reads.
- Apply `.lean()` on read-only queries.

---

## 6. Standard API Response Envelope
- **Success**:
  ```json
  {
    "success": true,
    "message": "Resource fetched successfully",
    "data": {}
  }
  ```
- **Paginated List**:
  ```json
  {
    "success": true,
    "message": "Fetched successfully",
    "data": [],
    "pagination": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 }
  }
  ```
- **Error**:
  ```json
  {
    "success": false,
    "message": "Detailed readable error message",
    "code": "ERROR_CODE"
  }
  ```

---

## 7. Zero Mock Data Rule
- No mock data, hardcoded fake arrays, demo fallbacks, or static test objects in production routes. Everything must be connected end-to-end to MongoDB.
