const { Router } = require('express');
const announcements = require('../data/announcements');

const router = Router();

router.get('/', (req, res) => {
  const { level, limit = announcements.length } = req.query;

  const filtered = announcements
    .filter((item) => (level ? item.level === level : true))
    .slice(0, Number(limit));

  res.json({ status: 'ok', total: filtered.length, data: filtered });
});

module.exports = router;
