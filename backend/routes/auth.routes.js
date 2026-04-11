const express = require('express');
const router = express.Router();
const { login, changePassword } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

router.post('/login', login);
router.patch('/change-password', authMiddleware, changePassword);

module.exports = router;
