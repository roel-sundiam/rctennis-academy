const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getBlockedSlots,
  getPublicBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot
} = require('../controllers/blocked-slot.controller');

router.get('/public',  getPublicBlockedSlots);         // Public: for calendar display
router.get('/',        auth, getBlockedSlots);          // Admin: full list
router.post('/',       auth, createBlockedSlot);
router.delete('/:id',  auth, deleteBlockedSlot);

module.exports = router;
