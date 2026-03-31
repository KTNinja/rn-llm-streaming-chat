# Complete Setup Guide

This guide will help you set up and run the React Native LLM Streaming Chat project.

## Project Structure Note

This repository contains **only the JavaScript/TypeScript source code**. The native iOS and Android folders are not included in version control because:
- They contain large binary files and build artifacts
- They're platform-specific and can be regenerated
- They vary based on React Native version
- They reduce repository size significantly

You'll need to initialize these folders after cloning (see below).

## Prerequisites

### Required for All Platforms
- **Node.js** 18+ and npm
- **React Native CLI**: `npm install -g react-native-cli`
- **Watchman** (recommended): `brew install watchman` (macOS)

### For iOS Development (macOS only)
- **Xcode** 14+ (from App Store)
- **CocoaPods**: `sudo gem install cocoapods`
- **Xcode Command Line Tools**: `xcode-select --install`

### For Android Development
- **Android Studio** with:
  - Android SDK (API level 31+)
  - Android SDK Platform-Tools
  - Android SDK Build-Tools
  - Android Emulator (or physical device)
- **JDK** 11 or higher
- **Environment variables**:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

## Complete Setup Process

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rn-llm-streaming-chat
```

### 2. Install JavaScript Dependencies

```bash
npm install
```

### 3. Initialize Native Project Folders

**Option A: Using React Native CLI (Recommended)**

```bash
# Create a temporary React Native project to get the native folders
npx react-native init TempRNProject --skip-install --version 0.73.0

# Copy the native folders
cp -r TempRNProject/ios ./
cp -r TempRNProject/android ./

# Update package name in Android (optional but recommended)
# Edit android/app/src/main/AndroidManifest.xml
# Change package="com.temprnproject" to package="com.smoothstreamingllmchat"

# Clean up
rm -rf TempRNProject
```

**Option B: Manual Setup**

If you prefer, you can manually create the native projects:
- For iOS: Use Xcode to create a new app project
- For Android: Use Android Studio to create a new project
- Then link them with React Native following [official docs](https://reactnative.dev/docs/integration-with-existing-apps)

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

Required environment variables:
- `API_BASE_URL`: Your LLM API endpoint
- `API_KEY`: Your API authentication key

### 5. Android-Specific Setup

```bash
# Copy local.properties example
cp android/local.properties.example android/local.properties

# Edit android/local.properties
nano android/local.properties
```

Update `sdk.dir` to point to your Android SDK location:
- **macOS/Linux**: `/Users/YOUR_USERNAME/Library/Android/sdk`
- **Windows**: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`

### 6. iOS-Specific Setup (macOS only)

```bash
# Install CocoaPods dependencies
cd ios
pod install
cd ..
```

If you encounter issues:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

## Running the App

### Start Metro Bundler

In one terminal window:
```bash
npm start
# Or: npx react-native start
```

### Run on iOS (macOS only)

In another terminal:
```bash
npm run ios

# Or for a specific simulator:
npx react-native run-ios --simulator="iPhone 15 Pro"

# Or for a physical device:
npx react-native run-ios --device
```

### Run on Android

In another terminal:
```bash
npm run android

# Or for a specific device:
adb devices  # List connected devices
npx react-native run-android --deviceId=DEVICE_ID
```

## Troubleshooting

### iOS Issues

**Error: "Command PhaseScriptExecution failed"**
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

**Error: "No bundle URL present"**
```bash
# Reset Metro bundler
rm -rf /tmp/metro-*
npm start -- --reset-cache
```

### Android Issues

**Error: "SDK location not found"**
- Verify `android/local.properties` has correct `sdk.dir` path
- Check that `ANDROID_HOME` environment variable is set

**Error: "Execution failed for task ':app:installDebug'"**
```bash
cd android
./gradlew clean
cd ..
```

**Error: "Could not connect to development server"**
```bash
# Reverse ADB port
adb reverse tcp:8081 tcp:8081
```

### General Issues

**Metro bundler issues**
```bash
# Clear all caches
npm start -- --reset-cache
rm -rf node_modules
npm install
```

**Clean build**
```bash
# iOS
cd ios && xcodebuild clean && cd ..

# Android
cd android && ./gradlew clean && cd ..
```

## Verifying Your Setup

Run these commands to check your environment:

```bash
# Check Node version
node --version  # Should be 18+

# Check React Native setup
npx react-native doctor

# Check Android setup
adb version

# Check iOS setup (macOS only)
xcodebuild -version
pod --version
```

## What Gets Gitignored

These files/folders are intentionally excluded from version control:

- ✅ `node_modules/` - Install with `npm install`
- ✅ `ios/` - Generate in step 3
- ✅ `android/` - Generate in step 3 (except `android/local.properties.example`)
- ✅ `.env` - Create from `.env.example`
- ✅ Build artifacts (`build/`, `*.xcarchive`, etc.)
- ✅ IDE settings (`.vscode/`, `.idea/`)

## Next Steps

After successful setup:

1. **Configure your LLM endpoint** - Edit the API calls in [src/screens/ChatScreen.tsx](src/screens/ChatScreen.tsx)
2. **Test the connection** - Run the app and send a test message
3. **Customize styling** - Modify components in `src/components/`
4. **Review architecture** - Read [ARCHITECTURE.md](ARCHITECTURE.md) for implementation details

## Getting Help

- Check [README.md](README.md) for project overview
- Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- See [React Native Docs](https://reactnative.dev/docs/environment-setup) for environment setup
- Open an issue if you encounter problems

---

**Note:** This setup process ensures that each developer can work with the appropriate React Native version and native dependencies for their environment without forcing a specific native project configuration.
