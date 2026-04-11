const Player = require('../models/Player');

async function getPlayers(req, res, next) {
  try {
    const players = await Player.find({ isActive: true }).sort({ name: 1 });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

async function getAllPlayers(req, res, next) {
  try {
    const players = await Player.find().sort({ name: 1 });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

async function createPlayer(req, res, next) {
  try {
    const { name, contactNumber } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Player name is required.' });
    }
    const player = new Player({ name: name.trim(), contactNumber: contactNumber || '' });
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    next(err);
  }
}

async function updatePlayer(req, res, next) {
  try {
    const { name, contactNumber } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Player name is required.' });
    }
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), contactNumber: contactNumber || '' },
      { new: true, runValidators: true }
    );
    if (!player) return res.status(404).json({ message: 'Player not found.' });
    res.json(player);
  } catch (err) {
    next(err);
  }
}

async function deletePlayer(req, res, next) {
  try {
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!player) return res.status(404).json({ message: 'Player not found.' });
    res.json({ message: 'Player deactivated.', player });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPlayers, getAllPlayers, createPlayer, updatePlayer, deletePlayer };
