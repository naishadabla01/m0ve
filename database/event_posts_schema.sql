-- =====================================================
-- EVENT POSTS & COMMENTS SCHEMA
-- Social messaging feature for artist-to-participant communication
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: event_posts
-- Stores posts/updates created by artists for their events
-- =====================================================
CREATE TABLE IF NOT EXISTS event_posts (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT event_posts_content_not_empty CHECK (char_length(content) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_posts_event_id ON event_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_artist_id ON event_posts(artist_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_created_at ON event_posts(created_at DESC);

-- =====================================================
-- TABLE: post_comments
-- Stores comments/replies from users on artist posts
-- Supports nested replies via parent_comment_id
-- =====================================================
CREATE TABLE IF NOT EXISTS post_comments (
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES event_posts(post_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(comment_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT post_comments_content_not_empty CHECK (char_length(content) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at ASC);

-- =====================================================
-- TABLE: post_likes
-- Stores likes/reactions on posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_likes (
  like_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES event_posts(post_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only like a post once
  UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- =====================================================
-- TABLE: comment_likes
-- Stores likes/reactions on comments
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_likes (
  like_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES post_comments(comment_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only like a comment once
  UNIQUE(comment_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE event_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: event_posts
-- =====================================================

-- Artists can create posts for their own events
CREATE POLICY "Artists can create posts for their events"
  ON event_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    artist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.event_id = event_posts.event_id
      AND events.artist_id = auth.uid()
    )
  );

-- Artists can update their own posts
CREATE POLICY "Artists can update their own posts"
  ON event_posts
  FOR UPDATE
  TO authenticated
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

-- Artists can delete their own posts
CREATE POLICY "Artists can delete their own posts"
  ON event_posts
  FOR DELETE
  TO authenticated
  USING (artist_id = auth.uid());

-- Users can view posts for events they're signed up for
CREATE POLICY "Users can view posts for their events"
  ON event_posts
  FOR SELECT
  TO authenticated
  USING (
    -- Event participants can see posts
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_participants.event_id = event_posts.event_id
      AND event_participants.user_id = auth.uid()
    )
    OR
    -- Artists can see their own posts
    artist_id = auth.uid()
  );

-- =====================================================
-- POLICIES: post_comments
-- =====================================================

-- Users can create comments on posts they have access to
CREATE POLICY "Users can create comments on accessible posts"
  ON post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_posts
      JOIN event_participants ON event_participants.event_id = event_posts.event_id
      WHERE event_posts.post_id = post_comments.post_id
      AND event_participants.user_id = auth.uid()
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON post_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON post_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view comments on posts they have access to
CREATE POLICY "Users can view comments on accessible posts"
  ON post_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_posts
      JOIN event_participants ON event_participants.event_id = event_posts.event_id
      WHERE event_posts.post_id = post_comments.post_id
      AND event_participants.user_id = auth.uid()
    )
    OR
    -- Artists can see all comments on their posts
    EXISTS (
      SELECT 1 FROM event_posts
      WHERE event_posts.post_id = post_comments.post_id
      AND event_posts.artist_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: post_likes
-- =====================================================

-- Users can like posts they have access to
CREATE POLICY "Users can like accessible posts"
  ON post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_posts
      JOIN event_participants ON event_participants.event_id = event_posts.event_id
      WHERE event_posts.post_id = post_likes.post_id
      AND event_participants.user_id = auth.uid()
    )
  );

-- Users can unlike their own likes
CREATE POLICY "Users can remove their own likes"
  ON post_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view likes on posts they have access to
CREATE POLICY "Users can view likes on accessible posts"
  ON post_likes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_posts
      JOIN event_participants ON event_participants.event_id = event_posts.event_id
      WHERE event_posts.post_id = post_likes.post_id
      AND event_participants.user_id = auth.uid()
    )
    OR
    -- Artists can see likes on their posts
    EXISTS (
      SELECT 1 FROM event_posts
      WHERE event_posts.post_id = post_likes.post_id
      AND event_posts.artist_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: comment_likes
-- =====================================================

-- Users can like comments they have access to
CREATE POLICY "Users can like accessible comments"
  ON comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM post_comments
      JOIN event_posts ON event_posts.post_id = post_comments.post_id
      JOIN event_participants ON event_participants.event_id = event_posts.event_id
      WHERE post_comments.comment_id = comment_likes.comment_id
      AND event_participants.user_id = auth.uid()
    )
  );

-- Users can unlike their own comment likes
CREATE POLICY "Users can remove their own comment likes"
  ON comment_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view likes on comments they have access to
CREATE POLICY "Users can view likes on accessible comments"
  ON comment_likes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM post_comments
      JOIN event_posts ON event_posts.post_id = post_comments.post_id
      JOIN event_participants ON event_participants.event_id = event_posts.event_id
      WHERE post_comments.comment_id = comment_likes.comment_id
      AND event_participants.user_id = auth.uid()
    )
    OR
    -- Artists can see likes on comments on their posts
    EXISTS (
      SELECT 1 FROM post_comments
      JOIN event_posts ON event_posts.post_id = post_comments.post_id
      WHERE post_comments.comment_id = comment_likes.comment_id
      AND event_posts.artist_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for event_posts
DROP TRIGGER IF EXISTS update_event_posts_updated_at ON event_posts;
CREATE TRIGGER update_event_posts_updated_at
  BEFORE UPDATE ON event_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================
-- Run this in Supabase Dashboard > Storage
-- 1. Create a new bucket called 'event-post-images'
-- 2. Set it to public
-- 3. Add the following policies:

-- Storage Policy: Artists can upload images for their posts
-- INSERT policy on storage.objects for bucket 'event-post-images'
-- (bucket_id = 'event-post-images' AND auth.role() = 'authenticated')

-- Storage Policy: Anyone can view post images
-- SELECT policy on storage.objects for bucket 'event-post-images'
-- (bucket_id = 'event-post-images')

-- Storage Policy: Artists can delete their own post images
-- DELETE policy on storage.objects for bucket 'event-post-images'
-- (bucket_id = 'event-post-images' AND auth.uid() = owner)

-- =====================================================
-- SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Get all posts for a specific event with comment count
-- SELECT
--   ep.*,
--   COUNT(DISTINCT pc.comment_id) as comment_count,
--   COUNT(DISTINCT pl.like_id) as like_count
-- FROM event_posts ep
-- LEFT JOIN post_comments pc ON pc.post_id = ep.post_id
-- LEFT JOIN post_likes pl ON pl.post_id = ep.post_id
-- WHERE ep.event_id = '<event_id>'
-- GROUP BY ep.post_id
-- ORDER BY ep.created_at DESC;

-- Get all comments for a specific post with user info
-- SELECT
--   pc.*,
--   u.email as user_email
-- FROM post_comments pc
-- JOIN auth.users u ON u.id = pc.user_id
-- WHERE pc.post_id = '<post_id>'
-- ORDER BY pc.created_at ASC;

-- Get nested comments (with replies)
-- WITH RECURSIVE comment_tree AS (
--   -- Top-level comments
--   SELECT comment_id, post_id, user_id, parent_comment_id, content, created_at, 0 as depth
--   FROM post_comments
--   WHERE parent_comment_id IS NULL AND post_id = '<post_id>'
--
--   UNION ALL
--
--   -- Nested replies
--   SELECT pc.comment_id, pc.post_id, pc.user_id, pc.parent_comment_id, pc.content, pc.created_at, ct.depth + 1
--   FROM post_comments pc
--   INNER JOIN comment_tree ct ON pc.parent_comment_id = ct.comment_id
-- )
-- SELECT * FROM comment_tree ORDER BY created_at ASC;
