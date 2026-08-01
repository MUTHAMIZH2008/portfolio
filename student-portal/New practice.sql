-- Student Portal SQL schema (SQLite-compatible)

PRAGMA foreign_keys = ON;

-- Users who can log in to the portal
CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at TEXT DEFAULT (datetime('now'))
);

-- Students managed by the portal (could be linked to a user or stand-alone)
CREATE TABLE IF NOT EXISTS students (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		full_name TEXT NOT NULL,
		class_name TEXT,
		attendance_percentage INTEGER DEFAULT 0,
		created_at TEXT DEFAULT (datetime('now'))
);

-- Individual attendance records (for history)
CREATE TABLE IF NOT EXISTS attendance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		student_id INTEGER NOT NULL,
		date TEXT NOT NULL,
		present INTEGER NOT NULL CHECK(present IN (0,1)),
		FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Courses/subjects
CREATE TABLE IF NOT EXISTS courses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		code TEXT,
		name TEXT NOT NULL
);

-- Grades: store numeric grade (0-10) and credits; used to compute CGPA
CREATE TABLE IF NOT EXISTS grades (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		student_id INTEGER NOT NULL,
		course_id INTEGER NOT NULL,
		grade REAL NOT NULL,
		credits REAL NOT NULL,
		FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
		FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- View to compute CGPA per student (rounded to 2 decimals). Returns NULL when no credits.
CREATE VIEW IF NOT EXISTS student_cgpa AS
SELECT
	s.id AS student_id,
	s.full_name,
	ROUND(SUM(g.grade * g.credits) / NULLIF(SUM(g.credits),0), 2) AS cgpa
FROM students s
LEFT JOIN grades g ON s.id = g.student_id
GROUP BY s.id;

-- ===== Example queries =====
-- 1) Compute CGPA for a student (via view):
-- SELECT cgpa FROM student_cgpa WHERE student_id = 1;

-- 2) Compute CGPA on the fly for student id = 1:
-- SELECT ROUND(SUM(grade * credits) / SUM(credits), 2) AS cgpa FROM grades WHERE student_id = 1;

-- 3) List a student's courses and grades:
-- SELECT c.code, c.name, g.grade, g.credits FROM grades g JOIN courses c ON c.id = g.course_id WHERE g.student_id = 1;

-- 4) Add an attendance record (present = 1 or 0):
-- INSERT INTO attendance (student_id, date, present) VALUES (1, date('now'), 1);

