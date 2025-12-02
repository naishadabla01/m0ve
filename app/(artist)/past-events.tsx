// app/(artist)/past-events.tsx
import { reopenEvent } from '@/lib/events/endEvent';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type PastEvent = {
  event_id: string;
  name: string;
  short_code: string;
  status: string;
  created_at: string;
  ended_at: string;
  participant_count?: number;
  total_energy?: number;
};

export default function PastEventsScreen() {
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPastEvents() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/signin');
        return;
      }

      // Get ended events created by this user
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .eq('status', 'ended')
        .order('ended_at', { ascending: false });

      if (error) throw error;

      // Get stats for each event
      const eventsWithStats = await Promise.all((eventsData || []).map(async (event) => {
        const { data: scores } = await supabase
          .from('scores')
          .select('user_id, energy')
          .eq('event_id', event.event_id);

        return {
          ...event,
          participant_count: new Set(scores?.map(s => s.user_id) || []).size,
          total_energy: scores?.reduce((sum, s) => sum + (s.energy || 0), 0) || 0,
        };
      }));

      setEvents(eventsWithStats);
    } catch (error: any) {
      console.error('Error loading past events:', error);
      Alert.alert('Error', 'Failed to load past events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPastEvents();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPastEvents();
  };

  const handleReopenEvent = async (eventId: string) => {
    Alert.alert(
      'Reopen Event',
      'Are you sure you want to reopen this event? It will become active again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reopen', 
          style: 'default',
          onPress: async () => {
            const success = await reopenEvent(eventId);
            if (success) {
              loadPastEvents();
            }
          }
        }
      ]
    );
  };

  const handleViewLeaderboard = (eventId: string) => {
    router.push(`/(home)/events/leaderboard?eventId=${eventId}`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading past events...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4ECDC4"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Past Events</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{events.length}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {events.reduce((sum, e) => sum + (e.participant_count || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Participants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {events.reduce((sum, e) => sum + (e.total_energy || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total GP</Text>
          </View>
        </View>

        {/* Events List */}
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>No past events yet</Text>
            <Text style={styles.emptySubtext}>
              Ended events will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <View key={event.event_id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View>
                    <Text style={styles.eventName}>
                      {event.name || event.short_code}
                    </Text>
                    <Text style={styles.eventDate}>
                      Ended {new Date(event.ended_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.eventBadge}>
                    <Text style={styles.badgeText}>Ended</Text>
                  </View>
                </View>

                <View style={styles.eventStats}>
                  <View style={styles.eventStat}>
                    <Ionicons name="people-outline" size={16} color="#666" />
                    <Text style={styles.eventStatText}>
                      {event.participant_count || 0} participants
                    </Text>
                  </View>
                  <View style={styles.eventStat}>
                    <Ionicons name="flash-outline" size={16} color="#666" />
                    <Text style={styles.eventStatText}>
                      {event.total_energy || 0} GP earned
                    </Text>
                  </View>
                </View>

                <View style={styles.eventActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewLeaderboard(event.event_id)}
                  >
                    <Ionicons name="trophy-outline" size={18} color="#FFD700" />
                    <Text style={styles.actionButtonText}>View Results</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.reopenButton]}
                    onPress={() => handleReopenEvent(event.event_id)}
                  >
                    <Ionicons name="play-outline" size={18} color="#4ECDC4" />
                    <Text style={[styles.actionButtonText, styles.reopenButtonText]}>
                      Reopen
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f1823',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#4ECDC4',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 15,
  },
  eventsList: {
    gap: 15,
  },
  eventCard: {
    backgroundColor: '#0f1823',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a2834',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  eventBadge: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  eventStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventStatText: {
    color: '#999',
    fontSize: 13,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  actionButtonText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  reopenButton: {
    backgroundColor: 'rgba(78,205,196,0.1)',
    borderColor: 'rgba(78,205,196,0.2)',
  },
  reopenButtonText: {
    color: '#4ECDC4',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});