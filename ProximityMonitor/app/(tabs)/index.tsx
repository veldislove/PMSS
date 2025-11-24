import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FIREBASE_DB_URL = 'https://pmss-lab3-default-rtdb.europe-west1.firebasedatabase.app/logs.json';

interface Stats {
  totalScans: number;
  criticalContacts: number;
  lastContactTime: string;
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [distance, setDistance] = useState<number>(120);
  const [statusLog, setStatusLog] = useState<string>('System Ready');

  const [stats, setStats] = useState<Stats>({
    totalScans: 0,
    criticalContacts: 0,
    lastContactTime: '--:--:--',
  });

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }

    const interval = setInterval(() => {
      simulateSensorRead("Auto-Scan");
    }, 10000); 

    return () => clearInterval(interval);
  }, [permission]);


  const simulateSensorRead = (source: string) => {
    const randomDist = Math.floor(Math.random() * 145) + 5; 
    handleDataProcessing(randomDist, source);
  };

  const handleDataProcessing = async (dist: number, source: string) => {
    setDistance(dist);
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    setStats((prev) => ({
      totalScans: prev.totalScans + 1,
      criticalContacts: dist < 50 ? prev.criticalContacts + 1 : prev.criticalContacts,
      lastContactTime: dist < 50 ? timeString : prev.lastContactTime,
    }));
    
    if (dist < 50) {
      setStatusLog(`⚠️ ALERT: ${dist}cm detected via ${source}`);
      await sendToFirebase(dist, timeString);
    } else {
      setStatusLog(`✅ Safe: ${dist}cm (${source})`);
    }
  };

  const sendToFirebase = async (dist: number, timeStr: string) => {
    try {
      await fetch(FIREBASE_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance: dist,
          timestamp: new Date().toISOString(),
          type: 'CRITICAL PROXIMITY',
          sensor: 'LIDAR_SIMULATION',
          app_version: 'v1.0-AR'
        }),
      });
      console.log('Data sent to cloud');
    } catch (error) {
      console.log('Network Error');
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={{marginBottom: 20}}>We need camera access for AR functionality</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
           <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCritical = distance < 50;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={styles.camera} facing="back">
        
        <View style={styles.overlay}>
 
          <View style={[styles.headerPanel, isCritical ? styles.bgRed : styles.bgGreen]}>
            <Text style={styles.headerLabel}>DISTANCE SENSOR</Text>
            <View style={styles.distanceRow}>
              <Text style={styles.distanceValue}>{distance}</Text>
              <Text style={styles.distanceUnit}>CM</Text>
            </View>
            <Text style={styles.statusText}>
              {isCritical ? '!!! CRITICAL RANGE !!!' : 'SAFE ZONE'}
            </Text>
          </View>

          <View style={styles.centerSection}>
            <View style={styles.statsBox}>
              <Text style={styles.statsHeader}>SESSION STATS</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>TOTAL SCANS:</Text>
                <Text style={styles.statValue}>{stats.totalScans}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, {color: '#ff4444'}]}>ALERTS:</Text>
                <Text style={[styles.statValue, {color: '#ff4444'}]}>{stats.criticalContacts}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>LAST CONTACT:</Text>
                <Text style={styles.statValue}>{stats.lastContactTime}</Text>
              </View>
            </View>

            <View style={styles.crosshair}>
              <View style={styles.chLineH} />
              <View style={styles.chLineV} />
              <View style={styles.chCircle} />
            </View>
          </View>

          <View style={styles.bottomPanel}>
            <Text style={styles.logText}>LOG: {statusLog}</Text>
            
            <TouchableOpacity 
              style={[styles.scanButton, isCritical ? {borderColor: 'red'} : {borderColor: '#00ffff'}]} 
              onPress={() => simulateSensorRead("Manual")}
              activeOpacity={0.7}
            >
              <Text style={styles.scanButtonText}>SCAN OBJECT</Text>
            </TouchableOpacity>
            
            <View style={styles.metaInfo}>
              <Text style={styles.hintText}>AUTO-SCAN: ON (10s)</Text>
              <Text style={styles.hintText}>MODE: Proximity</Text>
            </View>
          </View>

        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'space-between' },

  headerPanel: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    alignItems: 'center', 
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)'
  },
  bgGreen: { backgroundColor: 'rgba(0, 50, 0, 0.6)' },
  bgRed: { backgroundColor: 'rgba(100, 0, 0, 0.7)' },
  headerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' },
  distanceRow: { flexDirection: 'row', alignItems: 'baseline' },
  distanceValue: { color: 'white', fontSize: 72, fontWeight: '900', fontVariant: ['tabular-nums'] },
  distanceUnit: { color: 'rgba(255,255,255,0.8)', fontSize: 20, fontWeight: 'bold', marginLeft: 5 },
  statusText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, marginTop: -5 },

  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  
  statsBox: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 160,
  },
  statsHeader: { color: '#00ffff', fontSize: 10, fontWeight: 'bold', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#00ffff', paddingBottom: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statLabel: { color: '#aaa', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statValue: { color: 'white', fontSize: 10, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  crosshair: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', opacity: 0.6 },
  chLineH: { width: 60, height: 1, backgroundColor: '#00ffff' },
  chLineV: { width: 1, height: 60, backgroundColor: '#00ffff', position: 'absolute' },
  chCircle: { width: 150, height: 150, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)', borderRadius: 75, position: 'absolute', borderStyle: 'dashed' },

  bottomPanel: { 
    backgroundColor: 'rgba(10, 10, 20, 0.85)', 
    padding: 20, 
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  logText: { color: '#00ff00', marginBottom: 15, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }, 
  scanButton: { 
    backgroundColor: 'rgba(33, 150, 243, 0.3)', 
    borderWidth: 1,
    borderColor: '#00ffff',
    paddingVertical: 15, 
    borderRadius: 4, 
    alignItems: 'center',
    marginBottom: 10
  },
  scanButtonText: { color: '#00ffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  metaInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  hintText: { color: '#555', fontSize: 10, textTransform: 'uppercase' },

  btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: 'bold' }
});