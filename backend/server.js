require('dotenv').config();
const { connectDB } = require('./config/db');
const app = require('./app');

app.listen(process.env.PORT, () => {
  console.log(`RC Tennis API running on http://localhost:${process.env.PORT}`);
});

connectDB().catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
