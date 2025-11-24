import * as SQLite from 'expo-sqlite';
import { PulseRecord } from '../types/interfaces';

const db = SQLite.openDatabaseSync('pulse.db');

export const initDB = (): void => {
  db.execSync(
    'CREATE TABLE IF NOT EXISTS pulse_data (id INTEGER PRIMARY KEY NOT NULL, value INTEGER, timestamp INTEGER);'
  );
};

export const addMeasurement = (value: number): void => {
  const timestamp = Date.now();
  db.runSync(
    'INSERT INTO pulse_data (value, timestamp) VALUES (?, ?);',
    [value, timestamp]
  );
};

export const getMeasurements = (hours: number): PulseRecord[] => {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  
  return db.getAllSync<PulseRecord>(
    'SELECT * FROM pulse_data WHERE timestamp > ? ORDER BY timestamp ASC;',
    [cutoff]
  );
};

export const clearHistory = (): void => {
  db.runSync('DELETE FROM pulse_data;');
};
