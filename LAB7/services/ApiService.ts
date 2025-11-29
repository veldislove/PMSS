import { SensorData, DeviceState } from '../types';

const API_URL = 'http://192.168.0.136:3000/api';

export const ApiService = {
  fetchSensorData: async (): Promise<SensorData | null> => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(`${API_URL}/sensors`, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.log('API Error (Sensors):', error);
      return null;
    }
  },

  fetchDeviceState: async (): Promise<DeviceState | null> => {
    try {
      const response = await fetch(`${API_URL}/devices`);
      if (!response.ok) throw new Error('Network error');
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  updateDeviceState: async (updates: Partial<DeviceState>): Promise<DeviceState | null> => {
    try {
      const response = await fetch(`${API_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      return await response.json();
    } catch (error) {
      console.log('API Error (Update Devices):', error);
      return null;
    }
  }
};