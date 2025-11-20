const API_BASE = window.location.origin.includes('ondigitalocean.app')
  ? 'https://whale-app-ptl77.ondigitalocean.app/api'
  : `${window.location.origin}/api`;

async function fetchJSON(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error al consultar el API');
  }

  return response.json();
}

async function loadCourses(params = {}) {
  const query = new URLSearchParams(params);
  const { data } = await fetchJSON(`/courses?${query.toString()}`);
  return data;
}

async function loadAnnouncements() {
  const { data } = await fetchJSON('/announcements');
  return data;
}

function renderCourses(courses) {
  const list = document.querySelector('#coursesList');
  const template = document.querySelector('#courseTemplate');

  list.innerHTML = '';
  courses.forEach((course) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.course-head h3').textContent = course.title;
    node.querySelector('.course-head .muted').textContent = course.instructor;
    node.querySelector('.badge.credits').textContent = `${course.credits} CR`;
    node.querySelector('.summary').textContent = course.summary;
    node.querySelector('.meta .schedule').textContent = course.schedule;
    node.querySelector('.meta .campus').textContent = course.campus;
    node.querySelector('.meta .modality').textContent = course.modality;

    const tagsFragment = course.tags
      .map((tag) => `<li>${tag}</li>`)
      .join('');
    node.querySelector('.tags').innerHTML = tagsFragment;

    list.appendChild(node);
  });
}

function renderAnnouncements(items) {
  const list = document.querySelector('#announcementsList');
  const template = document.querySelector('#announcementTemplate');

  list.innerHTML = '';
  items.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.announcement-head .eyebrow').textContent = new Date(item.publishedAt).toLocaleString('es-CO');
    node.querySelector('.badge.level').textContent = item.level.toUpperCase();
    node.querySelector('h3').textContent = item.title;
    node.querySelector('.summary').textContent = item.content;
    list.appendChild(node);
  });
}

async function bootstrap() {
  try {
    const [courses, announcements] = await Promise.all([loadCourses(), loadAnnouncements()]);
    renderCourses(courses);
    renderAnnouncements(announcements);
  } catch (error) {
    console.error(error);
    alert('No pudimos conectar con el API. Revisa la consola.');
  }
}

async function handleFilters(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const params = Object.fromEntries([...formData.entries()].filter(([, value]) => value));
  const courses = await loadCourses(params);
  renderCourses(courses);
}

async function handleCourseForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const tagsValue = formData.get('tags') || '';
  const payload = {
    title: formData.get('title'),
    instructor: formData.get('instructor'),
    credits: formData.get('credits'),
    modality: formData.get('modality'),
    schedule: formData.get('schedule'),
    campus: formData.get('campus'),
    startDate: formData.get('startDate'),
    summary: formData.get('summary'),
    tags: tagsValue
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  };

  const statusEl = document.querySelector('#courseStatus');
  statusEl.textContent = 'Guardando…';
  statusEl.className = '';

  try {
    await fetchJSON('/courses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    statusEl.textContent = 'Curso registrado correctamente.';
    statusEl.classList.add('ok');
    event.currentTarget.reset();
    const courses = await loadCourses();
    renderCourses(courses);
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'No pudimos registrar el curso.';
    statusEl.classList.add('error');
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
      console.warn('SW', error);
    }
  }
}

function setupInstallPrompt() {
  const installBtn = document.getElementById('installBtn');
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.hidden = true;
    }
    deferredPrompt = null;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap();
  document.getElementById('filtersForm').addEventListener('submit', handleFilters);
  document.getElementById('courseForm').addEventListener('submit', handleCourseForm);
  registerServiceWorker();
  setupInstallPrompt();
});
