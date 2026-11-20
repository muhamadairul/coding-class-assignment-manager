# Database ERD & Schema Design

The database is designed for **PostgreSQL (Neon)** and is 100% compatible with standard ANSI SQL (also runnable on MySQL 8 for local setups). All timestamps are stored in UTC.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        bigint id PK
        string name
        string email UK
        string password
        timestamp created_at
        timestamp updated_at
    }

    STUDENTS {
        bigint id PK
        string name
        varchar nis UK
        string class
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    STUDENT_ACCESS_TOKENS {
        bigint id PK
        bigint student_id FK
        string token_hash UK
        timestamp last_used_at
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    ASSIGNMENT_CATEGORIES {
        bigint id PK
        string name
        string slug UK
        text description
        timestamp created_at
        timestamp updated_at
    }

    ASSIGNMENTS {
        bigint id PK
        bigint category_id FK
        bigint created_by FK
        string title
        string slug UK
        text description
        text instructions
        string class_target
        string attachment
        string attachment_original_name
        string attachment_disk
        timestamp start_date
        timestamp deadline
        string status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    SUBMISSIONS {
        bigint id PK
        bigint student_id FK
        bigint assignment_id FK
        timestamp submitted_at
        string status
        text notes
        text admin_notes
        timestamp created_at
        timestamp updated_at
    }

    SUBMISSION_FILES {
        bigint id PK
        bigint submission_id FK
        string original_name
        string file_path
        string disk
        string mime_type
        bigint file_size
        timestamp created_at
        timestamp updated_at
    }

    SUBMISSION_HISTORIES {
        bigint id PK
        bigint submission_id FK
        bigint student_id FK
        bigint assignment_id FK
        text notes
        text admin_notes
        string status
        int file_count
        timestamp submitted_at
        timestamp created_at
        timestamp updated_at
    }

    USERS ||--o{ ASSIGNMENTS : "creates"
    ASSIGNMENT_CATEGORIES ||--o{ ASSIGNMENTS : "categorizes"
    STUDENTS ||--o{ STUDENT_ACCESS_TOKENS : "owns"
    STUDENTS ||--o{ SUBMISSIONS : "submits"
    ASSIGNMENTS ||--o{ SUBMISSIONS : "receives"
    SUBMISSIONS ||--o{ SUBMISSION_FILES : "contains"
    SUBMISSIONS ||--o{ SUBMISSION_HISTORIES : "tracks"
    STUDENTS ||--o{ SUBMISSION_HISTORIES : "logs"
    ASSIGNMENTS ||--o{ SUBMISSION_HISTORIES : "references"
```

## Key Database Rules
- **Unique NIS**: `students.nis` is `VARCHAR(50)` with a unique index.
- **One Active Submission per Student/Assignment**: Composite unique constraint `(student_id, assignment_id)` on `submissions`.
- **Safe Deletion**: `assignments` and `students` use `softDeletes`; `submissions` uses `restrictOnDelete` so historical submissions are never accidentally wiped.
- **No Binary Storage in DB**: `submission_files` stores only metadata (`original_name`, UUID `file_path`, `disk`, `mime_type`, `file_size`).
- **Dynamic Timeliness**: Late status is derived from `submissions.submitted_at > assignments.deadline` rather than stored as a review status.
- **Dashboard Denominator Policy**: For each published assignment, target students are all active (non-deleted) students whose `class` matches `class_target` (`10`, `11`, or `all`).
