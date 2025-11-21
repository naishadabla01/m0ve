// app/call.web.tsx - Placeholder for web (LiveKit doesn't work on web)
import { View, Text } from 'react-native';

export default function CallScreenWeb() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
      <Text style={{ color: '#fff', fontSize: 18 }}>
        Video calls are only available on mobile devices
      </Text>
    </View>
  );
}
