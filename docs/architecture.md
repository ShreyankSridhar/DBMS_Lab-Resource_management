# System Architecture & Technical Design

**Project**: University Lab Resources Allocation System  
**Level**: DBMS Level 3 Academic Project  
**Author**: Shreyank S (PES1UG24CS443)  

---

## 1. High-Level Architectural Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|  Next.js 15+ React 19 Frontend (Tailwind CSS, Lucide Icons, Responsive Shell)   |
+---------------------------------------------------------------------------------+
                                      |
                           HTTPS / Secure Cookies
                                      v
+---------------------------------------------------------------------------------+
|                                APPLICATION TIER                                 |
|  - Next.js App Router API Route Handlers (/api/*)                               |
|  - Jose JWT Session Verification & Role Authorization Middleware                |
|  - Zod Request Validation & Sanitization                                        |
|  - Concurrency-Safe Resource Allocation Engine (Deadlock-Free Sorting)          |
+---------------------------------------------------------------------------------+
                   |                                           |
                   | ACID Transaction                          | Async Outbox Relay
                   v                                           v
+-----------------------------------------+   +-----------------------------------+
|         PRIMARY RELATIONAL DBMS         |   |      SECOND DATABASE PARADIGM     |
|             MySQL 8.0+ (InnoDB)         |   |           MongoDB 6.0+            |
|  - Normalized 3NF/BCNF Schema           |   |  - audit_events Collection        |
|  - Primary & Composite Foreign Keys     |   |  - Polymorphic JSON Metadata      |
|  - Row-Level Locking (SELECT FOR UPDATE)|   |  - Multi-Stage Aggregation Engine |
|  - Stored Procedures & Functions        |   |  - Embedded MongoMemoryServer     |
|  - Integrity & Audit Triggers           |   |    for zero-config local demo     |
|  - SQL Views (view_lab_utilization)     |   +-----------------------------------+
|  - Transactional outbox_events Table    |                     ^
+-----------------------------------------+                     |
                   |                                            |
                   +------ Reliable Outbox Worker Engine -------+
```

---

## 2. The Dual-Database Paradigm Rationale

### Why MySQL for the Relational Core?
1. **Strict ACID Guarantees**: Lab resource reservations demand immediate consistency. A workstation cannot be booked twice under any circumstances.
2. **Referential Integrity**: Foreign keys with `ON DELETE CASCADE` and `ON DELETE RESTRICT` prevent orphaned records (e.g. deleting a lab with active bookings is rejected).
3. **Complex Aggregations & Views**: Relational algebra enables efficient SQL views (`view_lab_utilization`, `view_resource_availability`) computed at the storage layer.

### Why MongoDB for the Event Audit Stream?
1. **Schema Polymorphism**: Different actions generate vastly different metadata. A `BOOKING_APPROVED` event includes approval comments and admin IDs, while an `EQUIPMENT_MAINTENANCE` event records sensor diagnostic logs. Forcing this into rigid relational tables causes sparse, null-heavy schemas.
2. **High-Throughput Append Log**: Writing audit logs never competes with or locks active MySQL booking rows.
3. **Powerful Aggregation Framework**: MongoDB pipelines (`$group`, `$match`, `$dateToString`) enable flexible forensic dashboards without impacting operational OLTP performance.

---

## 3. Transactional Outbox Pattern Architecture

A major challenge in distributed architectures is the **Dual-Write Problem**: if the application writes to MySQL and then directly attempts to write to MongoDB, network latency or a temporary MongoDB outage could cause the audit record to be lost, leaving MySQL and MongoDB out of sync.

### Solution:
1. **Atomic Local Commit**: When a booking is submitted or approved, an `outbox_events` row is inserted in MySQL within the **same atomic database transaction** as the booking itself.
2. **Asynchronous / Retryable Dispatcher**: An outbox worker process polls or is triggered to read pending outbox rows, transmits them to MongoDB, and marks them `PROCESSED`.
3. **Fault Tolerance**: If MongoDB is temporarily unreachable, the outbox record status remains `PENDING` with an incremented `retry_count`. Once connectivity resumes, no committed events are lost.

---

## 4. Concurrency & Deadlock Prevention Strategy

Under high-volume student booking rushes (e.g. at the start of a semester), multiple transactions may attempt to allocate equipment concurrently.

1. **Deterministic Resource Locking Order**:
   - When a booking requests multiple equipment items (e.g. Resource #5 and Resource #1), the allocation engine **sorts the resource requests in strictly ascending order by `resource_id`** before initiating lock acquisition:
     $$\text{Lock Order: } R_1 \to R_2 \to \dots \to R_n$$
   - This eliminates circular-wait deadlock conditions ($T_1$ waiting for $R_2$ while holding $R_1$, and $T_2$ waiting for $R_1$ while holding $R_2$).

2. **Row-Level Locking**:
   - `SELECT ... FOR UPDATE` acquires exclusive locks on targeted rows during the transaction, preventing dirty reads and phantom updates on inventory counts.

---

## 5. Security & Threat Mitigation

- **SQL Injection Defense**: All queries are executed using parameterized prepared statements via Prisma ORM and `mysql2` placeholders (`?`).
- **Broken Object Level Authorization (BOLA / IDOR)**: Booking ownership checks are enforced on the server before mutation. A student cannot read or cancel another student's booking even by altering the URL ID.
- **Credential Protection**: Passwords are encrypted with salted Bcrypt (cost factor 10).
- **Session Protection**: JWT tokens are signed with HMAC-SHA256 using a server secret and transported via `httpOnly`, `SameSite=Lax` cookies, preventing client-side XSS token theft.
