# Recent Changes - November 29, 2025

## Navigation & Modal Flow Improvements

### Issue Resolved
Fixed the "joined event modal not showing" issue when users navigate back from the Movement Screen to the Home Screen.

### Root Cause
- iOS gesture navigation (swipe from left edge) bypassed custom back button logic
- The `shouldShowEventDetails` flag was only being set when using the on-screen back button
- React Native's `BackHandler` only works for Android hardware back buttons, not iOS gestures

### Solution Implemented

#### 1. **Disabled iOS Gesture Navigation on Movement Screen**
- **File**: `app/move.tsx`
- **Change**: Added `gestureEnabled: false` to screen options
- **Effect**: Users can no longer swipe back; they must use the visible back button

```typescript
<Stack.Screen
  options={{
    headerShown: false,
    gestureEnabled: false, // Disable swipe back gesture
    animation: 'slide_from_right',
  }}
/>
```

#### 2. **Enhanced Back Button (iOS-Style)**
- **File**: `app/move.tsx` (lines 643-690)
- **Changes**:
  - Made button more prominent and visible
  - Added "Home" text next to chevron icon
  - Increased hit area for easier tapping
  - Styled to match iOS design patterns

```typescript
<Pressable onPress={handleBackPress} ...>
  <Ionicons name="chevron-back" size={32} color={purple} />
  <Text>Home</Text>
</Pressable>
```

#### 3. **Set Flag at Source (All Join Flows)**
Instead of setting the flag when backing out, we now set it when joining:

- **event-join.tsx** (QR scan flow) - Line 121
- **JoinEventModal.tsx** (manual code entry) - Line 160
- **EventDetailsModal.tsx** (Live Events Nearby) - Line 998

```typescript
await AsyncStorage.setItem("shouldShowEventDetails", "true");
```

#### 4. **Added useFocusEffect Hook**
- **File**: `app/(home)/index.tsx` (lines 144-163)
- **Purpose**: Detects when home screen comes into focus
- **Effect**: Checks for flag and activeEvent, shows modal automatically

```typescript
useFocusEffect(
  useCallback(() => {
    const shouldShow = await AsyncStorage.getItem("shouldShowEventDetails");
    if (shouldShow === "true" && activeEvent) {
      setSelectedEventForDetails(activeEvent);
    }
  }, [activeEvent])
);
```

### Result
✅ Modal now shows correctly when returning from Movement Screen
✅ Works for all join methods (QR scan, manual code, Live Events)
✅ More intuitive UX with visible iOS-style back button
✅ No more reliance on gesture navigation

---

## Code Organization & Refactoring

### Home Screen Modularization
Reduced `app/(home)/index.tsx` from **3,168 lines** to **~726 lines** by extracting components.

### New Component Structure

```
app/(home)/
├── index.tsx (main home screen - ~726 lines)
├── types.ts (shared TypeScript interfaces)
└── components/
    ├── EventListSection.tsx (~650 lines)
    ├── JoinEventModal.tsx (~493 lines)
    ├── EventDetailsModal.tsx (~1,070 lines)
    ├── OngoingEventsComponent.tsx (~21 lines)
    ├── PastEventsComponent.tsx (~21 lines)
    └── LiveEventCard.tsx (~221 lines)
```

### Extracted Components

#### 1. **EventListSection.tsx**
- Horizontal scrolling event list with pagination
- "All Events" modal with back button
- Handles both ongoing and past events
- **Lines**: 650

#### 2. **JoinEventModal.tsx**
- Modal for joining events via QR or code
- Includes "Scan QR Code" and "Enter Event Code" options
- Shows "Live Events Nearby" section
- **Lines**: 493

#### 3. **EventDetailsModal.tsx**
- Full-screen modal showing event details
- Displays event info grid (location, code, times)
- Shows event stats (total energy, participant count)
- Includes top 10 leaderboard
- Optional JOIN button for live events
- **Lines**: 1,070

#### 4. **OngoingEventsComponent.tsx**
- Wrapper for ongoing events section
- **Lines**: 21

#### 5. **PastEventsComponent.tsx**
- Wrapper for past events section
- **Lines**: 21

#### 6. **LiveEventCard.tsx**
- Card component for live events in carousel
- Shows cover image, live indicator, event details
- Opens EventDetailsModal on press
- **Lines**: 221

### Benefits
✅ Easier to maintain and debug
✅ Better code organization
✅ Reusable components
✅ Faster development for future features
✅ Improved IDE performance

---

## Bug Fixes

### 1. **Fixed Modal Alignment Issue (All Ongoing Events)**
- **File**: `app/(home)/components/EventListSection.tsx` (line 496)
- **Issue**: Modal content sometimes shifted up when opening
- **Cause**: SafeAreaView's 'top' edge had inconsistent behavior inside modals
- **Fix**: Changed `edges={['top', 'left', 'right', 'bottom']}` to `edges={['bottom']}` and added fixed `paddingTop: 60`

```typescript
<SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
  <View style={{ paddingTop: 60 }}>
    {/* Modal content */}
  </View>
</SafeAreaView>
```

