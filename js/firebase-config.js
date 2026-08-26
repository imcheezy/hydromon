/* Firebase project config for the optional shared leaderboard.
   Safe to commit to a public repo: this is a public client identifier, not
   a secret. Access control is enforced by Firestore Security Rules, not by
   hiding this file. See README.md → "Leaderboard setup" for how to get
   these values and what to paste where.

   Until every value below is filled in, the app runs exactly as it did
   before this file existed: the leaderboard tab shows a "not set up yet"
   message and nothing tries to reach Firebase. */
window.HYDROMON_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAUTon5pPEEuLr70w3oToQvf3bBn1rOCXw",
  authDomain: "cheezy-hydration.firebaseapp.com",
  projectId: "cheezy-hydration",
  storageBucket: "cheezy-hydration.firebasestorage.app",
  messagingSenderId: "221636563080",
  appId: "1:221636563080:web:5cf7da12880c1240a64f3d"
};
