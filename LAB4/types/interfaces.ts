export interface PulseRecord {
  id: number;
  value: number;     // Значення BPM
  timestamp: number; // Час (ms)
}

export interface HeartRateZone {
  label: string;
  color: string;
}