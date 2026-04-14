const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getBlockedSlots,
  getPublicBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  createRecurringBlockedSlots,
  deleteBlockedSlotGroup
} = require('../controllers/blocked-slot.controller');

router.get('/public',            getPublicBlockedSlots);           // Public: for calendar display
router.get('/',                  auth, getBlockedSlots);           // Admin: full list
router.post('/',                 auth, createBlockedSlot);         // One-time block
router.post('/recurring',        auth, createRecurringBlockedSlots); // Recurring block
router.delete('/group/:groupId', auth, deleteBlockedSlotGroup);    // Delete entire series — MUST be before /:id
router.delete('/:id',            auth, deleteBlockedSlot);         // Delete single occurrence

module.exports = router;
