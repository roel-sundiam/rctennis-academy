const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getPlayers,
  getAllPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer
} = require('../controllers/player.controller');

router.get('/',        getPlayers);        // Public: active players for booking dropdown
router.get('/all',     auth, getAllPlayers); // Admin: all players including inactive
router.post('/',       auth, createPlayer);
router.put('/:id',     auth, updatePlayer);
router.delete('/:id',  auth, deletePlayer);

module.exports = router;
