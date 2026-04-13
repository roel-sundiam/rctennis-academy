const Tournament = require('../models/Tournament');

function requireSuperAdmin(req, res) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    res.status(403).json({ message: 'Superadmin access required.' });
    return false;
  }
  return true;
}

// GET /tournaments — public, returns all non-cancelled tournaments with matches
async function getTournaments(req, res, next) {
  try {
    const filter = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: 'cancelled' } };
    const tournaments = await Tournament.find(filter).sort({ startDate: 1 });
    res.json(tournaments);
  } catch (err) {
    next(err);
  }
}

// GET /tournaments/:id — public
async function getTournamentById(req, res, next) {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    res.json(tournament);
  } catch (err) {
    next(err);
  }
}

// POST /tournaments — superadmin only
async function createTournament(req, res, next) {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { name, startDate, endDate, location, status } = req.body;
    if (!name || !startDate || !endDate || !location) {
      return res.status(400).json({ message: 'name, startDate, endDate, and location are required.' });
    }
    const tournament = await Tournament.create({
      name, startDate, endDate, location,
      status: status || 'upcoming',
      createdBy: req.admin.username,
    });
    res.status(201).json(tournament);
  } catch (err) {
    next(err);
  }
}

// PUT /tournaments/:id — superadmin only
async function updateTournament(req, res, next) {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    const { name, startDate, endDate, location, status } = req.body;
    if (name !== undefined) tournament.name = name;
    if (startDate !== undefined) tournament.startDate = startDate;
    if (endDate !== undefined) tournament.endDate = endDate;
    if (location !== undefined) tournament.location = location;
    if (status !== undefined) tournament.status = status;
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    next(err);
  }
}

// DELETE /tournaments/:id — superadmin only
async function deleteTournament(req, res, next) {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    res.json({ message: 'Tournament deleted.' });
  } catch (err) {
    next(err);
  }
}

// POST /tournaments/:id/matches — superadmin only
async function addMatch(req, res, next) {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    const { date, time, player1, player2, court, result } = req.body;
    if (!date || !time || !player1 || !player2 || !court) {
      return res.status(400).json({ message: 'date, time, player1, player2, and court are required.' });
    }
    tournament.matches.push({ date, time, player1, player2, court, result: result || null });
    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    next(err);
  }
}

// PUT /tournaments/:id/matches/:matchId — superadmin only
async function updateMatch(req, res, next) {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    const match = tournament.matches.id(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found.' });
    const { date, time, player1, player2, court, result } = req.body;
    if (date !== undefined) match.date = date;
    if (time !== undefined) match.time = time;
    if (player1 !== undefined) match.player1 = player1;
    if (player2 !== undefined) match.player2 = player2;
    if (court !== undefined) match.court = court;
    if (result !== undefined) match.result = result;
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    next(err);
  }
}

// DELETE /tournaments/:id/matches/:matchId — superadmin only
async function deleteMatch(req, res, next) {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    const match = tournament.matches.id(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found.' });
    match.deleteOne();
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  addMatch,
  updateMatch,
  deleteMatch,
};
