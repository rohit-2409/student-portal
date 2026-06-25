import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api/students';

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dbOnline, setDbOnline] = useState('loading'); // 'loading' | 'online' | 'offline' | 'fallback'
  const [dbType, setDbType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  
  // Modals / Action States
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    enrollment_number: '',
    email: '',
    mobile_number: '',
    branch: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({});

  // Alert banner notification
  const [notification, setNotification] = useState(null); // { type: 'success'|'error'|'info', message: '' }

  // Form states (Enroll)
  const [formData, setFormData] = useState({
    name: '',
    enrollment_number: '',
    email: '',
    mobile_number: '',
    branch: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // List of standard branches for the dropdown
  const branches = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical Engineering',
    'Chemical Engineering'
  ];

  // Fetch all students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_BASE_URL);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStudents(data.data);
        setDbType(data.dbType || 'MySQL');
        setDbOnline(data.dbType === 'Local JSON File' ? 'fallback' : 'online');
        // Clear any previous error notification if it was about connection
        if (notification && notification.message.includes('backend')) {
          setNotification(null);
        }
      } else {
        setDbOnline('offline');
        setNotification({
          type: 'error',
          message: data.error || 'Failed to fetch student database records.'
        });
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setDbOnline('offline');
      setNotification({
        type: 'error',
        message: 'Could not connect to the backend server. Please verify the Express backend is running (port 5000).'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Validate form fields
  const validateForm = (data, setErrors) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[0-9+\-\s]{10,15}$/;
    const nameRegex = /^[a-zA-Z\s]+$/;

    if (!data.name.trim()) {
      errors.name = 'Name is required';
    } else if (!nameRegex.test(data.name.trim())) {
      errors.name = 'Name can only contain letters and spaces';
    }

    if (!data.enrollment_number.trim()) {
      errors.enrollment_number = 'Enrollment number is required';
    }

    if (!data.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!data.mobile_number.trim()) {
      errors.mobile_number = 'Mobile number is required';
    } else if (!mobileRegex.test(data.mobile_number.trim())) {
      errors.mobile_number = 'Enter a valid mobile number (10 to 15 digits)';
    }

    if (!data.branch) {
      errors.branch = 'Please select a branch';
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form inputs change handler (Enroll)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Form inputs change handler (Edit)
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (editFormErrors[name]) {
      setEditFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle enroll submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(formData, setFormErrors)) return;

    setSubmitting(true);
    setNotification(null);

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();

      if (response.ok && data.success) {
        setNotification({
          type: 'success',
          message: data.message || 'Student added successfully!'
        });
        
        // Reset form
        setFormData({
          name: '',
          enrollment_number: '',
          email: '',
          mobile_number: '',
          branch: ''
        });
        
        fetchStudents();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to add student.'
        });
      }
    } catch (err) {
      console.error('Error adding student:', err);
      setNotification({
        type: 'error',
        message: 'Could not connect to the server to add student. Please verify the backend is running.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      enrollment_number: student.enrollment_number,
      email: student.email,
      mobile_number: student.mobile_number,
      branch: student.branch
    });
    setEditFormErrors({});
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(editFormData, setEditFormErrors)) return;

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotification({
          type: 'success',
          message: data.message || 'Student records updated successfully!'
        });
        setEditingStudent(null);
        fetchStudents();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to update student records.'
        });
      }
    } catch (err) {
      console.error('Error updating student:', err);
      setNotification({
        type: 'error',
        message: 'Server error. Failed to update student records.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirm modal
  const confirmDelete = (student) => {
    setDeletingStudent(student);
  };

  // Process delete
  const handleDelete = async () => {
    if (!deletingStudent) return;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/${deletingStudent.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotification({
          type: 'success',
          message: data.message || 'Student record deleted successfully.'
        });
        setDeletingStudent(null);
        fetchStudents();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to delete student record.'
        });
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      setNotification({
        type: 'error',
        message: 'Server error. Failed to delete student record.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute Branch distribution statistics
  const totalCount = students.length;
  const branchStats = branches.map(branch => {
    const count = students.filter(s => s.branch === branch).length;
    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { branch, count, percentage };
  }).sort((a, b) => b.count - a.count);

  // Filter students
  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      student.name.toLowerCase().includes(query) ||
      student.enrollment_number.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    );
    const matchesBranch = selectedBranchFilter === '' || student.branch === selectedBranchFilter;
    return matchesSearch && matchesBranch;
  });

  // Get color variables dynamically for branch initial bubbles
  const getGradientForName = (name) => {
    const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'linear-gradient(135deg, #4f46e5, #06b6d4)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #f59e0b, #ec4899)',
      'linear-gradient(135deg, #3b82f6, #10b981)'
    ];
    return gradients[hash % gradients.length];
  };

  return (
    <div className="app-container">
      {/* Header section */}
      <header>
        <div className="logo-container animate-fade-in">
          <div className="logo-icon">S</div>
          <div className="logo-title">
            <h1>StudentPortal</h1>
            <p>Full-Stack Administration System</p>
          </div>
        </div>
        <div className="db-status animate-fade-in">
          <span className={`status-dot ${dbOnline}`}></span>
          <span>
            {dbOnline === 'online' && `Database: ${dbType} (Connected)`}
            {dbOnline === 'fallback' && `Database: ${dbType} (Fallback)`}
            {dbOnline === 'offline' && 'Database: Disconnected'}
            {dbOnline === 'loading' && 'Checking database status...'}
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Form & Statistics */}
        <div className="sidebar-column">
          {/* Form panel */}
          <section className="glass-card form-section animate-slide-up">
            <h2 className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Enroll New Student
            </h2>

            {notification && (
              <div className={`alert-banner ${notification.type} animate-slide-down`}>
                <div>{notification.message}</div>
                <button 
                  className="alert-banner-close" 
                  onClick={() => setNotification(null)}
                >
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`form-control ${formErrors.name ? 'error-border' : ''}`}
                  placeholder="e.g. John Doe"
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="enrollment_number">Enrollment Number</label>
                <input
                  type="text"
                  id="enrollment_number"
                  name="enrollment_number"
                  value={formData.enrollment_number}
                  onChange={handleInputChange}
                  className={`form-control ${formErrors.enrollment_number ? 'error-border' : ''}`}
                  placeholder="e.g. ENR-202610"
                />
                {formErrors.enrollment_number && <span className="error-text">{formErrors.enrollment_number}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-control ${formErrors.email ? 'error-border' : ''}`}
                  placeholder="e.g. johndoe@example.com"
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobile_number">Mobile Number</label>
                <input
                  type="tel"
                  id="mobile_number"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  className={`form-control ${formErrors.mobile_number ? 'error-border' : ''}`}
                  placeholder="e.g. 9876543210"
                />
                {formErrors.mobile_number && <span className="error-text">{formErrors.mobile_number}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branch">Academic Branch</label>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className={`form-control ${formErrors.branch ? 'error-border' : ''}`}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b, idx) => (
                    <option key={idx} value={b}>{b}</option>
                  ))}
                </select>
                {formErrors.branch && <span className="error-text">{formErrors.branch}</span>}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting || dbOnline === 'offline'}
              >
                {submitting ? (
                  <>
                    <span className="spinner"></span>
                    Enrolling...
                  </>
                ) : (
                  'Submit Enrollment'
                )}
              </button>
            </form>
          </section>

          {/* Academic Statistics breakdown */}
          <section className="glass-card stats-card animate-slide-up delay-1">
            <h2 className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Academic Breakdown
            </h2>
            <div className="stats-breakdown-list">
              {totalCount === 0 ? (
                <p className="no-stats-text">No enrollment stats available.</p>
              ) : (
                branchStats.map((stat, idx) => {
                  if (stat.count === 0) return null;
                  return (
                    <div key={idx} className="branch-stat-item">
                      <div className="branch-stat-info">
                        <span className="branch-stat-name">{stat.branch}</span>
                        <span className="branch-stat-count">
                          {stat.count} {stat.count === 1 ? 'student' : 'students'}
                        </span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill"
                          style={{ 
                            width: `${stat.percentage}%`,
                            background: getGradientForName(stat.branch) 
                          }}
                        ></div>
                        <span className="progress-percentage-label">{stat.percentage}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Student Directory */}
        <section className="main-content">
          {/* Summary Stats Cards */}
          <div className="stats-container animate-fade-in">
            <div className="stat-card">
              <div className="stat-info">
                <h3>Total Directory Records</h3>
                <p className="stat-number">{students.length}</p>
              </div>
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Active Databases</h3>
                <p className="stat-text" style={{ 
                  color: dbOnline === 'online' 
                    ? 'var(--success)' 
                    : dbOnline === 'fallback'
                    ? 'var(--warning)'
                    : 'var(--error)' 
                }}>
                  {dbOnline === 'online' && 'LIVE MYSQL'}
                  {dbOnline === 'fallback' && 'LOCAL BACKUP'}
                  {dbOnline === 'offline' && 'DATABASE OFFLINE'}
                  {dbOnline === 'loading' && 'SYNCHRONIZING'}
                </p>
              </div>
              <div className="stat-icon" style={{ 
                color: dbOnline === 'online' 
                  ? 'var(--success)' 
                  : dbOnline === 'fallback'
                  ? 'var(--warning)'
                  : 'var(--error)', 
                background: dbOnline === 'online' 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : dbOnline === 'fallback'
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)' 
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12A10 10 0 1 1 12 2v10z"/><path d="M12 2a15.3 15.3 0 0 1 4 10H12V2z"/></svg>
              </div>
            </div>
          </div>

          {/* Directory Toolbar: Filters, Search, Toggle */}
          <div className="directory-toolbar animate-fade-in delay-1">
            {/* Search */}
            <div className="search-container">
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                placeholder="Search by name, email, or enrollment number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Filter by Branch */}
            <div className="filter-container">
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Branches</option>
                {branches.map((b, idx) => (
                  <option key={idx} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Layout view switcher toggle */}
            <div className="view-toggle-buttons">
              <button 
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="List Table View"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Directory Records Render */}
          {loading ? (
            <div className="spinner-wrapper">
              <div className="spinner spinner-large"></div>
            </div>
          ) : filteredStudents.length > 0 ? (
            viewMode === 'table' ? (
              /* Premium Table View */
              <div className="table-container animate-fade-in">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Enrollment No.</th>
                      <th>Branch</th>
                      <th>Contact Details</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      return (
                        <tr key={student.id} className="student-row">
                          <td>
                            <div className="student-profile-cell">
                              <div 
                                className="profile-bubble-small" 
                                style={{ background: getGradientForName(student.name) }}
                              >
                                {initials}
                              </div>
                              <div className="cell-primary">{student.name}</div>
                            </div>
                          </td>
                          <td>
                            <code className="enrollment-badge">{student.enrollment_number}</code>
                          </td>
                          <td>
                            <span className="badge badge-branch">{student.branch}</span>
                          </td>
                          <td>
                            <span className="cell-primary">{student.email}</span>
                            <span className="cell-secondary">{student.mobile_number}</span>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button 
                                className="action-btn edit"
                                onClick={() => openEditModal(student)}
                                title="Edit Student"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                              </button>
                              <button 
                                className="action-btn delete"
                                onClick={() => confirmDelete(student)}
                                title="Delete Student"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Premium Cards Grid View */
              <div className="student-grid animate-fade-in">
                {filteredStudents.map((student) => {
                  const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <div key={student.id} className="student-card glass-card">
                      <div className="student-card-header">
                        <div 
                          className="profile-bubble-large"
                          style={{ background: getGradientForName(student.name) }}
                        >
                          {initials}
                        </div>
                        <div className="card-header-info">
                          <h3>{student.name}</h3>
                          <code className="enrollment-badge">{student.enrollment_number}</code>
                        </div>
                      </div>

                      <div className="student-card-body">
                        <div className="tag-row">
                          <span className="badge badge-branch">{student.branch}</span>
                        </div>
                        <div className="card-detail-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          <span>{student.email}</span>
                        </div>
                        <div className="card-detail-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <span>{student.mobile_number}</span>
                        </div>
                      </div>

                      <div className="student-card-actions">
                        <button 
                          className="btn btn-secondary btn-icon"
                          onClick={() => openEditModal(student)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          Edit Details
                        </button>
                        <button 
                          className="btn btn-danger-outline btn-icon-only"
                          onClick={() => confirmDelete(student)}
                          title="Delete Record"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="glass-card empty-state animate-fade-in">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>No Directory Matches</h3>
              <p>
                {students.length === 0 
                  ? "Enroll a student using the dashboard form to start compiling database records." 
                  : "No students in the directory fit your current search query or branch filters."}
              </p>
              {students.length === 0 && dbOnline === 'fallback' && (
                <div style={{ marginTop: '1.2rem', fontSize: '0.85rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                  System operating in local backup mode because MySQL connection failed. Check your DB config to restore full service.
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Edit Glassmorphic Modal */}
      {editingStudent && (
        <div className="modal-overlay animate-fade-in">
          <div className="glass-card modal-container animate-scale-up">
            <div className="modal-header">
              <h2 className="modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Update Student Records
              </h2>
              <button className="close-modal-btn" onClick={() => setEditingStudent(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="edit_name">Full Name</label>
                <input
                  type="text"
                  id="edit_name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  className={`form-control ${editFormErrors.name ? 'error-border' : ''}`}
                  placeholder="Full Name"
                />
                {editFormErrors.name && <span className="error-text">{editFormErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit_enrollment_number">Enrollment Number</label>
                <input
                  type="text"
                  id="edit_enrollment_number"
                  name="enrollment_number"
                  value={editFormData.enrollment_number}
                  onChange={handleEditInputChange}
                  className={`form-control ${editFormErrors.enrollment_number ? 'error-border' : ''}`}
                  placeholder="Enrollment Number"
                />
                {editFormErrors.enrollment_number && <span className="error-text">{editFormErrors.enrollment_number}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit_email">Email Address</label>
                <input
                  type="email"
                  id="edit_email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  className={`form-control ${editFormErrors.email ? 'error-border' : ''}`}
                  placeholder="Email Address"
                />
                {editFormErrors.email && <span className="error-text">{editFormErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit_mobile_number">Mobile Number</label>
                <input
                  type="tel"
                  id="edit_mobile_number"
                  name="mobile_number"
                  value={editFormData.mobile_number}
                  onChange={handleEditInputChange}
                  className={`form-control ${editFormErrors.mobile_number ? 'error-border' : ''}`}
                  placeholder="Mobile Number"
                />
                {editFormErrors.mobile_number && <span className="error-text">{editFormErrors.mobile_number}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit_branch">Academic Branch</label>
                <select
                  id="edit_branch"
                  name="branch"
                  value={editFormData.branch}
                  onChange={handleEditInputChange}
                  className={`form-control ${editFormErrors.branch ? 'error-border' : ''}`}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b, idx) => (
                    <option key={idx} value={b}>{b}</option>
                  ))}
                </select>
                {editFormErrors.branch && <span className="error-text">{editFormErrors.branch}</span>}
              </div>

              <div className="modal-footer-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setEditingStudent(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Records'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Glassmorphic Modal */}
      {deletingStudent && (
        <div className="modal-overlay animate-fade-in">
          <div className="glass-card modal-container delete-modal animate-scale-up">
            <div className="modal-header">
              <h2 className="modal-title text-danger">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Confirm Delete
              </h2>
              <button className="close-modal-btn" onClick={() => setDeletingStudent(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete the records of <strong>{deletingStudent.name}</strong>?</p>
              <p className="sub-warning-text">This action cannot be undone. All database records for enrollment <code>{deletingStudent.enrollment_number}</code> will be wiped.</p>
            </div>
            <div className="modal-footer-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeletingStudent(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? 'Deleting Record...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>&copy; {new Date().getFullYear()} Student Administration Portal. Crafted with Vanilla CSS & React.</p>
      </footer>
    </div>
  );
}

export default App;
