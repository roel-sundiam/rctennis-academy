const express = require('express');
const router = express.Router();
const { trackVisit, getSummary } = require('../controllers/analytics.controller');
const auth = require('../middleware/auth');

// Public — Angular calls this on every route change
router.post('/track', trackVisit);

// Superadmin only
router.get('/summary', auth, (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  next();
}, getSummary);

module.exports = router;
