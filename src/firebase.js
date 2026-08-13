// Firebase Konfigürasyonu
// Bu bilgileri Firebase Console'dan aldıktan sonra buraya yapıştır
// https://console.firebase.google.com → Proje Ayarları → Genel → Web Uygulaması

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD_BURAYA_API_KEY_GEL",
  authDomain: "PROJE_ADI.firebaseapp.com",
  databaseURL: "https://PROJE_ADI-default-rtdb.firebaseio.com",
  projectId: "PROJE_ADI",
  storageBucket: "PROJE_ADI.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
