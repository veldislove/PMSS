import * as SQLite from 'expo-sqlite';
import { SensorData } from '../types';

const getDB = async () => {
  return await SQLite.openDatabaseAsync('streetlight_v13.db');
};

export const initDB = async () => {
  try {
    const db = await getDB();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sensors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER,
        illuminance REAL,
        motion INTEGER,
        visibility REAL,
        isSynced INTEGER
      );
    `);
    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing DB:', error);
  }
};

export const insertSensorData = async (data: SensorData) => {
  try {
    const db = await getDB();
    await db.runAsync(
      'INSERT INTO sensors (timestamp, illuminance, motion, visibility, isSynced) VALUES (?, ?, ?, ?, ?)',
      [data.timestamp, data.illuminance, data.motion ? 1 : 0, data.visibility, 0]
    );
  } catch (error) {
    console.error('Error inserting data:', error);
  }
};

export const getUnsyncedData = async (callback: (data: SensorData[]) => void) => {
  try {
    const db = await getDB();
    const allRows = await db.getAllAsync<SensorData>('SELECT * FROM sensors WHERE isSynced = 0');
    callback(allRows);
  } catch (error) {
    console.error('Error getting unsynced data:', error);
    callback([]);
  }
};

export const markAsSynced = async (ids: number[]) => {
  if (ids.length === 0) return;
  try {
    const db = await getDB();
    await db.runAsync(
      `UPDATE sensors SET isSynced = 1 WHERE id IN (${ids.join(',')})`
    );
  } catch (error) {
    console.error('Error marking as synced:', error);
  }
};

export const getRecentLogs = async (callback: (data: SensorData[]) => void) => {
  try {
    const db = await getDB();
    
    const allRows = await db.getAllAsync<SensorData>('SELECT * FROM sensors ORDER BY id DESC LIMIT 50');
    callback(allRows);
  } catch (error) {
    console.error('Error getting logs:', error);
    callback([]);
  }
};