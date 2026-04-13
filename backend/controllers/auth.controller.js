const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const LoginEvent = require('../models/LoginEvent');
const AdminPasswordOverride = require('../models/AdminPasswordOverride');
const AdminAccount = require('../models/AdminAccount');

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

    const envAccounts = getAdminAccounts();
    const envAccount = envAccounts.find(a => a.username === username);

    let activeHash, role;

    if (envAccount) {
      // Env-var account — check for a DB password override
      const override = await AdminPasswordOverride.findOne({ username });
      activeHash = override ? override.passwordHash : envAccount.hash;
      role = envAccount.role;
    } else {
      // Fall back to dynamically created DB accounts
      const dbAccount = await AdminAccount.findOne({ username });
      if (!dbAccount) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      activeHash = dbAccount.passwordHash;
      role = dbAccount.role;
    }

    const valid = await bcrypt.compare(password, activeHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { role, username },
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

    const envAccounts = getAdminAccounts();
    const envAccount = envAccounts.find(a => a.username === username);

    if (envAccount) {
      // Env-var account — use AdminPasswordOverride
      const override = await AdminPasswordOverride.findOne({ username });
      const activeHash = override ? override.passwordHash : envAccount.hash;

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
    } else {
      // DB account — update passwordHash directly on the AdminAccount document
      const dbAccount = await AdminAccount.findOne({ username });
      if (!dbAccount) {
        return res.status(403).json({ message: 'Account not found.' });
      }

      const valid = await bcrypt.compare(currentPassword, dbAccount.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      dbAccount.passwordHash = newHash;
      await dbAccount.save();
    }

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/admins — superadmin only
async function listAdmins(req, res, next) {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const envAccounts = getAdminAccounts().map(a => ({
      username: a.username,
      role: a.role,
      source: 'env'
    }));

    const dbAccounts = await AdminAccount.find({}, 'username role createdBy createdAt').lean();
    const dbMapped = dbAccounts.map(a => ({
      username: a.username,
      role: a.role,
      source: 'db',
      createdBy: a.createdBy,
      createdAt: a.createdAt
    }));

    res.json([...envAccounts, ...dbMapped]);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/admins — superadmin only
async function addAdmin(req, res, next) {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (role && !['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or superadmin.' });
    }

    // Prevent duplicates with env-var accounts
    const envAccounts = getAdminAccounts();
    if (envAccounts.some(a => a.username === username)) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const account = await AdminAccount.create({
      username,
      passwordHash,
      role: role || 'admin',
      createdBy: req.admin.username
    });

    res.status(201).json({
      username: account.username,
      role: account.role,
      source: 'db',
      createdBy: account.createdBy,
      createdAt: account.createdAt
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    next(err);
  }
}

// DELETE /api/auth/admins/:username — superadmin only, DB accounts only
async function deleteAdmin(req, res, next) {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const { username } = req.params;

    // Prevent deleting env-var accounts
    const envAccounts = getAdminAccounts();
    if (envAccounts.some(a => a.username === username)) {
      return res.status(400).json({ message: 'Cannot delete built-in accounts.' });
    }

    const result = await AdminAccount.deleteOne({ username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    res.json({ message: 'Account deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, changePassword, listAdmins, addAdmin, deleteAdmin };
