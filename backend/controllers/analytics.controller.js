const jwt = require('jsonwebtoken');
const SiteVisit = require('../models/SiteVisit');
const LoginEvent = require('../models/LoginEvent');

// POST /analytics/track — public, called by Angular on every route change
async function trackVisit(req, res, next) {
  try {
    const { page } = req.body;
    if (!page) return res.status(400).json({ message: 'page is required.' });

    // Identify the visitor via JWT if present (Angular interceptor sends it automatically for logged-in admins)
    let userType = 'anonymous', username = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        userType = 'authenticated';
        username = payload.username ?? null;
      } catch { /* invalid/expired — treat as anonymous */ }
    }

    // Real IP — Netlify/proxy puts it in x-forwarded-for
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || null;

    await SiteVisit.create({ page, userType, username, ipAddress });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /analytics/live — superadmin only
// Returns visits since ?since=ISO timestamp, or the last 30 if no param
async function getLiveFeed(req, res, next) {
  try {
    const query = {};
    if (req.query.since) {
      const since = new Date(req.query.since);
      if (!isNaN(since.getTime())) query.timestamp = { $gt: since };
    }

    const visits = await SiteVisit.find(
      query,
      { page: 1, timestamp: 1, userType: 1, username: 1, ipAddress: 1, _id: 0 }
    )
      .sort({ timestamp: req.query.since ? 1 : -1 })
      .limit(req.query.since ? 50 : 30)
      .lean();

    // When polling for new entries, return in chronological order
    const result = req.query.since ? visits : visits.reverse();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /analytics/summary — superadmin only
async function getSummary(req, res, next) {
  try {
    // Total counts
    const totalVisits = await SiteVisit.countDocuments();
    const totalLogins = await LoginEvent.countDocuments();

    // Visits by page
    const visitsByPage = await SiteVisit.aggregate([
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Logins by username
    const loginsByUser = await LoginEvent.aggregate([
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Visits per day (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const visitsByDay = await SiteVisit.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ totalVisits, totalLogins, visitsByPage, loginsByUser, visitsByDay });
  } catch (err) {
    next(err);
  }
}

module.exports = { trackVisit, getLiveFeed, getSummary };
