const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config(); // Load .env variables

const app = express();

// CORS setup — update to your Vercel frontend URL in production
app.use(cors({
  origin: 'https://form-event-frontend-d9fs.vercel.app', // Replace with 'https://your-vercel-app.vercel.app' on deploy
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json()); // built-in body parser

// Read environment variables
const SHEET_ID = process.env.SHEET_ID;
const CALENDAR_ID = process.env.CALENDAR_ID;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Google API authentication
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar'
  ]
});

// Main route
app.post('/submit', async (req, res) => {
  const { name, email, message } = req.body;
  const timestamp = new Date().toLocaleString();

  console.log('Received request body:', req.body);

  try {
    const client = await auth.getClient();

    // Google Sheets append
    const sheets = google.sheets({ version: 'v4', auth: client });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[name, email, message, timestamp]]
      }
    });

    // Google Calendar event
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: {
        summary: `New submission from ${name}`,
        description: message,
        start: {
          dateTime: new Date().toISOString()
        },
        end: {
          dateTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        }
      }
    });

    res.status(200).json({ message: 'Success' });
  } catch (err) {
    console.error('Detailed error:', err?.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

// Use dynamic port for Render, fallback to 5001 locally
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
