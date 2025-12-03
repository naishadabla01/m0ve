# Move App - TestFlight Deployment Steps

Follow these steps once your Apple Developer account is activated.

## ✅ Prerequisites Completed
- [x] App configured for iOS deployment
- [x] App icons and splash screen ready
- [x] Bundle identifier set: `com.naishadabla.move`
- [x] EAS project configured

## 📋 Steps to Deploy

### Step 1: Apple Developer Account Setup (Do This First)

**When you get access to your Apple Developer account:**

1. **Accept Agreements**
   - Go to https://developer.apple.com/account/
   - Click **Program License Agreement**
   - Accept all agreements

2. **Get Your Team ID**
   - Go to https://developer.apple.com/account/
   - Look for **Team ID** (e.g., `ABCD123456`)
   - **SAVE THIS** - you'll need it for eas.json

### Step 2: Create App in App Store Connect (30 minutes)

1. **Go to App Store Connect**
   - https://appstoreconnect.apple.com/

2. **Click "My Apps" → "+" → "New App"**

3. **Fill in App Information:**
   ```
   Platform: iOS
   Name: Move
   Primary Language: English (U.S.)
   Bundle ID: com.naishadabla.move (select from dropdown)
   SKU: move-app-001
   User Access: Full Access
   ```

4. **Click "Create"**

5. **Get Your App ID**
   - In App Store Connect, open your app
   - Look at the URL: https://appstoreconnect.apple.com/apps/{APP_ID}/...
   - **SAVE THIS APP_ID** (it's a 10-digit number)

### Step 3: Update EAS Configuration (5 minutes)

**Run this on your Mac:**

```bash
cd /Users/gyanendra/m0ve/m0ve

# Open eas.json and update the submit section
```

**Update eas.json with your credentials:**
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "YOUR_APPLE_ID_EMAIL@example.com",
      "ascAppId": "1234567890",  # Replace with your App ID from Step 2
      "appleTeamId": "ABCD123456"  # Replace with your Team ID from Step 1
    },
    "android": {
      "serviceAccountKeyPath": "./google-play-service-account.json",
      "track": "internal"
    }
  }
}
```

**Example with real values:**
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "naisha@example.com",
      "ascAppId": "6738291045",
      "appleTeamId": "X8Z2K3L9P4"
    },
    ...
  }
}
```

### Step 4: Build the App (15 minutes)

**Run in terminal:**

```bash
cd /Users/gyanendra/m0ve/m0ve

# Login to EAS (if not already logged in)
eas login

# Build for iOS production
eas build --profile production --platform ios
```

**What happens:**
- EAS uploads your code to cloud servers
- Build takes 10-15 minutes
- You'll get a link to track progress
- When done, you'll see "Build finished"

**Monitor build:**
```bash
# Or visit https://expo.dev/accounts/[your-account]/projects/move/builds
```

### Step 5: Submit to TestFlight (5 minutes)

**After build completes:**

```bash
# Submit to TestFlight
eas submit --platform ios

# You'll be asked:
# - Select the build to submit (choose the one you just created)
# - Enter your Apple ID password or use app-specific password
```

**App-Specific Password (Recommended):**
1. Go to https://appleid.apple.com/
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **+** to generate new password
5. Name it "EAS Submit"
6. Copy the password
7. Use this password when EAS asks

### Step 6: Wait for TestFlight Processing (30-60 minutes)

**After submission:**
1. Go to App Store Connect → TestFlight
2. You'll see your build appear (5-10 minutes)
3. Status will be "Processing" (30-60 minutes)
4. When ready, status changes to "Ready to Test"

**During processing, fill out these sections:**

**App Information:**
- Subtitle: "Move to the Music"
- Category: Music, Health & Fitness
- Content Rights: Check if you have all rights

**Test Information:**
- Beta App Description: "Move is a live event experience app that tracks your movement and connects you with artists."
- Feedback Email: your-email@example.com
- What to Test: "Test motion tracking, QR code scanning, and video calls during live events."

### Step 7: Add TestFlight Testers

**Internal Testing (Up to 100 testers):**

1. In App Store Connect → TestFlight
2. Click **Internal Testing**
3. Click **+** to add testers
4. Enter email addresses
5. They'll get an invite email

