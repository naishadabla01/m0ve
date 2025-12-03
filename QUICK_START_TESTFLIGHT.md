# Quick Start: Deploy to TestFlight

Everything is ready! Follow these steps when you get Apple Developer access.

## ✅ What's Already Done

- [x] EAS CLI installed (v16.27.0)
- [x] Logged in as: naishadabla
- [x] App icons and splash screen ready
- [x] app.json configured for iOS
- [x] eas.json configured for deployment
- [x] Bundle ID: com.naishadabla.move
- [x] EAS Project ID: 96370249-284e-417e-bb0e-4b1aacaaa305

## 🚀 3 Steps to TestFlight (When You Get Apple Access)

### Step 1: Get Your Credentials (10 minutes)

**A. Get Team ID:**
1. Go to https://developer.apple.com/account/
2. Look for "Team ID" (e.g., ABC123XYZ)
3. Copy it

**B. Create App in App Store Connect:**
1. Go to https://appstoreconnect.apple.com/
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: Move
   - Bundle ID: com.naishadabla.move
   - SKU: move-app-001
4. Click **Create**
5. Copy the **App ID** from the URL (10-digit number)

### Step 2: Update eas.json (2 minutes)

Open `/Users/gyanendra/m0ve/m0ve/eas.json` and update line 40-42:

```json
"ios": {
  "appleId": "your-email@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABC123XYZ"
}
```

**Replace with YOUR values:**
- `appleId`: Your Apple ID email
- `ascAppId`: The 10-digit App ID from App Store Connect
- `appleTeamId`: Your Team ID from developer.apple.com

**Save the file.**

### Step 3: Build and Submit (20 minutes)

```bash
# Navigate to project
cd /Users/gyanendra/m0ve/m0ve

# Build for iOS (takes ~15 minutes)
eas build --profile production --platform ios

# After build finishes, submit to TestFlight (takes ~5 minutes)
eas submit --platform ios
```

**That's it!** Your app will appear in TestFlight in 30-60 minutes.

## 📱 Install and Test

**On your iPhone:**

1. Download **TestFlight** from App Store
2. Open TestFlight
3. See "Move" app appear (wait 30-60 min after submit)
4. Tap **Install**
5. Test the app!

## 🐛 Found Bugs? Deploy Fix

```bash
# Make your code changes
git add .
git commit -m "Fix: description of bug fix"
git push

# Build new version
eas build --profile production --platform ios

# Submit to TestFlight
eas submit --platform ios
```

Build numbers auto-increment (1 → 2 → 3), so you can submit multiple times.

## 📊 Monitor Your Build

**Watch build progress:**
- Terminal shows real-time status
- Or visit: https://expo.dev/accounts/naishadabla/projects/move/builds

**Build statuses:**
- 🟡 In Queue → Waiting for build server
- 🔵 In Progress → Building now (~15 min)
- 🟢 Finished → Build complete! Ready to submit
- 🔴 Failed → Check logs, fix issues, rebuild

## 🔧 Troubleshooting

### "No bundle identifier found"
**Fix:** Make sure you created the app in App Store Connect first (Step 1B).

### "Invalid Team ID"
**Fix:** Double-check Team ID from https://developer.apple.com/account/

### "Provisioning profile error"
**Fix:**
```bash
eas build --profile production --platform ios --clear-cache
```

### Build takes too long (>30 min)
**Fix:** Builds might be queued. Check https://expo.dev/ for queue status.

## 📋 Deployment Checklist

Before your first build:
- [ ] Apple Developer account activated
- [ ] Team ID obtained
- [ ] App created in App Store Connect
- [ ] App ID obtained
- [ ] eas.json updated with credentials
- [ ] Changes committed and pushed to git

After build completes:
- [ ] Submitted to TestFlight
- [ ] TestFlight app installed on iPhone
- [ ] App tested on device
- [ ] Bugs documented
- [ ] Fixes deployed

## 💡 Pro Tips

**Tip 1: Use App-Specific Password**
When `eas submit` asks for password, use an app-specific password:
1. Go to https://appleid.apple.com/
2. Security → App-Specific Passwords
3. Generate new password for "EAS Submit"
4. Use that password (not your regular Apple password)

**Tip 2: Test Early, Test Often**
Don't wait for "perfection" - deploy to TestFlight early:
- First build: Just get it working
- Second build: Fix critical bugs
- Third build: Polish UI/UX
- Fourth+ builds: Add features

**Tip 3: Keep Version 1.0.0 for TestFlight**
Only bump version (1.0.0 → 1.1.0) when releasing to App Store.
Build numbers auto-increment for each TestFlight build.

**Tip 4: Parallel Testing**
While testing on TestFlight, continue developing:
- Make changes in feature branches
- Test locally with Expo Go
- When ready, merge and deploy new TestFlight build

## 🎯 Today's Commands

**When you get your Apple Developer access:**

```bash
# 1. Update eas.json with your credentials (use text editor)

# 2. Build iOS app
cd /Users/gyanendra/m0ve/m0ve
eas build --profile production --platform ios

# 3. Submit to TestFlight (after build finishes)
eas submit --platform ios

# 4. Check build status
eas build:list
```

**Expected timeline:**
- Build: 15 minutes
- Submit: 5 minutes
- TestFlight processing: 30-60 minutes
- **Total: ~1 hour from build to testable**

## 📞 Need Help?

**For detailed guide:** See `DEPLOYMENT_STEPS.md`

**For cross-platform info:** See `CROSS_PLATFORM_DEPLOYMENT.md`

**Check build status:** https://expo.dev/

**EAS docs:** https://docs.expo.dev/build/introduction/

---

**Ready to deploy!** Just waiting for your Apple Developer credentials. 🚀
