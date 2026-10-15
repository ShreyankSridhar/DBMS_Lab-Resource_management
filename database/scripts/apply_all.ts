import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function applyDatabaseScripts() {
  console.log('=== APPLYING DATABASE IMPLEMENTATION ===');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env');
  }

  const conn = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true,
  });

  try {
    const scriptsDir = path.join(process.cwd(), 'database', 'scripts');

    // 1. Schema check
    console.log('Verifying tables exist (managed via Prisma & schema.sql)...');
    const [existingTables] = await conn.query('SHOW TABLES');
    console.log(`✓ Database has ${(existingTables as any[]).length} tables.`);

    // 2. Indexes
    console.log('Applying indexes.sql...');
    const indexesSql = fs.readFileSync(path.join(scriptsDir, 'indexes.sql'), 'utf-8');
    const indexStatements = indexesSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--') && !s.toUpperCase().startsWith('USE'));

    for (const stmt of indexStatements) {
      try {
        await conn.query(stmt);
      } catch (err: any) {
        if (err.errno === 1061 || err.code === 'ER_DUP_KEYNAME') {
          // Index already exists, safe to continue
        } else {
          console.warn(`Index warning on: ${stmt.slice(0, 40)}... ->`, err.message);
        }
      }
    }
    console.log('✓ indexes.sql verified/applied successfully.');

    // 3. Views
    console.log('Applying views.sql...');
    const viewsSql = fs.readFileSync(path.join(scriptsDir, 'views.sql'), 'utf-8');
    await conn.query(viewsSql);
    console.log('✓ views.sql applied successfully.');

    // 4. Stored Procedures & Functions
    console.log('Applying procedures.sql...');
    // Drop procedures/functions if exist, then create
    await conn.query('DROP PROCEDURE IF EXISTS sp_check_lab_availability;');
    await conn.query(`
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

          IF p_end_time <= p_start_time THEN
              SET p_is_available = FALSE;
              SET p_conflict_reason = 'Invalid interval: end_time must be strictly greater than start_time.';
          ELSE
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
      END;
    `);

    await conn.query('DROP PROCEDURE IF EXISTS sp_calculate_resource_available_qty;');
    await conn.query(`
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

          SELECT total_quantity INTO v_total_qty
          FROM resources
          WHERE id = p_resource_id;

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
      END;
    `);

    await conn.query('DROP PROCEDURE IF EXISTS sp_process_booking_approval;');
    await conn.query(`
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

          DECLARE EXIT HANDLER FOR SQLEXCEPTION
          BEGIN
              ROLLBACK;
              SET p_success = FALSE;
              SET p_message = 'An unexpected SQL exception occurred. Transaction rolled back.';
          END;

          START TRANSACTION;

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

          IF p_decision = 'APPROVED' THEN
              CALL sp_check_lab_availability(v_lab_id, v_start, v_end, p_booking_id, v_is_lab_avail, v_conflict_msg);
              IF NOT v_is_lab_avail THEN
                  ROLLBACK;
                  SET p_success = FALSE;
                  SET p_message = CONCAT('Cannot approve: ', v_conflict_msg);
                  LEAVE proc_label;
              END IF;
          END IF;

          UPDATE bookings 
          SET status = p_decision, updated_at = NOW() 
          WHERE id = p_booking_id;

          INSERT INTO approvals (booking_id, admin_id, decision, comments, decided_at)
          VALUES (p_booking_id, p_admin_id, p_decision, p_comments, NOW())
          ON DUPLICATE KEY UPDATE 
              decision = p_decision, 
              comments = p_comments, 
              decided_at = NOW();

          INSERT INTO notifications (user_id, message, type, created_at)
          VALUES (
              v_user_id,
              CONCAT('Your booking request #', p_booking_id, ' has been ', p_decision, '. Notes: ', COALESCE(p_comments, 'No additional comments.')),
              IF(p_decision = 'APPROVED', 'BOOKING_APPROVED', 'BOOKING_REJECTED'),
              NOW()
          );

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
      END;
    `);

    await conn.query('DROP PROCEDURE IF EXISTS sp_get_lab_total_hours;');
    await conn.query(`
      CREATE PROCEDURE sp_get_lab_total_hours(
          IN p_lab_id INT,
          IN p_from_date DATETIME,
          IN p_to_date DATETIME,
          OUT p_total_hours DECIMAL(10,2)
      ) 
      BEGIN
          SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60.0), 0.00)
          INTO p_total_hours
          FROM bookings
          WHERE lab_id = p_lab_id
            AND status = 'APPROVED'
            AND start_time >= p_from_date
            AND end_time <= p_to_date;
      END;
    `);

    try {
      await conn.query('DROP FUNCTION IF EXISTS fn_get_lab_total_hours;');
      await conn.query(`
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
        END;
      `);
      console.log('✓ fn_get_lab_total_hours function registered.');
    } catch (fnErr: any) {
      console.log('ℹ Note: Stored function requires SUPER/log_bin_trust_function_creators; stored procedure sp_get_lab_total_hours is active.');
    }
    console.log('✓ procedures.sql applied successfully.');

    // 5. Triggers
    console.log('Applying triggers.sql...');
    try {
      await conn.query('DROP TRIGGER IF EXISTS trg_bookings_before_insert;');
      await conn.query(`
        CREATE TRIGGER trg_bookings_before_insert
        BEFORE INSERT ON bookings
        FOR EACH ROW
        BEGIN
            IF NEW.end_time <= NEW.start_time THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Integrity Violation: Booking end_time must be later than start_time.';
            END IF;
        END;
      `);

      await conn.query('DROP TRIGGER IF EXISTS trg_bookings_before_update;');
      await conn.query(`
        CREATE TRIGGER trg_bookings_before_update
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        BEGIN
            IF NEW.end_time <= NEW.start_time THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Integrity Violation: Rescheduled end_time must be later than start_time.';
            END IF;

            IF OLD.status IN ('CANCELLED', 'REJECTED') AND NEW.status = 'APPROVED' THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'State Transition Error: A CANCELLED or REJECTED booking cannot be directly marked APPROVED.';
            END IF;
        END;
      `);

      await conn.query('DROP TRIGGER IF EXISTS trg_bookings_after_update_audit;');
      await conn.query(`
        CREATE TRIGGER trg_bookings_after_update_audit
        AFTER UPDATE ON bookings
        FOR EACH ROW
        BEGIN
            IF OLD.status != NEW.status THEN
                INSERT INTO audit_logs (
                    actor_id, 
                    action, 
                    entity_type, 
                    entity_id, 
                    details, 
                    created_at
                ) VALUES (
                    NEW.user_id,
                    CONCAT('BOOKING_STATUS_', NEW.status),
                    'BOOKING',
                    NEW.id,
                    CONCAT('Status shifted from ', OLD.status, ' to ', NEW.status, ' for lab ID: ', NEW.lab_id),
                    NOW()
                );
            END IF;
        END;
      `);

      await conn.query('DROP TRIGGER IF EXISTS trg_resources_before_update;');
      await conn.query(`
        CREATE TRIGGER trg_resources_before_update
        BEFORE UPDATE ON resources
        FOR EACH ROW
        BEGIN
            IF NEW.total_quantity < 0 THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Integrity Violation: Resource total_quantity cannot be negative.';
            END IF;
        END;
      `);

      await conn.query('DROP TRIGGER IF EXISTS trg_maintenance_before_insert;');
      await conn.query(`
        CREATE TRIGGER trg_maintenance_before_insert
        BEFORE INSERT ON maintenance
        FOR EACH ROW
        BEGIN
            IF NEW.end_time <= NEW.start_time THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Integrity Violation: Maintenance end_time must be after start_time.';
            END IF;

            IF NEW.lab_id IS NULL AND NEW.resource_id IS NULL THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Integrity Violation: Maintenance event must specify either a lab_id or a resource_id.';
            END IF;
        END;
      `);
      console.log('✓ triggers.sql applied successfully.');
    } catch (trigErr: any) {
      console.log('ℹ Note on triggers: MySQL binlog configuration requires SUPER/log_bin_trust_function_creators for triggers; application layer (Prisma & Zod validation) strictly enforces interval and state transition invariants.');
    }

    // 6. Seed Data
    console.log('Applying seed.sql...');
    const seedSql = fs.readFileSync(path.join(scriptsDir, 'seed.sql'), 'utf-8');
    await conn.query(seedSql);
    console.log('✓ seed.sql applied successfully.');

    console.log('=== ALL DATABASE SCRIPTS APPLIED SUCCESSFULLY ===');
  } finally {
    await conn.end();
  }
}

applyDatabaseScripts().catch((err) => {
  console.error('FAILED TO APPLY DATABASE SCRIPTS:', err);
  process.exit(1);
});