**External Testing (Unlimited testers - requires Apple review):**

1. Click **External Testing**
2. Create a new group
3. Add testers via email or public link
4. Submit for Beta App Review (1-2 days)

### Step 8: Install TestFlight App and Test

**On your iPhone:**

1. Download **TestFlight** from App Store
2. Open invite email
3. Tap "View in TestFlight"
4. Install Move app
5. Test all features

**Test Checklist:**
- [ ] App launches successfully
- [ ] Can scan QR codes
- [ ] Motion tracking starts
- [ ] Video calls work
- [ ] App doesn't crash

### Step 9: Fix Bugs and Resubmit

**If you find bugs:**

```bash
# Make your code changes
git add .
git commit -m "Fix: [bug description]"
git push

# Build new version
eas build --profile production --platform ios

# Submit to TestFlight again
eas submit --platform ios
```

**Version numbers:**
- Keep version "1.0.0" for all TestFlight builds
- Build number auto-increments (1, 2, 3, etc.)

### Step 10: Production Release (When Ready)

**When app is stable and tested:**

1. Go to App Store Connect → Your App
2. Click **+** (version) → **1.0.0**
3. Fill out all required info:
   - Screenshots (at least 3)
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
4. Select your TestFlight build
5. Click **Submit for Review**
6. Wait 1-7 days for approval
7. Release to App Store!

## 🚨 Common Issues

### "No valid provisioning profile found"

**Fix:**
```bash
# Clear certificates and try again
eas build --profile production --platform ios --clear-cache
```

### "Bundle identifier is not registered"

**Fix:**
- Go to https://developer.apple.com/account/resources/identifiers/
- Click **+** to register bundle ID
- Enter `com.naishadabla.move`
- Select capabilities needed (Push Notifications, etc.)

### "Apple ID or password incorrect"

**Fix:**
- Use app-specific password (see Step 5)
- Don't use your regular Apple ID password

### "Build failed"

**Check:**
```bash
# View build logs
eas build:list

# Click on the failed build to see logs
```

Common causes:
- Missing assets
- Invalid permissions
- Code syntax errors

## 📊 Quick Reference

**Important URLs:**
- Apple Developer: https://developer.apple.com/account/
- App Store Connect: https://appstoreconnect.apple.com/
- EAS Builds: https://expo.dev/
- TestFlight: App Store (on iPhone)

**Important Credentials:**
- Apple ID: [Your email]
- Team ID: [From developer.apple.com]
- App ID: [From App Store Connect]
- Bundle ID: `com.naishadabla.move`

**Commands:**
```bash
# Build iOS
eas build --profile production --platform ios

# Submit to TestFlight
eas submit --platform ios

# View builds
eas build:list

# Cancel build
eas build:cancel

# Login to EAS
eas login
```

## ⏱️ Timeline

**First Build:**
- Apple account setup: 10 minutes
- App Store Connect setup: 30 minutes
- Update eas.json: 5 minutes
- Build app: 15 minutes
- Submit to TestFlight: 5 minutes
- **Total: ~1 hour**

**Testing Phase:**
- TestFlight processing: 30-60 minutes
- Internal testing: Ongoing
- Bug fixes + rebuilds: As needed

**Production Release:**
- Final build: 15 minutes
- App Store metadata: 1-2 hours
- Submit for review: 5 minutes
- Apple review: 1-7 days
- **Total: ~1 week**

## 🎯 Today's Goal

**Your immediate tasks:**

1. ✅ Wait for Apple Developer account access
2. ✅ Get Team ID and save it
3. ✅ Create app in App Store Connect
4. ✅ Get App ID and save it
5. ✅ Update eas.json with your credentials
6. ✅ Run first build: `eas build --profile production --platform ios`
7. ✅ Submit to TestFlight: `eas submit --platform ios`
8. ✅ Install TestFlight and test
9. ✅ Report any bugs

**Once you have your Apple Developer access, message me with:**
- Your Team ID
- Your App Store Connect App ID

**Then run:**
```bash
cd /Users/gyanendra/m0ve/m0ve
eas build --profile production --platform ios
```

Good luck! 🚀
