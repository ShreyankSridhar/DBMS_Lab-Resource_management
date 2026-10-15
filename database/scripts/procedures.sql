-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Script: procedures.sql (Stored Procedures and Stored Functions)
-- ==============================================================================

USE university_lab_db;

DELIMITER $$

-- ------------------------------------------------------------------------------
-- Procedure 1: sp_check_lab_availability
-- Verifies whether a given laboratory room is free of bookings and maintenance
-- during a requested [start_time, end_time] interval.
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_check_lab_availability$$
CREATE PROCEDURE sp_check_lab_availability(
    IN p_lab_id INT,
    IN p_start_time DATETIME,
    IN p_end_time DATETIME,
    IN p_exclude_booking_id INT,
    OUT p_is_available BOOLEAN,
    OUT p_conflict_reason VARCHAR(255)
)
BEGIN
    DECLARE v_lab_status VARCHAR(50);
    DECLARE v_conflict_booking_id INT;
    DECLARE v_maintenance_id INT;

    -- 1. Validate inputs
    IF p_end_time <= p_start_time THEN
        SET p_is_available = FALSE;
        SET p_conflict_reason = 'Invalid interval: end_time must be strictly greater than start_time.';
    ELSE
        -- 2. Verify lab exists and is operational
        SELECT status INTO v_lab_status FROM labs WHERE id = p_lab_id;

        IF v_lab_status IS NULL THEN
            SET p_is_available = FALSE;
            SET p_conflict_reason = 'Lab does not exist.';
        ELSEIF v_lab_status = 'INACTIVE' THEN
            SET p_is_available = FALSE;
            SET p_conflict_reason = 'Laboratory is currently marked as INACTIVE by university administration.';
        ELSEIF v_lab_status = 'MAINTENANCE' THEN
            SET p_is_available = FALSE;
            SET p_conflict_reason = 'Laboratory is undergoing full facility maintenance.';
        ELSE
            -- 3. Check for overlapping scheduled maintenance windows
            SELECT id INTO v_maintenance_id
            FROM maintenance
            WHERE lab_id = p_lab_id
              AND status IN ('SCHEDULED', 'IN_PROGRESS')
              AND start_time < p_end_time 
              AND end_time > p_start_time
            LIMIT 1;

            IF v_maintenance_id IS NOT NULL THEN
                SET p_is_available = FALSE;
                SET p_conflict_reason = CONCAT('Lab has scheduled maintenance (Maintenance ID #', v_maintenance_id, ') during this interval.');
            ELSE
                -- 4. Check for overlapping APPROVED or PENDING bookings
                SELECT id INTO v_conflict_booking_id
                FROM bookings
                WHERE lab_id = p_lab_id
                  AND status IN ('APPROVED', 'PENDING')
                  AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
                  AND start_time < p_end_time 
                  AND end_time > p_start_time
                LIMIT 1;

                IF v_conflict_booking_id IS NOT NULL THEN
                    SET p_is_available = FALSE;
                    SET p_conflict_reason = CONCAT('Lab slot already reserved by Booking #', v_conflict_booking_id, '.');
                ELSE
                    SET p_is_available = TRUE;
                    SET p_conflict_reason = 'Lab is available.';
                END IF;
            END IF;
        END IF;
    END IF;
END$$

-- ------------------------------------------------------------------------------
-- Procedure 2: sp_calculate_resource_available_qty
-- Calculates the exact remaining quantity of an equipment resource across
-- an interval [p_start_time, p_end_time] considering active reservations and maintenance.
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_resource_available_qty$$
CREATE PROCEDURE sp_calculate_resource_available_qty(
    IN p_resource_id INT,
    IN p_start_time DATETIME,
    IN p_end_time DATETIME,
    IN p_exclude_booking_id INT,
    OUT p_available_qty INT
)
BEGIN
    DECLARE v_total_qty INT DEFAULT 0;
    DECLARE v_booked_qty INT DEFAULT 0;
    DECLARE v_in_maintenance BOOLEAN DEFAULT FALSE;

    -- Fetch total inventory for the resource
    SELECT total_quantity INTO v_total_qty
    FROM resources
    WHERE id = p_resource_id;

    -- Check if resource is under maintenance during this period
    IF EXISTS (
        SELECT 1 FROM maintenance
        WHERE resource_id = p_resource_id
          AND status IN ('SCHEDULED', 'IN_PROGRESS')
          AND start_time < p_end_time
          AND end_time > p_start_time
    ) THEN
        SET v_in_maintenance = TRUE;
    END IF;

    IF v_in_maintenance THEN
        SET p_available_qty = 0;
    ELSE
        -- Sum up quantities reserved in overlapping active bookings
        SELECT COALESCE(SUM(bi.quantity_requested), 0) INTO v_booked_qty
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE bi.resource_id = p_resource_id
          AND b.status IN ('APPROVED', 'PENDING')
          AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
          AND b.start_time < p_end_time
          AND b.end_time > p_start_time;

        SET p_available_qty = GREATEST(0, v_total_qty - v_booked_qty);
    END IF;
