# Social Messaging Feature - Setup Guide

This guide explains how to set up and use the social messaging feature for artist-to-participant communication.

## Overview

This feature allows:
- **Artists**: Post updates with text and images to event participants
- **Participants**: View posts and comment/reply to artists
- **Real-time**: Updates feed in the event details modal
- **Future**: Dedicated feed section in app navigation

---

## 📋 Setup Steps

### 1. Database Setup

Run the SQL schema in your Supabase dashboard:

```bash
# File location: /Users/gyanendra/m0ve/m0ve/database/event_posts_schema.sql
```

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `event_posts_schema.sql`
3. Run the SQL script
4. Verify tables were created:
   - `event_posts`
   - `post_comments`
   - `post_likes`

### 2. Storage Bucket Setup

Create a storage bucket for post images:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `event-post-images`
3. Make it **public**
4. Add the following policies:

**Insert Policy:**
```sql
Name: Artists can upload post images
Policy: bucket_id = 'event-post-images' AND auth.role() = 'authenticated'
```

**Select Policy:**
```sql
Name: Anyone can view post images
Policy: bucket_id = 'event-post-images'
```

**Delete Policy:**
```sql
Name: Users can delete their own images
Policy: bucket_id = 'event-post-images' AND auth.uid() = owner
```

### 3. Environment Variables

Ensure these are set in your `.env.local` (Artist Dashboard):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🎨 Artist Dashboard Integration

### Add to Event Details Page

In your artist dashboard, add the EventPostsManager component to each event's detail view:

```tsx
import EventPostsManager from '@/components/EventPostsManager';

// Inside your event detail page
<EventPostsManager
  eventId={event.event_id}
  eventName={event.title || event.name}
/>
```

### Usage for Artists

1. Navigate to an event in your dashboard
2. Find the "Event Updates" section
3. Click "Create Post"
4. Write your message
5. Optionally upload an image
6. Click "Post Update"
7. All signed-up participants will see it in the app

---

## 📱 Mobile App Integration

### Add to LiveEventDetailsModal

To show posts in the event details modal, you need to integrate the `EventPostsFeed` component.

**Option 1: Add as a Tab (Recommended)**

Modify `LiveEventDetailsModal.tsx` to include a tabs system:

```tsx
import { EventPostsFeed } from './EventPostsFeed';

// Inside LiveEventDetailsModal component
const [activeTab, setActiveTab] = useState<'details' | 'updates'>('details');

// Add tab buttons
<View style={{ flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl }}>
  <Pressable onPress={() => setActiveTab('details')}>
    <Text style={{
      color: activeTab === 'details' ? Colors.accent.purple : Colors.text.muted
    }}>
      Details
    </Text>
  </Pressable>
  <Pressable onPress={() => setActiveTab('updates')}>
    <Text style={{
      color: activeTab === 'updates' ? Colors.accent.purple : Colors.text.muted
    }}>
      Updates
    </Text>
  </Pressable>
</View>

// Show content based on active tab
{activeTab === 'details' && (
  // Existing event details content
)}

{activeTab === 'updates' && (
  <EventPostsFeed eventId={event.event_id} />
)}
```

**Option 2: Add Below Event Details**

Simply add the feed below existing event information:

```tsx
import { EventPostsFeed } from './EventPostsFeed';

// Inside LiveEventDetailsModal ScrollView, after stats/leaderboard
<View style={{ marginTop: Spacing.xl }}>
  <Text style={{
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl
  }}>
    Artist Updates
  </Text>
  <EventPostsFeed eventId={event.event_id} />
</View>
```

---

## 🔔 Notifications (Future Enhancement)

To add push notifications when artists post:

1. Set up Expo Notifications in the mobile app
2. Store push tokens in the database
3. Modify `/api/posts/create` to send notifications to all event participants
4. Use Supabase Edge Functions or a background job

Example notification payload:
```typescript
{
  title: "New update from [Artist Name]",
  body: "[First 50 chars of post content]...",
  data: {
    type: 'event_post',
    event_id: event.event_id,
    post_id: post.post_id
  }
}
```

---

## 🎯 Feature Roadmap

### Phase 1: Basic Implementation ✅
- [x] Database schema
- [x] Post creation (Artist Dashboard)
- [x] Post viewing (Mobile App)
- [x] Comments system
- [x] Image uploads

### Phase 2: Enhanced Features (Next)
- [ ] Push notifications
- [ ] Like/reaction system
- [ ] Post editing
- [ ] Rich text formatting
- [ ] Emoji support

### Phase 3: Dedicated Feed (Future)
- [ ] New tab in app navigation
- [ ] Aggregated feed from all user's events
- [ ] Filter by event
- [ ] Unread indicators
- [ ] Search functionality

---

## 📊 Database Schema Reference

### event_posts
| Column | Type | Description |
|--------|------|-------------|
| post_id | uuid | Primary key |
| event_id | uuid | Foreign key to events |
| artist_id | uuid | Foreign key to users |
| content | text | Post content |
| image_url | text | URL to uploaded image |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### post_comments
| Column | Type | Description |
|--------|------|-------------|
| comment_id | uuid | Primary key |
| post_id | uuid | Foreign key to event_posts |
| user_id | uuid | Foreign key to users |
| content | text | Comment content |
| created_at | timestamptz | Creation timestamp |

### post_likes
| Column | Type | Description |
|--------|------|-------------|
| like_id | uuid | Primary key |
| post_id | uuid | Foreign key to event_posts |
| user_id | uuid | Foreign key to users |
| created_at | timestamptz | Creation timestamp |

---

## 🔒 Security & RLS Policies

All tables have Row Level Security (RLS) enabled with the following policies:

**event_posts:**
- Artists can create posts for their own events
- Artists can update/delete their own posts
- Participants can view posts for events they're signed up for

**post_comments:**
- Participants can create comments on posts they have access to
- Users can update/delete their own comments
- Users can view comments on accessible posts

**post_likes:**
- Participants can like posts they have access to
- Users can remove their own likes
- Users can view likes on accessible posts

---

## 🧪 Testing

### Test Post Creation
1. Log in as an artist in the dashboard
2. Navigate to an event
3. Create a test post with text and image
4. Verify it appears in the dashboard

### Test Post Viewing
1. Sign up for the event as a participant (mobile app)
2. Open the event details modal
3. Navigate to Updates tab/section
4. Verify the post appears
5. Test adding a comment

### Test Permissions
1. Try viewing posts for events you're not signed up for (should fail)
2. Try posting as a non-artist (should fail)
3. Try commenting without being signed up (should fail)

---

## 🐛 Troubleshooting

**Posts not appearing:**
- Check RLS policies are enabled
- Verify user is signed up for the event
- Check browser console for errors

**Image upload failing:**
- Verify storage bucket `event-post-images` exists and is public
- Check storage policies are set correctly
- Ensure file size is under Supabase limits (50MB default)

**Comments not posting:**
- Verify user is authenticated
- Check user is signed up for the event
- Verify post exists and user has access

---

## 📝 API Reference

### POST /api/posts/create
Create a new event post

**Request:**
```json
{
  "event_id": "uuid",
  "content": "string",
  "image_url": "string | null"
}
```

**Response:**
```json
{
  "ok": true,
  "post": { /* EventPost object */ }
}
```

### GET /api/posts/list?event_id=xxx
Get all posts for an event

**Response:**
```json
{
  "ok": true,
  "posts": [
    { /* EventPost with counts */ }
  ]
}
```

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review Supabase logs for errors
3. Check browser/mobile console for errors
4. Verify RLS policies and permissions

---

**Created:** December 2025
**Last Updated:** December 2025
