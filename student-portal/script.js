// Small student portal JS: registration, login, persistence, CGPA calculator, attendance

// Local storage keys
const USERS_KEY = 'sp_users_v1';
const CURRENT_KEY = 'sp_current_user_email_v1';
const STUDENTS_KEY = 'sp_students_v1';
const RESET_KEY = 'sp_reset_codes_v1';

// DOM elements
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginBox = document.getElementById('login-box');
const registerBox = document.getElementById('register-box');
const resetBox = document.getElementById('reset-box');
const appSection = document.getElementById('app-section');
const authSection = document.getElementById('auth-section');
const navButtons = document.querySelectorAll('.nav-button[data-view]');
const panels = document.querySelectorAll('.view-panel');
const logoutButton = document.getElementById('logout-button');

// Dashboard & attendance elements
const studentSummary = document.getElementById('student-summary');
const totalStudents = document.getElementById('total-students');
const averageAttendance = document.getElementById('average-attendance');
const lowAttendanceCount = document.getElementById('low-attendance-count');
const attendanceList = document.getElementById('attendance-list');
const saveAttendanceBtn = document.getElementById('save-attendance');
const attendanceMessage = document.getElementById('attendance-message');

// CGPA elements
const addSubjectBtn = document.getElementById('add-subject');
const subjectsList = document.getElementById('subjects-list');
const cgpaForm = document.getElementById('cgpa-form');
const cgpaResult = document.getElementById('cgpa-result');

// Admin elements
const adminButton = document.getElementById('admin-button');
const adminUsersList = document.getElementById('admin-users-list');
const adminStudentsList = document.getElementById('admin-students-list');
const adminClearDataBtn = document.getElementById('admin-clear-data');
const adminExportBtn = document.getElementById('admin-export');

// Profile
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileCgpa = document.getElementById('profile-cgpa');
const profileUpload = document.getElementById('profile-upload');
const profileDocsList = document.getElementById('profile-docs-list');

// helpers for localStorage
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUserEmail() {
    return localStorage.getItem(CURRENT_KEY) || null;
}

function setCurrentUserEmail(email) {
    localStorage.setItem(CURRENT_KEY, email);
}

function clearCurrentUser() {
    localStorage.removeItem(CURRENT_KEY);
}

function getStudents() {
    const raw = JSON.parse(localStorage.getItem(STUDENTS_KEY) || '[]');
    // normalize records to expected fields
    return raw.map(s => ({
        id: s.id || Date.now() + Math.floor(Math.random() * 1000),
        name: s.full_name || s.name || s.student_name || 'Unnamed',
        className: s.className || s.class_name || s.class || '',
        attendance: (s.attendance !== undefined) ? s.attendance : (s.attendance_percentage !== undefined ? s.attendance_percentage : 0),
        // keep any extra fields
        _raw: s
    }));
}

function saveStudents(list) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(list));
}

// UI helpers
function showAppFor(user) {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    renderDashboard();
    renderAttendance();
    loadProfile(user);
    if (adminButton) {
        if (user && user.role === 'admin') adminButton.style.display = '';
        else adminButton.style.display = 'none';
    }
}

function showAuth() {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    registerError.textContent = '';
    registerSuccess.textContent = '';
    loginError.textContent = '';
}

// Navigation
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const view = button.dataset.view;
        if (!view) return;
        navButtons.forEach(btn => btn.classList.remove('active-nav'));
        button.classList.add('active-nav');
        panels.forEach(panel => panel.classList.add('hidden'));
        document.getElementById(`${view}-view`).classList.remove('hidden');
    });
});

logoutButton.addEventListener('click', () => {
    clearCurrentUser();
    showAuth();
});

// Registration / Login toggles
showRegisterBtn.addEventListener('click', () => {
    loginBox.classList.add('hidden');
    registerBox.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerBox.classList.add('hidden');
    loginBox.classList.remove('hidden');
});

