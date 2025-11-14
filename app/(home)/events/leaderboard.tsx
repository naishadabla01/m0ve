// app/(home)/events/leaderboard.tsx
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  energy: number;
  rank: number;
};

type EventDetails = {
  event_id: string;
  name: string;
  short_code: string;
  status: string;
  ended_at: string;
  created_by: string;
};

export default function EventLeaderboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  async function loadEventData() {
    try {
      setLoading(true);
      setError(null);

      // Load event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Load leaderboard
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          user_id,
         energy,
    profiles (display_name)
  `)
  .eq('event_id', eventId)
  .order('energy', { ascending: false });

if (scoresError) throw scoresError;

// Format leaderboard data - Fixed type access
const formattedLeaderboard = (scoresData || []).map((score: any, index) => ({
  user_id: score.user_id,
  display_name: score.profiles?.display_name || 'Anonymous',
  energy: score.energy || 0,
  rank: index + 1,
}));

setLeaderboard(formattedLeaderboard);
    } catch (err: any) {
      console.error('Error loading event data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderPodium = () => {
    const top3 = leaderboard.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    
    return (
      <View style={styles.podiumRow}>
  {/* Reorder manually - Silver, Gold, Bronze */}
  {top3[1] && (
    <View style={styles.podiumItem}>
      {/* Silver content stays same */}
    </View>
  )}
  
  {top3[0] && (
    <View style={styles.podiumItem}>
      {/* Gold content stays same */}
    </View>
  )}
  
  {top3[2] && (
    <View style={styles.podiumItem}>
      {/* Bronze content stays same */}
    </View>
  )}
</View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEventData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.eventStatus}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
            <Text style={styles.concludedText}>Event Concluded</Text>
          </View>
          
          <Text style={styles.eventName}>
            {event?.name || event?.short_code || 'Event'}
          </Text>
          
          {event?.ended_at && (
            <Text style={styles.endedAt}>
              Ended {new Date(event.ended_at).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Podium */}
        {leaderboard.length > 0 && renderPodium()}

        {/* Full Leaderboard */}
        <View style={styles.leaderboardContainer}>
          <Text style={styles.sectionTitle}>Full Rankings</Text>
          
          {leaderboard.map((entry, index) => (
            <View key={entry.user_id} style={styles.leaderboardItem}>
              <View style={styles.rankContainer}>
                <Text style={[
                  styles.rankText,
                  index === 0 && styles.goldText,
                  index === 1 && styles.silverText,
                  index === 2 && styles.bronzeText,
                ]}>
                  #{entry.rank}
                </Text>
              </View>
              
              <Text style={styles.userName}>{entry.display_name}</Text>
              
              <Text style={styles.userEnergy}>{entry.energy} GP</Text>
            </View>
          ))}
          
          {leaderboard.length === 0 && (
            <Text style={styles.noDataText}>No participants yet</Text>
          )}
        </View>

        {/* Return Button */}
        <TouchableOpacity 
          style={styles.returnButton}
          onPress={() => router.replace('/(home)')}
        >
          <Text style={styles.returnButtonText}>Return to Home</Text>
        </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: {
    color: '#000',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  eventStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  concludedText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  eventName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  endedAt: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  podiumContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 200,
  },
  podiumItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
   firstPlace: {
    // Remove order property
  },
  secondPlace: {
    // Remove order property
  },
  thirdPlace: {
    // Remove order property
  },
  medal: {
    fontSize: 40,
    marginBottom: 10,
  },
  goldMedal: {
    fontSize: 50,
  },
  podiumPillar: {
    backgroundColor: '#1a2634',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#2a3644',
  },
  goldPillar: {
    backgroundColor: '#2a2410',
    borderColor: '#FFD700',
    minHeight: 140,
  },
  podiumRank: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  podiumName: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  podiumEnergy: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  goldText: {
    color: '#FFD700',
  },
  silverText: {
    color: '#C0C0C0',
  },
  bronzeText: {
    color: '#CD7F32',
  },
  leaderboardContainer: {
    backgroundColor: '#0f1823',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  rankContainer: {
    width: 50,
  },
  rankText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  userEnergy: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  returnButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});