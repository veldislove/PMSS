// db/Database.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('pulse_v2.db');

export interface PulseRecord {
  id: number;
  value: number;
  timestamp: number;
  deviceId: string;   // ID пристрою
  deviceName: string; // Модель
  synced: number;     // 0 - не в хмарі, 1 - в хмарі
}

// Ініціалізація
export const initDB = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pulse_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value INTEGER,
      timestamp INTEGER,
      deviceId TEXT,
      deviceName TEXT,
      synced INTEGER DEFAULT 0
    );
  `);
};

// Додавання запису (локально)
export const addLocalMeasurement = (value: number, deviceId: string, deviceName: string) => {
  const timestamp = Date.now();
  db.runSync(
    'INSERT INTO pulse_data (value, timestamp, deviceId, deviceName, synced) VALUES (?, ?, ?, ?, 0);',
    [value, timestamp, deviceId, deviceName]
  );
};

// Збереження даних, які прийшли з ХМАРИ (помічаємо як synced = 1)
export const saveCloudMeasurement = (value: number, timestamp: number, deviceId: string, deviceName: string) => {
  // Перевіряємо, чи такий запис вже є (уникнення дублікатів по часу та девайсу)
  const existing = db.getAllSync(
    'SELECT * FROM pulse_data WHERE timestamp = ? AND deviceId = ?',
    [timestamp, deviceId]
  );

  if (existing.length === 0) {
    db.runSync(
      'INSERT INTO pulse_data (value, timestamp, deviceId, deviceName, synced) VALUES (?, ?, ?, ?, 1);',
      [value, timestamp, deviceId, deviceName]
    );
  }
};

// Отримати несинхронізовані дані (щоб відправити в хмару)
export const getUnsyncedData = (): PulseRecord[] => {
  return db.getAllSync<PulseRecord>('SELECT * FROM pulse_data WHERE synced = 0');
};

// Позначити дані як синхронізовані
export const markAsSynced = (id: number) => {
  db.runSync('UPDATE pulse_data SET synced = 1 WHERE id = ?', [id]);
};

// Отримати всі дані для графіка
export const getMeasurements = (hours: number): PulseRecord[] => {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  
  // Беремо тільки ті, що новіші за cutoff, і сортуємо
  return db.getAllSync<PulseRecord>(
    'SELECT * FROM pulse_data WHERE timestamp > ? ORDER BY timestamp ASC',
    [cutoff]
  );
};

// Очищення (для тестів)
export const clearLocalDB = () => {
  db.runSync('DELETE FROM pulse_data');
};