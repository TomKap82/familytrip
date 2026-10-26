import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
export const configured=Boolean(import.meta.env.VITE_FIREBASE_API_KEY&&import.meta.env.VITE_FIREBASE_PROJECT_ID&&import.meta.env.VITE_FIREBASE_APP_ID);
const app=initializeApp({apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'not-set',authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'invalid.invalid',projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'not-set',appId:import.meta.env.VITE_FIREBASE_APP_ID||'not-set'});
export const auth=getAuth(app);
export const db=getFirestore(app);
