// components/IncomingCallModalWrapper.tsx
// Wrapper to prevent LiveKit from loading on web
import { Platform } from 'react-native';

// Only import IncomingCallModal on native platforms
let IncomingCallModal: any = null;

if (Platform.OS !== 'web') {
  IncomingCallModal = require('./IncomingCallModal').IncomingCallModal;
}

export function IncomingCallModalWrapper() {
  // Don't render anything on web
  if (Platform.OS === 'web' || !IncomingCallModal) {
    return null;
  }

  return <IncomingCallModal />;
}
