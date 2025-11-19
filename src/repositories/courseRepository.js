const { v4: uuid } = require('uuid');
const { getPool, useDatabase } = require('../db/pool');
const seedCourses = require('../data/courses');

let ensureTablePromise = null;

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().split('T')[0];
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    instructor: row.instructor,
    credits: row.credits,
    modality: row.modality,
    schedule: row.schedule,
    campus: row.campus,
    startDate: normalizeDate(row.startDate),
    tags: row.tags || [],
    summary: row.summary
  };
}

async function ensureTable() {
  if (!useDatabase) {
    return;
  }

  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          instructor TEXT NOT NULL,
          credits INT NOT NULL,
          modality TEXT NOT NULL,
          schedule TEXT NOT NULL,
          campus TEXT NOT NULL,
          start_date DATE NOT NULL,
          tags TEXT[] NOT NULL,
          summary TEXT NOT NULL
        )
      `);

      const { rows } = await pool.query('SELECT COUNT(*)::INT AS count FROM courses');
      if (rows[0].count === 0) {
        for (const course of seedCourses) {
          await pool.query(
            `
              INSERT INTO courses (id, title, instructor, credits, modality, schedule, campus, start_date, tags, summary)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
            [
              course.id,
              course.title,
              course.instructor,
              course.credits,
              course.modality,
              course.schedule,
              course.campus,
              course.startDate,
              course.tags,
              course.summary
            ]
          );
        }
      }
    })().catch((error) => {
      ensureTablePromise = null;
      console.error('Error preparando tabla courses', error);
      throw error;
    });
  }

  return ensureTablePromise;
}

async function listCourses() {
  if (!useDatabase) {
    return [];
  }

  await ensureTable();
  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT
        id,
        title,
        instructor,
        credits,
        modality,
        schedule,
        campus,
        start_date AS "startDate",
        tags,
        summary
      FROM courses
      ORDER BY start_date ASC
    `
  );
  return rows.map(mapRow);
}

async function findCourseById(courseId) {
  await ensureTable();
  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT
        id,
        title,
        instructor,
        credits,
        modality,
        schedule,
        campus,
        start_date AS "startDate",
        tags,
        summary
      FROM courses
      WHERE id = $1
      LIMIT 1
    `,
    [courseId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRow(rows[0]);
}

async function createCourse(data) {
  await ensureTable();
  const pool = getPool();
  const course = {
    id: data.id || `c-${uuid().slice(0, 8)}`,
    title: data.title,
    instructor: data.instructor,
    credits: data.credits,
    modality: data.modality,
    schedule: data.schedule,
    campus: data.campus,
    startDate: normalizeDate(data.startDate),
    tags: data.tags || [],
    summary: data.summary
  };

  await pool.query(
    `
      INSERT INTO courses (id, title, instructor, credits, modality, schedule, campus, start_date, tags, summary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      course.id,
      course.title,
      course.instructor,
      course.credits,
      course.modality,
      course.schedule,
      course.campus,
      course.startDate,
      course.tags,
      course.summary
    ]
  );

  return mapRow(course);
}

module.exports = {
  useDatabase,
  ensureTable,
  listCourses,
  findCourseById,
  createCourse
};
