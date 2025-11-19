require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { port, corsOptions } = require('./config/appConfig');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const courseRoutes = require('./routes/courseRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '32kb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/health', healthRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/announcements', announcementRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
}

module.exports = app;