END$$

-- ------------------------------------------------------------------------------
-- Procedure 3: sp_process_booking_approval
-- Atomic transaction processing for approving or rejecting a booking.
-- Locks relevant records, re-verifies availability to prevent race conditions,
-- logs the approval decision, emits notifications and an outbox event.
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_process_booking_approval$$
CREATE PROCEDURE sp_process_booking_approval(
    IN p_booking_id INT,
    IN p_admin_id INT,
    IN p_decision ENUM('APPROVED', 'REJECTED'),
    IN p_comments TEXT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_lab_id INT;
    DECLARE v_start DATETIME;
    DECLARE v_end DATETIME;
    DECLARE v_user_id INT;
    DECLARE v_is_lab_avail BOOLEAN;
    DECLARE v_conflict_msg VARCHAR(255);

    -- Declare handler for unexpected SQL exceptions
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An unexpected SQL exception occurred. Transaction rolled back.';
    END;

    START TRANSACTION;

    -- Row-level lock on the target booking
    SELECT status, lab_id, start_time, end_time, user_id
    INTO v_current_status, v_lab_id, v_start, v_end, v_user_id
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Booking record not found.';
        LEAVE proc_label;
    END IF;

    IF v_current_status != 'PENDING' THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = CONCAT('Booking has already been resolved with status: ', v_current_status);
        LEAVE proc_label;
    END IF;

    -- If approving, re-verify availability of lab
    IF p_decision = 'APPROVED' THEN
        CALL sp_check_lab_availability(v_lab_id, v_start, v_end, p_booking_id, v_is_lab_avail, v_conflict_msg);
        IF NOT v_is_lab_avail THEN
            ROLLBACK;
            SET p_success = FALSE;
            SET p_message = CONCAT('Cannot approve: ', v_conflict_msg);
            LEAVE proc_label;
        END IF;
    END IF;

    -- Update booking status
    UPDATE bookings 
    SET status = p_decision, updated_at = NOW() 
    WHERE id = p_booking_id;

    -- Record in approvals table
    INSERT INTO approvals (booking_id, admin_id, decision, comments, decided_at)
    VALUES (p_booking_id, p_admin_id, p_decision, p_comments, NOW())
    ON DUPLICATE KEY UPDATE 
        decision = p_decision, 
        comments = p_comments, 
        decided_at = NOW();

    -- Create in-app student notification
    INSERT INTO notifications (user_id, message, type, created_at)
    VALUES (
        v_user_id,
        CONCAT('Your booking request #', p_booking_id, ' has been ', p_decision, '. Notes: ', COALESCE(p_comments, 'No additional comments.')),
        IF(p_decision = 'APPROVED', 'BOOKING_APPROVED', 'BOOKING_REJECTED'),
        NOW()
    );

    -- Write to transactional outbox for asynchronous MongoDB audit ingestion
    INSERT INTO outbox_events (event_type, payload, status, created_at)
    VALUES (
        CONCAT('BOOKING_', p_decision),
        JSON_OBJECT(
            'booking_id', p_booking_id,
            'user_id', v_user_id,
            'lab_id', v_lab_id,
            'admin_id', p_admin_id,
            'decision', p_decision,
            'comments', p_comments,
            'timestamp', NOW()
        ),
        'PENDING',
        NOW()
    );

    COMMIT;
    SET p_success = TRUE;
    SET p_message = CONCAT('Booking #', p_booking_id, ' successfully ', p_decision);
END$$

-- ------------------------------------------------------------------------------
-- Function 1: fn_get_lab_total_hours
-- Returns the cumulative hours booked for a given laboratory in a date range.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_lab_total_hours$$
CREATE FUNCTION fn_get_lab_total_hours(
    p_lab_id INT,
    p_from_date DATETIME,
    p_to_date DATETIME
) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_hours DECIMAL(10,2) DEFAULT 0.00;

    SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60.0), 0.00)
    INTO v_total_hours
    FROM bookings
    WHERE lab_id = p_lab_id
      AND status = 'APPROVED'
      AND start_time >= p_from_date
      AND end_time <= p_to_date;

    RETURN v_total_hours;
END$$

DELIMITER ;
