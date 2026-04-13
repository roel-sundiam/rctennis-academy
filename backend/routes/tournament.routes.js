const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  addMatch,
  updateMatch,
  deleteMatch,
} = require('../controllers/tournament.controller');

router.get('/',                            getTournaments);
router.get('/:id',                         getTournamentById);
router.post('/',                    auth,  createTournament);
router.put('/:id',                  auth,  updateTournament);
router.delete('/:id',               auth,  deleteTournament);
router.post('/:id/matches',         auth,  addMatch);
router.put('/:id/matches/:matchId', auth,  updateMatch);
router.delete('/:id/matches/:matchId', auth, deleteMatch);

module.exports = router;
