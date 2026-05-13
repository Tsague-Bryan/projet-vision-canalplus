require('dotenv').config();
const pool = require('./backend/db');
(async () => {
  try {
    const [rows] = await pool.query('SELECT id, capture FROM demandes_recharge ORDER BY id DESC LIMIT 30');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
})();
