import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import dotenv from 'dotenv';

// Configure dotenv to load the .env file
dotenv.config();

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export function initializeAuth(onSuccess, onFailure) {
  signInAnonymously(auth)
    .then(() => {
      console.log('Signed in anonymously');
      onSuccess();
    })
    .catch((error) => {
      console.error('Error signing in anonymously:', error);
      if (onFailure) {
        onFailure(error);
      }
    });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User signed in:', user.uid);
    } else {
      console.log('User signed out');
    }
  });
}


function addScore(username, score) {
  const user = auth.currentUser;
  if (user && username.length !== 0) {
    const uid = user.uid;
    const userRef = ref(database, 'leaderboard/' + uid);

    // Get the current data for the user
    get(userRef).then((snapshot) => {
      const existingData = snapshot.val();
      console.log('Existing data:', existingData); // Check what existing data is

      if (!existingData || score > existingData.score) {
        const scoreData = {
          username: username,
          score: score,
          uid: uid // Store the UID with the score data for easier lookup
        };

        console.log('Adding/updating score:', scoreData);
        // Update the database with the new score
        update(userRef, scoreData)
          .then(() => {
            console.log('Score added/updated successfully');
          })
          .catch((error) => {
            console.error('Error adding/updating score:', error);
          });
      }
    }).catch((error) => {
      console.error('Error fetching user data:', error);
    });
  }
}


function getLeaderboard(callback) {
  const leaderboardQuery = query(ref(database, 'leaderboard'), orderByChild('score'), limitToLast(10));
  onValue(leaderboardQuery, (snapshot) => {
    const scores = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const score = {
        username: data.username,
        score: data.score,
        uid: childSnapshot.key // Store the UID as well
      };
      scores.push(score);
    });
    callback(scores.reverse());
  });
}


function showHighscore(callback) {
  const user = auth.currentUser;
  if (user) {
    const uid = user.uid;
    const userRef = ref(database, 'leaderboard/' + uid);

    onValue(userRef, (snapshot) => {
      let highscore = 0;

      const data = snapshot.val();
      if (data) {
        highscore = data.score;
      }

      document.getElementById('highscoreValue').textContent = highscore;
      callback();
    }, { onlyOnce: true });
  } else {
    console.error('User is not authenticated');
    callback();
  }
}


function getPersonalScore(username, callback) {
  const user = auth.currentUser;
  if (user) {
    const uid = user.uid;
    const userRef = ref(database, 'leaderboard/' + uid);

    get(userRef).then((snapshot) => {
      const data = snapshot.val();
      if (data && data.username === username) {
        callback(data.score);
      } else {
        callback(0);
      }
    }).catch((error) => {
      console.error('Error fetching personal score:', error);
      callback(0);
    });
  } else {
    callback(0);
  }
}

export { addScore, getLeaderboard, showHighscore, getPersonalScore };
