# 📞 Video Call Feature - Setup Guide

**Last Updated:** November 16, 2025
**Status:** ✅ Code Complete - Ready for Database Setup

---

## 🎯 Overview

The video call feature allows artists to start video calls with event participants using LiveKit. When an artist starts a call and invites participants, they receive a real-time notification on their mobile app.

### Features Implemented:
- ✅ IncomingCallModal - Global incoming call notification
- ✅ CallScreen (app/call.tsx) - Full video call interface
- ✅ LiveKit integration with React Native
- ✅ Real-time call notifications via Supabase
- ✅ Backend API for LiveKit token generation
- ✅ Database migration ready

---

## 🚀 Quick Start (3 Steps)

### Step 1: Set Up LiveKit Account

1. Go to https://cloud.livekit.io/
2. Sign up and create a new project
3. Copy your credentials:
   - **WebSocket URL**: `wss://your-project.livekit.cloud`
   - **API Key**: `APIxxxxxxxxxxxxx`
   - **API Secret**: `your_secret_key`

### Step 2: Add Environment Variables

**Mobile App (.env or config/env.ts):**
```bash
EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
```

**Backend (.env.local in move-dashboard-deploy):**
```bash
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_key
```

⚠️ **Important:**
- Client-side vars start with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
- Server-side vars (API_KEY, API_SECRET) must NOT have public prefixes

### Step 3: Run Database Migration

Open your Supabase SQL Editor and run:
```bash
# Copy the contents of migrations/002_call_tables.sql and paste into Supabase SQL Editor
```

Or using psql:
```bash
psql $DATABASE_URL < migrations/002_call_tables.sql
```

---

## 📊 Database Schema

### Tables Created:

#### `call_sessions`
Stores active and past video calls.

| Column | Type | Description |
|--------|------|-------------|
| call_id | uuid | Primary key |
| event_id | uuid | References events |
| host_id | uuid | Artist who started the call |
| room_name | text | Unique LiveKit room name |
| started_at | timestamptz | When call started |
| ended_at | timestamptz | When call ended (null if active) |
| status | text | 'active' or 'ended' |
| call_type | text | 'broadcast', '1-on-1', 'group' |
| max_participants | integer | Max participants (default: 100) |

#### `call_participants`
Tracks who was invited and joined calls.

| Column | Type | Description |
|--------|------|-------------|
| call_id | uuid | References call_sessions |
| user_id | uuid | References profiles |
| joined_at | timestamptz | When user joined |
| left_at | timestamptz | When user left (null if still in call) |
| status | text | 'invited', 'joined', 'left', 'declined' |
| role | text | 'host', 'speaker', 'listener' |
| is_invited | boolean | Whether user was specifically invited |

---

## 🔧 How It Works

### Flow Diagram:
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Artist    │         │   Supabase   │         │ Participant │
│  (Dashboard)│         │  (Database)  │         │  (Mobile)   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ 1. Start Call         │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │ 2. Insert into        │                        │
       │    call_sessions      │                        │
       │                       │                        │
       │ 3. Add participants   │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │ 4. Real-time INSERT    │
       │                       │    trigger fires       │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │ 5. IncomingCallModal   │
       │                       │    appears with        │
       │                       │    vibration           │
       │                       │                        │
       │                       │ 6. User accepts call   │
       │                       │<───────────────────────┤
       │                       │                        │
       │                       │ 7. Fetch LiveKit token │
       │                       │    from backend        │
       │                       │                        │
       │ 8. Both join LiveKit room                      │
       │<───────────────────────────────────────────────┤
       │                       │                        │
       │         LiveKit video/audio connection         │
       │<──────────────────────────────────────────────>│
