# Database Architecture & Relational Schema Design

**System**: University Lab Resources Allocation System  
**Database**: `university_lab_db` (MySQL 8.0+) & `university_lab_audit` (MongoDB 6.0+)  
**Level**: DBMS Level 3  

---

## 1. Relational Database Normalization

The relational schema is rigorously designed to satisfy **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)** to prevent insertion, deletion, and update anomalies.

1. **First Normal Form (1NF)**:
   - All attributes contain only atomic values.
   - Repeating groups (such as equipment items per booking) are decomposed into the associative entity `booking_items`.
   - Every table possesses an explicit primary key (`id INT AUTO_INCREMENT`).

2. **Second Normal Form (2NF)**:
   - Every non-key attribute is fully functionally dependent on the entire primary key.
   - In `booking_items`, `quantity_requested` is fully dependent on the surrogate primary key `id` (and the candidate key `(booking_id, resource_id)`).

3. **Third Normal Form (3NF)**:
   - There are no transitive dependencies. Non-key attributes do not depend on other non-key attributes.
   - Category information (`name`, `description`) is extracted to `resource_categories` so `resources` references `category_id` rather than repeating category strings.
   - Lab physical building and locations are stored solely in `labs` and referenced via foreign keys.
   - Derived availability is never stored as a mutable, denormalized column; it is calculated deterministically via queries and SQL views to prevent conflicting state.

---

## 2. Relational Schema Data Dictionary

### Table 1: `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique institutional user identifier |
| `name` | `VARCHAR(100)` | `NOT NULL` | Full legal name |
| `email` | `VARCHAR(150)` | `NOT NULL UNIQUE` | Official university email |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Salted Bcrypt/Argon2 password hash |
| `role` | `ENUM` | `'STUDENT','FACULTY','ADMIN','LAB_MANAGER'` | Institutional privilege level |
| `department` | `VARCHAR(100)` | `NOT NULL` | Academic department affiliation |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Registration timestamp |
| `updated_at` | `DATETIME` | `ON UPDATE CURRENT_TIMESTAMP` | Last profile update timestamp |

### Table 2: `labs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique laboratory room identifier |
| `name` | `VARCHAR(100)` | `NOT NULL` | Facility name (e.g. AI Lab) |
| `building` | `VARCHAR(100)` | `NOT NULL` | Campus building |
| `location` | `VARCHAR(100)` | `NOT NULL` | Floor and room number |
| `capacity` | `INT` | `NOT NULL, CHECK (capacity > 0)` | Maximum student capacity |
| `description`| `TEXT` | `NULL` | Facility capabilities & safety rules |
| `status` | `ENUM` | `'AVAILABLE','MAINTENANCE','RESERVED','INACTIVE'` | Operational status |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |

### Table 3: `resource_categories`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Category taxonomy identifier |
| `name` | `VARCHAR(100)` | `NOT NULL UNIQUE` | Category name (e.g., GPU Workstations) |
| `description`| `TEXT` | `NULL` | Classification scope description |

### Table 4: `resources`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique hardware asset identifier |
| `lab_id` | `INT` | `FK -> labs(id) ON DELETE CASCADE` | Assigned laboratory room |
| `category_id`| `INT` | `FK -> resource_categories(id) ON DELETE RESTRICT` | Equipment category taxonomy |
| `name` | `VARCHAR(150)` | `NOT NULL` | Model / equipment name |
| `description`| `TEXT` | `NULL` | Technical hardware specifications |
| `total_quantity` | `INT` | `DEFAULT 1, CHECK (total_quantity >= 0)` | Physical units inventory |
| `status` | `ENUM` | `'AVAILABLE','MAINTENANCE','DECOMMISSIONED'` | Asset operational health |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record timestamp |
| `updated_at` | `DATETIME` | `ON UPDATE CURRENT_TIMESTAMP` | Modification timestamp |

### Table 5: `bookings`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique reservation transaction ID |
| `user_id` | `INT` | `FK -> users(id) ON DELETE CASCADE` | Applicant student/faculty member |
| `lab_id` | `INT` | `FK -> labs(id) ON DELETE RESTRICT` | Reserved laboratory room |
| `purpose` | `TEXT` | `NOT NULL` | Academic project justification |
| `start_time` | `DATETIME` | `NOT NULL` | Reservation window start |
| `end_time` | `DATETIME` | `NOT NULL, CHECK (end_time > start_time)` | Reservation window end |
| `status` | `ENUM` | `'PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED'` | Workflow state |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Submission timestamp |
| `updated_at` | `DATETIME` | `ON UPDATE CURRENT_TIMESTAMP` | State transition timestamp |

### Table 6: `booking_items`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Item allocation identifier |
| `booking_id` | `INT` | `FK -> bookings(id) ON DELETE CASCADE` | Parent reservation |
| `resource_id`| `INT` | `FK -> resources(id) ON DELETE RESTRICT` | Reserved equipment asset |
| `quantity_requested` | `INT` | `DEFAULT 1, CHECK (quantity_requested > 0)` | Number of physical units |