### 2. **Fixed Leaderboard Navigation**
- **File**: `app/move.tsx` (line 443)
- **Issue**: "View Leaderboard" button opened camera scanner
- **Cause**: Incorrect route path `"/(home)/leaderboard"` didn't exist
- **Fix**: Changed to `"/leaderboard"` (correct path)

```typescript
router.push({
  pathname: "/leaderboard", // Fixed from "/(home)/leaderboard"
  params: { event_id: eventId! },
});
```

---

## Navigation Flow Summary

### QR Scan → Join → Movement → Back Flow
```
1. User on Home Screen
2. Scan QR → event-join.tsx
   - Sets flag: shouldShowEventDetails = true
   - Saves event_id to AsyncStorage
   - Navigates to /move
3. User on Movement Screen
4. Taps "← Home" button
   - Sets flag: shouldShowEventDetails = true (backup)
   - Navigates to /(home) with router.replace
5. Home Screen
   - useFocusEffect detects screen focus
   - Checks flag and activeEvent
   - Shows EventDetailsModal ✅
```

### Code Entry → Join → Movement → Back Flow
```
1. User on Home Screen
2. "Enter the Experience" → JoinEventModal
3. Enter code → Join
   - Sets flag: shouldShowEventDetails = true
   - Saves event_id to AsyncStorage
   - Navigates to /move
4. User on Movement Screen
5. Taps "← Home" button
   - Sets flag: shouldShowEventDetails = true (backup)
   - Navigates to /(home)
6. Home Screen
   - Shows EventDetailsModal ✅
```

### Live Events → Join → Movement → Back Flow
```
1. User on Home Screen
2. "Enter the Experience" → "Live Events Nearby"
3. Tap event card → EventDetailsModal
4. Tap "Join Event"
   - Sets flag: shouldShowEventDetails = true
   - Saves event_id to AsyncStorage
   - Navigates to /move
5. User on Movement Screen
6. Taps "← Home" button
   - Sets flag: shouldShowEventDetails = true (backup)
   - Navigates to /(home)
7. Home Screen
   - Shows EventDetailsModal ✅
```

---

## Technical Implementation Details

### AsyncStorage Flags Used
- `event_id`: Stores currently joined event ID
- `shouldShowEventDetails`: Flag to trigger modal display
- `navigating_to_move`: Temporary flag (cleaned up on mount)

### Key Design Decisions

1. **Flag at Source, Not Destination**
   - Setting flag when joining (source) is more reliable than when backing (destination)
   - Ensures flag is set regardless of navigation method

2. **useFocusEffect Over useEffect**
   - useFocusEffect runs every time screen comes into focus
   - useEffect only runs on mount and when dependencies change
   - Critical for handling navigation back

3. **Disable Gesture Instead of Intercepting**
   - Simpler and more reliable than trying to intercept gestures
   - Better UX with visible, tappable button
   - Consistent behavior across all scenarios

4. **Component Extraction Best Practices**
   - Named exports for components (not default)
   - Shared types in separate types.ts file
   - Clear prop interfaces with TypeScript
   - Minimal props, maximum reusability

---

## Files Modified

### Major Changes
1. `app/move.tsx` - Added gesture disable, enhanced back button
2. `app/(home)/index.tsx` - Added useFocusEffect, extracted components
3. `app/event-join.tsx` - Set flag before navigation
4. `app/(home)/components/JoinEventModal.tsx` - Set flag before navigation (NEW)
5. `app/(home)/components/EventDetailsModal.tsx` - Set flag before navigation (NEW)
6. `app/(home)/components/EventListSection.tsx` - Fixed modal alignment (NEW)
7. `app/(home)/components/OngoingEventsComponent.tsx` - Extracted component (NEW)
8. `app/(home)/components/PastEventsComponent.tsx` - Extracted component (NEW)
9. `app/(home)/components/LiveEventCard.tsx` - Extracted component (NEW)
10. `app/(home)/types.ts` - Shared Event interface (NEW)

### Lines of Code Impact
- **Before**: index.tsx = 3,168 lines
- **After**: index.tsx = 726 lines + 6 component files
- **Net Change**: More organized, same functionality

---

## Testing Checklist

- [x] QR scan → join → movement → back shows modal
- [x] Manual code → join → movement → back shows modal
- [x] Live Events → join → movement → back shows modal
- [x] Swipe back gesture is disabled on Movement Screen
- [x] Back button works and shows modal
- [x] Leaderboard button opens correct page
- [x] All Ongoing Events modal has correct alignment
- [x] Component extraction doesn't break any flows

---

## Future Recommendations

1. **Consider Similar Pattern for Other Screens**
   - Movement Screen could be refactored similarly
   - Leaderboard could be componentized

2. **Add TypeScript Strict Mode**
   - Current types work but could be stricter
   - Consider adding Zod for runtime validation

3. **Centralize Navigation Logic**
   - Create a navigation utilities file
   - Standardize route names as constants

4. **Add E2E Tests**
   - Test critical flows (QR → join → back)
   - Ensure modals appear correctly

5. **Consider State Management Library**
   - Current AsyncStorage + useState works but could be cleaner
   - Zustand or Jotai would simplify cross-screen state

---

## Notes

- All changes maintain backward compatibility
- No database schema changes required
- No new dependencies added
- Works on both iOS and Android
- Tested on iOS simulator and physical device
