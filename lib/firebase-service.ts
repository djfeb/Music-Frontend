import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from './firebase';

// Simple retry helper with exponential backoff for transient Firestore errors
async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
async function withRetry<T>(operation: () => Promise<T>, label: string, retries = 3, baseDelayMs = 500): Promise<T> {
  let attempt = 0
  let lastError: unknown
  while (attempt <= retries) {
    try {
      if (attempt > 0) {
        console.debug(`[Firestore][retry] Attempt ${attempt}/${retries} for`, label)
      }
      const result = await operation()
      if (attempt > 0) {
        console.debug(`[Firestore][retry] Succeeded after ${attempt} retries for`, label)
      }
      return result
    } catch (err: any) {
      lastError = err
      const code = err?.code as string | undefined
      const transient = code === 'unavailable' || code === 'deadline-exceeded' || code === 'internal' || code === 'resource-exhausted'
      if (!transient || attempt === retries) {
        console.error(`[Firestore][retry] Failed ${label}`, { attempt, code, err })
        throw err
      }
      const delay = baseDelayMs * Math.pow(2, attempt)
      await sleep(delay)
      attempt++
    }
  }
  throw lastError as any
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  contentPreferences?: {
    preferredContinents: string[];
    preferenceType: 'international' | 'local' | 'mixed';
    hasSetPreferences: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  tracks: string[]; // Track IDs
  isPublic: boolean;
  createdBy: string; // User UID
  createdAt: Date;
  updatedAt: Date;
  trackCount: number;
}

export interface UserFavorite {
  id: string;
  userId: string;
  trackId: string;
  addedAt: Date;
}

export interface UserHistory {
  id: string;
  userId: string;
  trackId: string;
  playedAt: Date;
}

export interface UserLibrary {
  id: string;
  userId: string;
  type: 'album' | 'artist' | 'playlist';
  itemId: string;
  addedAt: Date;
}

class FirebaseService {
  // Optional connectivity handler: toggles Firestore network based on browser online status
  initConnectivityHandling() {
    if (typeof window === 'undefined') return
    const apply = async () => {
      try {
        if (navigator.onLine) {
          console.debug('[Firestore][net] Enabling network (online)')
          await enableNetwork(db)
        } else {
          console.debug('[Firestore][net] Disabling network (offline)')
          await disableNetwork(db)
        }
      } catch (e) {
        console.warn('[Firestore][net] Failed to toggle network', e)
      }
    }
    window.addEventListener('online', apply)
    window.addEventListener('offline', apply)
    // Apply once on init
    apply()
  }

  // User Profile Management
  async createUserProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
    const userRef = doc(db, 'users', profile.uid);
    
    // Filter out undefined values to prevent Firebase errors
    const cleanProfile = Object.fromEntries(
      Object.entries(profile).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    await setDoc(userRef, {
      ...cleanProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await withRetry(() => getDoc(userRef), `getUserProfile(${uid})`);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }
    
    return null;
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  // Content Preferences Management
  async updateContentPreferences(uid: string, preferences: {
    preferredContinents: string[];
    preferenceType: 'international' | 'local' | 'mixed';
    hasSetPreferences: boolean;
  }): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      contentPreferences: preferences,
      updatedAt: serverTimestamp(),
    });
  }

  async getUserContentPreferences(uid: string): Promise<{
    preferredContinents: string[];
    preferenceType: 'international' | 'local' | 'mixed';
    hasSetPreferences: boolean;
  } | null> {
    const profile = await this.getUserProfile(uid);
    return profile?.contentPreferences || null;
  }

  // Playlist Management
  async createPlaylist(playlist: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Filter out undefined values to prevent Firebase errors
    const cleanPlaylist = Object.fromEntries(
      Object.entries(playlist).filter(([_, value]) => value !== undefined)
    );
    
    const playlistRef = await addDoc(collection(db, 'users', playlist.createdBy, 'playlists'), {
      ...cleanPlaylist,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return playlistRef.id;
  }

  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await withRetry(() => getDocs(usersRef), 'getPlaylist:users');
    
    for (const userDoc of usersSnapshot.docs) {
      const playlistsRef = collection(db, 'users', userDoc.id, 'playlists');
      const q = query(
        playlistsRef,
        where('__name__', '==', playlistId)
      );
      
      const playlistSnapshot = await withRetry(() => getDocs(q), `getPlaylist:${playlistId}`);
      if (!playlistSnapshot.empty) {
        const data = playlistSnapshot.docs[0].data();
        return {
          id: playlistSnapshot.docs[0].id,
          ...data,
          createdAt: (data as any).createdAt?.toDate() || new Date(),
          updatedAt: (data as any).updatedAt?.toDate() || new Date(),
        } as Playlist;
      }
    }
    
    return null;
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const playlistsRef = collection(db, 'users', userId, 'playlists');
    const q = query(
      playlistsRef,
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await withRetry(() => getDocs(q), `getUserPlaylists(${userId})`);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data as any).createdAt?.toDate() || new Date(),
        updatedAt: (data as any).updatedAt?.toDate() || new Date(),
      } as Playlist;
    });
  }

  async updatePlaylist(playlistId: string, updates: Partial<Playlist>): Promise<void> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) throw new Error('Playlist not found');
    
    const usersRef = collection(db, 'users');
    const usersSnapshot = await withRetry(() => getDocs(usersRef), 'updatePlaylist:users');
    
    for (const userDoc of usersSnapshot.docs) {
      const playlistRef = doc(db, 'users', userDoc.id, 'playlists', playlistId);
      const playlistSnap = await withRetry(() => getDoc(playlistRef), 'updatePlaylist:locate');
      
      if (playlistSnap.exists()) {
        await updateDoc(playlistRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        return;
      }
    }
    
    throw new Error('Playlist not found');
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await withRetry(() => getDocs(usersRef), 'deletePlaylist:users');
    
    for (const userDoc of usersSnapshot.docs) {
      const playlistRef = doc(db, 'users', userDoc.id, 'playlists', playlistId);
      const playlistSnap = await withRetry(() => getDoc(playlistRef), 'deletePlaylist:locate');
      
      if (playlistSnap.exists()) {
        await deleteDoc(playlistRef);
        return;
      }
    }
    
    throw new Error('Playlist not found');
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await withRetry(() => getDocs(usersRef), 'addTrackToPlaylist:users');
    
    for (const userDoc of usersSnapshot.docs) {
      const playlistRef = doc(db, 'users', userDoc.id, 'playlists', playlistId);
      const playlistSnap = await withRetry(() => getDoc(playlistRef), 'addTrackToPlaylist:locate');
      
      if (playlistSnap.exists()) {
        const playlist = playlistSnap.data() as Playlist;
        const updatedTracks = [...playlist.tracks, trackId];
        
        await updateDoc(playlistRef, {
          tracks: updatedTracks,
          trackCount: updatedTracks.length,
          updatedAt: serverTimestamp(),
        });
        return;
      }
    }
    
    throw new Error('Playlist not found');
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await withRetry(() => getDocs(usersRef), 'removeTrackFromPlaylist:users');
    
    for (const userDoc of usersSnapshot.docs) {
      const playlistRef = doc(db, 'users', userDoc.id, 'playlists', playlistId);
      const playlistSnap = await withRetry(() => getDoc(playlistRef), 'removeTrackFromPlaylist:locate');
      
      if (playlistSnap.exists()) {
        const playlist = playlistSnap.data() as Playlist;
        const updatedTracks = playlist.tracks.filter(id => id !== trackId);
        
        await updateDoc(playlistRef, {
          tracks: updatedTracks,
          trackCount: updatedTracks.length,
          updatedAt: serverTimestamp(),
        });
        return;
      }
    }
    
    throw new Error('Playlist not found');
  }

  // Favorites Management
  async addToFavorites(userId: string, trackId: string): Promise<void> {
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    await addDoc(favoritesRef, {
      trackId,
      addedAt: serverTimestamp(),
    });
  }

  async removeFromFavorites(userId: string, trackId: string): Promise<void> {
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    const q = query(
      favoritesRef,
      where('trackId', '==', trackId)
    );
    
    const querySnapshot = await withRetry(() => getDocs(q), `removeFromFavorites(${userId}, ${trackId})`);
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  async getUserFavorites(userId: string): Promise<string[]> {
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    const q = query(
      favoritesRef,
      orderBy('addedAt', 'desc')
    );
    
    const querySnapshot = await withRetry(() => getDocs(q), `getUserFavorites(${userId})`);
    return querySnapshot.docs.map(doc => doc.data().trackId);
  }

  async isTrackFavorited(userId: string, trackId: string): Promise<boolean> {
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    const q = query(
      favoritesRef,
      where('trackId', '==', trackId)
    );
    
    const querySnapshot = await withRetry(() => getDocs(q), `isTrackFavorited(${userId}, ${trackId})`);
    return !querySnapshot.empty;
  }

  // History Management
  async addToHistory(userId: string, trackId: string): Promise<void> {
    const historyRef = collection(db, 'users', userId, 'history');
    
    // Add the new history entry
    await addDoc(historyRef, {
      trackId,
      playedAt: serverTimestamp(),
    });
    
    // Check if we need to clean up old entries (keep only 50 most recent)
    const historyQuery = query(
      historyRef,
      orderBy('playedAt', 'desc')
    );
    
    const snapshot = await getDocs(historyQuery);
    
    // If we have more than 50 entries, delete the oldest ones
    if (snapshot.docs.length > 50) {
      const batch = writeBatch(db);
      const docsToDelete = snapshot.docs.slice(50); // Get all docs after the 50th
      
      docsToDelete.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.debug(`[FirebaseService] Cleaned up ${docsToDelete.length} old history entries for user ${userId}`);
    }
  }

  async getUserHistory(userId: string, limitCount: number = 50): Promise<string[]> {
    const historyRef = collection(db, 'users', userId, 'history');
    const qy = query(
      historyRef,
      orderBy('playedAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await withRetry(() => getDocs(qy), `getUserHistory(${userId})`);
    return querySnapshot.docs.map((d) => (d.data() as any).trackId);
  }

  // Library Management
  async addToLibrary(userId: string, type: 'album' | 'artist' | 'playlist', itemId: string): Promise<void> {
    const libraryRef = collection(db, 'users', userId, 'library');
    await addDoc(libraryRef, {
      type,
      itemId,
      addedAt: serverTimestamp(),
    });
  }

  async removeFromLibrary(userId: string, type: 'album' | 'artist' | 'playlist', itemId: string): Promise<void> {
    const libraryRef = collection(db, 'users', userId, 'library');
    const q = query(
      libraryRef,
      where('type', '==', type),
      where('itemId', '==', itemId)
    );
    
    const querySnapshot = await withRetry(() => getDocs(q), `removeFromLibrary(${userId}, ${type}, ${itemId})`);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async getUserLibrary(userId: string, type?: 'album' | 'artist' | 'playlist'): Promise<UserLibrary[]> {
    const libraryRef = collection(db, 'users', userId, 'library');
    
    let qRef;
    if (type) {
      qRef = query(libraryRef, where('type', '==', type));
    } else {
      qRef = query(libraryRef, orderBy('addedAt', 'desc'));
    }
    
    const querySnapshot = await withRetry(() => getDocs(qRef), `getUserLibrary(${userId}, ${type || 'all'})`);
    let results = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        addedAt: (data as any).addedAt?.toDate() || new Date(),
      } as UserLibrary;
    });
    
    if (type) {
      results.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
    }
    
    return results;
  }

  // Account Deletion - Remove all user data from Firestore
  async deleteUserAccount(uid: string): Promise<void> {
    const batch = writeBatch(db);
    
    try {
      console.log(`[FirebaseService] Starting complete account deletion for user: ${uid}`);
      
      // 1. Delete user profile (includes content preferences)
      const userRef = doc(db, 'users', uid);
      batch.delete(userRef);
      
      // 2. Delete all user playlists
      const playlistsRef = collection(db, 'users', uid, 'playlists');
      const playlistsSnapshot = await withRetry(() => getDocs(playlistsRef), `deleteUserAccount:playlists(${uid})`);
      playlistsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 3. Delete all user favorites
      const favoritesRef = collection(db, 'users', uid, 'favorites');
      const favoritesSnapshot = await withRetry(() => getDocs(favoritesRef), `deleteUserAccount:favorites(${uid})`);
      favoritesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 4. Delete all user listening history
      const historyRef = collection(db, 'users', uid, 'history');
      const historySnapshot = await withRetry(() => getDocs(historyRef), `deleteUserAccount:history(${uid})`);
      historySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 5. Delete all user library items (followed artists, liked albums)
      const libraryRef = collection(db, 'users', uid, 'library');
      const librarySnapshot = await withRetry(() => getDocs(libraryRef), `deleteUserAccount:library(${uid})`);
      librarySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Commit all Firestore deletions in a single batch
      await batch.commit();
      
      console.log(`[FirebaseService] Successfully deleted all Firestore data for user: ${uid}`);
      
    } catch (error) {
      console.error(`[FirebaseService] Error deleting user account data for ${uid}:`, error);
      throw new Error(`Failed to delete user account data: ${error}`);
    }
  }
}

export const firebaseService = new FirebaseService();