// Register
registerForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;
    registerError.textContent = '';
    registerSuccess.textContent = '';

    if (password !== confirm) {
        registerError.textContent = 'Passwords do not match.';
        return;
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
        registerError.textContent = 'An account with this email already exists.';
        return;
    }

    const isAdmin = document.getElementById('reg-admin') ? document.getElementById('reg-admin').checked : false;
    const newUser = { id: Date.now(), name, email, password, role: isAdmin ? 'admin' : 'student', cgpa: null, courses: [] };
    users.push(newUser);
    saveUsers(users);
    registerSuccess.textContent = 'Account created. You can now login.';
    registerForm.reset();
    setTimeout(() => {
        registerBox.classList.add('hidden');
        loginBox.classList.remove('hidden');
        registerSuccess.textContent = '';
    }, 1200);
});

// Forgot password / reset flow
const forgotLink = document.getElementById('forgot-password');
const resetRequestForm = document.getElementById('reset-request-form');
const resetConfirmForm = document.getElementById('reset-confirm-form');
const resetBack = document.getElementById('reset-back');
const resetCancel = document.getElementById('reset-cancel');
const resetRequestError = document.getElementById('reset-request-error');
const resetRequestMessage = document.getElementById('reset-request-message');
const resetError = document.getElementById('reset-error');
const resetSuccess = document.getElementById('reset-success');

function saveResetCodes(obj) {
    localStorage.setItem(RESET_KEY, JSON.stringify(obj || {}));
}

function getResetCodes() {
    return JSON.parse(localStorage.getItem(RESET_KEY) || '{}');
}

if (forgotLink) {
    forgotLink.addEventListener('click', () => {
        loginBox.classList.add('hidden');
        registerBox.classList.add('hidden');
        if (resetBox) resetBox.classList.remove('hidden');
        if (resetConfirmForm) resetConfirmForm.classList.add('hidden');
        resetRequestMessage.textContent = '';
        resetRequestError.textContent = '';
    });
}

if (resetBack) {
    resetBack.addEventListener('click', () => {
        resetBox.classList.add('hidden');
        loginBox.classList.remove('hidden');
    });
}

if (resetCancel) {
    resetCancel.addEventListener('click', () => {
        resetBox.classList.add('hidden');
        loginBox.classList.remove('hidden');
    });
}

// Request reset code (demo: displays the code; in production send email)
if (resetRequestForm) {
    resetRequestForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim().toLowerCase();
        resetRequestError.textContent = '';
        resetRequestMessage.textContent = '';
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) {
            resetRequestError.textContent = 'No account found with that email.';
            return;
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codes = getResetCodes();
        codes[email] = { code, expires: Date.now() + 15 * 60 * 1000 };
        saveResetCodes(codes);
        // Display code so demo user can proceed (replace with email sending in real app)
        resetRequestMessage.textContent = `Reset code (demo): ${code}`;
        // show confirm form
        if (resetConfirmForm) resetConfirmForm.classList.remove('hidden');
    });
}

// Confirm and set new password
if (resetConfirmForm) {
    resetConfirmForm.addEventListener('submit', e => {
        e.preventDefault();
        resetError.textContent = '';
        resetSuccess.textContent = '';
        const email = document.getElementById('reset-email').value.trim().toLowerCase();
        const entered = document.getElementById('reset-code').value.trim();
        const npw = document.getElementById('reset-new-password').value;
        const npw2 = document.getElementById('reset-new-password-confirm').value;
        if (npw !== npw2) { resetError.textContent = 'Passwords do not match.'; return; }
        const codes = getResetCodes();
        const rec = codes[email];
        if (!rec) { resetError.textContent = 'No reset request found for this email.'; return; }
        if (Date.now() > rec.expires) { resetError.textContent = 'Reset code expired.'; delete codes[email]; saveResetCodes(codes); return; }
        if (rec.code !== entered) { resetError.textContent = 'Invalid reset code.'; return; }
        // set new password
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) { resetError.textContent = 'User not found.'; return; }
        user.password = npw;
        saveUsers(users);
        delete codes[email]; saveResetCodes(codes);
        resetSuccess.textContent = 'Password reset successful — please login.';
        setTimeout(() => {
            resetBox.classList.add('hidden');
            loginBox.classList.remove('hidden');
            document.getElementById('login-email').value = email;
        }, 1200);
    });
}

