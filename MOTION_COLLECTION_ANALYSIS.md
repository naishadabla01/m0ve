# Motion Collection System - Architecture & Scaling Analysis

## Current System Architecture

### 📱 Client-Side (Mobile App)

**Data Collection:**
- **Sampling Rate**: 25 Hz (every 40ms) via device accelerometer
- **Batch Interval**: Sends data every 1 second (configurable via `postEveryMs`)
- **Payload per batch**: ~25 samples, each containing:
  ```typescript
  {
    t: number,      // timestamp (ms since epoch)
    mag: number,    // magnitude = sqrt(x² + y² + z²)
    x: number,      // x-axis acceleration
    y: number,      // y-axis acceleration
    z: number       // z-axis acceleration
  }
  ```
- **Payload size**: ~25 samples × 5 fields × 8 bytes ≈ **1 KB per second per user**

**Request Pattern:**
- **Motion data**: POST to `/api/motion` every 1 second
- **Score polling**: GET from Supabase `scores` table every 3 seconds
- **Authentication**: JWT token included in every request

### 🔄 Backend (Railway API)

**Endpoint**: `POST /api/motion`

**Processing per request:**
1. Receives batch of ~25 samples
2. Calculates energy/score (currently accumulating raw values)
3. Updates `scores` table in Supabase PostgreSQL
4. Updates `last_update` timestamp

**Database Schema:**
```sql
CREATE TABLE scores (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score numeric DEFAULT 0,
  last_update timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_live boolean DEFAULT false,
  PRIMARY KEY (event_id, user_id)
);
```

---

## 🚨 Scaling Concerns with 500 Concurrent Users

### 1. **Database Write Load**

**Current Load:**
- 500 users × 1 request/second = **500 writes/second**
- 500 users × 60 seconds × 60 minutes = **1.8 million writes per hour**
- Each write is an UPDATE to the `scores` table (upsert pattern)

**Issues:**
- ❌ PostgreSQL connection pool exhaustion
- ❌ Lock contention on `scores` table
- ❌ Index maintenance overhead (indexes on event_id, user_id, score)
- ❌ High CPU usage for continuous UPDATEs

### 2. **Database Read Load**

**Current Load:**
- 500 users × 1 read/3 seconds = **~167 reads/second** (score polling)
- Leaderboard queries: Up to 100 rows sorted by score (expensive)
- Real-time rank calculations

**Issues:**
- ❌ Expensive ORDER BY score DESC queries
- ❌ No caching layer
- ❌ Simultaneous leaderboard queries strain database

### 3. **API Backend Load**

**Current Load:**
- 500 requests/second to process
- Each request requires:
  - JWT validation
  - JSON parsing (~1 KB payload)
  - Score calculation from 25 samples
  - Database write operation

**Issues:**
- ❌ Backend CPU bottleneck processing samples
- ❌ Network bandwidth: 500 KB/second incoming
- ❌ Potential memory issues if requests queue up

### 4. **Network & Client Impact**

**Per User:**
- 1 KB/second upload (motion data)
- Minimal download (score updates)
- Battery drain from constant HTTP requests

**Issues:**
- ⚠️ Battery consumption on mobile devices
- ⚠️ Data usage (3.6 MB per hour per user)
- ⚠️ Poor performance on slow networks

---

## ✅ Recommended Solutions

### Immediate Fixes (Quick Wins)

#### 1. **Reduce Send Frequency**
```typescript
// Change from 1 second to 3 seconds
startMotionStream(eventId, 3000); // Instead of 1000
```
- **Impact**: Reduces database writes to 167/second (66% reduction)
- **Trade-off**: Slightly delayed score updates

#### 2. **Client-Side Score Estimation**
```typescript
// Calculate estimated score locally, only poll every 10 seconds
const estimatedScore = totalEnergy + (recentActivity * timeElapsed);
```
- **Impact**: Reduces read load to 50/second (70% reduction)
- **Trade-off**: Slight score drift (sync every 10s)

#### 3. **Batch Multiple Intervals**
```typescript
// Send every 5 seconds with 5 seconds worth of data
startMotionStream(eventId, 5000);
```
- **Impact**: Reduces to 100 writes/second (80% reduction)
- **Trade-off**: 5-second delay in score updates

### Medium-Term Solutions

#### 4. **Implement Message Queue**

**Architecture:**
```
Mobile App → API → Message Queue (Redis/RabbitMQ) → Worker → Database
                ↓
            Return 202 Accepted immediately
```

**Benefits:**
- ✅ API responds instantly (202 Accepted)
- ✅ Workers process batches asynchronously
- ✅ Better handling of traffic spikes
- ✅ Can batch multiple user updates into single transaction

**Implementation:**
```typescript
// API endpoint
app.post('/api/motion', async (req, res) => {
  await redis.lpush('motion_queue', JSON.stringify(req.body));
  res.status(202).json({ queued: true });
});

// Background worker
while (true) {
  const batch = await redis.brpop('motion_queue', 100); // Get up to 100
  await processBatch(batch); // Single transaction for all updates
}
```

#### 5. **Database Optimization**

**A. Use PostgreSQL Connection Pooling:**
```sql
-- Increase connection pool size
max_connections = 200
shared_buffers = 256MB
```

**B. Add Materialized View for Leaderboard:**
```sql
CREATE MATERIALIZED VIEW leaderboard_cache AS
SELECT
  event_id,
  user_id,
  score,
  ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY score DESC) as rank
FROM scores
WHERE is_live = true;

-- Refresh every 10 seconds instead of querying on every request
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
```

**C. Partition scores table by event_id:**
```sql
-- Reduces index contention
CREATE TABLE scores (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score numeric DEFAULT 0,
  ...
) PARTITION BY LIST (event_id);
```

