import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getMySqlPool(): mysql.Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:root@127.0.0.1:3306/university_lab_db';
    
    // Parse connection string or pass as url
    pool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      dateStrings: true,
    });
  }
  return pool;
}

/**
 * Execute raw query using mysql2 pool
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  const p = getMySqlPool();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}

/**
 * Execute query inside an explicit transactional connection with custom isolation level
 */
export async function withTransaction<T>(
  action: (conn: mysql.PoolConnection) => Promise<T>,
  isolationLevel: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' = 'REPEATABLE READ'
): Promise<T> {
  const p = getMySqlPool();
  const conn = await p.getConnection();
  try {
    await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    await conn.beginTransaction();

    const result = await action(conn);

    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
