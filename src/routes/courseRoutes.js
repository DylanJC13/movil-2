const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { z } = require('zod');
const seedCourses = require('../data/courses');
const courseRepository = require('../repositories/courseRepository');

const memoryCourses = [...seedCourses];

const router = Router();

const normalize = (value = '') => value.toString().toLowerCase();

function filterCourses(items, { modality, campus, tag, search }) {
  return items.filter((course) => {
    const matchesModality = modality ? normalize(course.modality) === normalize(modality) : true;
    const matchesCampus = campus ? normalize(course.campus) === normalize(campus) : true;
    const courseTags = Array.isArray(course.tags) ? course.tags : [];
    const matchesTag = tag ? courseTags.map(normalize).includes(normalize(tag)) : true;
    const matchesSearch = search
      ? normalize(course.title).includes(normalize(search)) || normalize(course.summary).includes(normalize(search))
      : true;

    return matchesModality && matchesCampus && matchesTag && matchesSearch;
  });
}

const CourseSchema = z.object({
  id: z
    .string()
    .trim()
    .min(3, 'El ID debe tener al menos 3 caracteres')
    .max(30, 'El ID no puede superar 30 caracteres')
    .optional(),
  title: z.string({ required_error: 'El título es obligatorio' }).min(4).max(80),
  instructor: z.string({ required_error: 'El nombre del docente es obligatorio' }).min(3).max(80),
  credits: z.coerce.number({ invalid_type_error: 'Los créditos deben ser numéricos' }).int().min(1).max(10),
  modality: z.enum(['Presencial', 'Virtual', 'Híbrido', 'Remoto'], {
    required_error: 'La modalidad es obligatoria'
  }),
  schedule: z.string({ required_error: 'La franja horaria es obligatoria' }).min(4).max(120),
  campus: z.string({ required_error: 'El campus es obligatorio' }).min(2).max(50),
  startDate: z.coerce.date({ required_error: 'La fecha de inicio es obligatoria' }),
  tags: z.array(z.string()).default([]),
  summary: z.string({ required_error: 'El resumen es obligatorio' }).min(10).max(280)
});

router.get('/', async (req, res, next) => {
  try {
    const sourceCourses = courseRepository.useDatabase
      ? await courseRepository.listCourses()
      : memoryCourses;
    const filtered = filterCourses(sourceCourses, req.query);

    res.json({
      status: 'ok',
      total: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:courseId', async (req, res, next) => {
  try {
    const course = courseRepository.useDatabase
      ? await courseRepository.findCourseById(req.params.courseId)
      : memoryCourses.find((item) => item.id === req.params.courseId);

    if (!course) {
      const err = new Error('Curso no encontrado');
      err.status = 404;
      throw err;
    }

    res.json({ status: 'ok', data: course });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = CourseSchema.parse(req.body);
    const normalizedCourse = {
      ...payload,
      startDate: payload.startDate.toISOString().split('T')[0]
    };

    const course = courseRepository.useDatabase
      ? await courseRepository.createCourse(normalizedCourse)
      : createMemoryCourse(normalizedCourse);

    res.status(201).json({ status: 'ok', data: course });
  } catch (error) {
    error.status = error.status || 422;
    next(error);
  }
});

function createMemoryCourse(courseData) {
  const course = {
    id: courseData.id || `c-${uuid().slice(0, 8)}`,
    ...courseData
  };
  memoryCourses.push(course);
  return course;
}

module.exports = router;
