const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

let deviceState = {
  ledBrightness: 0, 
  fogLights: false 
};

let sensorData = {
  illuminance: 50000,
  visibility: 100,
  motion: false
};

const updateSensors = () => {
  const luxChange = (Math.random() * 4000) - 2000;
  let newLux = sensorData.illuminance + luxChange;
  newLux = Math.max(0, Math.min(100000, newLux));

  const visChange = (Math.random() * 10) - 5;
  let newVis = sensorData.visibility + visChange;
  newVis = Math.max(0, Math.min(100, newVis));

  const isMotion = Math.random() > 0.7;

  sensorData = {
    illuminance: Math.floor(newLux),
    visibility: Math.floor(newVis),
    motion: isMotion
  };
};

setInterval(updateSensors, 2000);


app.get('/api/sensors', (req, res) => {
  const response = {
    id: Date.now(),
    timestamp: Date.now(),
    ...sensorData,
    isSynced: 1
  };
  console.log(`[SENSOR] Sent: Lux=${response.illuminance}, Vis=${response.visibility}`);
  res.json(response);
});

app.get('/api/devices', (req, res) => {
  res.json(deviceState);
});

app.post('/api/devices', (req, res) => {
  const updates = req.body;
  
  deviceState = { ...deviceState, ...updates };
  
  console.log(`[DEVICE] Updated: LED=${deviceState.ledBrightness}%, Fog=${deviceState.fogLights}`);
  res.json(deviceState);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
}); 