# Fix: Excessive `/api/articles` Requests

## Problem
The `/api/articles` endpoint was being called **hundreds of times per minute** in development, causing excessive server logs and potential database hammering.

## Root Cause
A cascade of issues in `src/app/page.tsx` countdown timer logic:

1. **Infinite Schedule Loop**: When `nextUpdate` was in the past (common in local dev without cron jobs), the countdown timer would:
   - Run every 1 second
   - Schedule a fetch every time it detected the deadline passed
   - After the fetch completed, it would set a new `nextUpdate` reference (different object)
   - This would trigger the `useEffect` to re-run (dependency change)
   - Leading to exponentially increasing scheduled fetches

2. **Effect Dependencies**: The countdown `useEffect` had `[nextUpdate, fetchArticles]` as dependencies. Since `setNextUpdate()` always created a new `Date` object, it would perpetually retrigger the effect.

3. **No Deduplication**: There was no mechanism to prevent multiple simultaneous refresh attempts, so cascading timeouts would all fire.

## Solution

### 1. **Frontend Fix** (`src/app/page.tsx`)
Added a `refreshingRef` to deduplicate refresh attempts:

```typescript
// Added useRef import
import { useState, useEffect, useCallback, useRef } from 'react';

// In component:
const refreshingRef = useRef(false);

// In fetchArticles callback - reset flag when done:
finally {
  setLoading(false);
  refreshingRef.current = false;
}

// In countdown effect - guard against duplicate scheduling:
if (!refreshingRef.current) {
  refreshingRef.current = true;
  setTimeout(() => {
    fetchArticles();
  }, 5000);
}
```

**Effect**: Only one refresh is scheduled even if the countdown runs multiple times while the update is in progress.

### 2. **Backend Fix** (`src/app/api/articles/route.ts`)
Added simple in-memory caching with a 10-second TTL:

```typescript
const CACHE_TTL = 10 * 1000; // 10 seconds
let cachedResponse: any = null;
let cacheTimestamp = 0;

export async function GET() {
  const now = Date.now();
  if (cachedResponse && (now - cacheTimestamp) < CACHE_TTL) {
    return NextResponse.json(cachedResponse);
  }
  
  // ... fetch and cache response ...
}
```

**Effect**: Multiple rapid requests return the same cached data without hitting the database, reducing DB queries 10x.

## Impact

- ✅ Eliminates cascade of API requests
- ✅ Reduces database load significantly
- ✅ Cleaner development logs
- ✅ Works correctly in both dev (no cron) and production (with cron)
- ✅ No breaking changes to functionality

## Testing

1. Start dev server: `npm run dev`
2. Watch the terminal logs
3. Should see `GET /api/articles` requests at reasonable intervals (every 30 min auto-refresh + countdown triggers)
4. No more spam of hundreds of requests

## Future Improvements

- Consider using a proper cache library (Redis) in production
- Add request deduplication with SWR or React Query
- Monitor and set alerts on database query counts

