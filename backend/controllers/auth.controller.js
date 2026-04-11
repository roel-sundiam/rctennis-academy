const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const LoginEvent = require('../models/LoginEvent');
const AdminPasswordOverride = require('../models/AdminPasswordOverride');

// Supports multiple admins via numbered env vars:
// ADMIN_USERNAME / ADMIN_PASSWORD_HASH / ADMIN_ROLE  (account 1)
// ADMIN2_USERNAME / ADMIN2_PASSWORD_HASH / ADMIN2_ROLE (account 2) ... etc.
// ROLE defaults to 'admin' if not set. Use 'superadmin' for elevated access.
function getAdminAccounts() {
  const accounts = [];
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH) {
    accounts.push({
      username: process.env.ADMIN_USERNAME,
      hash: process.env.ADMIN_PASSWORD_HASH,
      role: process.env.ADMIN_ROLE || 'admin'
    });
  }
  let i = 2;
  while (process.env[`ADMIN${i}_USERNAME`] && process.env[`ADMIN${i}_PASSWORD_HASH`]) {
    accounts.push({
      username: process.env[`ADMIN${i}_USERNAME`],
      hash: process.env[`ADMIN${i}_PASSWORD_HASH`],
      role: process.env[`ADMIN${i}_ROLE`] || 'admin'
    });
    i++;
  }
  return accounts;
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const accounts = getAdminAccounts();
    const account = accounts.find(a => a.username === username);

    if (!account) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check for a DB password override first; fall back to the env-var hash
    const override = await AdminPasswordOverride.findOne({ username });
    const activeHash = override ? override.passwordHash : account.hash;

    const valid = await bcrypt.compare(password, activeHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { role: account.role, username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log the login event for analytics (fire-and-forget)
    LoginEvent.create({ username }).catch(() => {});

    res.json({ token });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const username = req.admin.username;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const accounts = getAdminAccounts();
    const account = accounts.find(a => a.username === username);

    if (!account) {
      return res.status(403).json({ message: 'Account not found.' });
    }

    // Determine the currently active hash (DB override or env var)
    const override = await AdminPasswordOverride.findOne({ username });
    const activeHash = override ? override.passwordHash : account.hash;

    const valid = await bcrypt.compare(currentPassword, activeHash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await AdminPasswordOverride.findOneAndUpdate(
      { username },
      { passwordHash: newHash, updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, changePassword };