```

### Technical Implementation:

1. **Artist Starts Call** (Dashboard):
   - Creates record in `call_sessions` table
   - Inserts invited users into `call_participants`
   - Gets LiveKit token from `/api/livekit/token`
   - Joins LiveKit room

2. **Real-time Notification** (Supabase):
   - Mobile app subscribes to `call_participants` INSERT events
   - When new participant added, event fires immediately
   - IncomingCallModal component receives notification

3. **Participant Joins** (Mobile):
   - IncomingCallModal shows with artist info
   - Vibration alerts user
   - Accept button → Navigate to CallScreen
   - CallScreen fetches LiveKit token
   - Connects to same LiveKit room

4. **LiveKit Connection**:
   - WebRTC peer-to-peer connection
   - Low latency video/audio
   - Automatic quality adaptation
   - Works globally via LiveKit edge network

---

## 📱 Mobile App Components

### IncomingCallModal
**Location:** `components/IncomingCallModal.tsx`

**Features:**
- Global modal (always mounted in app/_layout.tsx)
- Listens for real-time call invitations
- Shows artist name, avatar, event name
- Vibrates phone on incoming call
- Accept/Decline buttons
- Purple/pink gradient iOS 26 theme

**Usage:**
```tsx
// Already added to app/_layout.tsx
<IncomingCallModal />
```

### CallScreen
**Location:** `app/call.tsx`

**Features:**
- Full-screen video interface
- LiveKit video rendering
- Mute/unmute microphone
- Enable/disable camera
- End call button
- Participant counter
- Dark gradient control bar

**Navigation:**
```tsx
router.push({
  pathname: '/call',
  params: {
    callId: 'uuid-here',
    roomName: 'event-room-123',
  },
});
```

---

## 🔌 Backend API

### LiveKit Token Endpoint
**Location:** `move-dashboard-deploy/src/app/api/livekit/token/route.ts`

**Endpoint:** `POST /api/livekit/token`

**Request Body:**
```json
{
  "room_name": "event-xyz-call",
  "event_id": "uuid",
  "participant_name": "User Name" // optional
}
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJhbGc...",
  "url": "wss://your-project.livekit.cloud",
  "room_name": "event-xyz-call",
  "identity": "user-uuid",
  "name": "Display Name",
  "isArtist": false
}
```

**Authentication:**
- Requires Supabase auth header
- Verifies user is artist OR event participant
- Artists get full permissions
- Participants get limited permissions

---

## 🧪 Testing the Feature

### Prerequisites:
1. ✅ Database migration run
2. ✅ LiveKit account created
3. ✅ Environment variables set
4. ✅ Backend deployed
5. ✅ Mobile app built with changes

### Test Scenario 1: Artist → Participant Call

**Step 1:** Create Test Event (as Artist)
```sql
-- Run in Supabase SQL Editor
INSERT INTO events (event_id, artist_id, name, status, start_at)
VALUES (
  gen_random_uuid(),
  'your-artist-user-id',
  'Test Event',
  'live',
  now()
);
```

**Step 2:** Start Call (Dashboard - To be implemented)
```tsx
// This functionality needs to be added to dashboard
// For now, manually insert:
INSERT INTO call_sessions (event_id, host_id, room_name, status)
VALUES ('event-id', 'artist-id', 'test-room-123', 'active');

INSERT INTO call_participants (call_id, user_id, is_invited, status)
VALUES ('call-id-from-above', 'participant-user-id', true, 'invited');
```

**Step 3:** Verify Mobile App
- Open mobile app as participant
- Should see IncomingCallModal popup
- Phone should vibrate
- Click "Accept"
- Should navigate to CallScreen
- Should connect to LiveKit room

### Test Scenario 2: Token Generation

Test the API endpoint:
```bash
curl -X POST https://your-backend.railway.app/api/livekit/token \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_name": "test-room",
    "event_id": "YOUR_EVENT_ID"
  }'
