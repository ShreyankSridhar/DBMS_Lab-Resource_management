# Test Plan and Verification Report

**Project**: University Lab Resources Allocation System  
**Level**: DBMS Level 3 Academic Project  
**Author**: Shreyank S (PES1UG24CS443)  

---

## 1. Test Strategy & Scope

The testing plan verifies:
1. **Mathematical correctness** of time interval overlap checks: `existing_start < requested_end AND existing_end > requested_start`.
2. **Concurrency safety** under simulated high-demand contention.
3. **Database constraint enforcement** via MySQL triggers and check constraints.
4. **Security & isolation**: Role-based access control and tenant data isolation.
5. **Dual-database consistency**: MySQL Transactional Outbox pattern to MongoDB document ingestion.

---

## 2. Test Cases Matrix

| TC # | Test Case Description | Input Scenario | Expected Outcome | Execution Result |
|---|---|---|---|---|
| **TC-01** | **Successful booking request** | Lab 1 free, slot 2026-11-05 10:00-12:00, requesting 2 units of RTX 4090 (24 in inventory) | Booking created with status `PENDING`, items stored, outbox record written | **PASSED** |
| **TC-02** | **Invalid time interval** | Start: 2026-11-05 14:00, End: 2026-11-05 12:00 (`end_time <= start_time`) | Rejected immediately with 400 Bad Request; Trigger raises SQLSTATE 45000 | **PASSED** |
| **TC-03** | **Overlapping lab booking** | Request for Lab 1 during an existing approved session (2026-10-16 11:00-13:00) | Blocked with 409 Conflict: "Lab slot already reserved by Booking #3" | **PASSED** |
| **TC-04** | **Insufficient equipment quantity** | Request 10 units of Dual RTX Rig when only 6 exist in total inventory | Rejected with 409 Conflict: "Insufficient inventory for Dual NVIDIA RTX A6000 Rig" | **PASSED** |
| **TC-05** | **Concurrent requests for final units** | 2 concurrent requests for the final 2 units of UR3e Robotic Arm | Deterministic locking order allocates to first transaction; second transaction fails and rolls back cleanly | **PASSED** |
| **TC-06** | **Booking approval workflow** | Admin approves pending booking #4 with comments | Status updated to `APPROVED`, approval row recorded, student notified, audit logged | **PASSED** |
| **TC-07** | **Booking rejection workflow** | Admin rejects pending booking #5 with comment "Cleanroom maintenance conflict" | Status set to `REJECTED`, reason saved, student notified | **PASSED** |
| **TC-08** | **Cancellation & Inventory Release** | Student cancels approved booking #1 | Status set to `CANCELLED`, all 4 reserved RTX 4090 units immediately return to available pool | **PASSED** |
| **TC-09** | **Maintenance conflict detection** | Request Lab 6 or Resource 8 during an active maintenance window | Blocked with 409 Conflict: "Lab has scheduled maintenance during this interval" | **PASSED** |
| **TC-10** | **Unauthorized access attempt** | Unauthenticated user accessing `/api/admin/bookings/pending` | HTTP 401 Unauthorized or 403 Forbidden | **PASSED** |
| **TC-11** | **Cross-student data isolation** | Student A attempting to access or cancel Student B's booking record | HTTP 403 Forbidden: "Access denied to other users bookings" | **PASSED** |
| **TC-12** | **Failed transaction & Rollback** | Speculative insert followed by equipment constraint failure | Explicit `ROLLBACK` executed; database verified to contain zero partial records | **PASSED** |
| **TC-13** | **Audit-event delivery & retry** | Simulating offline MongoDB during MySQL commit; reconnecting and processing outbox | Outbox event marked `FAILED` with retry counter incremented; subsequent run marks `PROCESSED` | **PASSED** |

---

## 3. Automated Test Execution Commands

```bash
# Run the automated unit & integration test suite using Vitest
npx vitest run tests/allocation.test.ts

# Run the MySQL SQL scripts verification
mysql -u root -p university_lab_db < database/scripts/queries_demo.sql
```
