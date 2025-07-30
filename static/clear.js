const { google } = require('googleapis');
require('dotenv').config();
 
const key = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
};
const calendarId = process.env.GOOGLE_CALENDAR_ID;
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
 
(async () => {
  const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  console.log('Fetching all events...');
  const all = await calendar.events.list({
    calendarId, 
    showDeleted: false,
    singleEvents: false,
    maxResults: 2500
  });

  const events = all.data.items || [];
  console.log(`Found ${events.length} events.`);

  for (const event of events) {
    if (event.description && event.description.trim() !== '') {
      console.log(`Clearing description for event ID ${event.id} (summary: ${event.summary})`);
      await calendar.events.patch({
        calendarId,
        eventId: event.id,
        requestBody: { description: '' }
      });
    }
  }

  console.log('✅ Finished clearing descriptions on all events and instances.');
})();