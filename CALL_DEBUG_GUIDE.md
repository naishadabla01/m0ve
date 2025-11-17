# Video Call Debugging Guide

## Issue
Incoming call notifications not appearing on mobile device. Instead, iPhone redirects to Continuity Camera app.

## Root Cause Analysis
The **Continuity Camera** feature is interfering with testing. When your Mac (running the dashboard) requests camera access, your iPhone automatically responds by opening the Continuity Camera app, preventing the normal call notification flow.

---

## STEP 1: Disable Continuity Camera on iPhone

### Option A: Completely Disable (Recommended for Testing)
1. Open **Settings** on your iPhone
2. Go to **General** → **AirPlay & Continuity**
3. Scroll down to **Continuity Camera**
4. Turn **OFF** the toggle

### Option B: Disable for Mac Only
1. Make sure your iPhone and Mac are on the same WiFi network
2. On **Mac**: System Settings → General → AirDrop & Handoff
3. Turn off **Continuity Camera**

---

## STEP 2: Test the Call Flow (After Disabling Continuity Camera)

### On Mobile App:
1. Open the Move app on iPhone
2. Make sure you're logged in as the **regular user** (not artist)
3. Join an event where you have recent activity (scores updated within last 20 seconds)
4. **Watch the Expo terminal logs** carefully

### Expected Logs on Mobile (Expo Terminal):
Look for these log messages in order:

```
🎯 [IncomingCallModal] User ID: [your-user-id]
🎯 [IncomingCallModal] User Email: [your-email]
🔔 [IncomingCallModal] Setting up realtime subscription for user: [your-user-id]
🔔 [IncomingCallModal] Channel name: incoming-calls:[your-user-id]
🔔 [IncomingCallModal] Filter: user_id=eq.[your-user-id]
✅ [IncomingCallModal] Subscription status: SUBSCRIBED
✅ [IncomingCallModal] Successfully subscribed to incoming calls!
```

### On Dashboard (localhost:3000):
1. Log in as **artist**
2. Go to the event
3. Click "Start Call"
4. Select the participant (your regular user account)
5. Click "Start Call (1 Invite)"

### Expected Logs After Starting Call:
```
📞 [IncomingCallModal] Incoming call notification received!
📞 [IncomingCallModal] Payload: { ... }
📞 [IncomingCallModal] Fetching call session details for ID: [session-id]
📞 [IncomingCallModal] Call data: { ... }
📞 [IncomingCallModal] Showing incoming call modal!
📞 [IncomingCallModal] Artist: [artist-name]
📞 [IncomingCallModal] Event: [event-name]
📞 [IncomingCallModal] Room: [room-name]
```

**Then the IncomingCallModal should appear on your iPhone!**

---

## STEP 3: Troubleshooting Based on Logs

### Scenario 1: No subscription logs at all
**Problem**: IncomingCallModal component not rendering
**Check**:
- Is IncomingCallModalWrapper being rendered in app/_layout.tsx?
- Is Platform.OS === 'ios' or 'android'? (Should not be 'web')

### Scenario 2: Subscription fails or times out
**Logs you'll see**:
```
❌ [IncomingCallModal] Channel error - subscription failed
OR
❌ [IncomingCallModal] Subscription timed out
```

**Problem**: Supabase Realtime not properly configured
**Solutions**:
1. Verify you ran the `enable_realtime.sql` script in Supabase
2. Check if `call_participants` table is published:
   ```sql
   SELECT schemaname, tablename
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime';
   ```
   Should show `call_participants` in the results
3. Restart Expo app after enabling realtime

### Scenario 3: Subscription succeeds but no call notification
**Logs you'll see**:
```
✅ [IncomingCallModal] Successfully subscribed to incoming calls!
(but nothing after clicking "Start Call" on dashboard)
```

**Problem**: Either:
a) User ID mismatch (mobile user ID ≠ participant user ID)
b) `call_participants` row not being inserted
c) Realtime filter not matching

**Check**:
1. **Verify User IDs Match**:
   - Note the user ID from mobile logs: `🎯 [IncomingCallModal] User ID: [id]`
   - Check dashboard participant selector shows same user
   - Run this query in Supabase:
     ```sql
     SELECT user_id, email FROM profiles WHERE email = '[mobile-user-email]';
     ```

2. **Verify Call Participant is Inserted**:
   After starting call, run in Supabase:
   ```sql
   SELECT * FROM call_participants
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   Should show a row with matching `user_id`

3. **Check RLS Policies Allow SELECT**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename = 'call_participants';
   ```
   Should have a policy allowing SELECT for authenticated users

### Scenario 4: Notification received but modal doesn't show
**Logs you'll see**:
```
📞 [IncomingCallModal] Incoming call notification received!
❌ [IncomingCallModal] Error fetching call data: [error]
```

**Problem**: Call session query failing
**Check**: RLS policies on `call_sessions`, `events`, and `profiles` tables

---

## STEP 4: Quick Verification Queries

Run these in Supabase SQL Editor to verify setup:

### 1. Check if realtime is enabled:
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'call_participants';
```

### 2. Check recent call attempts:
```sql
SELECT
  cs.id,
  cs.room_name,
  cs.status,
  cs.created_at,
  p.display_name as artist_name,
  e.name as event_name
FROM call_sessions cs
JOIN profiles p ON p.user_id = cs.artist_id
JOIN events e ON e.event_id = cs.event_id
ORDER BY cs.created_at DESC
LIMIT 5;
```

### 3. Check call participants:
```sql
SELECT
  cp.*,
  p.display_name,
  p.email
FROM call_participants cp
JOIN profiles p ON p.user_id = cp.user_id
ORDER BY cp.created_at DESC
LIMIT 5;
```

---

## Next Steps

1. **Disable Continuity Camera** (STEP 1)
2. **Restart Expo app** on your iPhone
3. **Clear Expo terminal** to see fresh logs
4. **Attempt call flow** (STEP 2)
5. **Copy ALL logs** from the moment you see "Setting up realtime subscription" until after clicking "Start Call"
6. **Share the logs** so we can identify exactly where the flow is breaking

---

## Expected Working Flow

When everything works correctly:

1. ✅ Mobile app starts → Subscribes to realtime
2. ✅ Dashboard starts call → Inserts `call_participants` row
3. ✅ Supabase Realtime → Sends notification to mobile
4. ✅ Mobile receives notification → Fetches call details
5. ✅ IncomingCallModal appears → User sees Accept/Decline buttons
6. ✅ User accepts → Navigates to `/call` screen → LiveKit video call starts

Currently stuck at step 3-4 (notification not being received).
