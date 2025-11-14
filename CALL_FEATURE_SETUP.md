# Video Call Feature Setup Guide

This document explains how to set up and configure the video call feature for artist-to-attendee communication during live events.

## Overview

The call feature allows artists to:
- Start video calls during live events
- Select specific attendees from the leaderboard to invite
- Broadcast their video feed to concert screens
- Interact face-to-face with fans in real-time

## Architecture

- **Video Infrastructure**: LiveKit (WebRTC-based)
- **Real-time Signaling**: Supabase Realtime Channels
- **Database**: PostgreSQL (Supabase)
- **Frontend**: React with LiveKit Components

## Prerequisites

1. **LiveKit Cloud Account**
   - Sign up at https://cloud.livekit.io/
   - Create a new project
   - Get your API credentials

2. **Database Tables**
   - Run the migration: `/migrations/002_call_tables.sql`
   - Creates `call_sessions` and `call_participants` tables
   - Sets up RLS (Row Level Security) policies

## Step 1: Configure LiveKit

### Create LiveKit Project

1. Go to https://cloud.livekit.io/
2. Create a new project
3. Copy the following credentials:
   - **WebSocket URL**: `wss://your-project.livekit.cloud`
   - **API Key**: Your API key
   - **API Secret**: Your API secret

### Add to Environment Variables

Update your `.env.local` file:

```bash
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_key_here
```

⚠️ **Important**:
- `NEXT_PUBLIC_LIVEKIT_URL` must be public (starts with `NEXT_PUBLIC_`)
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` must be server-side only (no `NEXT_PUBLIC_` prefix)

## Step 2: Set Up Database

### Run Migration

Execute the SQL migration in your Supabase SQL editor:

```bash
psql $DATABASE_URL < migrations/002_call_tables.sql
```

Or manually copy-paste from `/migrations/002_call_tables.sql` into Supabase SQL Editor.

### Verify Tables

Check that these tables exist:
- `call_sessions` - Stores active/past call sessions
- `call_participants` - Tracks who joined each call

## Step 3: Test the Feature

### As an Artist:

1. Create a live event
2. Go to the event details page
3. Click "Start Video Call" button (only visible during live events)
4. Select attendees from the leaderboard to invite (optional)
5. Click "Start Call"
6. Video interface opens in fullscreen

### As an Attendee:

1. Join a live event via the mobile app
2. Move/dance to generate activity (appear on leaderboard)
3. When artist starts a call and invites you:
   - You'll receive a real-time notification (via Supabase Realtime)
   - Join the call from your device

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/livekit/token` | POST | Generate LiveKit access token |
| `/api/calls/start` | POST | Start a new call session |
| `/api/calls/end` | POST | End an active call |
| `/api/calls/active` | GET | Check if event has active call |

## Components

### CallInterface (`/src/components/CallInterface.tsx`)
- Full-screen video call UI
- iOS 26 glassmorphism styling
- Uses LiveKit React components
- Handles token fetching and connection

### CallParticipantSelector (`/src/components/CallParticipantSelector.tsx`)
- Modal for selecting attendees to invite
- Shows live participants from leaderboard
- Multi-select checkbox interface
- Real-time participant data

## Styling

All components follow the iOS 26 glassmorphism theme:
- `rounded-[2rem]` - Smooth rounded corners
- `backdrop-blur-2xl` - Frosted glass effect
- `from-purple-500/10 via-black/40 to-pink-500/10` - Purple/pink gradients
- `border-white/10` - Subtle borders

## Troubleshooting

### "LiveKit credentials not configured" error

**Cause**: Environment variables not set or incorrect

**Fix**:
1. Check `.env.local` has all three LiveKit variables
2. Restart Next.js dev server: `npm run dev`
3. Verify variable names match exactly (case-sensitive)

### "Failed to get call token" error

**Cause**: User not authenticated or not authorized

**Fix**:
1. Ensure user is logged in
2. Verify user is either:
   - The event artist, OR
   - A participant in the event (has motion data)

### Video not working / black screen

**Cause**: Browser permissions not granted

**Fix**:
1. Allow camera/microphone access in browser
2. Check browser console for errors
3. Verify LiveKit URL is correct (must start with `wss://`)

### Participants can't join

**Cause**: Not invited or not active participants

**Fix**:
1. Ensure users are active (moved within last 20 seconds)
2. Verify they were invited by the artist
3. Check `call_participants` table in database

## Security

### Row Level Security (RLS)

The database tables have RLS policies that ensure:
- Only event artists can start/end calls
- Only invited participants can join calls
- Users can only see calls they're part of

### Token Security

- LiveKit tokens expire after 2 hours
- API keys are server-side only (not exposed to browser)
- Each token is scoped to a specific room and user

## Performance

### Bandwidth Requirements

- **Artist (uploading video)**: 2-4 Mbps upload
- **Attendees (receiving video)**: 1-2 Mbps download
- **Audio only**: 50-100 Kbps

### Scaling

LiveKit Cloud handles scaling automatically:
- Up to 100 participants per room (free tier)
- Unlimited participants with paid plans
- Global edge network for low latency

## Future Enhancements

Potential improvements:
- [ ] Screen sharing for artists
- [ ] Picture-in-picture mode for attendees
- [ ] Call recording and playback
- [ ] Text chat during calls
- [ ] Reactions/emojis overlay
- [ ] Spotlight mode for selected attendees
- [ ] Integration with projector display page

## Support

For LiveKit support:
- Documentation: https://docs.livekit.io/
- Discord: https://livekit.io/discord
- GitHub: https://github.com/livekit/livekit

For Supabase support:
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com/
- GitHub: https://github.com/supabase/supabase
