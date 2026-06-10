# Deployment Instructions

## Recent Changes (June 10, 2026)

Updated the admin panel's "Tunni info" (lesson info) page to show lessons from the **start of the previous month** to the **end of the current month** (e.g., May 1 - June 30 when viewing in June).

**Previous behavior**: Showed lessons from 1 year in the past to 1 year in the future
**New behavior**: Shows lessons from previous month + current month only

## Deploy to Production

The code changes have been committed and pushed to GitHub. To deploy to CapRover:

### Option 1: CapRover Web Dashboard

1. Go to your CapRover dashboard at `https://captain.apps.realsteal.online`
2. Log in with your admin credentials
3. Navigate to the `guitarium` app
4. Go to the **Deployment** tab
5. Click **Deploy from GitHub**
6. Select the `main` branch
7. Click **Deploy**
8. Wait for the deployment to complete (watch the logs)

### Option 2: CapRover CLI

If you have CapRover CLI configured:

```bash
npx caprover deploy
```

Select the `redirecter at https://captain.apps.realsteal.online` machine when prompted.

### Option 3: Manual Deployment

1. Pull the latest code: `git pull origin main`
2. Build and deploy manually through your CapRover setup

## Verify the Deployment

After deployment:

1. Go to the admin panel
2. Click **Tunni info**
3. Select group "D" (or any group with lessons in May)
4. Verify that lessons from early May (e.g., May 3rd) are now visible
5. The date dropdown should show lessons starting from May 1st

## Technical Details

**Changed file**: `main.js`
**Changed function**: `/api/getevents-by-group` endpoint (lines 657-724)
**Key change**: Modified date range calculation from 1-year window to 2-month window

```javascript
// Before:
const pastWindow = new Date(now);
pastWindow.setFullYear(now.getFullYear() - 1);
const future = new Date(now);
future.setFullYear(now.getFullYear() + 1);

// After:
const pastWindow = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
const future = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
```

**Commits**:
- `2a1ad0a` - Initial fix for date range
- `e1d95d4` - Clarified date range calculation with explicit time components

## Troubleshooting

If lessons from May 3rd are still not showing after deployment:

1. **Check the server time**: Ensure the server is using Europe/Tallinn timezone (EEST/EET)
2. **Verify the deployment**: Check CapRover logs to ensure the new code was deployed
3. **Clear browser cache**: Force-refresh the admin panel (Ctrl+F5 or Cmd+Shift+R)
4. **Check Google Calendar**: Verify the May 3rd lesson exists in the Google Calendar with group "D"
5. **Restart the app**: In CapRover dashboard, restart the guitarium app
