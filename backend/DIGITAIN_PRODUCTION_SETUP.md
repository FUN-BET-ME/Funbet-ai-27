# DIGITAIN PRODUCTION API SETUP GUIDE

## When Production Credentials Arrive

You will receive:
1. **Production Base URL** - e.g., `https://affiliatefeedapi.digitain.com` (without "tst")
2. **Production Client ID** - e.g., `FunbetClient_Prod` or similar
3. **Production Client Secret** - New secret key

## Steps to Switch to Production

### STEP 1: Update Environment Variables

Edit `/app/backend/.env`:

```bash
# OLD (TEST) - REPLACE THESE:
DIGITAIN_BASE_URL="https://affiliatefeedapi.tst-digi.com"
DIGITAIN_CLIENT_ID="FunbetClient"
DIGITAIN_CLIENT_SECRET="aK6ADMhN7V"

# NEW (PRODUCTION) - USE YOUR ACTUAL CREDENTIALS:
DIGITAIN_BASE_URL="<PRODUCTION_URL_FROM_DIGITAIN>"
DIGITAIN_CLIENT_ID="<PRODUCTION_CLIENT_ID>"
DIGITAIN_CLIENT_SECRET="<PRODUCTION_SECRET>"
```

### STEP 2: Restart Backend

```bash
sudo supervisorctl restart backend
```

### STEP 3: Verify Production Connection

Run this test:

```bash
cd /app/backend && python -c "
import asyncio
from digitain_api import get_access_token, fetch_live_events, fetch_prematch_events, convert_to_odds_api_format

async def test_production():
    print('=== TESTING PRODUCTION API ===')
    
    # Test auth
    token = await get_access_token()
    if not token:
        print('❌ Authentication FAILED')
        return
    print('✅ Authentication successful')
    
    # Test live events
    live = await fetch_live_events()
    print(f'Live events: {len(live)}')
    
    # Test prematch
    prematch = await fetch_prematch_events(7)
    print(f'Prematch events: {len(prematch)}')
    
    # Check for cricket
    all_events = convert_to_odds_api_format(live + prematch)
    cricket = [e for e in all_events if 'cricket' in e.get('sport_title', '').lower()]
    print(f'✅ Cricket events found: {len(cricket)}')
    
    if cricket:
        print('Example cricket match:')
        c = cricket[0]
        print(f'  {c[\"home_team\"]} vs {c[\"away_team\"]}')
        if c.get('scores'):
            print(f'  Score: {c[\"scores\"]}')

asyncio.run(test_production())
"
```

### STEP 4: Test Endpoints

```bash
# Test live endpoint
curl "https://livescore-verify.preview.emergentagent.com/api/digitain/live" | jq '.data[] | select(.sport_title | contains("Cricket"))'

# Test prematch endpoint
curl "https://livescore-verify.preview.emergentagent.com/api/digitain/prematch?days_ahead=7" | jq '.data[] | select(.sport_title | contains("Cricket"))'
```

## Expected Results with Production

✅ Cricket events (live and prematch)
✅ More sports coverage
✅ Real-time live scores
✅ Correct sport IDs (not 0)
✅ More bookmakers/markets

## What's Already Configured

✅ OAuth authentication with token refresh
✅ Live events fetching
✅ Prematch events fetching (with date ranges)
✅ MessagePack decoding
✅ English language (LangId=2)
✅ Format conversion to odds-api compatible structure
✅ Backend API endpoints (/api/digitain/live, /api/digitain/prematch)
✅ Caching (1-min for live, 5-min for prematch)
✅ Frontend integration ready (timeFilter support in OddsTable)

## Troubleshooting

If cricket still doesn't show:
1. Check if Digitain production has cricket (SportId=36)
2. Verify date range for prematch events
3. Check logs: `tail -f /var/log/supervisor/backend.err.log | grep Digitain`
4. Test with different sports to confirm API is working

## Contact Info

If issues persist, contact Digitain support with:
- Your Client ID
- Error messages from logs
- Sport IDs you're requesting
