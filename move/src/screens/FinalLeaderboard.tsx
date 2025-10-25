// PATH: move/src/screens/FinalLeaderboard.tsx
import { FlatList, Image, Text, View } from 'react-native';

export default function FinalLeaderboard({ route }: any) {
  const { event, top10, message = 'Event has concluded' } = route.params || {};
  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      {!!event?.cover_url && (
        <Image
          source={{ uri: event.cover_url }}
          style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
          resizeMode="cover"
        />
      )}
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{event?.title || 'Event'}</Text>
      <Text style={{ color: '#9ca3af', marginTop: 4 }}>{message}</Text>

      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16 }}>
        Top 10
      </Text>
      <FlatList
        data={top10 || []}
        keyExtractor={(item) => item.user_id + ':' + item.rank}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomColor: '#1f2937',
              borderBottomWidth: 1,
            }}
          >
            <Text style={{ color: '#a3e635', width: 28, fontWeight: '700' }}>{item.rank}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>{Number(item.score).toFixed(0)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
