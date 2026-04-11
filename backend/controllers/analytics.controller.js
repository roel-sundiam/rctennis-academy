const SiteVisit = require('../models/SiteVisit');
const LoginEvent = require('../models/LoginEvent');

// POST /analytics/track — public, called by Angular on every route change
async function trackVisit(req, res, next) {
  try {
    const { page } = req.body;
    if (!page) return res.status(400).json({ message: 'page is required.' });
    await SiteVisit.create({ page });
    res.status(201).json({ ok: true });
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

module.exports = { trackVisit, getSummary };
