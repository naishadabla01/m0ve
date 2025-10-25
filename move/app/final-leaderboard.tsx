// PATH: move/app/final-leaderboard.tsx
import FinalLeaderboard from '@/../src/screens/FinalLeaderboard';
import { useLocalSearchParams } from 'expo-router';

export default function FinalLeaderboardRoute() {
  const params = useLocalSearchParams() as any;

  // Normalize params so your screen can use route.params.*
  const event = typeof params.event === 'string' ? JSON.parse(params.event) : params.event;
  const top10 = typeof params.top10 === 'string' ? JSON.parse(params.top10) : params.top10;
  const message = params.message ?? 'Event has concluded';

  // Pass a React Navigation-like shape if your screen expects route.params
  return <FinalLeaderboard route={{ params: { event, top10, message } }} />;
}
