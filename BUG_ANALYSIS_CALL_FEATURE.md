# CRITICAL BUG ANALYSIS: Call Feature Not Receiving Notifications

**Date:** November 17, 2025
**Severity:** CRITICAL - Feature completely non-functional
**Status:** Root cause identified

---

## EXECUTIVE SUMMARY

The call feature is **completely missing from the mobile app**. While:
- ✅ The dashboard can start calls (POST /api/calls/start)
- ✅ Database tables exist (theoretically)
- ✅ LiveKit packages are installed
- ❌ **The mobile app has NO CODE to listen for incoming calls**
- ❌ **The mobile app has NO realtime subscriptions implemented**
- ❌ **The mobile app has NO UI components to display calls**

Users on the mobile app don't receive anything because the app never listens for call notifications.

---

## ROOT CAUSES IDENTIFIED

### 1. NO REALTIME SUBSCRIPTIONS (CRITICAL)

The mobile app has **zero realtime channel subscriptions** for calls.

**Current State:**
- Only auth state subscriptions exist: `supabase.auth.onAuthStateChange()`
- No `supabase.channel()` calls anywhere
- No listening for `call_sessions` or `call_participants` table changes

**Required but Missing:**
```typescript
// THIS CODE DOESN'T EXIST ANYWHERE IN THE MOBILE APP:

// Listen for call invitations
const channel = supabase
  .channel(`event:${eventId}:calls`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'call_sessions',
      filter: `event_id=eq.${eventId}`
    },
    (payload) => {
      // Show call notification
      showCallNotification(payload.new);
    }
  )
  .subscribe();
```

**Evidence:**
- File: `/home/user/m0ve/app/(home)/notifications.tsx` - Just a "Coming Soon" placeholder
- Grep search results: Zero matches for `.channel`, `.subscribe`, `.on` patterns
- Commit history: No call feature commits

---

### 2. INCOMPLETE DATABASE SETUP (CRITICAL)

The required `call_sessions` and `call_participants` tables were never created.

**What Should Exist:**
```sql
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(event_id),
  artist_id UUID REFERENCES profiles(user_id),
  room_name TEXT UNIQUE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);

CREATE TABLE call_participants (
  id UUID PRIMARY KEY,
  call_session_id UUID REFERENCES call_sessions(id),
  user_id UUID REFERENCES profiles(user_id),
  is_invited BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ
);
```

**What Actually Exists:**
- The SQL files in the repo don't create these tables:
  - `/home/user/m0ve/SUPABASE_FINAL_SETUP.sql` - No call tables
  - `/home/user/m0ve/SUPABASE_SAFE_SETUP.sql` - No call tables
  - `/home/user/m0ve/SUPABASE_SETUP.sql` - No call tables

**Evidence:**
- File: `/home/user/m0ve/CALL_FEATURE_SETUP.md` - Documents the feature but it's not implemented
- No migration files exist for call tables
- Even if dashboard tries to insert into these tables, they don't exist

---

### 3. MISSING LIVEKIT ENVIRONMENT VARIABLES (CRITICAL)

The mobile app has no LiveKit credentials configured.

**What Should Be in app.json:**
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_LIVEKIT_URL": "wss://your-project.livekit.cloud",
      "LIVEKIT_API_KEY": "APIxxxx",
      "LIVEKIT_API_SECRET": "secret"
    }
  }
}
```

**What Actually Exists:**
- Only generic Supabase and API base URL variables
- No LIVEKIT_* variables
- Packages installed but no configuration

**Current app.json extras:**
```json
"EXPO_PUBLIC_SUPABASE_URL": "https://jxjaqamunkkqnwhrlnzk.supabase.co",
"EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_w7Zh42w1bNPIe3kicNVEEw_dBqEq_2I",
"EXPO_PUBLIC_INGEST_URL": "https://jxjaqamunkkqnwhrlnzk.supabase.co/functions/v1/ingest",
"EXPO_PUBLIC_API_BASE": "https://move-dashboard-deploy-production.up.railway.app"
```

---

### 4. NO CALL UI COMPONENTS (CRITICAL)

The mobile app has zero call-related UI components.

**What Should Exist:**
- `CallInterface.tsx` - Full-screen video call component using LiveKit
- `CallParticipantSelector.tsx` - Modal to invite participants
- Call notification display in notifications screen

**What Actually Exists:**
- `/home/user/m0ve/app/(home)/notifications.tsx` - Just shows "Coming Soon"
- No other call-related components

---

### 5. DOCUMENTATION SAYS IT'S DONE BUT IT'S NOT (DOCUMENTATION BUG)

Files document the feature as if it exists:
- `/home/user/m0ve/CALL_FEATURE_SETUP.md` - 217 lines, completely describes implementation
- `/home/user/m0ve/MOBILE_APP_HANDOFF.md` - Section "Video Call Flow (NEEDS IMPLEMENTATION)" explicitly marks it as TODO

**The handoff document even says:**
> ❌ **Mobile App Features**: No video call UI (LiveKit installed but not implemented)
> ❌ No call invitation handling (dashboard can invite, but app can't receive)

---

## COMPLETE DATA FLOW ANALYSIS

### What Should Happen (Ideal Flow)
```
1. Artist clicks "Start Video Call" on dashboard
   ↓
