# Facebook App ID Setup Guide

## Why Use Facebook App ID?
Using a Facebook App ID provides:
- ✅ Better control over shared content appearance
- ✅ More reliable sharing with Facebook's Dialog API
- ✅ Enhanced preview and formatting on Facebook
- ✅ Ability to track sharing analytics (optional)

## How to Create a Facebook App ID

### Step 1: Go to Facebook Developers
1. Visit: https://developers.facebook.com/
2. Log in with your Facebook account
3. Click "My Apps" in the top navigation
4. Click "Create App"

### Step 2: Choose App Type
1. Select **"Consumer"** or **"Business"** (Consumer is fine for sharing)
2. Click "Next"

### Step 3: Fill in App Details
1. **App Name**: `FunBet.AI` (or your preferred name)
2. **App Contact Email**: Your email address
3. **Business Account**: (Optional - skip if you don't have one)
4. Click "Create App"

### Step 4: Configure App Settings
1. In the left sidebar, go to **Settings** → **Basic**
2. Add **App Domains**: 
   - `bet-oracle-33.preview.emergentagent.com`
   - Add your production domain when ready
3. Scroll down to **"Tell us how your app works"**
   - Add Platform: **Website**
   - Site URL: `https://funbet-ai.preview.emergentagent.com`
4. Save changes

### Step 5: Get Your App ID
1. At the top of the Settings page, you'll see **"App ID"**
2. Copy this number (e.g., `1234567890123456`)

### Step 6: Add to Your App
1. Open `/app/frontend/.env`
2. Update the line:
   ```
   REACT_APP_FACEBOOK_APP_ID=YOUR_APP_ID_HERE
   ```
3. Replace `YOUR_APP_ID_HERE` with your actual App ID
4. Restart the frontend server:
   ```bash
   sudo supervisorctl restart frontend
   ```

## Example Configuration

```env
# /app/frontend/.env
REACT_APP_BACKEND_URL=https://funbet-ai.preview.emergentagent.com
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
REACT_APP_FACEBOOK_APP_ID=1234567890123456
```

## How It Works

### With App ID (Enhanced)
- Uses Facebook's Dialog API (`/dialog/share`)
- Better control over shared content
- Shows quote text prominently
- More reliable across devices

### Without App ID (Basic - Current)
- Uses basic sharer (`/sharer/sharer.php`)
- Still works but with limited control
- Falls back automatically if no App ID provided

## Testing

After adding your App ID:
1. Go to any prediction page
2. Click the Facebook share button
3. You should see a more polished Facebook sharing dialog
4. The prediction details should appear in the post

## Optional: Make App Live

By default, your app is in "Development Mode" which only works for you and testers:

1. Go to **Settings** → **Basic**
2. Scroll to **"App Mode"**
3. Toggle from "Development" to "Live"
4. This allows anyone to use the share feature

## Troubleshooting

**App ID not working?**
- Make sure you added the correct domain in App Domains
- Ensure the app is not in Development Mode (or add yourself as a tester)
- Check that you restarted the frontend server after updating .env

**Still using basic sharer?**
- Verify the App ID is in the .env file
- Check browser console for any errors
- Make sure there are no spaces in the App ID

## Need Help?
Contact Facebook Developer Support: https://developers.facebook.com/support/
