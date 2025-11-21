// components/IncomingCallModalWrapper.tsx
// Wrapper to prevent LiveKit from loading on web
import React from 'react';
import { Platform } from 'react-native';

// Only import IncomingCallModal on native platforms
let IncomingCallModal: any = null;

if (Platform.OS !== 'web') {
  try {
    IncomingCallModal = require('./IncomingCallModal').IncomingCallModal;
  } catch (error) {
    console.error('❌ [IncomingCallModalWrapper] Failed to load IncomingCallModal:', error);
  }
}

// Memoize to prevent unnecessary re-renders
export const IncomingCallModalWrapper = React.memo(function IncomingCallModalWrapper() {
  // Don't render anything on web
  if (Platform.OS === 'web' || !IncomingCallModal) {
    return null;
  }

  return <IncomingCallModal />;
});