### Table 7: `approvals`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Administrative decision record |
| `booking_id` | `INT` | `FK -> bookings(id) ON DELETE CASCADE, UNIQUE` | 1-to-1 link to reservation |
| `admin_id` | `INT` | `FK -> users(id) ON DELETE RESTRICT` | Authorizing administrator |
| `decision` | `ENUM` | `'APPROVED','REJECTED'` | Final review outcome |
| `comments` | `TEXT` | `NULL` | Administrative feedback / reason |
| `decided_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Decision timestamp |

### Table 8: `maintenance`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Outage event identifier |
| `resource_id`| `INT` | `FK -> resources(id) ON DELETE SET NULL` | Target equipment (if applicable) |
| `lab_id` | `INT` | `FK -> labs(id) ON DELETE SET NULL` | Target facility (if applicable) |
| `start_time` | `DATETIME` | `NOT NULL` | Maintenance start window |
| `end_time` | `DATETIME` | `NOT NULL, CHECK (end_time > start_time)` | Maintenance end window |
| `description`| `TEXT` | `NOT NULL` | Scope of work / reason |
| `status` | `ENUM` | `'SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'` | Outage progress state |
| `created_by` | `INT` | `FK -> users(id) ON DELETE RESTRICT` | Scheduling admin user |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Scheduling timestamp |

### Table 9: `outbox_events` (Reliability Bridge to MongoDB)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Outbox event identifier |
| `event_type` | `VARCHAR(100)`| `NOT NULL` | Event classifier (e.g. BOOKING_APPROVED) |
| `payload` | `LONGTEXT` | `NOT NULL` | JSON document containing full event data |
| `status` | `ENUM` | `'PENDING','PROCESSED','FAILED'` | Ingestion status to MongoDB |
| `retry_count`| `INT` | `DEFAULT 0` | Exponential retry tracker |
| `error_message`| `TEXT` | `NULL` | Exception details if sync failed |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Event timestamp |
| `processed_at`| `DATETIME` | `NULL` | MongoDB write confirmation timestamp |

---

## 3. Advanced Relational DBMS Features

### 3.1 Views
1. `view_lab_utilization`: Computes cumulative approved reservation hours and estimated monthly facility utilization percentage.
2. `view_resource_availability`: Computes real-time active inventory subtracting ongoing reservations and maintenance windows.
3. `view_pending_bookings`: Joins applicants, facility records, and items count for the administrative approval queue.
4. `view_booking_summaries`: Denormalized summary query aggregating bookings, approval notes, and comma-separated equipment items.

### 3.2 Stored Procedures & Stored Functions
- `sp_check_lab_availability`: Verifies whether a laboratory is free during `[start_time, end_time]` using the interval overlap condition.
- `sp_calculate_resource_available_qty`: Sums overlapping booking item quantities and verifies equipment maintenance to return the exact available units.
- `sp_process_booking_approval`: Atomic transaction that locks the booking record (`FOR UPDATE`), checks for newly conflicting slots, updates status, writes the approval record, sends notification, and writes an outbox event.
- `fn_get_lab_total_hours`: Deterministic stored function returning total hours booked for a lab across a custom date range.

### 3.3 Database Triggers
- `trg_bookings_before_insert`: Validates `end_time > start_time`.
- `trg_bookings_before_update`: Prevents reactivating `CANCELLED` or `REJECTED` bookings and validates updated intervals.
- `trg_bookings_after_update_audit`: Automatically writes an audit row whenever a booking status shifts.
- `trg_resources_before_update`: Safeguards against negative inventory.
- `trg_maintenance_before_insert`: Ensures either `lab_id` or `resource_id` is supplied and interval is valid.

---

## 4. Second Database Paradigm: MongoDB Event Sourcing

### Why MySQL for Bookings vs. MongoDB for Audit?
| Architectural Concern | MySQL (Relational Core) | MongoDB (Audit & Activity Stream) |
|---|---|---|
| **Primary Responsibility** | Authoritative state, bookings, inventory counts | Chronological event stream, forensic audit, flexible metadata |
| **Data Model** | Strictly typed, normalized tables, foreign keys | Polymorphic document JSON without schema migration bottlenecks |
| **Consistency Model** | ACID transactions with row-level locks (`SELECT FOR UPDATE`) | Eventual consistency, high append throughput, immutable event log |
| **Concurrency Behavior** | Prevents race conditions and double bookings | High write performance without contention on booking tables |
| **Analytics Style** | Structured joins, SQL views, relational aggregations | Aggregation pipelines (`$group`, `$dateToString`, `$facet`) |

### MongoDB `audit_events` Document Schema
```json
{
  "_id": "ObjectId('670d9a1f8b2c4e0012a4b891')",
  "event_type": "BOOKING_APPROVED",
  "actor_user_id": 1,
  "actor_email": "admin@university.edu",
  "actor_role": "ADMIN",
  "entity_type": "BOOKING",
  "entity_id": 3,
  "timestamp": "2026-10-15T08:30:00.000Z",
  "metadata": {
    "booking_id": 3,
    "user_id": 4,
    "lab_id": 1,
    "decision": "APPROVED",
    "comments": "Approved for benchmark evaluation run."
  },
  "outcome": "SUCCESS"
}
```
