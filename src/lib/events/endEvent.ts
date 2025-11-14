// src/lib/events/endEvent.ts
import { supabase } from '@/lib/supabase/client';
import { Alert } from 'react-native';

export async function endEvent(eventId: string): Promise<boolean> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'You must be logged in to end an event');
      return false;
    }

    // Verify the user owns this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by, name, status')
      .eq('event_id', eventId)
      .single();

    if (eventError) {
      Alert.alert('Error', 'Event not found');
      return false;
    }

    if (event.created_by !== user.id) {
      Alert.alert('Error', 'You can only end events you created');
      return false;
    }

    if (event.status === 'ended') {
      Alert.alert('Info', 'This event has already ended');
      return false;
    }

    // End the event
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('event_id', eventId);

    if (updateError) {
      Alert.alert('Error', 'Failed to end event');
      return false;
    }

    Alert.alert(
      'Event Ended',
      `"${event.name || 'Event'}" has been successfully ended. Participants can now view the final leaderboard.`,
      [{ text: 'OK' }]
    );

    return true;
  } catch (error: any) {
    console.error('Error ending event:', error);
    Alert.alert('Error', error.message || 'Failed to end event');
    return false;
  }
}

export async function reopenEvent(eventId: string): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Verify ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by, name, status')
      .eq('event_id', eventId)
      .single();

    if (eventError || event.created_by !== user.id) {
      Alert.alert('Error', 'You can only reopen events you created');
      return false;
    }

    if (event.status !== 'ended') {
      Alert.alert('Info', 'This event is not ended');
      return false;
    }

    // Reopen the event
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        status: 'ongoing',
        ended_at: null
      })
      .eq('event_id', eventId);

    if (updateError) {
      Alert.alert('Error', 'Failed to reopen event');
      return false;
    }

    Alert.alert('Event Reopened', `"${event.name || 'Event'}" is now active again`);
    return true;
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to reopen event');
    return false;
  }
}