2. Dashboard POST /api/calls/start
   ├─ Creates call_sessions row
   ├─ Creates call_participants rows for invited users
   └─ Broadcasts via Supabase Realtime channel
   ↓
3. Mobile app listening on `event:{eventId}:calls` receives notification
   ├─ Shows "incoming call" banner/modal
   └─ Plays sound notification
   ↓
4. User taps "Join Call"
   ├─ Requests LiveKit token from /api/livekit/token
   └─ Launches CallInterface component
   ↓
5. LiveKit connects user to call
   └─ Video/audio streaming starts
```

### What Actually Happens
```
1. Artist clicks "Start Video Call" on dashboard
   ↓
2. Dashboard POST /api/calls/start
   ├─ ❌ Creates call_sessions row - TABLE DOESN'T EXIST!
   ├─ ❌ Creates call_participants rows - TABLE DOESN'T EXIST!
   └─ ❌ Broadcasts via Supabase Realtime - NO LISTENER!
   ↓
3. Mobile app does NOTHING
   ├─ No listener configured
   ├─ No notification shown
   ├─ No sound
   └─ User unaware call exists
```

---

## FILES ANALYZED

### Mobile App Structure
```
/home/user/m0ve/
├── app/
│   ├── _layout.tsx (only auth subscriptions)
│   ├── move.tsx (motion tracking only)
│   ├── (home)/
│   │   ├── index.tsx (event list only)
│   │   ├── leaderboard.tsx (polling-based, no realtime)
│   │   └── notifications.tsx (EMPTY - "Coming Soon")
│   └── (artist)/past-events.tsx
├── src/
│   ├── lib/
│   │   ├── supabase/client.ts (basic client)
│   │   ├── apiBase.ts (hardcoded Railway URL)
│   │   └── join.ts (join logic, no calls)
│   └── screens/
├── config/env.ts (hardcoded Supabase credentials)
├── app.json (missing LIVEKIT variables)
├── package.json (LiveKit packages installed)
├── CALL_FEATURE_SETUP.md (describes feature)
├── MOBILE_APP_HANDOFF.md (says "NEEDS IMPLEMENTATION")
└── SUPABASE_*.sql (no call tables)
```

### Key Evidence Files
- **No realtime code:** `grep -r "channel\|subscribe" app/` returns ZERO matches
- **No LiveKit code:** `grep -r "livekit\|LiveKit" app/src/` returns ZERO matches
- **Empty notifications:** `app/(home)/notifications.tsx` - 66 lines, all placeholder text
- **No migrations:** No `migrations/` directory or `*_call*.sql` files

---

## ENVIRONMENT VARIABLES COMPARISON

### Dashboard (move-dashboard-deploy) - HAS THESE
```
NEXT_PUBLIC_LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=secret...
```

### Mobile App (move) - MISSING THESE
```json
// In app.json under extra:
{
  "EXPO_PUBLIC_SUPABASE_URL": "https://jxjaqamunkkqnwhrlnzk.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_w7Zh42w1bNPIe3kicNVEEw_dBqEq_2I",
  "EXPO_PUBLIC_INGEST_URL": "https://jxjaqamunkkqnwhrlnzk.supabase.co/functions/v1/ingest",
  "EXPO_PUBLIC_API_BASE": "https://move-dashboard-deploy-production.up.railway.app"
  // NO LIVEKIT VARIABLES!
}
```

---

## SUPABASE CONFIGURATION ISSUES

### Database Tables Status

| Table | Status | Evidence |
|-------|--------|----------|
| `events` | ✅ Exists | Used in queries throughout |
| `profiles` | ✅ Exists | Joined in leaderboard queries |
| `scores` | ✅ Exists | Used in motion tracking |
| `event_participants` | ✅ Exists | Upserted in join flow |
| `motion_buckets` | ✅ Exists | Created by fn_upsert_motion_bucket |
| `call_sessions` | ❌ MISSING | Not in any SQL setup file |
| `call_participants` | ❌ MISSING | Not in any SQL setup file |

### RLS Policies
- ✅ Configured for events, scores, motion data
- ❌ No policies for call_sessions/call_participants

---

## SUMMARY OF BLOCKERS

| Issue | File | Line | Status |
|-------|------|------|--------|
| No realtime subscriptions | All app files | N/A | NOT IMPLEMENTED |
| Call tables don't exist | Supabase | - | NOT CREATED |
| No notification UI | app/(home)/notifications.tsx | 1-67 | PLACEHOLDER |
| No call components | Missing files | - | NOT CREATED |
| No LiveKit config | app.json | 1-65 | MISSING VARS |
| No call logic | All files | N/A | NOT IMPLEMENTED |
| No event listeners | All files | N/A | NOT IMPLEMENTED |

---

## WHAT'S ACTUALLY NEEDED TO FIX THIS

### Step 1: Create Database Tables
Run in Supabase SQL Editor:
```sql
-- Create call_sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  room_name TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create call_participants table
CREATE TABLE IF NOT EXISTS call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  is_invited BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_call_sessions_event_id ON call_sessions(event_id);
CREATE INDEX idx_call_sessions_artist_id ON call_sessions(artist_id);
CREATE INDEX idx_call_participants_call_session_id ON call_participants(call_session_id);
CREATE INDEX idx_call_participants_user_id ON call_participants(user_id);
```

### Step 2: Add LiveKit Configuration to app.json
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_LIVEKIT_URL": "wss://your-livekit-project.livekit.cloud",
      "EXPO_PUBLIC_LIVEKIT_API_KEY": "APIxxxx",
      "EXPO_PUBLIC_LIVEKIT_API_SECRET": "secret"
    }
  }
}
```

