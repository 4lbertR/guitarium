This is an open source group lesson booking system ordered by guitarium.ee.
This app is used for managing lesson bookings with multiple groups (for example music schools or sports lessons, where most lessons are in a group).
This app supports unlimited students and groups.
The lessons are managed in google calendar.
The title of a lesson in google calendar is the group and description is reserved for tracking participants


<img width="519" height="374" alt="image" src="https://github.com/user-attachments/assets/3dfb3111-ad04-4757-82f2-e1f53865509f" />

The groups can have any name (e.g E1 or Tennis 1), but the group name has to be consistent.
A group can be created by creating an account that is a member of that group.
After that every lesson that has the title of the group shows up for that person.

At the moment a person can't be a member of 2 groups.

Ps. This can not be bypassed by creating another user with the same full name but different password/group. 

Pps. Only the first account registered under a name will work.


For setup, you will need:

1. A server to deploy the script to
2. Caprover or some similar one-click-app installer
3. A mySQL database (Can be installed from caprover)

On how to install caprover:
https://caprover.com/docs/get-started.html

After installing Caprover:
go to captain.something.mydomain.com

Log in with your credentials

Click on one-click-apps

![IMG_0095](https://github.com/user-attachments/assets/24d86f13-ad56-4191-9072-9347d08d58bc)
Search PhpMyAdmin
Set it up
Click on one-click-apps
Search MySql
Set it up

Create an empty app
![IMG_0096](https://github.com/user-attachments/assets/61c9448d-5a4d-422a-a588-035b7bbd939e)
Name it the name you want it to be

Go to the app settings and enable HTTPS
Enable websocket support

Deploy your application:
1. Clone this repository to your local machine
2. Install dependencies: `npm install`
3. Set up environment variables (create a .env file):
   - `DB_HOST` - MySQL database host
   - `DB_PORT` - MySQL database port
   - `DB_USER` - MySQL database username
   - `DB_PASSWORD` - MySQL database password
   - `DB_DATABASE` - MySQL database name
   - `GOOGLE_TYPE` - Google service account type
   - `GOOGLE_PROJECT_ID` - Google Cloud project ID
   - `GOOGLE_PRIVATE_KEY_ID` - Google service account private key ID
   - `GOOGLE_PRIVATE_KEY` - Google service account private key
   - `GOOGLE_CLIENT_EMAIL` - Google service account client email
   - `GOOGLE_CLIENT_ID` - Google service account client ID
   - `GOOGLE_AUTH_URI` - Google OAuth2 auth URI
   - `GOOGLE_TOKEN_URI` - Google OAuth2 token URI
   - `GOOGLE_AUTH_PROVIDER_CERT_URL` - Google auth provider cert URL
   - `GOOGLE_CLIENT_CERT_URL` - Google client cert URL
   - `GOOGLE_UNIVERSE_DOMAIN` - Google universe domain (usually googleapis.com)
   - `GOOGLE_CALENDAR_ID` - The ID of your Google Calendar
   - `JWT_SECRET` - Secret key for JWT token signing

4. Create the MySQL database schema:
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    grupp VARCHAR(100) NOT NULL
);
```

5. Set up Google Calendar API:
   - Create a Google Cloud project
   - Enable the Google Calendar API
   - Create a service account and download the JSON credentials
   - Share your Google Calendar with the service account email
   - Give the service account "Make changes to events" permissions

6. Configure group settings:
   - Create a `config.json` file in the root directory
   - Define your groups and their maximum participant limits:
```json
{
    "E1": { "max": 10 },
    "E2": { "max": 8 },
    "Tennis 1": { "max": 6 }
}
```

7. Deploy to CapRover:
   - Push your code to a Git repository
   - In CapRover, go to your app and deploy from Git
   - Or use the CapRover CLI: `caprover deploy`

8. Start the application locally for testing:
   - `npm start` or `node server.js`
   - Access at `http://localhost:3000`

## Features

- User authentication with JWT tokens
- Group-based lesson management
- Google Calendar integration
- Students can join/leave lessons (with 24-hour cancellation policy)
- Admin panel for managing users, groups, and lessons
- Bulk user creation from Google Sheets
- Cross-group lesson registration
- Lesson capacity limits
- Automatic lesson cancellation display
- Estonian language interface

## Admin Features

To make a user an admin, add their full name to the `admins` array in [main.js](main.js:8):
```javascript
const admins = ['Julia Reinman', 'admin'];
```

Admins can:
- Create and edit user accounts
- Bulk import users from Google Sheets
- Create and delete lessons
- Manage groups
- Register users for lessons
- View lesson information and participants

## Technical Stack

- **Backend**: Node.js with Express
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Calendar Integration**: Google Calendar API
- **Frontend**: Vanilla JavaScript with HTML/CSS

## License

This is open source software. Feel free to use and modify it for your needs.
