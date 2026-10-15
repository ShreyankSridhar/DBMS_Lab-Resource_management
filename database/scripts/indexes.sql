-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Script: indexes.sql (Performance Optimization & Indexing Strategy)
-- ==============================================================================

USE university_lab_db;

-- ------------------------------------------------------------------------------
-- 1. Index on Bookings for Conflict Detection (Critical Hot Path)
-- Query: Check if lab has overlapping approved or pending bookings
-- Filter: WHERE lab_id = ? AND status IN ('APPROVED', 'PENDING') 
--               AND start_time < requested_end AND end_time > requested_start
-- Rationale: A composite B-Tree index covering lab_id, start_time, end_time, and status
-- eliminates full-table scans during concurrency checks and booking submissions.
-- ------------------------------------------------------------------------------
CREATE INDEX idx_bookings_lab_times 
ON bookings (lab_id, start_time, end_time, status);

-- ------------------------------------------------------------------------------
-- 2. Index on Bookings for Student / Faculty Portal
-- Query: Display user's personal booking history ordered by timestamp
-- Filter: WHERE user_id = ? ORDER BY created_at DESC
-- ------------------------------------------------------------------------------
CREATE INDEX idx_bookings_user_created 
ON bookings (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. Index on Bookings for Admin Approval Workflow
-- Query: Fetch all pending requests awaiting administrative decision
-- Filter: WHERE status = 'PENDING'
-- ------------------------------------------------------------------------------
CREATE INDEX idx_bookings_status 
ON bookings (status);

-- ------------------------------------------------------------------------------
-- 4. Index on Maintenance Schedules for Availability Check
-- Query: Find maintenance blocks covering a lab or resource in a given window
-- Filter: WHERE lab_id = ? AND status IN ('SCHEDULED', 'IN_PROGRESS')
--               AND start_time < requested_end AND end_time > requested_start
-- ------------------------------------------------------------------------------
CREATE INDEX idx_maintenance_lab_window 
ON maintenance (lab_id, start_time, end_time, status);

CREATE INDEX idx_maintenance_resource_window 
ON maintenance (resource_id, start_time, end_time, status);

-- ------------------------------------------------------------------------------
-- 5. Index on Resources for Inventory and Filtering
-- Query: Filter equipment by lab or category
-- Filter: WHERE lab_id = ? AND category_id = ?
-- ------------------------------------------------------------------------------
CREATE INDEX idx_resources_lab_cat 
ON resources (lab_id, category_id);

-- ------------------------------------------------------------------------------
-- 6. Index on Booking Items for Equipment Demand & Quantity Aggregation
-- Query: Calculate total units reserved for a given resource across active bookings
-- Filter: JOIN bookings b ON bi.booking_id = b.id WHERE bi.resource_id = ?
-- ------------------------------------------------------------------------------
CREATE INDEX idx_booking_items_resource 
ON booking_items (resource_id, booking_id);

-- ------------------------------------------------------------------------------
-- 7. Index on Notifications for Unread Badge Counts
-- Query: Show unread alerts for current logged-in user
-- Filter: WHERE user_id = ? AND read_at IS NULL
-- ------------------------------------------------------------------------------
CREATE INDEX idx_notifications_user_read 
ON notifications (user_id, read_at);

-- ------------------------------------------------------------------------------
-- 8. Index on Outbox Events for Async Event Dispatcher (MySQL -> MongoDB)
-- Query: Worker selects unprocessed events in chronological order
-- Filter: WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT ?
-- ------------------------------------------------------------------------------
CREATE INDEX idx_outbox_status_created 
ON outbox_events (status, created_at ASC);

-- ------------------------------------------------------------------------------
-- 9. Index on Audit Logs for Admin Forensics
-- Query: Filter audit trails by entity type and record ID
-- Filter: WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC
-- ------------------------------------------------------------------------------
CREATE INDEX idx_audit_entity 
ON audit_logs (entity_type, entity_id);

CREATE INDEX idx_audit_created 
ON audit_logs (created_at DESC);
