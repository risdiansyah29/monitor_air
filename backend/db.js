const { Pool } = require('pg');
require('dotenv').config({ override: true });

let connectionString = process.env.DATABASE_URL;

if (connectionString) {
  // Regex untuk memisahkan protocol, user, password, dan sisa host/port/db
  const match = connectionString.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@]+)$/);
  if (match) {
    const protocol = match[1];
    const user = match[2];
    const password = match[3];
    const rest = match[4];
    
    // Jika password mengandung karakter spesial dan belum di-encode, encode secara otomatis
    if (password.includes('#') || password.includes('@') || password.includes(':') || password.includes('/')) {
      const encodedPassword = encodeURIComponent(decodeURIComponent(password));
      connectionString = `${protocol}${user}:${encodedPassword}@${rest}`;
    }
  }
}

// Buat pool koneksi ke Supabase PostgreSQL
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Diperlukan untuk koneksi aman ke Supabase
  }
});

pool.on('connect', () => {
  console.log('Connected to the Supabase PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Supabase client:', err.message);
});

// Wrapper agar query kompatibel dengan pemanggilan SQLite/MySQL lama (?)
const promiseDb = {
  query: async (sql, params = []) => {
    try {
      let pgSql = sql;
      let index = 1;
      
      // Ubah tanda "?" menjadi "$1", "$2", dst. untuk standar PostgreSQL
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${index++}`);
      }

      // Jalankan query ke PostgreSQL
      const res = await pool.query(pgSql, params);

      // Kembalikan data sesuai format pemanggilan di server.js / arduino.js
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return [res.rows];
      } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // Jika kueri INSERT memiliki 'RETURNING id', kita ambil id tersebut
        const insertId = res.rows[0]?.id || null;
        return [{ insertId: insertId, affectedRows: res.rowCount }];
      } else {
        return [{ affectedRows: res.rowCount }];
      }
    } catch (error) {
      console.error('Database Query Error:', error.message);
      throw error;
    }
  }
};

module.exports = promiseDb;
