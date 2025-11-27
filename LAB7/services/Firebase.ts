import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';
import { SensorData } from '../types';
import { getUnsyncedData, markAsSynced } from './Database';
import * as Network from 'expo-network';

const firebaseConfig = {
  apiKey: "AIzaSyBP_X_1lI1ZL3bR9WderR8CY6nYGLt4RTM",
  authDomain: "pmss-lab7.firebaseapp.com",
  databaseURL: "https://pmss-lab7-default-rtdb.firebaseio.com",
  projectId: "pmss-lab7",
  storageBucket: "pmss-lab7.firebasestorage.app",
  messagingSenderId: "153842677728",
  appId: "1:153842677728:web:ff0a7ed0ffbeeda1449d85"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const syncDataToCloud = async (): Promise<boolean> => {
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected || !netState.isInternetReachable) {
      return false; 
    }
  
    return new Promise((resolve) => {
 
      getUnsyncedData((rows) => {
        if (rows.length === 0) {
          resolve(true);
          return;
        }
  
        const idsToSync: number[] = [];
        const promises = rows.map((row) => {
          const newRef = push(ref(database, 'sensors/'));
          if (row.id) idsToSync.push(row.id);
          return set(newRef, { ...row, syncedAt: Date.now() });
        });
  
        Promise.all(promises)
          .then(() => {
            markAsSynced(idsToSync);
            resolve(true);
          })
          .catch((err) => {
            console.error("Sync error:", err);
            resolve(false);
          });
      });
    });
  };