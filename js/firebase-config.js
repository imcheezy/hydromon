/* Firebase project config for the optional shared leaderboard.
   Safe to commit to a public repo: this is a public client identifier, not
   a secret. Access control is enforced by Firestore Security Rules, not by
   hiding this file. See README.md → "Leaderboard setup" for how to get
   these values and what to paste where.

   Until every value below is filled in, the app runs exactly as it did
   before this file existed: the leaderboard tab shows a "not set up yet"
   message and nothing tries to reach Firebase. */
window.HYDROMON_FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