```

Expected response:
```json
{
  "ok": true,
  "token": "eyJhbGc...",
  "url": "wss://...",
  "isArtist": false
}
```

---

## 🐛 Troubleshooting

### Issue: "LiveKit credentials not configured"

**Cause:** Environment variables not set

**Fix:**
```bash
# Check backend .env.local
echo $LIVEKIT_API_KEY
echo $LIVEKIT_API_SECRET
echo $NEXT_PUBLIC_LIVEKIT_URL

# Restart backend after adding:
npm run dev
```

### Issue: IncomingCallModal not appearing

**Cause:** Supabase Realtime not configured or user not in call_participants

**Fix:**
1. Check Supabase Realtime is enabled for `call_participants` table
2. Verify INSERT happened:
```sql
SELECT * FROM call_participants WHERE user_id = 'your-user-id';
```
3. Check mobile app console for subscription errors

### Issue: "Failed to get call token"

**Cause:** User not authenticated or not authorized

**Fix:**
1. Verify user is logged in:
```tsx
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```
2. Check user is participant:
```sql
SELECT * FROM event_participants
WHERE event_id = 'event-id' AND user_id = 'user-id';
```

### Issue: Black screen / no video

**Cause:** Camera/microphone permissions not granted

**Fix:**
1. iOS: Check Settings > Your App > Camera/Microphone
2. Android: Grant permissions in app settings
3. Check LiveKit console for connection errors

---

## 📦 Dependencies

### Mobile App (package.json):
```json
{
  "@livekit/react-native": "^2.9.2",
  "@livekit/react-native-expo-plugin": "^1.0.1",
  "@livekit/react-native-webrtc": "^137.0.2",
  "livekit-client": "^2.15.8"
}
```

### Backend (package.json):
```json
{
  "livekit-server-sdk": "^2.x.x"
}
```

---

## 🚧 TODO: Dashboard Implementation

The mobile app is ready, but the dashboard needs a UI to start calls:

### Needed in Dashboard:

1. **"Start Video Call" Button**
   - Location: Event details page (for artists only)
   - Shows only when event is 'live'
   - Opens participant selector modal

2. **Participant Selector Modal**
   - Shows active participants (from leaderboard)
   - Checkboxes to select who to invite
   - "Start Call" button

3. **Call Interface**
   - Full-screen video
   - Uses LiveKit React components
   - Similar to app/call.tsx but for web

**Reference:** See `CALL_FEATURE_SETUP.md` in move-dashboard-deploy for more details

---

## 🔐 Security

### Row Level Security (RLS)

All database tables have RLS enabled:

- **call_sessions:**
  - Artists can create calls for their events
  - Artists and participants can view calls
  - Only artists can update/end calls

- **call_participants:**
  - Artists can add participants
  - Users can view/update their own participation
  - Cannot see other calls

### Token Security

- LiveKit tokens expire after 2 hours
- API keys never exposed to client
- Each token scoped to specific room and user
- Supabase auth required for token generation

---

## 📈 Performance & Scaling

### Bandwidth Requirements:
- **Artist (uploading):** 2-4 Mbps upload
- **Participants (receiving):** 1-2 Mbps download
- **Audio only:** 50-100 Kbps

### LiveKit Scaling:
- Free tier: Up to 100 participants per room
- Paid: Unlimited participants
- Global edge network for low latency
- Automatic quality adaptation

---

## 🎉 Next Steps

1. **Run the database migration** ✅ Ready
2. **Set up LiveKit account** (5 minutes)
3. **Add environment variables** (2 minutes)
4. **Test on mobile** (Incoming call should work!)
5. **Build dashboard UI** (To start calls)
6. **Deploy and test end-to-end**

---

## 📞 Support

- **LiveKit Docs:** https://docs.livekit.io/
- **Supabase Realtime:** https://supabase.com/docs/guides/realtime
- **React Native WebRTC:** https://github.com/react-native-webrtc/react-native-webrtc

---

**✅ The mobile app is ready to receive calls! The migration is ready to run. Just need to set up LiveKit and run the SQL migration!**
