const express = require('express');
const router = express.Router();
const { login, changePassword, listAdmins, addAdmin, deleteAdmin } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

router.post('/login', login);
router.patch('/change-password', authMiddleware, changePassword);

// Admin account management — superadmin only (enforced in controller)
router.get('/admins', authMiddleware, listAdmins);
router.post('/admins', authMiddleware, addAdmin);
router.delete('/admins/:username', authMiddleware, deleteAdmin);

module.exports = router;
