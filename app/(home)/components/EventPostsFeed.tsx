// components/EventPostsFeed.tsx - Display event posts in LiveEventDetailsModal
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { Colors, BorderRadius, Spacing, Typography } from '../../../constants/Design';

interface EventPost {
  post_id: string;
  event_id: string;
  artist_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  comment_count?: number;
  like_count?: number;
  artist_name?: string;
  artist_avatar?: string | null;
  user_has_liked?: boolean;
}

interface PostComment {
  comment_id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  like_count?: number;
  user_has_liked?: boolean;
  parent_comment_id?: string | null;
}

interface EventPostsFeedProps {
  eventId: string;
}

export function EventPostsFeed({ eventId }: EventPostsFeedProps) {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPost, setExpandedPost] = useState<EventPost | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
  }, [eventId]);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  async function loadPosts() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      // Fetch posts with counts
      const { data: postsData, error: postsError } = await supabase
        .from('event_posts')
        .select(`
          *,
          post_comments(count),
          post_likes(count)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Get unique artist IDs
      const artistIds = [...new Set(postsData.map(p => p.artist_id))];

      // Fetch artist profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', artistIds);

      // Create a map of artist profiles
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Check if user has liked each post
      let userLikes: string[] = [];
      if (user) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postsData.map(p => p.post_id));

        userLikes = likesData?.map(l => l.post_id) || [];
      }

      // Transform data
      const transformedPosts = postsData.map((post: any) => {
        const profile = profilesMap.get(post.artist_id);
        return {
          ...post,
          comment_count: post.post_comments?.[0]?.count ?? 0,
          like_count: post.post_likes?.[0]?.count ?? 0,
          artist_name: profile?.display_name ||
                      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
                      'Artist',
          artist_avatar: profile?.avatar_url || null,
          user_has_liked: userLikes.includes(post.post_id),
        };
      });

      setPosts(transformedPosts);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleLikePost(post: EventPost) {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    try {
      if (post.user_has_liked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.post_id)
          .eq('user_id', currentUserId);
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.post_id,
            user_id: currentUserId,
          });
      }

      // Update local state
      setPosts(posts.map(p =>
        p.post_id === post.post_id
          ? {
              ...p,
              like_count: (p.like_count || 0) + (post.user_has_liked ? -1 : 1),
              user_has_liked: !post.user_has_liked,
            }
          : p
      ));

      // Update expanded post if it's the same
      if (expandedPost?.post_id === post.post_id) {
        setExpandedPost({
          ...expandedPost,
          like_count: (expandedPost.like_count || 0) + (post.user_has_liked ? -1 : 1),
          user_has_liked: !post.user_has_liked,
        });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadPosts();
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['2xl'] }}>
        <ActivityIndicator size="large" color={Colors.accent.purple.DEFAULT} />
        <Text style={{ color: Colors.text.muted, marginTop: Spacing.md, fontSize: Typography.size.sm }}>
          Loading feed...
        </Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['3xl'] }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: BorderRadius.full,
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: Spacing.lg,
        }}>
          <Ionicons name="chatbubbles-outline" size={40} color={Colors.accent.purple.DEFAULT} />
        </View>
        <Text style={{
          color: Colors.text.secondary,
          marginTop: Spacing.md,
          fontSize: Typography.size.lg,
          fontWeight: Typography.weight.bold
        }}>
          No Posts Yet
        </Text>
        <Text style={{
          color: Colors.text.muted,
          marginTop: Spacing.xs,
          fontSize: Typography.size.sm,
          textAlign: 'center',
          paddingHorizontal: Spacing['2xl']
        }}>
          The artist hasn't shared any updates for this event
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent.purple.DEFAULT} />
        }
      >
        {posts.map((post) => (
          <Pressable
            key={post.post_id}
            onPress={() => setExpandedPost(post)}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: BorderRadius['2xl'],
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              marginBottom: Spacing.lg,
              overflow: 'hidden',
            }}
          >
            {/* Post Image (if exists) */}
            {post.image_url && (
              <Image
                source={{ uri: post.image_url }}
                style={{
                  width: '100%',
                  height: 200,
                }}
                resizeMode="cover"
              />
            )}

            {/* Post Content */}
            <View style={{ padding: Spacing.md }}>
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.base,
                  lineHeight: 22,
                  marginBottom: Spacing.md,
                }}
                numberOfLines={3}
              >
                {post.content}
              </Text>

              {/* Actions Bar */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.lg,
              }}>
                {/* Like Button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleLikePost(post);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
                >
                  <Ionicons
                    name={post.user_has_liked ? "heart" : "heart-outline"}
                    size={22}
                    color={post.user_has_liked ? "#ec4899" : Colors.text.muted}
                  />
                  <Text style={{
                    color: post.user_has_liked ? "#ec4899" : Colors.text.muted,
                    fontSize: Typography.size.sm,
                    fontWeight: post.user_has_liked ? Typography.weight.semibold : Typography.weight.regular
                  }}>
                    {post.like_count || 0}
                  </Text>
                </Pressable>

                {/* Comment Button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.text.muted} />
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
                    {post.comment_count || 0}
                  </Text>
                </View>

                {/* Time */}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                  }}>
                    {getTimeAgo(post.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Expanded Post Modal */}
      {expandedPost && (
        <ExpandedPostModal
          post={expandedPost}
          onClose={() => setExpandedPost(null)}
          onLike={() => handleLikePost(expandedPost)}
          currentUserId={currentUserId}
          getInitials={getInitials}
          onUpdatePost={(updatedPost) => {
            setPosts(posts.map(p => p.post_id === updatedPost.post_id ? updatedPost : p));
            setExpandedPost(updatedPost);
          }}
        />
      )}
    </>
  );
}

// =====================================================
// Expanded Post Modal Component
// =====================================================
interface ExpandedPostModalProps {
  post: EventPost;
  onClose: () => void;
  onLike: () => void;
  currentUserId: string | null;
  getInitials: (name: string) => string;
  onUpdatePost: (post: EventPost) => void;
}

function ExpandedPostModal({ post, onClose, onLike, currentUserId, getInitials, onUpdatePost }: ExpandedPostModalProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [inlineReplyFor, setInlineReplyFor] = useState<string | null>(null);
  const [inlineReplyContent, setInlineReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Map<string, boolean>>(new Map());
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    loadComments();
  }, []);

  // Pan Responder for swipe down gesture on cover image
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical swipes (dy > dx)
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 100 pixels, close the modal
        if (gestureState.dy > 100) {
          onClose();
        }
      },
    })
  ).current;

  async function loadComments() {
    try {
      setLoadingComments(true);

      const { data: { user } } = await supabase.auth.getUser();

      // Fetch comments
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*, comment_likes(count)')
        .eq('post_id', post.post_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      // Fetch user profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', userIds);

      // Create a map of profiles
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Check which comments user has liked
      let userCommentLikes: string[] = [];
      if (user) {
        const { data: likesData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentsData.map(c => c.comment_id));

        userCommentLikes = likesData?.map(l => l.comment_id) || [];

        const likesMap = new Map<string, boolean>();
        userCommentLikes.forEach(id => likesMap.set(id, true));
        setCommentLikes(likesMap);
      }

      const commentsWithProfiles = commentsData.map((comment: any) => {
        const profile = profilesMap.get(comment.user_id);
        return {
          ...comment,
          user_name: profile?.display_name ||
                    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
                    'User',
          user_avatar: profile?.avatar_url || null,
          like_count: comment.comment_likes?.[0]?.count ?? 0,
          user_has_liked: userCommentLikes.includes(comment.comment_id),
        };
      });

      setComments(commentsWithProfiles);

      // Update post comment count
      onUpdatePost({
        ...post,
        comment_count: commentsWithProfiles.length,
      });
    } catch (error: any) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleSubmitNewComment() {
    if (!newCommentContent.trim()) return;

    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    try {
      setSubmittingComment(true);

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.post_id,
          user_id: currentUserId,
          content: newCommentContent.trim(),
          parent_comment_id: null,
        });

      if (error) throw error;

      setNewCommentContent('');
      Keyboard.dismiss();
      await loadComments();

      // Scroll to show the new comment
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleSubmitInlineReply(parentCommentId: string) {
    if (!inlineReplyContent.trim()) return;

    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to reply');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.post_id,
          user_id: currentUserId,
          content: inlineReplyContent.trim(),
          parent_comment_id: parentCommentId,
        });

      if (error) throw error;

      setInlineReplyFor(null);
      setInlineReplyContent('');
      Keyboard.dismiss();
      setExpandedReplies(prev => new Set(prev).add(parentCommentId));
      await loadComments();

      // Scroll to show the new reply
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      Alert.alert('Error', 'Failed to post reply');
    }
  }

  async function handleLikeComment(comment: PostComment) {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to like comments');
      return;
    }

    try {
      const isLiked = commentLikes.get(comment.comment_id) || false;

      if (isLiked) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.comment_id)
          .eq('user_id', currentUserId);
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: comment.comment_id,
            user_id: currentUserId,
          });
      }

      // Update local state
      setCommentLikes(prev => {
        const newMap = new Map(prev);
        newMap.set(comment.comment_id, !isLiked);
        return newMap;
      });

      setComments(comments.map(c =>
        c.comment_id === comment.comment_id
          ? {
              ...c,
              like_count: (c.like_count || 0) + (isLiked ? -1 : 1),
              user_has_liked: !isLiked,
            }
          : c
      ));
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  }

  async function handleDeleteComment(commentId: string) {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('post_comments')
                .delete()
                .eq('comment_id', commentId);

              if (error) throw error;

              await loadComments();
            } catch (error: any) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  }

  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const visibleComments = showAllComments ? topLevelComments : topLevelComments.slice(0, 5);
  const hasMore = topLevelComments.length > 5;

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Cover Image with Close Button Overlay and Swipe Down Gesture */}
          <View style={{ position: 'relative' }} {...panResponder.panHandlers}>
          {post.image_url ? (
            <Image
              source={{ uri: post.image_url }}
              style={{
                width: '100%',
                height: inlineReplyFor ? 0 : 300,  // Hide when reply is active
              }}
              resizeMode="cover"
            />
          ) : (
            // Fallback gradient if no image
            <LinearGradient
              colors={['#1a1a1a', '#0a0a0a']}
              style={{
                width: '100%',
                height: inlineReplyFor ? 0 : 300,  // Hide when reply is active
              }}
            />
          )}

          {/* Close Button Overlay */}
          {!inlineReplyFor && (
            <Pressable
              onPress={onClose}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
              }}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </Pressable>
          )}
          </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: inlineReplyFor ? 400 : Spacing['2xl']
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >

          {/* Post Content & Actions */}
          <View style={{ padding: Spacing.lg }}>
            {/* Artist Name with Verified Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
              <Text style={{
                color: Colors.text.primary,
                fontSize: Typography.size.base,
                fontWeight: Typography.weight.bold,
              }}>
                {post.artist_name}
              </Text>
              {/* Verified Badge */}
              <View style={{
                width: 18,
                height: 18,
                borderRadius: BorderRadius.full,
                backgroundColor: '#3b82f6',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="checkmark" size={12} color="#ffffff" />
              </View>
            </View>

            {/* Post Text */}
            <Text style={{
              color: Colors.text.primary,
              fontSize: Typography.size.base,
              lineHeight: 24,
              marginBottom: Spacing.lg,
            }}>
              {post.content}
            </Text>

            {/* Actions: Likes, Comments, Time */}
            <View style={{
              flexDirection: 'row',
              gap: Spacing.lg,
              paddingVertical: Spacing.md,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              marginBottom: Spacing.lg,
            }}>
              <Pressable
                onPress={onLike}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
              >
                <Ionicons
                  name={post.user_has_liked ? "heart" : "heart-outline"}
                  size={26}
                  color={post.user_has_liked ? "#ec4899" : Colors.text.muted}
                />
                <Text style={{
                  color: post.user_has_liked ? "#ec4899" : Colors.text.muted,
                  fontSize: Typography.size.base,
                  fontWeight: post.user_has_liked ? Typography.weight.bold : Typography.weight.regular
                }}>
                  {post.like_count || 0}
                </Text>
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Ionicons name="chatbubble-outline" size={24} color={Colors.text.muted} />
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base }}>
                  {comments.length}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
                  {getTimeAgo(post.created_at)}
                </Text>
              </View>
            </View>

            {/* Comments Section */}
            <Text style={{
              color: Colors.text.primary,
              fontWeight: Typography.weight.bold,
              fontSize: Typography.size.lg,
              marginBottom: Spacing.md,
            }}>
              Comments
            </Text>

            {loadingComments ? (
              <ActivityIndicator size="small" color={Colors.accent.purple.DEFAULT} style={{ marginVertical: Spacing.lg }} />
            ) : comments.length === 0 ? (
              <Text style={{
                color: Colors.text.muted,
                fontSize: Typography.size.sm,
                textAlign: 'center',
                paddingVertical: Spacing.xl,
              }}>
                No comments yet. Be the first to comment!
              </Text>
            ) : (
              <View style={{ gap: Spacing.md }}>
                {visibleComments.map((comment) => {
                  const replies = comments.filter(c => c.parent_comment_id === comment.comment_id);
                  const showReplies = expandedReplies.has(comment.comment_id);
                  const isArtist = comment.user_id === post.artist_id;

                  return (
                    <View key={comment.comment_id} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: BorderRadius.xl,
                      padding: Spacing.md,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}>
                      {/* Comment */}
                      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                        {/* Avatar */}
                        <View style={{ position: 'relative' }}>
                          {comment.user_avatar ? (
                            <Image
                              source={{ uri: comment.user_avatar }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: BorderRadius.full,
                              }}
                            />
                          ) : (
                            <View style={{
                              width: 36,
                              height: 36,
                              borderRadius: BorderRadius.full,
                              backgroundColor: 'rgba(168, 85, 247, 0.3)',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}>
                              <Text style={{
                                color: Colors.text.primary,
                                fontSize: Typography.size.xs,
                                fontWeight: Typography.weight.bold,
                              }}>
                                {getInitials(comment.user_name)}
                              </Text>
                            </View>
                          )}
                          {/* Artist Badge */}
                          {isArtist && (
                            <View style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 16,
                              height: 16,
                              borderRadius: BorderRadius.full,
                              backgroundColor: '#60a5fa',
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderWidth: 2,
                              borderColor: Colors.background.primary,
                            }}>
                              <Ionicons name="checkmark" size={8} color="#ffffff" />
                            </View>
                          )}
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs }}>
                            <Text style={{
                              color: Colors.text.primary,
                              fontWeight: Typography.weight.bold,
                              fontSize: Typography.size.sm,
                            }}>
                              {comment.user_name}
                            </Text>
                            <Text style={{
                              color: Colors.text.muted,
                              fontSize: Typography.size.xs,
                            }}>
                              {getTimeAgo(comment.created_at)}
                            </Text>
                          </View>
                          <Text style={{
                            color: Colors.text.secondary,
                            fontSize: Typography.size.sm,
                            lineHeight: 20,
                            marginBottom: Spacing.sm,
                          }}>
                            {comment.content}
                          </Text>

                          {/* Comment Actions */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                            {/* Like */}
                            <Pressable
                              onPress={() => handleLikeComment(comment)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
                            >
                              <Ionicons
                                name={comment.user_has_liked ? "heart" : "heart-outline"}
                                size={16}
                                color={comment.user_has_liked ? "#ec4899" : Colors.text.muted}
                              />
                              {(comment.like_count || 0) > 0 && (
                                <Text style={{
                                  color: comment.user_has_liked ? "#ec4899" : Colors.text.muted,
                                  fontSize: Typography.size.xs,
                                }}>
                                  {comment.like_count}
                                </Text>
                              )}
                            </Pressable>

                            {/* Reply */}
                            <Pressable
                              onPress={() => {
                                setInlineReplyFor(comment.comment_id);
                                setInlineReplyContent(`@${comment.user_name} `);
                              }}
                            >
                              <Text style={{
                                color: Colors.text.muted,
                                fontSize: Typography.size.xs,
                                fontWeight: Typography.weight.semibold,
                              }}>
                                Reply
                              </Text>
                            </Pressable>

                            {/* View Replies */}
                            {replies.length > 0 && (
                              <Pressable onPress={() => toggleReplies(comment.comment_id)}>
                                <Text style={{
                                  color: Colors.accent.purple.DEFAULT,
                                  fontSize: Typography.size.xs,
                                  fontWeight: Typography.weight.semibold,
                                }}>
                                  {showReplies ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                </Text>
                              </Pressable>
                            )}

                            {/* Delete (only for user's own comments) */}
                            {comment.user_id === currentUserId && (
                              <Pressable onPress={() => handleDeleteComment(comment.comment_id)}>
                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Nested Replies */}
                      {showReplies && replies.length > 0 && (
                        <View style={{ marginTop: Spacing.md, marginLeft: Spacing.lg, gap: Spacing.md }}>
                          {replies.map((reply) => {
                            const isReplyArtist = reply.user_id === post.artist_id;
                            return (
                              <View key={reply.comment_id} style={{ flexDirection: 'row', gap: Spacing.sm }}>
                                {/* Reply Avatar */}
                                <View style={{ position: 'relative' }}>
                                  {reply.user_avatar ? (
                                    <Image
                                      source={{ uri: reply.user_avatar }}
                                      style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: BorderRadius.full,
                                      }}
                                    />
                                  ) : (
                                    <View style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: BorderRadius.full,
                                      backgroundColor: 'rgba(168, 85, 247, 0.3)',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}>
                                      <Text style={{
                                        color: Colors.text.primary,
                                        fontSize: Typography.size.xs,
                                        fontWeight: Typography.weight.bold,
                                      }}>
                                        {getInitials(reply.user_name)}
                                      </Text>
                                    </View>
                                  )}
                                  {isReplyArtist && (
                                    <View style={{
                                      position: 'absolute',
                                      bottom: -2,
                                      right: -2,
                                      width: 14,
                                      height: 14,
                                      borderRadius: BorderRadius.full,
                                      backgroundColor: '#60a5fa',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      borderWidth: 2,
                                      borderColor: Colors.background.primary,
                                    }}>
                                      <Ionicons name="checkmark" size={7} color="#ffffff" />
                                    </View>
                                  )}
                                </View>

                                {/* Reply Content */}
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs }}>
                                    <Text style={{
                                      color: Colors.text.primary,
                                      fontWeight: Typography.weight.bold,
                                      fontSize: Typography.size.xs,
                                    }}>
                                      {reply.user_name}
                                    </Text>
                                    <Text style={{
                                      color: Colors.text.muted,
                                      fontSize: Typography.size.xs,
                                    }}>
                                      {getTimeAgo(reply.created_at)}
                                    </Text>
                                  </View>
                                  <Text style={{
                                    color: Colors.text.secondary,
                                    fontSize: Typography.size.xs,
                                    lineHeight: 18,
                                    marginBottom: Spacing.xs,
                                  }}>
                                    {reply.content}
                                  </Text>

                                  {/* Reply Actions */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                                    <Pressable
                                      onPress={() => handleLikeComment(reply)}
                                      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
                                    >
                                      <Ionicons
                                        name={reply.user_has_liked ? "heart" : "heart-outline"}
                                        size={14}
                                        color={reply.user_has_liked ? "#ec4899" : Colors.text.muted}
                                      />
                                      {(reply.like_count || 0) > 0 && (
                                        <Text style={{
                                          color: reply.user_has_liked ? "#ec4899" : Colors.text.muted,
                                          fontSize: Typography.size.xs,
                                        }}>
                                          {reply.like_count}
                                        </Text>
                                      )}
                                    </Pressable>

                                    <Pressable
                                      onPress={() => {
                                        setInlineReplyFor(comment.comment_id);
                                        setInlineReplyContent(`@${reply.user_name} `);
                                      }}
                                    >
                                      <Text style={{
                                        color: Colors.text.muted,
                                        fontSize: Typography.size.xs,
                                        fontWeight: Typography.weight.semibold,
                                      }}>
                                        Reply
                                      </Text>
                                    </Pressable>

                                    {/* Delete (only for user's own replies) */}
                                    {reply.user_id === currentUserId && (
                                      <Pressable onPress={() => handleDeleteComment(reply.comment_id)}>
                                        <Ionicons name="trash-outline" size={12} color="#ef4444" />
                                      </Pressable>
                                    )}
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Inline Reply Box - Positioned at bottom of comment thread */}
                      {inlineReplyFor === comment.comment_id && (
                        <View style={{ marginTop: Spacing.md, marginLeft: showReplies && replies.length > 0 ? Spacing.lg : 0, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                          <TextInput
                            autoFocus
                            value={inlineReplyContent}
                            onChangeText={setInlineReplyContent}
                            placeholder="Write a reply..."
                            placeholderTextColor={Colors.text.muted}
                            returnKeyType="send"
                            onSubmitEditing={() => handleSubmitInlineReply(comment.comment_id)}
                            blurOnSubmit={false}
                            style={{
                              flex: 1,
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              borderRadius: BorderRadius.lg,
                              paddingHorizontal: Spacing.sm,
                              paddingVertical: Spacing.sm,
                              color: Colors.text.primary,
                              fontSize: Typography.size.sm,
                              borderWidth: 1,
                              borderColor: Colors.accent.purple.DEFAULT + '80',
                              minHeight: 36,
                            }}
                            multiline
                          />
                          <Pressable
                            onPress={() => handleSubmitInlineReply(comment.comment_id)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: BorderRadius.full,
                              backgroundColor: Colors.accent.purple.DEFAULT,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Ionicons name="send" size={16} color="#ffffff" />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setInlineReplyFor(null);
                              setInlineReplyContent('');
                              Keyboard.dismiss();
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: BorderRadius.full,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Ionicons name="close" size={16} color={Colors.text.muted} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Show More/Less */}
                {hasMore && !showAllComments && (
                  <Pressable
                    onPress={() => setShowAllComments(true)}
                    style={{ paddingVertical: Spacing.sm }}
                  >
                    <Text style={{
                      color: Colors.accent.purple.DEFAULT,
                      fontSize: Typography.size.sm,
                      fontWeight: Typography.weight.semibold,
                      textAlign: 'center',
                    }}>
                      See {topLevelComments.length - 5} more comments
                    </Text>
                  </Pressable>
                )}

                {hasMore && showAllComments && (
                  <Pressable
                    onPress={() => setShowAllComments(false)}
                    style={{ paddingVertical: Spacing.sm }}
                  >
                    <Text style={{
                      color: Colors.accent.purple.DEFAULT,
                      fontSize: Typography.size.sm,
                      fontWeight: Typography.weight.semibold,
                      textAlign: 'center',
                    }}>
                      Show less
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input (Fixed at bottom) - Hidden when inline reply is active */}
        {!inlineReplyFor && (
          <View style={{
            padding: Spacing.lg,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: Colors.background.primary,
            paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.lg,
          }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
              <TextInput
                value={newCommentContent}
                onChangeText={setNewCommentContent}
                placeholder="Write a comment..."
                placeholderTextColor={Colors.text.muted}
                returnKeyType="send"
                onSubmitEditing={handleSubmitNewComment}
                blurOnSubmit={false}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: BorderRadius.xl,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.md,
                  color: Colors.text.primary,
                  fontSize: Typography.size.base,
                  maxHeight: 100,
                  minHeight: 48,
                }}
                multiline
              />
              <Pressable
                onPress={handleSubmitNewComment}
                disabled={submittingComment || !newCommentContent.trim()}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius.full,
                  backgroundColor: newCommentContent.trim() ? Colors.accent.purple.DEFAULT : 'rgba(168, 85, 247, 0.3)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="send" size={20} color="#ffffff" />
                )}
              </Pressable>
            </View>
          </View>
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// =====================================================
// Helper Functions
// =====================================================
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
