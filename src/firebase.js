import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCjxROmM0KT-U8jbP9KSbIqNxrdXXAkat0",
  authDomain: "vidchat-f039f.firebaseapp.com",
  projectId: "vidchat-f039f",
  storageBucket: "vidchat-f039f.appspot.com",
  messagingSenderId: "283607412303",
  appId: "1:283607412303:web:4672118a9d86fe655a443a",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
export const firestore = firebase.firestore();
