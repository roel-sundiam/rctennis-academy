require('dotenv').config();
const serverless = require('serverless-http');
const { connectDB } = require('./config/db');
const app = require('./app');

let isConnected = false;
const serverlessApp = serverless(app);

exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for the event loop to drain
  context.callbackWaitsForEmptyEventLoop = false;

  // Reuse DB connection across warm invocations
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }

  // Strip /api prefix so Express routes (/players, /auth, etc.) match correctly
  const modifiedEvent = {
    ...event,
    path: event.path.replace(/^\/api/, '') || '/'
  };

  return serverlessApp(modifiedEvent, context);
};
