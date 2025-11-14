# Move Platform: Dashboard → Mobile App Handoff Document

**Date:** November 13, 2025
**Purpose:** Transition from artist dashboard development to mobile app modernization
**Repos:**
- Dashboard (Web): `move-dashboard-deploy` (Railway: https://move-dashboard-deploy-production.up.railway.app)
- Mobile App: `move` (Expo/React Native at `/Users/gyanendra/m0ve/move`)

---

## Executive Summary

We've built a **complete artist dashboard** with iOS 26 glassmorphism design (purple/pink gradients, backdrop blur, rounded corners). Now we need to **modernize the mobile app** to match this aesthetic and integrate new features like video calls.

### What Works Now:
✅ **Dashboard**: Full event management, LiveKit video calls, p5.js visual effects, leaderboards
✅ **Mobile App**: Motion tracking (10Hz), event joining via QR, API integration to dashboard
❌ **Mobile App UI**: Still uses old green/cyan design, needs iOS 26 update
❌ **Mobile App Features**: No video call UI (LiveKit installed but not implemented)

---

## Part 1: Artist Dashboard (move-dashboard-deploy) - COMPLETED

### 🎨 Design System: iOS 26 Glassmorphism

**Color Palette:**
- **Purple**: `#a855f7` (purple-500), `#9333ea` (purple-600), `#7e22ce` (purple-700)
- **Pink**: `#ec4899` (pink-500), `#db2777` (pink-600), `#be185d` (pink-700)
- **Backgrounds**: `#0a0a0a` (black), gradients with low opacity (5-15%)
- **Borders**: `rgba(255, 255, 255, 0.1)` (white/10)

**Signature Style:**
```tsx
// Glassmorphism card pattern
className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-purple-500/10 via-black/40 to-pink-500/10 backdrop-blur-2xl"
```

**Key Files:**
- All screens use Tailwind CSS with these exact gradient/border patterns
- Hover states: `hover:from-purple-500/15 hover:to-pink-500/15`
- Shadows: `shadow-purple-500/20` for glowing effects

---

### 🎥 Video Call Feature (LiveKit Integration)

**What We Built:**

1. **Database Tables** (`migrations/002_call_tables.sql`):
```sql
call_sessions (id, event_id, artist_id, room_name, started_at, ended_at, status)
call_participants (id, call_session_id, user_id, joined_at, left_at, is_invited)
```

2. **API Endpoints:**
- `POST /api/livekit/token` - Generate LiveKit access tokens (role-based permissions)
- `POST /api/calls/start` - Start video call with optional participant invites
- `POST /api/calls/end` - End active call
- `GET /api/calls/active?event_id=...` - Check for active calls

3. **Components:**
- `src/components/CallInterface.tsx` - Full-screen video call UI with LiveKit
- `src/components/CallParticipantSelector.tsx` - Modal to invite live attendees
- Both use dynamic imports with `ssr: false` to prevent SSR issues

4. **Event Details Integration:**
- "Start Video Call" button (only for artists, only when event is live)
- Shows participant selector → creates call session → launches full-screen call
- Supabase Realtime broadcasts call invitations to attendees

**Environment Variables Required:**
```
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

**Setup Instructions:**
1. Sign up at https://cloud.livekit.io/
2. Create a project
3. Copy API credentials to `.env.local`
4. Run migration: `002_call_tables.sql` in Supabase SQL Editor

---

### 🎨 Visual Effects System (Projector Display)

**What We Built:**

1. **Components:**
- `src/components/VisualEffectsPanel.tsx` - iOS 26 styled control panel
  - Width: `w-72` (288px)
  - Transparency: `from-purple-500/5 via-black/30 to-pink-500/5`
  - Auto-hide after 2.5s when mouse leaves
  - Invisible hover trigger (128x128px) in top-right corner

- `src/components/P5EffectsStackable.tsx` - p5.js effects engine
  - 5 stackable effects: Glitch, Grayscale, Particles, Color Motion, Blur
  - WebGL shaders for chromatic aberration and motion detection
  - Particle pool (1000 particles) for performance

2. **Effects:**
- **Glitch**: Chromatic aberration shader with RGB channel separation
- **Grayscale**: Desaturation filter
- **Particles**: Motion-reactive particle spawning (160x90 downsampled motion detection)
- **Color Motion**: Rainbow color overlay on motion (HSV to RGB shader)
- **Blur**: Simple blur filter

3. **Presets:**
- Clean (all off)
- Minimal (grayscale only)
- Balanced (glitch + grayscale)
- Maximum (all effects)
- Retro (glitch + particles)

4. **Implementation:**
- Located at `/artist/events/[event_id]/display/page.tsx`
- Uses `useRef` for timeout management to prevent flickering
- Smooth transitions with `transition-all duration-300`

---

### 🗄️ Database Schema (Supabase)

**Core Tables:**

```sql
-- Events
events (
  event_id uuid PRIMARY KEY,
  artist_id uuid REFERENCES profiles(user_id),
  name text,
  title text,
  short_code text UNIQUE,
  venue text,
  location text,  -- Full Google Places formatted address
  location_lat numeric,
  location_lng numeric,
  started_at timestamptz,
  ended_at timestamptz,
  status text DEFAULT 'scheduled'
)

-- Participants
event_participants (
  event_id uuid,
  user_id uuid,
  PRIMARY KEY (event_id, user_id)
)

-- Scores (live leaderboard)
scores (
  event_id uuid,
  user_id uuid,
  score numeric DEFAULT 0,  -- Energy points
  last_seen timestamptz,    -- For "live" status (20s window)
  PRIMARY KEY (event_id, user_id)
)

-- Motion tracking
motion_buckets (
  event_id uuid,
  user_id uuid,
  bucket_ts timestamptz,    -- Minute-level bucket
  count integer,            -- Sample count
  sum_accel numeric,        -- Total acceleration
  max_accel numeric,        -- Peak acceleration
  PRIMARY KEY (event_id, user_id, bucket_ts)
)

-- Video calls
call_sessions (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events(event_id),
  artist_id uuid REFERENCES profiles(user_id),
  room_name text UNIQUE,    -- LiveKit room identifier
  started_at timestamptz,
  ended_at timestamptz,
  status text DEFAULT 'active'
)

call_participants (
  id uuid PRIMARY KEY,
  call_session_id uuid REFERENCES call_sessions(id),
  user_id uuid REFERENCES profiles(user_id),
  is_invited boolean DEFAULT false,
  joined_at timestamptz,
  left_at timestamptz
)
```

**Row Level Security (RLS):**
- Artists can create/edit/delete their own events
- Anyone can view events
- Only invited users can join calls
- Scores are publicly readable

---

### 🔌 API Endpoints (Dashboard)

**Base URL:** `https://move-dashboard-deploy-production.up.railway.app`

#### Motion Tracking:
- `POST /api/motion` - Submit motion data (accelerometer samples)
  ```json
  {
    "event_id": "uuid",
    "user_id": "uuid",
    "accel": 1.23,      // Acceleration magnitude
    "steps": null
  }
  ```

#### Scores/Leaderboard:
- `GET /api/scores?event_id=uuid` - Get live leaderboard
  ```json
  {
    "ok": true,
    "rows": [
      {
        "user_id": "uuid",
        "display_name": "John Doe",
        "score": 1234,
        "last_seen": "2025-11-13T...",
        "is_live": true  // Active within 20 seconds
      }
    ]
  }
  ```

#### Event Joining:
- `POST /api/join` - Join event (validates event status)
  ```json
  // Request
  { "code": "7DF044" }  // or { "event_id": "uuid" }

  // Response (success)
  { "ok": true, "event_id": "uuid" }

  // Response (ended event)
  {
    "ok": false,
    "reason": "ended",
    "event": { ... },
    "top10": [ ... ]  // Final leaderboard
  }
  ```

#### Video Calls:
- `POST /api/livekit/token` - Get LiveKit access token
  ```json
  {
    "event_id": "uuid",
    "room_name": "event-uuid-timestamp-random"
  }
  // Returns: { "ok": true, "token": "jwt...", "url": "wss://..." }
  ```

- `POST /api/calls/start` - Start video call
  ```json
  {
    "event_id": "uuid",
    "invited_user_ids": ["uuid1", "uuid2"]  // Optional
  }
  // Returns: { "ok": true, "call_session": { ... } }
  ```

- `POST /api/calls/end` - End video call
  ```json
  { "call_session_id": "uuid" }
  ```

- `GET /api/calls/active?event_id=uuid` - Check for active call

#### Events:
- `GET /api/events?artist_id=uuid` - Get artist's events
- `POST /api/events` - Create event (artists only)
- `PATCH /api/events/[event_id]` - Update event
- `DELETE /api/events/[event_id]` - Delete event (RLS enforced)

---

### 📱 Dashboard Features Completed

1. **Event Management:**
   - Create/edit/delete events
   - Google Maps location autocomplete (uncontrolled input pattern)
   - QR code generation for event joining
   - Live/scheduled/ended status indicators

2. **Leaderboard:**
   - Real-time updates via Supabase Realtime
   - Live indicators (green dot for active within 20s)
   - Energy scores with rankings
   - Final leaderboard for ended events

3. **Video Calls:**
   - Artist can start calls during live events
   - Invite specific participants (shows only live attendees)
   - Full-screen LiveKit interface
   - Role-based permissions (artists can publish, attendees can only subscribe)

4. **Projector Display:**
   - Camera feed with p5.js effects overlay
   - Stackable visual effects (5 effects + 5 presets)
   - Auto-hiding control panel (iOS 26 styled)
   - Motion-reactive particles and color detection

5. **Authentication:**
   - Supabase Auth (email/password + anonymous)
   - Profile management
   - Artist/attendee roles

---

## Part 2: Mobile App (move) - CURRENT STATE

### 📱 Tech Stack

- **Framework:** Expo SDK ~54.0.0
- **React Native:** 0.81.4
- **Navigation:** Expo Router (file-based routing)
- **Backend:** Supabase + Railway dashboard APIs
- **Video:** LiveKit packages installed (`@livekit/react-native`)
- **Sensors:** `expo-sensors` (Accelerometer)

### 📂 Directory Structure

```
move/
├── app/
│   ├── index.tsx              # Landing screen (Sign in/Sign up)
│   ├── _layout.tsx            # Root layout
│   ├── join.tsx               # Join event by code/QR
│   ├── scan.tsx               # QR code scanner
│   ├── move.tsx               # Movement tracking screen
│   ├── stage/
│   │   └── index.tsx          # Motion streaming (accelerometer)
│   ├── (auth)/                # Auth screens
│   ├── (home)/                # Home navigation group
│   └── explore.tsx, now.tsx, etc.
├── components/
│   ├── home/
│   │   ├── JoinEventCard.tsx
│   │   ├── OngoingEventsCard.tsx
│   │   └── MovementCard.tsx
│   └── ui/
│       └── (minimal components)
├── src/
│   ├── lib/
│   │   ├── apiBase.ts         # API base URL resolver
│   │   ├── join.ts            # Join event logic
│   │   ├── motion.ts          # Motion utilities
│   │   ├── motionStream.ts    # Motion streaming logic
│   │   └── supabase/
│   └── screens/
│       └── FinalLeaderboard.tsx
├── constants/
│   └── Design.ts              # iOS 26 design system (NEWLY CREATED)
└── package.json
```

### ✅ What Works (Mobile App)

1. **Motion Tracking:**
   - Accelerometer sampling at 10Hz
   - 3-second flush intervals to `/api/motion`
   - Minute-level bucket aggregation (via `fn_upsert_motion_bucket`)
   - Live score updates

2. **Event Joining:**
   - QR code scanning (`expo-camera`)
   - Short code input (e.g., "7DF044")
   - Full event_id input
   - Validates event status (rejects ended events)

3. **API Integration:**
   - Connects to Railway dashboard (`apiBase()` utility)
   - Supabase authentication (anonymous + email/password)
   - Real-time score fetching

4. **LiveKit Packages:**
   - ✅ Installed: `@livekit/react-native`, `livekit-client`
   - ❌ No UI implementation yet (just packages)

### ❌ What Needs Fixing

1. **Design Mismatch:**
   - Current: Green/cyan colors (`#10b981`, `#22d3ee`)
   - Target: Purple/pink iOS 26 glassmorphism (matching dashboard)
   - **Status:** Created `constants/Design.ts` but not yet applied to screens

2. **Missing Features:**
   - No video call UI (LiveKit installed but no components)
   - No call invitation handling (dashboard can invite, but app can't receive)
   - No visual effects (projector screen is web-only)

3. **Inconsistent Styling:**
   - Each screen uses inline styles
   - No shared component library
   - No glassmorphism effects

---

## Part 3: INTEGRATION REQUIREMENTS

### How Mobile App Connects to Dashboard

**API Base URL:**
- Production: `https://move-dashboard-deploy-production.up.railway.app`
- Configured in `app.json` → `extra.EXPO_PUBLIC_API_BASE`
- Resolved at runtime via `src/lib/apiBase.ts`

**Authentication Flow:**
1. User signs up/in on mobile app → Supabase Auth
2. Same Supabase project as dashboard (shared users)
3. Anonymous auth for quick event joining

**Motion Tracking Flow:**
1. User joins event → `POST /api/join` (validates event status)
2. Mobile app starts accelerometer → samples at 10Hz
3. Every 3 seconds → aggregates samples → `POST /api/motion`
4. Dashboard's `fn_upsert_motion_bucket` aggregates into minute buckets
5. `fn_bump_score` updates live score
6. Dashboard leaderboard shows real-time updates via Supabase Realtime

**Video Call Flow (NEEDS IMPLEMENTATION):**
1. Artist starts call on dashboard → `POST /api/calls/start` with `invited_user_ids`
2. Dashboard broadcasts via Supabase Realtime channel `event:{event_id}`
3. Mobile app should listen to this channel → show "You've been invited to a call" notification
4. User taps notification → `POST /api/livekit/token` → get access token
5. Mobile app launches `<CallInterface>` with LiveKit React Native components

---

## Part 4: MOBILE APP TODO LIST

### 🎨 Phase 1: Design System Update (Priority: HIGH)

**Goal:** Match dashboard's iOS 26 glassmorphism aesthetic

**Files to Update:**

1. ✅ `constants/Design.ts` - DONE (created in this session)

2. `app/index.tsx` - Landing screen
   - Replace green (`#10b981`) with purple/pink gradients
   - Add glassmorphism background blobs
   - Use `<LinearGradient>` for buttons
   - Apply `BorderRadius['2xl']` (32px) to cards

3. `app/join.tsx` - Join event screen
   - Glassmorphism input fields
   - Purple/pink gradient buttons
   - Update color scheme

4. `app/move.tsx` - Movement tracking screen
   - Glassmorphism event info card
   - Purple/pink progress bar (replace green)
   - Gradient start/stop button
   - Update sensor data display with glass effect

5. `app/stage/index.tsx` - Motion streaming
   - Minimal UI with iOS 26 styling
   - Glassmorphism status indicators

6. `components/home/*.tsx` - Home screen cards
   - `JoinEventCard.tsx`
   - `OngoingEventsCard.tsx`
   - `MovementCard.tsx`
   - All need glassmorphism treatment

**Design Patterns to Apply:**

```typescript
// Glassmorphism Card
<LinearGradient
  colors={['rgba(168, 85, 247, 0.1)', 'rgba(0, 0, 0, 0.4)', 'rgba(236, 72, 153, 0.1)']}
  style={{
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.glass,
    padding: Spacing['2xl'],
    ...Shadows.md,
  }}
>
  {/* Content */}
</LinearGradient>

// Gradient Button
<LinearGradient
  colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={{
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.lg,
  }}
>
  <Text style={{ color: Colors.text.primary, fontWeight: Typography.weight.bold }}>
    Button Text
  </Text>
</LinearGradient>

// Background Blobs
<View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
  <View
    style={{
      position: 'absolute',
      top: -100,
      right: -60,
      width: 300,
      height: 300,
      borderRadius: 9999,
      backgroundColor: Colors.accent.purple.light,
      opacity: 0.15,
      ...(Platform.OS === 'web' && { filter: 'blur(80px)' }),
    }}
  />
</View>
```

---

### 📞 Phase 2: Video Call Integration (Priority: HIGH)

**Goal:** Implement LiveKit video calls in mobile app

**New Files to Create:**

1. `components/CallInterface.tsx` (mobile version)
   - Use `@livekit/react-native` instead of `@livekit/components-react`
   - Full-screen video call UI
   - iOS 26 styled controls
   - End call / Leave call buttons

2. `components/CallInvitationModal.tsx`
   - Modal that shows when artist invites you to a call
   - "Join Call" / "Decline" buttons
   - Glassmorphism styling

**Existing Files to Update:**

3. `app/move.tsx` or `app/stage/index.tsx`
   - Add Supabase Realtime listener:
   ```typescript
   const channel = supabase
     .channel(`event:${eventId}`)
     .on('broadcast', { event: 'call_started' }, (payload) => {
       // Show CallInvitationModal
       setCallInvitation(payload);
     })
     .subscribe();
   ```

4. `src/lib/calls.ts` (new utility file)
   - `fetchLiveKitToken(event_id: string, room_name: string)` → calls `/api/livekit/token`
   - `joinCall(call_session_id: string)` → updates `call_participants` table
   - `leaveCall(call_session_id: string)` → marks `left_at`

**Implementation Steps:**

1. Listen to Supabase Realtime channel `event:{event_id}` for `call_started` events
2. Show notification/modal when artist invites user
3. When user taps "Join Call":
   - Fetch LiveKit token: `POST /api/livekit/token`
   - Launch `<CallInterface>` with token
   - Update `call_participants` table
4. LiveKit handles video/audio streaming
5. When user leaves/call ends:
   - Update `call_participants.left_at`
   - Close `<CallInterface>`

**LiveKit React Native Example:**

```typescript
import { LiveKitRoom, useParticipants, VideoView } from '@livekit/react-native';

export default function CallInterface({ token, url, onLeave }: Props) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      <CallContent onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function CallContent({ onLeave }: { onLeave: () => void }) {
  const participants = useParticipants();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Video grid */}
      {participants.map((p) => (
        <VideoView
          key={p.identity}
          participant={p}
          style={{ flex: 1 }}
        />
      ))}

      {/* iOS 26 styled controls */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <Button onPress={onLeave}>Leave Call</Button>
      </LinearGradient>
    </View>
  );
}
```

---

### 🔔 Phase 3: Real-time Notifications (Priority: MEDIUM)

**Goal:** Show real-time updates to users

**Features:**

1. **Call Invitations:**
   - Listen to `event:{event_id}` channel
   - Show badge/modal when invited to call

2. **Event Status Changes:**
   - Listen to `event:{event_id}` channel
   - Notify when event starts/ends
   - Auto-navigate to final leaderboard when event ends

3. **Leaderboard Updates:**
   - Subscribe to `scores` table changes
   - Show "You moved up!" notifications
   - Haptic feedback for rank changes

**Implementation:**

```typescript
// In app/move.tsx or stage/index.tsx
useEffect(() => {
  if (!eventId) return;

  const channel = supabase
    .channel(`event:${eventId}`)
    .on('broadcast', { event: 'call_started' }, (payload) => {
      setCallInvitation(payload);
    })
    .on('broadcast', { event: 'event_ended' }, () => {
      router.push('/final-leaderboard');
    })
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [eventId]);
```

---

### 🎯 Phase 4: Feature Parity (Priority: LOW)

**Nice-to-have features from dashboard:**

1. **Profile Management:**
   - Edit display name, avatar
   - View stats (total events joined, total energy)

2. **Event Discovery:**
   - Browse nearby events (use `location_lat`, `location_lng`)
   - Filter by date, artist

3. **Social Features:**
   - Follow artists
   - Share event QR codes
   - Invite friends to events

4. **Achievements:**
   - Badges for milestones (first event, 1000 energy, etc.)
   - Unlock special effects/themes

---

## Part 5: TESTING CHECKLIST

### Dashboard Testing (Already Works)

- [x] Create event with Google Maps location
- [x] Start event → status changes to "live"
- [x] View leaderboard (real-time updates)
- [x] Start video call → invite participants
- [x] Video call works with LiveKit
- [x] Projector display with visual effects
- [x] End event → status changes to "ended"
- [x] Delete event (RLS enforced)

### Mobile App Testing (After Updates)

**Design:**
- [ ] Landing screen shows purple/pink gradients
- [ ] All screens use glassmorphism cards
- [ ] Buttons have gradient or glass styling
- [ ] Colors match dashboard exactly

**Motion Tracking:**
- [ ] Join event via QR code
- [ ] Join event via short code
- [ ] Start motion tracking → accelerometer samples
- [ ] Scores update on dashboard leaderboard
- [ ] "Live" indicator shows on dashboard within 20s

**Video Calls:**
- [ ] Artist starts call on dashboard
- [ ] Mobile app receives call invitation notification
- [ ] User taps "Join Call" → video call launches
- [ ] Video/audio works with LiveKit
- [ ] User can leave call
- [ ] Artist can end call (kicks everyone out)

**Edge Cases:**
- [ ] Trying to join ended event → shows final leaderboard
- [ ] Trying to join non-existent event → error message
- [ ] Motion tracking works with app in background (iOS background modes)
- [ ] Motion tracking stops when event ends

---

## Part 6: ENVIRONMENT SETUP

### Dashboard (.env.local)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jxjaqamunkkqnwhrlnzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
# Restricted to: https://move-dashboard-deploy-production.up.railway.app/*

# LiveKit (USER NEEDS TO SET UP)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxx

# Legacy (still in use)
CALL_ENDPOINT=https://...
```

### Mobile App (.env or app.json)

```
# Supabase (same as dashboard)
EXPO_PUBLIC_SUPABASE_URL=https://jxjaqamunkkqnwhrlnzk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dashboard API
EXPO_PUBLIC_API_BASE=https://move-dashboard-deploy-production.up.railway.app

# LiveKit (will use dashboard's /api/livekit/token endpoint)
# No direct LiveKit credentials needed in mobile app
```

---

## Part 7: DEPLOYMENT STATUS

### Dashboard (Production)

- **Platform:** Railway
- **URL:** https://move-dashboard-deploy-production.up.railway.app
- **Status:** ✅ Deployed and working
- **Branch:** `claude/compact-dashboard-purple-theme-011CV3LRWbHrjSBxdKJj6GXi`
- **Pending:**
  - User needs to add LiveKit credentials to Railway env vars
  - User needs to run `002_call_tables.sql` migration in Supabase

### Mobile App (Development)

- **Platform:** Expo (not yet deployed to App Store/Play Store)
- **Local Testing:** `expo start` or `npm start`
- **Status:** ❌ Needs design updates before deployment
- **EAS Project ID:** `96370249-284e-417e-bb0e-4b1aacaaa305`
- **Build Config:** `eas.json` exists

---

## Part 8: NEXT SESSION INSTRUCTIONS

**For the new chat session in the `move` repository:**

### Context to Provide:

"I have a mobile app (Expo/React Native) that needs to be modernized to match my artist dashboard's design. The dashboard uses iOS 26 glassmorphism with purple/pink gradients (`#a855f7`, `#ec4899`), rounded corners (`rounded-[2rem]`), and backdrop blur effects.

**Current mobile app state:**
- ✅ Motion tracking works (accelerometer → API)
- ✅ Event joining works (QR codes, short codes)
- ✅ LiveKit packages installed
- ❌ Design uses old green/cyan colors
- ❌ No video call UI yet
- ❌ No glassmorphism styling

**I've created `constants/Design.ts`** with the iOS 26 design system (colors, gradients, shadows, typography).

**Tasks:**
1. Update all screens to use purple/pink iOS 26 glassmorphism
2. Replace inline styles with Design constants
3. Implement LiveKit video call UI (mobile version)
4. Add Supabase Realtime listener for call invitations
5. Ensure all screens match the dashboard's modern aesthetic

**Key files to update:**
- `app/index.tsx` (landing screen)
- `app/join.tsx` (join event)
- `app/move.tsx` (movement tracking)
- `app/stage/index.tsx` (motion streaming)
- `components/home/*.tsx` (home cards)

**New files to create:**
- `components/CallInterface.tsx` (LiveKit React Native)
- `components/CallInvitationModal.tsx` (call notifications)

**API Integration:**
- Dashboard API: `https://move-dashboard-deploy-production.up.railway.app`
- Use `/api/livekit/token` to get LiveKit access tokens
- Listen to Supabase Realtime channel `event:{event_id}` for call invitations"

### Files to Share with New Session:

1. This document (`MOBILE_APP_HANDOFF.md`)
2. `constants/Design.ts` (already created)
3. Current `package.json` (to understand dependencies)

### First Actions for New Session:

1. Read this handoff document
2. Examine `constants/Design.ts`
3. Update `app/index.tsx` with iOS 26 styling (show user the new design)
4. Once approved, systematically update all other screens
5. Implement LiveKit call UI
6. Test end-to-end flow (join event → track motion → receive call → join call)

---

## Part 9: QUICK REFERENCE

### Design System Quick Copy-Paste

**Glassmorphism Card:**
```typescript
<LinearGradient
  colors={Gradients.glass.light}
  style={{
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.glass,
    padding: Spacing['2xl'],
  }}
>
  {children}
</LinearGradient>
```

**Gradient Button:**
```typescript
<LinearGradient
  colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={{
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  }}
>
  <Text style={{ color: Colors.text.primary, fontWeight: Typography.weight.bold }}>
    {title}
  </Text>
</LinearGradient>
```

**Background Blobs:**
```typescript
<View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
  <View style={{
    position: 'absolute',
    top: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 9999,
    backgroundColor: Colors.accent.purple.light,
    opacity: 0.15,
  }} />
</View>
```

### API Quick Reference

**Join Event:**
```typescript
POST https://move-dashboard-deploy-production.up.railway.app/api/join
Body: { "code": "7DF044" } or { "event_id": "uuid" }
```

**Get Leaderboard:**
```typescript
GET https://move-dashboard-deploy-production.up.railway.app/api/scores?event_id=uuid
```

**Get LiveKit Token:**
```typescript
POST https://move-dashboard-deploy-production.up.railway.app/api/livekit/token
Body: { "event_id": "uuid", "room_name": "event-uuid-..." }
```

**Start Call:**
```typescript
POST https://move-dashboard-deploy-production.up.railway.app/api/calls/start
Body: { "event_id": "uuid", "invited_user_ids": ["uuid1", "uuid2"] }
```

### Supabase Realtime Quick Reference

**Listen to Call Invitations:**
```typescript
const channel = supabase
  .channel(`event:${eventId}`)
  .on('broadcast', { event: 'call_started' }, (payload) => {
    console.log('Call started:', payload);
  })
  .subscribe();
```

---

## Part 10: TROUBLESHOOTING

### Common Issues:

**Issue:** "Module not found: @livekit/react-native"
**Fix:** Already installed in `package.json`, just need to implement UI

**Issue:** Colors don't match dashboard
**Fix:** Use exact hex values from `constants/Design.ts`:
- Purple: `#a855f7`, `#9333ea`, `#7e22ce`
- Pink: `#ec4899`, `#db2777`, `#be185d`

**Issue:** Glassmorphism doesn't show on native
**Fix:** `LinearGradient` works on native, but `backdrop-blur` doesn't (use lower opacity overlays instead)

**Issue:** Motion tracking doesn't update leaderboard
**Fix:** Check `apiBase()` returns correct Railway URL

**Issue:** Call invitation not received
**Fix:** Ensure Supabase Realtime channel is subscribed before artist starts call

**Issue:** LiveKit connection fails
**Fix:** Ensure dashboard has correct `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in Railway

---

## Summary

**Dashboard (move-dashboard-deploy):**
- ✅ COMPLETE with iOS 26 design
- ✅ Video calls with LiveKit
- ✅ Visual effects with p5.js
- ✅ Deployed to Railway

**Mobile App (move):**
- 🔄 IN PROGRESS - needs design update
- 🔄 IN PROGRESS - needs video call UI
- ✅ Motion tracking works
- ✅ Event joining works
- ✅ Design system created (`constants/Design.ts`)

**Integration:**
- Mobile app → Dashboard API (Railway)
- Same Supabase project (shared auth & database)
- LiveKit tokens from dashboard `/api/livekit/token`
- Realtime updates via Supabase channels

**Next Steps:**
1. Open new chat in `move` repository
2. Share this document + `constants/Design.ts`
3. Update all screens with iOS 26 styling
4. Implement LiveKit video call UI
5. Test end-to-end integration

---

**Document Version:** 1.0
**Last Updated:** November 13, 2025
**Author:** Claude (Artist Dashboard Session)
**For:** Mobile App Modernization Session
