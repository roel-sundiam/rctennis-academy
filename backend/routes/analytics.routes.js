const express = require('express');
const router = express.Router();
const { trackVisit, getLiveFeed, getSummary } = require('../controllers/analytics.controller');
const auth = require('../middleware/auth');

// Public — Angular calls this on every route change
router.post('/track', trackVisit);

// Superadmin only — live visitor feed (polled every few seconds)
router.get('/live', auth, (req, res, next) => {
  if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden.' });
  next();
}, getLiveFeed);

// Superadmin only — aggregated analytics summary
router.get('/summary', auth, (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  next();
}, getSummary);

module.exports = router;
