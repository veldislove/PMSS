import { SensorData } from '../types';

export const generateSensorData = (lastData?: SensorData): SensorData => {
  const now = Date.now();
  
  // Емуляція зміни освітлення (плавна зміна + шум)
  const randomLuxChange = (Math.random() * 4000) - 2000; 
  let newLux = (lastData?.illuminance || 50000) + randomLuxChange;
  newLux = Math.max(0, Math.min(100000, newLux));

  // Емуляція видимості (туман може настати раптово або плавно)
  const randomVisChange = (Math.random() * 10) - 5;
  let newVis = (lastData?.visibility || 90) + randomVisChange;
  newVis = Math.max(0, Math.min(100, newVis));

  // Рух - випадкова подія (30% ймовірність)
  const isMotion = Math.random() > 0.7;

  return {
    timestamp: now,
    illuminance: Math.floor(newLux),
    motion: isMotion,
    visibility: Math.floor(newVis),
    isSynced: 0 // Спочатку завжди не синхронізовано
  };
};