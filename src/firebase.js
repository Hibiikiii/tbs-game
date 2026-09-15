import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  onValue,
  update,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Parcel inlines process.env.* from .env / CI secrets at build time
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

let authReady = null;

export function initializeAuth(onSuccess, onFailure) {
  if (!authReady) {
    authReady = signInAnonymously(auth)
      .then(() => {
        console.log('Signed in anonymously');
      })
      .catch((error) => {
        authReady = null;
        console.error('Error signing in anonymously:', error);
        throw error;
      });

    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User signed in:', user.uid);
      } else {
        console.log('User signed out');
      }
    });
  }

  authReady
    .then(() => onSuccess())
    .catch((error) => {
      if (onFailure) onFailure(error);
    });
}

async function waitForAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (authReady) {
    await authReady;
    return auth.currentUser;
  }
  return null;
}

async function addScore(username, score) {
  if (!username || username.length === 0) return;

  const user = await waitForAuth();
  if (!user) {
    console.error('Cannot add score: user is not authenticated');
    return;
  }

  const uid = user.uid;
  const userRef = ref(database, 'leaderboard/' + uid);

  try {
    const snapshot = await get(userRef);
    const existingData = snapshot.val();

    if (!existingData || score > existingData.score) {
      await update(userRef, {
        username,
        score,
        uid,
      });
      console.log('Score added/updated successfully');
    }
  } catch (error) {
    console.error('Error adding/updating score:', error);
  }
}

function getLeaderboard(callback) {
  const leaderboardQuery = query(
    ref(database, 'leaderboard'),
    orderByChild('score'),
    limitToLast(10)
  );

  onValue(leaderboardQuery, (snapshot) => {
    const scores = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (!data) return;
      scores.push({
        username: data.username,
        score: data.score,
        uid: childSnapshot.key,
      });
    });
    callback(scores.reverse());
  });
}

async function showHighscore(callback) {
  const user = auth.currentUser;
  if (!user) {
    console.error('User is not authenticated');
    if (callback) callback();
    return;
  }

  try {
    const snapshot = await get(ref(database, 'leaderboard/' + user.uid));
    const data = snapshot.val();
    const highscore = data?.score ?? 0;
    const el = document.getElementById('highscoreValue');
    if (el) el.textContent = String(highscore);
  } catch (error) {
    console.error('Error loading highscore:', error);
  }

  if (callback) callback();
}

async function getPersonalScore(username, callback) {
  const user = auth.currentUser;
  if (!user) {
    callback(0, '—');
    return;
  }

  const uid = user.uid;
  const userRef = ref(database, 'leaderboard/' + uid);

  try {
    const snapshot = await get(userRef);
    const data = snapshot.val();

    if (!data || data.username !== username) {
      callback(0, '—');
      return;
    }

    // Rank = 1 + number of players with a strictly higher score
    const allSnapshot = await get(ref(database, 'leaderboard'));
    let higherCount = 0;
    allSnapshot.forEach((child) => {
      const entry = child.val();
      if (entry && typeof entry.score === 'number' && entry.score > data.score) {
        higherCount += 1;
      }
    });

    callback(data.score, higherCount + 1);
  } catch (error) {
    console.error('Error fetching personal score:', error);
    callback(0, '—');
  }
}

export { addScore, getLeaderboard, showHighscore, getPersonalScore };
