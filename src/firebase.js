// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYm3qLP8iWYcAA19meji3eS6z-R3lPJzc",
  authDomain: "coursemaker-4beaa.firebaseapp.com",
  projectId: "coursemaker-4beaa",
  storageBucket: "coursemaker-4beaa.firebasestorage.app",
  messagingSenderId: "130887390763",
  appId: "1:130887390763:web:95fc0207a3c3a950f4bc6e",
  measurementId: "G-DPJ599W5P1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);