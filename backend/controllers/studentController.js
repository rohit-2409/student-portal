const db = require('../config/db');

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM students ORDER BY created_at DESC');
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      dbType: db.isFallback && db.isFallback() ? 'Local JSON File' : 'MySQL'
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    
    // Provide a helpful hint in case the table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        success: false,
        error: 'Table "students" does not exist. Please run schema.sql first.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Server database error. Please verify MySQL service is running.'
    });
  }
};

// Add a new student
exports.addStudent = async (req, res) => {
  const { name, enrollment_number, email, mobile_number, branch } = req.body;

  // Simple validation
  if (!name || !enrollment_number || !email || !mobile_number || !branch) {
    return res.status(400).json({
      success: false,
      error: 'All fields (name, enrollment_number, email, mobile_number, branch) are required.'
    });
  }

  // Regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.'
    });
  }

  const mobileRegex = /^[0-9+\-\s]{10,15}$/;
  if (!mobileRegex.test(mobile_number)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid mobile number (10 to 15 digits).'
    });
  }

  try {
    // Check if enrollment number or email already exists
    const [existingEnrollment] = await db.query(
      'SELECT id FROM students WHERE enrollment_number = ?',
      [enrollment_number]
    );
    if (existingEnrollment.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A student with this Enrollment Number already exists.'
      });
    }

    const [existingEmail] = await db.query(
      'SELECT id FROM students WHERE email = ?',
      [email]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A student with this Email Address already exists.'
      });
    }

    // Insert student
    const [result] = await db.query(
      'INSERT INTO students (name, enrollment_number, email, mobile_number, branch) VALUES (?, ?, ?, ?, ?)',
      [name, enrollment_number, email, mobile_number, branch]
    );

    return res.status(201).json({
      success: true,
      message: 'Student added successfully!',
      data: {
        id: result.insertId,
        name,
        enrollment_number,
        email,
        mobile_number,
        branch
      }
    });
  } catch (error) {
    console.error('Error adding student:', error.message);

    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        success: false,
        error: 'Table "students" does not exist. Please run schema.sql first.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Database error. Failed to add student.'
    });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, enrollment_number, email, mobile_number, branch } = req.body;

  // Simple validation
  if (!name || !enrollment_number || !email || !mobile_number || !branch) {
    return res.status(400).json({
      success: false,
      error: 'All fields (name, enrollment_number, email, mobile_number, branch) are required.'
    });
  }

  // Regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.'
    });
  }

  const mobileRegex = /^[0-9+\-\s]{10,15}$/;
  if (!mobileRegex.test(mobile_number)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid mobile number (10 to 15 digits).'
    });
  }

  try {
    // Check if another student has this enrollment number
    const [existingEnrollment] = await db.query(
      'SELECT id FROM students WHERE enrollment_number = ? AND id != ?',
      [enrollment_number, id]
    );
    if (existingEnrollment.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Another student with this Enrollment Number already exists.'
      });
    }

    // Check if another student has this email address
    const [existingEmail] = await db.query(
      'SELECT id FROM students WHERE email = ? AND id != ?',
      [email, id]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Another student with this Email Address already exists.'
      });
    }

    // Update
    await db.query(
      'UPDATE students SET name = ?, enrollment_number = ?, email = ?, mobile_number = ?, branch = ? WHERE id = ?',
      [name, enrollment_number, email, mobile_number, branch, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully!'
    });
  } catch (error) {
    console.error('Error updating student:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Database error. Failed to update student.'
    });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM students WHERE id = ?', [id]);
    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting student:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Database error. Failed to delete student.'
    });
  }
};

