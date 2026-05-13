const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vision_canalplus'
});

(async () => {
  try {
    const conn = await pool.getConnection();
    
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║ DATABASE SCHEMA ANALYSIS                   ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    // Users table
    console.log('=== USERS TABLE ===');
    const [users] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' 
      ORDER BY ORDINAL_POSITION
    `);
    console.table(users);
    
    // Demandes Technicien table
    console.log('\n=== DEMANDES_TECHNICIEN TABLE ===');
    const [demandes] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_technicien' 
      ORDER BY ORDINAL_POSITION
    `);
    console.table(demandes);
    
    // Reabonnements table
    console.log('\n=== REABONNEMENTS TABLE ===');
    const [reabonnements] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reabonnements' 
      ORDER BY ORDINAL_POSITION
    `);
    console.table(reabonnements);
    
    // Commission Rules table
    console.log('\n=== COMMISSION_RULES TABLE ===');
    const [commissions] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commission_rules' 
      ORDER BY ORDINAL_POSITION
    `);
    console.table(commissions);
    
    conn.release();
    pool.end();
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
