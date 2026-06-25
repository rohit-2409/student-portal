const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;
let useFallback = false;
const jsonDbPath = path.join(__dirname, '../students_db.json');

// Initialize JSON database with starting data if it doesn't exist
function initJsonDb() {
  if (!fs.existsSync(jsonDbPath)) {
    const starterData = [
      {
        id: 1,
        name: "Aarav Sharma",
        enrollment_number: "ENR-100201",
        email: "aarav.sharma@example.com",
        mobile_number: "9876543210",
        branch: "Computer Science & Engineering",
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: "Isha Patel",
        enrollment_number: "ENR-100202",
        email: "isha.patel@example.com",
        mobile_number: "9876543211",
        branch: "Information Technology",
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    fs.writeFileSync(jsonDbPath, JSON.stringify(starterData, null, 2));
  }
}

function readJsonDb() {
  try {
    initJsonDb();
    const data = fs.readFileSync(jsonDbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON DB:', err);
    return [];
  }
}

function writeJsonDb(data) {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing JSON DB:', err);
  }
}

// Perform MySQL initialization asynchronously
async function initMysql() {
  let setupConnection;
  try {
    // 1. Connect to MySQL without specifying database name first
    setupConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    // 2. Create the database if it doesn't exist
    await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'student_db'}\``);
    await setupConnection.end();

    // 3. Create the connection pool with the database selected
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'student_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 4. Create the students table if it doesn't exist
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        enrollment_number VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        mobile_number VARCHAR(15) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Successfully connected to MySQL database & verified schema.');
    connection.release();
  } catch (error) {
    console.error('\n================================================================');
    console.error('DATABASE CONNECTION ERROR: Could not connect to MySQL.');
    console.error('FALLBACK ACTIVATED: Falling back to local file storage (students_db.json).');
    console.error('Ensure MySQL is running and credentials in backend/.env are correct');
    console.error('if you want to use MySQL.');
    console.error('Error Details:', error.message);
    console.error('================================================================\n');
    useFallback = true;
    initJsonDb();
    if (setupConnection) {
      try { await setupConnection.end(); } catch (e) {}
    }
  }
}

// Start the initialization promise
const initPromise = initMysql();

// Expose a unified query and connection interface
const db = {
  query: async function (sql, params = []) {
    await initPromise;
    if (useFallback) {
      const cleanSql = sql.trim().replace(/\s+/g, ' ');
      const lowerSql = cleanSql.toLowerCase();

      // 1. SELECT * FROM students ORDER BY created_at DESC
      if (lowerSql.startsWith('select * from students')) {
        const students = readJsonDb();
        students.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
        return [students, []];
      }

      // 2b. SELECT id FROM students WHERE enrollment_number = ? AND id != ?
      if (lowerSql.includes('enrollment_number = ? and id != ?') || lowerSql.includes('enrollment_number=? and id!=?')) {
        const students = readJsonDb();
        const [enrollment, id] = params;
        const rows = students.filter(s => s.enrollment_number === enrollment && s.id !== parseInt(id)).map(s => ({ id: s.id }));
        return [rows, []];
      }

      // 2. SELECT id FROM students WHERE enrollment_number = ?
      if (lowerSql.includes('enrollment_number = ?') || lowerSql.includes('enrollment_number=?')) {
        const students = readJsonDb();
        const value = params[0];
        const rows = students.filter(s => s.enrollment_number === value).map(s => ({ id: s.id }));
        return [rows, []];
      }

      // 3b. SELECT id FROM students WHERE email = ? AND id != ?
      if (lowerSql.includes('email = ? and id != ?') || lowerSql.includes('email=? and id!=?')) {
        const students = readJsonDb();
        const [email, id] = params;
        const rows = students.filter(s => s.email === email && s.id !== parseInt(id)).map(s => ({ id: s.id }));
        return [rows, []];
      }

      // 3. SELECT id FROM students WHERE email = ? or email=?
      if (lowerSql.includes('email = ?') || lowerSql.includes('email=?')) {
        const students = readJsonDb();
        const value = params[0];
        const rows = students.filter(s => s.email === value).map(s => ({ id: s.id }));
        return [rows, []];
      }

      // 4. INSERT INTO students
      if (lowerSql.startsWith('insert into students')) {
        const students = readJsonDb();
        const [name, enrollment_number, email, mobile_number, branch] = params;
        const newId = students.length > 0 ? Math.max(...students.map(s => s.id || 0)) + 1 : 1;
        
        const newStudent = {
          id: newId,
          name,
          enrollment_number,
          email,
          mobile_number,
          branch,
          created_at: new Date().toISOString()
        };
        
        students.push(newStudent);
        writeJsonDb(students);
        return [{ insertId: newId }, []];
      }

      // 5. UPDATE students
      if (lowerSql.startsWith('update students')) {
        const students = readJsonDb();
        const [name, enrollment_number, email, mobile_number, branch, id] = params;
        const idx = students.findIndex(s => s.id === parseInt(id));
        if (idx !== -1) {
          students[idx] = {
            ...students[idx],
            name,
            enrollment_number,
            email,
            mobile_number,
            branch
          };
          writeJsonDb(students);
          return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
      }

      // 6. DELETE FROM students
      if (lowerSql.startsWith('delete from students')) {
        const students = readJsonDb();
        const id = params[0];
        const updated = students.filter(s => s.id !== parseInt(id));
        writeJsonDb(updated);
        return [{ affectedRows: 1 }, []];
      }

      throw new Error(`Unsupported SQL query in fallback mode: ${sql}`);
    } else {
      return pool.query(sql, params);
    }
  },

  getConnection: async function () {
    await initPromise;
    if (useFallback) {
      return {
        query: (sql, params) => db.query(sql, params),
        release: () => {}
      };
    } else {
      return pool.getConnection();
    }
  },

  isFallback: () => useFallback
};

module.exports = db;