// Login
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    loginError.textContent = '';

    const users = getUsers();
    const u = users.find(x => x.email === email && x.password === password);
    if (!u) {
        loginError.textContent = 'Invalid email or password.';
        return;
    }

    setCurrentUserEmail(u.email);
    showAppFor(u);
    if (adminButton) {
        if (u.role === 'admin') adminButton.style.display = '';
        else adminButton.style.display = 'none';
    }
});

// Dashboard & attendance rendering
function renderDashboard() {
    const students = getStudents();
    studentSummary.innerHTML = '';
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.className}</td>
            <td>${student.attendance}%</td>
            <td>${student.attendance >= 75 ? 'Good' : 'At Risk'}</td>
        `;
        studentSummary.appendChild(row);
    });
    totalStudents.textContent = students.length;
    averageAttendance.textContent = `${computeAverage(students)}%`;
    lowAttendanceCount.textContent = `${students.filter(s => s.attendance < 75).length}`;
}

function renderAttendance() {
    const students = getStudents();
    attendanceList.innerHTML = '';
    students.forEach((student, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.name}</td>
            <td>${student.className}</td>
            <td><input type="checkbox" class="attendance-checkbox" data-student-id="${student.id}" ${student.attendance >= 75 ? 'checked' : ''}></td>
        `;
        attendanceList.appendChild(row);
    });
}

saveAttendanceBtn.addEventListener('click', () => {
    const students = getStudents();
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    checkboxes.forEach(box => {
        const id = Number(box.dataset.studentId);
        const student = students.find(s => s.id === id);
        if (!student) return;
        student.attendance = box.checked ? Math.min(100, student.attendance + 1) : Math.max(0, student.attendance - 1);
    });
    saveStudents(students);
    renderDashboard();
    renderAttendance();
    attendanceMessage.textContent = 'Attendance updated';
    setTimeout(() => attendanceMessage.textContent = '', 2500);
});

function computeAverage(list) {
    if (!list.length) return 0;
    return Math.round(list.reduce((s, it) => s + (it.attendance || 0), 0) / list.length);
}

// CGPA calculator
function createSubjectRow() {
    const id = Date.now();
    const wrapper = document.createElement('div');
    wrapper.className = 'form-grid';
    wrapper.style.marginBottom = '8px';
    wrapper.dataset.rowId = id;
    wrapper.innerHTML = `
        <label>Subject name <input type="text" class="sub-name" required></label>
        <label>Grade (0-10) <input type="number" min="0" max="10" step="0.01" class="sub-grade" required></label>
        <label>Credits <input type="number" min="0.5" step="0.5" class="sub-credit" required></label>
        <div><button type="button" class="btn" data-remove="${id}">Remove</button></div>
    `;
    subjectsList.appendChild(wrapper);
}

addSubjectBtn.addEventListener('click', () => createSubjectRow());

subjectsList.addEventListener('click', e => {
    if (e.target && e.target.dataset.remove) {
        const id = e.target.dataset.remove;
        const row = subjectsList.querySelector(`[data-row-id='${id}']`);
        if (row) row.remove();
    }
});

cgpaForm.addEventListener('submit', e => {
    e.preventDefault();
    const rows = subjectsList.querySelectorAll('[data-row-id]');
    if (!rows.length) {
        cgpaResult.textContent = 'Add at least one subject.';
        return;
    }
    let totalPoints = 0;
    let totalCredits = 0;
    const courses = [];
    rows.forEach(row => {
        const name = row.querySelector('.sub-name').value.trim();
        const grade = parseFloat(row.querySelector('.sub-grade').value) || 0;
        const credit = parseFloat(row.querySelector('.sub-credit').value) || 0;
        if (credit <= 0) return; // skip invalid credit
        totalPoints += grade * credit;
        totalCredits += credit;
        courses.push({ name, grade, credit });
    });
    const cgpa = totalCredits ? +(totalPoints / totalCredits).toFixed(2) : 0;
    cgpaResult.textContent = `CGPA: ${cgpa}`;

    // save to current user
    const email = getCurrentUserEmail();
    if (email) {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            user.cgpa = cgpa;
            user.courses = courses;
            saveUsers(users);
            loadProfile(user);
        }
    }
});

