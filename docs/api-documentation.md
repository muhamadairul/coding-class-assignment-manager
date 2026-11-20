# API Documentation (`/api/v1`)

## Standard Response Envelope

### Success
```json
{
  "success": true,
  "message": "Data berhasil diproses",
  "data": {},
  "meta": null
}
```

### Paginated List
```json
{
  "success": true,
  "message": "Data berhasil diambil",
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 75
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Terjadi kesalahan",
  "errors": {}
}
```

---

## Health Check
- `GET /api/health` — Returns service & database connectivity status (`200 OK` / `503 Service Unavailable`).

## Admin Authentication (`Auth` Module)
- `POST /api/v1/admin/login` — Authenticate admin (`email`, `password`). Rate-limited (`15/min`). Returns Sanctum Bearer token.
- `POST /api/v1/admin/logout` — Revoke current Sanctum token (`auth:sanctum`).
- `GET /api/v1/admin/me` — Get current authenticated admin (`auth:sanctum`).

## Dashboard (`Dashboard` Module — `auth:sanctum`)
- `GET /api/v1/admin/dashboard` — Overview stats, 14-day trend, Class 10 vs 11 breakdown, assignment completion rates.
- `GET /api/v1/admin/dashboard/recent-submissions` — Filtered paginated recent submissions (`class`, `assignment_id`, `status`, `timeliness`, `date_from`, `date_to`).

## Assignments & Categories (`Assignments` Module — `auth:sanctum`)
- `GET /api/v1/admin/categories` — List all assignment categories.
- `GET /api/v1/admin/assignments` — Paginated list (`search`, `class_target`, `category_id`, `status`, `sort_by`, `sort_dir`).
- `POST /api/v1/admin/assignments` — Create assignment (multipart for optional `attachment`).
- `GET /api/v1/admin/assignments/{id}` — Assignment detail + completion summary.
- `PUT /api/v1/admin/assignments/{id}` (or `POST` for multipart) — Update assignment.
- `DELETE /api/v1/admin/assignments/{id}` — Safe soft-delete (preserves submission history).
- `GET /api/v1/admin/assignments/{id}/submissions` — Submissions for an assignment.
- `GET /api/v1/admin/assignments/{id}/students-status` — Lists of submitted & not-submitted target students.

## Students (`Students` Module — `auth:sanctum`)
- `GET /api/v1/admin/students` — Paginated master student list (`search`, `class`).
- `GET /api/v1/admin/students/{id}` — Student detail + all relevant assignments & submission statuses.
- `PUT /api/v1/admin/students/{id}` — Correct student `name` and `class`.
- `POST /api/v1/admin/students/{id}/recovery-token` — Issue a new opaque access token for a student who switched devices.
- `DELETE /api/v1/admin/students/{id}/tokens` — Revoke all active access tokens for a student.

## Submissions (`Submissions` Module — `auth:sanctum`)
- `GET /api/v1/admin/submissions` — Paginated submissions with filters.
- `GET /api/v1/admin/submissions/{id}` — Submission detail with files & revision histories.
- `PUT /api/v1/admin/submissions/{id}/review` — Mark `reviewed` with optional `admin_notes`.
- `PUT /api/v1/admin/submissions/{id}/request-revision` — Mark `revision_required` with required `admin_notes`.
- `GET /api/v1/admin/submissions/{id}/download` — Download single file or auto-bundled ZIP of all files.
- `GET /api/v1/admin/submissions/{id}/files/{fileId}/download` — Download or inline preview (`?inline=1`) an individual file.

## Public Student APIs (`Students`, `Assignments`, `Submissions` Modules)
- `GET /api/v1/public/categories` — Public list of assignment categories.
- `GET /api/v1/public/assignments` — Published assignments (`class`, `category_id`, `search`, `per_page`).
- `GET /api/v1/public/assignments/{id}` — Published assignment detail (includes `student_submission` if valid `X-Student-Token` header is sent).
- `GET /api/v1/public/assignments/{id}/attachment` — Download published assignment attachment.
- `POST /api/v1/public/students/identify` — Identify/register student by NIS. Returns `student_token`. Returns `409` if NIS exists with different name/class.
- `POST /api/v1/public/students/recover` — Verify a recovery token issued by admin.
- `POST /api/v1/public/submissions` — Submit assignment with multi-file upload (max 10 files, 10 MB each, transactional).

### Token-Protected Student Endpoints (`X-Student-Token` required)
- `GET /api/v1/public/me` — Get current authenticated student profile.
- `GET /api/v1/public/me/assignments` — Published assignments for student's class with `student_task_status` (`all`, `not_submitted`, `submitted`, `category_id`, `search`).
- `GET /api/v1/public/me/submissions` — Authenticated student's submission history.
- `POST /api/v1/public/submissions/{id}/revision` — Submit revision when status is `revision_required`.
- `GET /api/v1/public/submissions/{id}/files/{fileId}/download` — Download own submission file (anti-IDOR).
