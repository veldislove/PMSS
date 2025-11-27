export interface SensorData {
  id?: number;
  timestamp: number;
  illuminance: number;
  motion: boolean;
  visibility: number;
  isSynced: number;
}

export interface DeviceState {
  ledBrightness: number;
  fogLights: boolean;
}

// Вимога 3: Налаштування меж правил
export interface RuleThresholds {
  luxTarget: number;       // Поріг освітленості (було 10000)
  visibilityLimit: number; // Поріг видимості (було 30)
  motionTimeout: number;   // Час затримки (мс)
}

// Вимога 2: Статистика
export interface Statistics {
  count: number;
  averageLux: number;
  medianLux: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}