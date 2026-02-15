# Setup Guide

## Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "music-streaming-app")
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Services

#### Authentication
1. In Firebase Console, go to "Authentication" > "Sign-in method"
2. Click "Email/Password"
3. Enable "Email/Password" provider
4. Click "Save"

#### Firestore Database
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

#### Storage
1. Go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode" (for development)
4. Select a location
5. Click "Done"

### 3. Get Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > "Web"
4. Enter app nickname (e.g., "music-streaming-web")
5. Click "Register app"
6. Copy the configuration object

### 4. Update Configuration Files

#### Update `lib/firebase.ts`
Replace the placeholder configuration with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

#### Create `.env.local`
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 5. Firestore Security Rules

Update your Firestore security rules in Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own playlists
    match /playlists/{playlistId} {
      allow read, write: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || resource.data.isPublic == true);
    }
    
    // Users can read/write their own favorites
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Users can read/write their own history
    match /history/{historyId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Users can read/write their own library
    match /library/{libraryId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 6. Storage Security Rules

Update your Storage security rules in Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Music API Configuration

The application is pre-configured to use the music API at `http://102.212.179.119:3000`. No additional configuration is needed for the music API.

## Testing the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Try to sign up with a new account

4. Check Firebase Console to see if the user was created

5. Try creating a playlist

6. Check Firestore to see if the playlist was saved

## Troubleshooting

### Common Issues

1. **Firebase not initialized**
   - Check that your Firebase config is correct
   - Ensure `.env.local` file exists and has correct values
   - Restart the development server after changing environment variables

2. **Authentication not working**
   - Verify Email/Password provider is enabled in Firebase Console
   - Check browser console for error messages
   - Ensure Firebase project is in the correct region

3. **Firestore permission denied**
   - Check Firestore security rules
   - Ensure rules allow authenticated users to read/write
   - Verify user is properly authenticated

4. **Music API not working**
   - Check if the API endpoint is accessible
   - Verify network connectivity
   - Check browser console for CORS errors

### Debug Mode

Enable debug logging by adding this to your browser console:

```javascript
localStorage.setItem('debug', 'firebase:*')
```

Then refresh the page to see detailed Firebase logs.

## Next Steps

After successful setup:

1. **Customize the UI**: Modify colors, fonts, and layouts
2. **Add more features**: Implement additional music player controls
3. **Deploy to production**: Use Vercel, Netlify, or Firebase Hosting
4. **Add analytics**: Integrate Firebase Analytics
5. **Implement caching**: Add service worker for offline support