// profile
function loadProfile(user) {
    if (!user) {
        const email = getCurrentUserEmail();
        const users = getUsers();
        user = users.find(u => u.email === email);
    }
    if (!user) return;
    profileName.textContent = user.name;
    profileEmail.textContent = user.email;
    profileCgpa.textContent = user.cgpa === null ? '—' : user.cgpa;
    renderProfileDocs(user);
}

// Profile document upload handling
function renderProfileDocs(user) {
    if (!profileDocsList) return;
    profileDocsList.innerHTML = '';
    if (!user || !user.docs) return;
    user.docs.forEach((doc, i) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = doc.dataUrl;
        a.download = doc.name;
        a.textContent = doc.name;
        li.appendChild(a);
        profileDocsList.appendChild(li);
    });
}

if (profileUpload) {
    profileUpload.addEventListener('change', e => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const email = getCurrentUserEmail();
        if (!email) { alert('Please login to upload files.'); return; }
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) { alert('User not found.'); return; }
        user.docs = user.docs || [];
        let readCount = 0;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                user.docs.push({ name: file.name, type: file.type, dataUrl: reader.result });
                readCount += 1;
                if (readCount === files.length) {
                    saveUsers(users);
                    renderProfileDocs(user);
                }
            };
            reader.readAsDataURL(file);
        });
        // clear input
        profileUpload.value = '';
    });
}

// Admin: render users and students
function renderAdmin() {
    if (!adminUsersList || !adminStudentsList) return;
    const users = getUsers();
    const students = getStudents();
    adminUsersList.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `${u.name} — ${u.email} (${u.role || 'student'}) <button class="btn" data-action="delete-user" data-email="${u.email}">Delete</button>`;
        adminUsersList.appendChild(li);
    });

    adminStudentsList.innerHTML = '';
    students.forEach(s => {
        const li = document.createElement('li');
        const displayName = s.full_name || s.name || 'Unnamed';
        li.innerHTML = `${displayName} — ${s.className || ''} <button class="btn" data-action="delete-student" data-id="${s.id}">Delete</button>`;
        adminStudentsList.appendChild(li);
    });
}

// Admin events
if (adminUsersList) {
    adminUsersList.addEventListener('click', e => {
        if (e.target && e.target.dataset.action === 'delete-user') {
            const email = e.target.dataset.email;
            if (!confirm(`Delete user ${email}?`)) return;
            let users = getUsers();
            users = users.filter(u => u.email !== email);
            saveUsers(users);
            renderAdmin();
        }
    });
}

if (adminStudentsList) {
    adminStudentsList.addEventListener('click', e => {
        if (e.target && e.target.dataset.action === 'delete-student') {
            const id = Number(e.target.dataset.id);
            if (!confirm(`Delete student ${id}?`)) return;
            let students = getStudents();
            students = students.filter(s => s.id !== id);
            saveStudents(students);
            renderAdmin();
            renderDashboard();
            renderAttendance();
        }
    });
}

if (adminClearDataBtn) {
    adminClearDataBtn.addEventListener('click', () => {
        if (!confirm('This will clear all local demo data (users, students, session). Continue?')) return;
        localStorage.removeItem(USERS_KEY);
        localStorage.removeItem(STUDENTS_KEY);
        localStorage.removeItem(CURRENT_KEY);
        showAuth();
        renderAdmin();
    });
}

if (adminExportBtn) {
    adminExportBtn.addEventListener('click', () => {
        const payload = { users: getUsers(), students: getStudents() };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', 'student-portal-data.json');
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
}

if (adminButton) {
    adminButton.addEventListener('click', () => renderAdmin());
}

// initialize
window.addEventListener('DOMContentLoaded', () => {
    // ensure one subject row ready
    createSubjectRow();
    // if logged in, auto-show app
    const email = getCurrentUserEmail();
    if (email) {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            showAppFor(user);
            if (user.role === 'admin') renderAdmin();
        } else {
            clearCurrentUser();
        }
    }
});

