// types/posts.ts - Type definitions for event posts and comments

export interface EventPost {
  post_id: string;
  event_id: string;
  artist_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields (from queries)
  artist_name?: string;
  artist_email?: string;
  comment_count?: number;
  like_count?: number;
  user_has_liked?: boolean;
}

export interface PostComment {
  comment_id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;

  // Joined fields (from queries)
  user_email?: string;
  user_name?: string;
}

export interface PostLike {
  like_id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CreatePostData {
  event_id: string;
  content: string;
  image_url?: string | null;
}

export interface CreateCommentData {
  post_id: string;
  content: string;
}

export interface UpdatePostData {
  post_id: string;
  content?: string;
  image_url?: string | null;
}
