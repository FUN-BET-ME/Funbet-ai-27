# FunBet.AI Performance Optimization Plan

## Current Performance Metrics
- **Homepage**: ~0.5s load time ✅ (Excellent)
- **Live Odds Page**: ~5.8s load time ⚠️ (Can be improved)
- **API Response**: Working but can be optimized
- **Images**: Some blocked, multiple logo fetches

---

## 🚀 Priority 1: Quick Wins (Immediate Impact)

### 1.1 Implement Progressive Loading
**Problem**: Users see blank screen while waiting for all data
**Solution**: Show content as it loads
- Display skeleton loaders immediately
- Load match cards incrementally (first 10, then rest)
- Show cached data while fetching fresh data

### 1.2 Add Browser Caching Headers
**Problem**: Resources re-downloaded on every visit
**Solution**: Configure aggressive caching
```python
# Backend: Add cache headers
@app.get("/api/matches")
async def get_matches(response: Response):
    response.headers["Cache-Control"] = "public, max-age=120"  # 2 min cache
    # ... rest of code
```

### 1.3 Optimize Team Logo Loading
**Problem**: 14+ logo requests slowing page load
**Solution**: 
- Batch logo requests into single API call
- Use lazy loading for logos (load only visible ones)
- Implement logo sprite sheet or base64 embed for common teams
- Self-host critical team logos instead of external URLs

### 1.4 Enable Response Compression
**Problem**: Large JSON responses
**Solution**: Enable Gzip/Brotli compression in backend
```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

---

## 🎯 Priority 2: Performance Enhancements (High Impact)

### 2.1 Implement API Response Caching
**Problem**: Same data fetched repeatedly
**Solution**: Cache API responses in memory
```python
from functools import lru_cache
import time

# In-memory cache with TTL
cache = {}

@app.get("/api/matches")
async def get_matches():
    cache_key = "matches"
    now = time.time()
    
    # Return cached if fresh (< 2 min old)
    if cache_key in cache and now - cache[cache_key]['time'] < 120:
        return cache[cache_key]['data']
    
    # Fetch fresh data
    data = await fetch_matches()
    cache[cache_key] = {'data': data, 'time': now}
    return data
```

### 2.2 Optimize Database Queries
**Problem**: Slow MongoDB queries
**Solution**:
- Add indexes on frequently queried fields
- Limit query results (pagination)
- Use projection to fetch only needed fields
```python
# Add indexes
await db.matches.create_index([("commence_time", 1)])
await db.predictions.create_index([("match_id", 1)])

# Optimize queries
matches = await db.matches.find(
    {"commence_time": {"$gte": now}},
    {"_id": 0, "match_id": 1, "home_team": 1, "away_team": 1, "odds": 1}
).limit(50).to_list(length=50)
```

### 2.3 Code Splitting & Lazy Loading
**Problem**: Large initial JavaScript bundle
**Solution**: Split code by route
```javascript
// App.js - Use React.lazy
import React, { lazy, Suspense } from 'react';

const LiveOdds = lazy(() => import('./pages/LiveOdds'));
const Predictions = lazy(() => import('./pages/Predictions'));
const Stats = lazy(() => import('./pages/Stats'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/live-odds" element={<LiveOdds />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </Suspense>
  );
}
```

### 2.4 Image Optimization
**Problem**: Unoptimized images, external blocking
**Solution**:
- Convert team logos to WebP format
- Implement responsive images
- Add lazy loading to images
- Self-host critical logos
```jsx
<img 
  src={logoUrl} 
  alt={teamName}
  loading="lazy"
  width="40" 
  height="40"
/>
```

### 2.5 Implement Service Worker (PWA)
**Problem**: No offline support, slow repeat visits
**Solution**: Cache static assets and API responses
```javascript
// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('funbet-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/main.js',
        '/static/css/main.css'
      ]);
    })
  );
});
```

---

## 💎 Priority 3: Advanced Optimizations (Long-term)

### 3.1 Implement Redis Caching
**Problem**: In-memory cache limited to single server
**Solution**: Use Redis for distributed caching
```python
import redis
from datetime import timedelta

redis_client = redis.Redis(host='localhost', port=6379)

@app.get("/api/matches")
async def get_matches():
    # Try Redis cache first
    cached = redis_client.get("matches")
    if cached:
        return json.loads(cached)
    
    # Fetch and cache
    data = await fetch_matches()
    redis_client.setex("matches", timedelta(minutes=2), json.dumps(data))
    return data
```

### 3.2 Database Connection Pooling
**Problem**: Opening new DB connections is slow
**Solution**: Maintain connection pool
```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=50,
    minPoolSize=10
)
```

### 3.3 API Response Optimization
**Problem**: Sending unnecessary data
**Solution**:
- Remove unused fields from responses
- Implement GraphQL or field selection
- Compress timestamps and IDs
```python
# Only send needed fields
return {
    "id": match["match_id"],
    "h": match["home_team"],
    "a": match["away_team"],
    "t": match["commence_time"],
    "o": match["odds"]  # Shortened field names
}
```

### 3.4 Implement CDN
**Problem**: Static assets served from single location
**Solution**: Use CDN for global distribution
- CloudFlare (free tier available)
- AWS CloudFront
- Vercel Edge Network

### 3.5 Optimize React Rendering
**Problem**: Unnecessary re-renders
**Solution**:
```javascript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const MatchCard = memo(({ match }) => {
  return <div>...</div>;
});