### Step 3: Create Realtime Listener Hook
New file: `hooks/useCallNotifications.ts`
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useCallNotifications(eventId: string) {
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event:${eventId}:calls`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          setIncomingCall(payload.new);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [eventId]);

  return { incomingCall, setIncomingCall };
}
```

### Step 4: Create Call Notification UI
New file: `components/CallInvitation.tsx`
```typescript
import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';

export function CallInvitation({ visible, onJoin, onDismiss }) {
  return (
    <Modal visible={visible} transparent>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
          <Text>You've been invited to a video call!</Text>
          <Pressable onPress={onJoin}>
            <Text>Join Call</Text>
          </Pressable>
          <Pressable onPress={onDismiss}>
            <Text>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
```

### Step 5: Integrate into Move Screen
```typescript
// In app/move.tsx
const { incomingCall, setIncomingCall } = useCallNotifications(eventId);

return (
  <>
    {/* Existing move UI */}
    <CallInvitation 
      visible={!!incomingCall}
      onJoin={() => router.push(`/call/${incomingCall.id}`)}
      onDismiss={() => setIncomingCall(null)}
    />
  </>
);
```

---

## CONCLUSION

**This is a complete feature gap, not a configuration issue.**

The bug is that:
1. ❌ Mobile app never listens for calls
2. ❌ Call tables were never created in Supabase
3. ❌ No LiveKit integration in mobile app
4. ❌ Notification UI is empty
5. ❌ Zero error messages because nothing is even trying to happen

The dashboard is sending calls to a void. The mobile app is deaf. Users will never know they're being called because no code exists to tell them.

**This feature is in the documentation but not in the code.**
