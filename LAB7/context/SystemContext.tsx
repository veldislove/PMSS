import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { generateSensorData } from '../services/SensorGenerator';
import { insertSensorData, getRecentLogs } from '../services/Database';
import { initDB } from '../services/Database';
import { syncDataToCloud } from '../services/Firebase';
import { SensorData, DeviceState, RuleThresholds, Statistics } from '../types';

interface SystemContextType {
  currentData: SensorData | null;
  history: SensorData[]; 
  deviceState: DeviceState;
  logs: SensorData[];
  stats: Statistics;   
  thresholds: RuleThresholds; 
  isAutoMode: boolean;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  
  toggleOfflineSimulation: () => void;
  toggleAutoMode: () => void;
  toggleFogLights: () => void;
  setLedBrightness: (val: number) => void;
  updateThresholds: (key: keyof RuleThresholds, val: number) => void; 
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider = ({ children }: { children: ReactNode }) => {
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceState>({ ledBrightness: 0, fogLights: false });
  const [logs, setLogs] = useState<SensorData[]>([]);
  
  const [thresholds, setThresholds] = useState<RuleThresholds>({
    luxTarget: 10000,
    visibilityLimit: 30,
    motionTimeout: 5000
  });

  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [lastMotionTime, setLastMotionTime] = useState(Date.now());

  useEffect(() => { initDB(); }, []);

  const calculateStats = (data: SensorData[]): Statistics => {
    if (data.length === 0) return { count: 0, averageLux: 0, medianLux: 0, trend: 'STABLE' };
    
    const luxValues = data.map(d => d.illuminance);
    const sum = luxValues.reduce((a, b) => a + b, 0);
    const avg = sum / luxValues.length;

    const sorted = [...luxValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const firstHalf = luxValues.slice(0, Math.floor(luxValues.length / 2));
    const secondHalf = luxValues.slice(Math.floor(luxValues.length / 2));
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
    
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (avg2 > avg1 + 500) trend = 'UP';
    if (avg2 < avg1 - 500) trend = 'DOWN';

    return { count: logs.length, averageLux: avg, medianLux: median, trend };
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const newData = generateSensorData(currentData || undefined);
      setCurrentData(newData);
      
      setHistory(prev => {
        const newHist = [...prev, newData];
        return newHist.length > 50 ? newHist.slice(1) : newHist;
      });

      if (isAutoMode) {
        if (newData.motion) setLastMotionTime(Date.now());
        const timeSinceMotion = Date.now() - lastMotionTime;

        let brightness = 0;
        if (newData.illuminance < thresholds.luxTarget) {
          if (newData.motion || timeSinceMotion < thresholds.motionTimeout) {
            brightness = 100;
          } else {
            brightness = 20;
          }
        }
        const fog = newData.visibility < thresholds.visibilityLimit;
        setDeviceState({ ledBrightness: brightness, fogLights: fog });
      }

      await insertSensorData(newData);

      if (isSimulatedOffline) {
        setIsOnline(false);
      } else {
        const syncResult = await syncDataToCloud();
        setIsOnline(syncResult);
      }

      getRecentLogs((fetchedLogs) => setLogs(fetchedLogs));

    }, 2000);
    return () => clearInterval(interval);
  }, [currentData, isAutoMode, lastMotionTime, isSimulatedOffline, thresholds]);

  const toggleAutoMode = () => setIsAutoMode(p => !p);
  const toggleFogLights = () => setDeviceState(p => ({ ...p, fogLights: !p.fogLights }));
  const setLedBrightness = (v: number) => setDeviceState(p => ({ ...p, ledBrightness: v }));
  const toggleOfflineSimulation = () => setIsSimulatedOffline(p => !p);
  
  const updateThresholds = (key: keyof RuleThresholds, val: number) => {
    setThresholds(prev => ({...prev, [key]: val}));
  };

  return (
    <SystemContext.Provider value={{ 
      currentData, history, deviceState, logs, 
      isAutoMode, isOnline, isSimulatedOffline,
      thresholds, stats: calculateStats(history), 
      toggleOfflineSimulation, toggleAutoMode, toggleFogLights, setLedBrightness, updateThresholds
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) throw new Error("useSystem error");
  return context;
};