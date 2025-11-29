import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ApiService } from '../services/ApiService';
import { generateSensorData } from '../services/SensorGenerator';
import { insertSensorData, getRecentLogs, initDB } from '../services/Database';
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
    luxTarget: 10000, visibilityLimit: 30, motionTimeout: 5000
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
    
    const half = Math.floor(luxValues.length / 2);
    const avg1 = luxValues.slice(0, half).reduce((a,b)=>a+b,0)/half;
    const avg2 = luxValues.slice(half).reduce((a,b)=>a+b,0)/(luxValues.length-half);
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (avg2 > avg1 + 100) trend = 'UP'; else if (avg2 < avg1 - 100) trend = 'DOWN';

    return { count: logs.length, averageLux: avg, medianLux: median, trend };
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      let newData: SensorData | null = null;
      let connectionStatus = false;

      if (!isSimulatedOffline) {
        newData = await ApiService.fetchSensorData();
      }

      if (newData) {
        connectionStatus = true;
        const serverState = await ApiService.fetchDeviceState();
        if (serverState) setDeviceState(serverState);

      } else {
        newData = generateSensorData(currentData || undefined);
        connectionStatus = false;
      }

      setCurrentData(newData);
      setIsOnline(connectionStatus);

      setHistory(prev => {
        const newHist = [...prev, newData!];
        return newHist.length > 50 ? newHist.slice(1) : newHist;
      });

      if (isAutoMode && newData) {
        if (newData.motion) setLastMotionTime(Date.now());
        const timeSinceMotion = Date.now() - lastMotionTime;

        let brightness = 0;
        if (newData.illuminance < thresholds.luxTarget) {
            brightness = (newData.motion || timeSinceMotion < thresholds.motionTimeout) ? 100 : 20;
        }
        const fog = newData.visibility < thresholds.visibilityLimit;

        if (connectionStatus) {
            if (brightness !== deviceState.ledBrightness || fog !== deviceState.fogLights) {
                 ApiService.updateDeviceState({ ledBrightness: brightness, fogLights: fog });
                 setDeviceState({ ledBrightness: brightness, fogLights: fog });
            }
        } else {
            setDeviceState({ ledBrightness: brightness, fogLights: fog });
        }
      }

      await insertSensorData(newData!);


      if (connectionStatus && !isSimulatedOffline) {
        await syncDataToCloud();
      }

      getRecentLogs(setLogs);

    }, 2000);

    return () => clearInterval(interval);
  }, [currentData, isAutoMode, lastMotionTime, isSimulatedOffline, thresholds, deviceState]);

  const toggleOfflineSimulation = () => setIsSimulatedOffline(p => !p);
  const toggleAutoMode = () => setIsAutoMode(p => !p);
  const updateThresholds = (key: keyof RuleThresholds, val: number) => setThresholds(p => ({...p, [key]: val}));

  const toggleFogLights = async () => {
    const newState = !deviceState.fogLights;
    setDeviceState(p => ({ ...p, fogLights: newState })); 
    if (isOnline && !isSimulatedOffline) {
        await ApiService.updateDeviceState({ fogLights: newState });
    }
  };

  const setLedBrightness = async (val: number) => {
    setDeviceState(p => ({ ...p, ledBrightness: val }));
    if (isOnline && !isSimulatedOffline) {
        await ApiService.updateDeviceState({ ledBrightness: val });
    }
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