// Memoize expensive calculations
const sortedMatches = useMemo(() => {
  return matches.sort((a, b) => a.commence_time - b.commence_time);
}, [matches]);

// Memoize callbacks
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### 3.6 Preload Critical Resources
**Problem**: Resources loaded late in page lifecycle
**Solution**: Add preload hints
```html
<!-- In index.html -->
<link rel="preconnect" href="https://funbet.ai">
<link rel="dns-prefetch" href="https://upload.wikimedia.org">
<link rel="preload" href="/static/css/main.css" as="style">
<link rel="preload" href="/static/js/main.js" as="script">
```

### 3.7 Implement Virtual Scrolling
**Problem**: Rendering hundreds of matches slows page
**Solution**: Render only visible matches
```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={800}
  itemCount={matches.length}
  itemSize={200}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <MatchCard match={matches[index]} />
    </div>
  )}
</FixedSizeList>
```

### 3.8 API Request Batching
**Problem**: Multiple small API calls
**Solution**: Batch related requests
```javascript
// Instead of multiple calls
const matches = await fetch('/api/matches');
const odds = await fetch('/api/odds');
const predictions = await fetch('/api/predictions');

// Single batched call
const data = await fetch('/api/batch', {
  method: 'POST',
  body: JSON.stringify({
    requests: ['matches', 'odds', 'predictions']
  })
});
```

---

## 📊 Priority 4: Perceived Performance (UX)

### 4.1 Skeleton Screens
**Problem**: Blank screen feels slow
**Solution**: Show skeleton loaders
```jsx
function MatchCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-20 bg-gray-700 rounded"></div>
    </div>
  );
}

{loading ? (
  <MatchCardSkeleton />
) : (
  <MatchCard data={match} />
)}
```

### 4.2 Optimistic UI Updates
**Problem**: Waiting for API confirmation
**Solution**: Update UI immediately, rollback if fails
```javascript
const handleFavorite = async (matchId) => {
  // Update UI immediately
  setFavorites([...favorites, matchId]);
  
  try {
    await api.addFavorite(matchId);
  } catch (error) {
    // Rollback on error
    setFavorites(favorites.filter(id => id !== matchId));
  }
};
```

### 4.3 Stale-While-Revalidate
**Problem**: Fresh data takes time
**Solution**: Show cached data, fetch fresh in background
```javascript
const [data, setData] = useState(cachedData);

useEffect(() => {
  // Show cached immediately
  const cached = localStorage.getItem('matches');
  if (cached) {
    setData(JSON.parse(cached));
  }
  
  // Fetch fresh in background
  fetch('/api/matches').then(response => {
    const fresh = response.json();
    setData(fresh);
    localStorage.setItem('matches', JSON.stringify(fresh));
  });
}, []);
```

### 4.4 Prefetch Next Page
**Problem**: Navigation feels slow
**Solution**: Prefetch likely next pages
```javascript
// Prefetch when user hovers over link
<Link 
  to="/predictions"
  onMouseEnter={() => {
    // Prefetch predictions page
    import('./pages/Predictions');
  }}
>
  Predictions
</Link>
```

---

## 🔧 Implementation Priority Order

### Week 1: Quick Wins
1. ✅ Enable Gzip compression (backend)
2. ✅ Add Cache-Control headers
3. ✅ Implement skeleton loaders
4. ✅ Add lazy loading to images
5. ✅ Optimize team logo loading

### Week 2: Core Optimizations
1. ✅ Implement API response caching
2. ✅ Add database indexes
3. ✅ Code splitting by route
4. ✅ Optimize MongoDB queries

### Week 3: Advanced Features
1. ✅ Service Worker (PWA)
2. ✅ Redis caching
3. ✅ Virtual scrolling for long lists
4. ✅ API request batching

### Week 4: Polish & Monitoring
1. ✅ Performance monitoring
2. ✅ CDN setup
3. ✅ Final optimizations
4. ✅ Performance testing

---

## 📈 Expected Results

### Current Performance
- Homepage: 0.5s
- Live Odds: 5.8s
- Perceived performance: Average

### Target Performance (After Optimization)
- Homepage: 0.2-0.3s
- Live Odds: 1.5-2s
- Perceived performance: Excellent
- Lighthouse Score: 95+

### Key Metrics to Track
- **TTFB** (Time to First Byte): < 200ms
- **FCP** (First Contentful Paint): < 1s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3s
- **CLS** (Cumulative Layout Shift): < 0.1

---

## 🎯 Quick Implementation Checklist

- [ ] Enable Gzip compression
- [ ] Add Cache-Control headers
- [ ] Implement skeleton loaders
- [ ] Lazy load images
- [ ] Optimize team logo fetching
- [ ] Add API response caching
- [ ] Create database indexes
- [ ] Implement code splitting
- [ ] Add Service Worker
- [ ] Set up Redis (optional)
- [ ] Implement virtual scrolling
- [ ] Add performance monitoring

---

## 💡 Monitoring & Continuous Improvement

### Tools to Use
1. **Google Lighthouse** - Overall performance score
2. **Google PageSpeed Insights** - Real-world performance data
3. **WebPageTest** - Detailed waterfall analysis
4. **Chrome DevTools** - Performance profiling
5. **Sentry/LogRocket** - Real user monitoring

### Regular Checks
- Weekly Lighthouse audits
- Monitor Core Web Vitals
- Track API response times
- Monitor error rates
- Review user feedback

---

*This optimization plan will significantly improve FunBet.AI's performance and user experience!*
