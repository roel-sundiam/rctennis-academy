const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const playerRoutes = require('./routes/player.routes');
const reservationRoutes = require('./routes/reservation.routes');
const blockedSlotRoutes = require('./routes/blocked-slot.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/players', playerRoutes);
app.use('/reservations', reservationRoutes);
app.use('/blocked-slots', blockedSlotRoutes);
app.use('/analytics', analyticsRoutes);

app.use(errorHandler);

module.exports = app;