#### 6. **Caching Layer (Redis)**

**Leaderboard Caching:**
```typescript
// Cache leaderboard for 5 seconds
const cacheKey = `leaderboard:${eventId}`;
let leaderboard = await redis.get(cacheKey);

if (!leaderboard) {
  leaderboard = await db.query('SELECT ...');
  await redis.setex(cacheKey, 5, JSON.stringify(leaderboard));
}
```

**Score Caching:**
```typescript
// Update Redis on every write, PostgreSQL every 10 seconds
await redis.hincrby(`scores:${eventId}`, userId, scoreIncrease);

// Background sync to PostgreSQL
setInterval(async () => {
  const scores = await redis.hgetall(`scores:${eventId}`);
  await db.batchUpdate(scores);
}, 10000);
```

### Long-Term Solutions

#### 7. **WebSocket for Real-Time Updates**

Instead of polling every 3 seconds:
```typescript
// Client
const ws = new WebSocket('wss://api.m0ve.app/events/${eventId}');
ws.onmessage = (event) => {
  const { leaderboard, userScore } = JSON.parse(event.data);
  updateUI(leaderboard, userScore);
};
```

**Benefits:**
- ✅ Eliminates polling (saves 167 requests/second)
- ✅ Instant updates when scores change
- ✅ Single connection per user instead of repeated HTTP requests

#### 8. **Edge Functions / Serverless**

Deploy motion processing to edge:
```typescript
// Cloudflare Workers / Vercel Edge
export default async function handler(req) {
  const samples = await req.json();

  // Process at edge (close to user)
  const score = calculateScore(samples);

  // Batch write to central database
  await queueScoreUpdate(score);

  return new Response('OK', { status: 202 });
}
```

#### 9. **Time-Series Database for Motion Data**

If you need to store historical motion data:
```
TimescaleDB / InfluxDB for raw samples
    ↓
PostgreSQL for aggregated scores
```

---

## 📊 Recommended Architecture for 500+ Users

```
┌─────────────┐
│ Mobile App  │
│  (500 users)│
└──────┬──────┘
       │ POST /api/motion every 3s (instead of 1s)
       │
       ▼
┌─────────────────┐
│  Load Balancer  │
│   (nginx/ALB)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   API Servers (3+)      │
│   - Validate JWT        │
│   - Quick processing    │
│   - Return 202 Accepted │
└───────────┬─────────────┘
            │
            ▼
┌──────────────────────┐
│   Redis Queue        │
│   - motion_queue     │
└──────────┬───────────┘
           │
           ▼
┌───────────────────────┐
│  Background Workers   │
│  - Process batches    │
│  - Calculate scores   │
│  - Batch DB writes    │
└──────────┬────────────┘
           │
           ▼
┌────────────────────────┐
│   Redis Cache          │
│   - Live scores        │
│   - Leaderboards       │
│   TTL: 5-10 seconds    │
└──────────┬─────────────┘
           │
           ▼ (periodic sync)
┌────────────────────────┐
│  PostgreSQL (Supabase) │
│  - Persistent scores   │
│  - User profiles       │
│  - Events              │
└────────────────────────┘
           │
           ▼
┌────────────────────────┐
│  WebSocket Server      │
│  - Push score updates  │
│  - Real-time leaderboard│
└────────────────────────┘
```

---

## 🎯 Immediate Action Plan

### Phase 1: Quick Fixes (Today)
1. ✅ Change `postEveryMs` from 1000ms → 3000ms
2. ✅ Reduce score polling from 3s → 5s
3. ✅ Implement local score estimation
4. ✅ Add database indexes if missing

**Expected Result**: Reduces load by 60-70%

### Phase 2: Backend Optimization (This Week)
1. 🔧 Add Redis for caching leaderboards
2. 🔧 Implement message queue (Redis or RabbitMQ)
3. 🔧 Create background worker for batch processing
4. 🔧 Add connection pooling

**Expected Result**: Handles 1000+ concurrent users

### Phase 3: Advanced Features (Next Sprint)
1. 🚀 WebSocket for real-time updates
2. 🚀 Materialized views for leaderboards
3. 🚀 Edge functions for global distribution
4. 🚀 Database partitioning

**Expected Result**: Handles 5000+ concurrent users

---

## 💰 Cost Implications

### Current System (500 users, 1 hour event)
- Database writes: 1.8M per hour
- Database reads: 600K per hour
- Supabase: May hit free tier limits
- Railway backend: High CPU usage

### Optimized System
- Database writes: 360K per hour (5× reduction)
- Redis operations: ~10M per hour (cheap)
- Background workers: Constant CPU, lower spikes
- **Estimated cost**: $20-50/month for 500 concurrent users

---

## 🔍 Monitoring Recommendations

### Key Metrics to Track
1. **Request rate**: Requests/second to `/api/motion`
2. **Database connections**: Active connections to PostgreSQL
3. **Queue depth**: Items waiting in message queue
4. **Score update latency**: Time from motion → score visible
5. **Error rate**: Failed requests / timeouts
6. **Database query time**: Slow query log

### Tools
- **Application**: DataDog, New Relic, or Sentry
- **Database**: Supabase metrics dashboard
- **Infrastructure**: Railway metrics + CloudWatch

---

## Summary

**Current system will struggle at 500 concurrent users due to:**
- 500 database writes/second
- No caching layer
- Synchronous request processing
- Expensive leaderboard queries

**Recommended immediate fix:**
- Change send interval to 3 seconds (reduces load by 66%)
- Implement Redis caching for leaderboards

**Long-term solution:**
- Message queue + background workers
- WebSocket for real-time updates
- Materialized views for leaderboards

**With optimizations, the system can handle 1000-5000 concurrent users.**
