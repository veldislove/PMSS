import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, Alert, Platform } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

const SERVER_URL = 'ВАШ IP';

const CLASSES = [
  { id: 'normal', label: '🚶 Normal Walk', color: '#34C759' },
  { id: 'fast',   label: '🏃 Fast Walk',   color: '#FF9500' },
  { id: 'heavy',  label: '🐘 Heavy Step',  color: '#FF3B30' },
  { id: 'tiptoe', label: '🤫 Tiptoe',      color: '#AF52DE' },
  { id: 'slow',   label: '🐢 Slow Walk',   color: '#0A84FF' },
  { id: 'idle',   label: '🛑 Standing',    color: '#8E8E93' }, 
];

export default function TrainingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [sensorData, setSensorData] = useState({ ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 });
  const [samplesInBuffer, setSamplesInBuffer] = useState(0);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  const dataBuffer = useRef<any[]>([]);
  const lastGyro = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    const subG = Gyroscope.addListener(d => {
      lastGyro.current = d;
      setSensorData(prev => ({ ...prev, gx: d.x, gy: d.y, gz: d.z }));
    });
    const subA = Accelerometer.addListener(d => {
      setSensorData(prev => ({ ...prev, ax: d.x, ay: d.y, az: d.z }));
      if (isRecording) {
        dataBuffer.current.push({
          ax: d.x, ay: d.y, az: d.z,
          gx: lastGyro.current.x, gy: lastGyro.current.y, gz: lastGyro.current.z,
          label: selectedClass.id
        });
        setSamplesInBuffer(dataBuffer.current.length);
        if (dataBuffer.current.length >= 50) sendBatch();
      }
    });

    return () => { subG.remove(); subA.remove(); };
  }, [isRecording, selectedClass]);

  const sendBatch = async () => {
    const batch = [...dataBuffer.current];
    dataBuffer.current = [];
    try {
      await fetch(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(batch)
      });
    } catch (e) { 
      console.log("Send error:", e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/stats`);
      const data = await res.json();
      setStats(data);
      setModalVisible(true);
    } catch (e) { Alert.alert("Error", "Server unreachable. Check IP & Firewall."); }
  };

  const trainModel = async () => {
    try {
      Alert.alert("Training...", "Please wait");
      const res = await fetch(`${SERVER_URL}/train`, { method: 'POST' });
      const data = await res.json();
      if(data.status === 'success') Alert.alert("Success", "Model updated!");
      else Alert.alert("Error", data.message);
    } catch (e) { Alert.alert("Error", "Failed to connect to server"); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.pageTitle}>Data Collection</Text>

        <Text style={styles.sectionTitle}>Select Activity Type</Text>
        <View style={styles.grid}>
          {CLASSES.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.classBtn, 
                selectedClass.id === item.id && { borderColor: item.color, backgroundColor: item.color + '20' }
              ]}
              onPress={() => setSelectedClass(item)}
            >
              <Text style={[styles.classBtnText, selectedClass.id === item.id && { color: item.color, fontWeight: 'bold' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sensorBox}>
          <Text style={styles.sensorTitle}>Live Sensors</Text>
          <View style={styles.row}>
            <Text style={styles.sensorText}>Acc: {sensorData.ax.toFixed(2)} {sensorData.ay.toFixed(2)} {sensorData.az.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.sensorText}>Gyro: {sensorData.gx.toFixed(2)} {sensorData.gy.toFixed(2)} {sensorData.gz.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.recordBtn, isRecording ? styles.recording : null]}
          onPress={() => setIsRecording(!isRecording)}
        >
          <IconSymbol name={isRecording ? "stop.fill" : "circle.fill"} size={24} color="white" />
          <Text style={styles.recordBtnText}>
            {isRecording ? "STOP RECORDING" : "START RECORDING"}
          </Text>
        </TouchableOpacity>
        
        {isRecording && <Text style={styles.bufferText}>Buffer: {samplesInBuffer}</Text>}

        <View style={styles.toolsContainer}>
          <TouchableOpacity style={styles.toolBtn} onPress={fetchStats}>
            <IconSymbol name="list.bullet.rectangle.fill" size={20} color="#fff" />
            <Text style={styles.toolText}>View Dataset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: '#34C759' }]} onPress={trainModel}>
            <IconSymbol name="bolt.fill" size={20} color="#fff" />
            <Text style={styles.toolText}>Train Model</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dataset Statistics</Text>
            {Object.keys(stats).length === 0 ? (
              <Text style={{color:'#888', textAlign: 'center'}}>No data yet or connection failed.</Text>
            ) : (
              Object.entries(stats).map(([key, count]) => (
                <View key={key} style={styles.statRow}>
                  <Text style={styles.statKey}>{key.toUpperCase()}</Text>
                  <Text style={styles.statVal}>{count} samples</Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 20 },
  sectionTitle: { fontSize: 16, color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  classBtn: { width: '48%', padding: 15, borderRadius: 12, backgroundColor: '#1C1C1E', borderWidth: 2, borderColor: 'transparent', alignItems: 'center' },
  classBtnText: { color: '#fff', fontSize: 14 },
  
  sensorBox: { backgroundColor: '#1C1C1E', padding: 15, borderRadius: 12, marginBottom: 25 },
  sensorTitle: { color: '#666', marginBottom: 5, fontSize: 12 },
  row: { marginBottom: 5 },
  sensorText: { color: '#0A84FF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  recordBtn: { flexDirection: 'row', backgroundColor: '#0A84FF', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10 },
  recording: { backgroundColor: '#FF3B30' },
  recordBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  bufferText: { color: '#FF3B30', textAlign: 'center', marginTop: 5 },

  toolsContainer: { flexDirection: 'row', gap: 15, marginTop: 30 },
  toolBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#2C2C2E', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  toolText: { color: 'white', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1C1C1E', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 22, color: 'white', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  statKey: { color: '#fff', fontWeight: 'bold' },
  statVal: { color: '#888' },
  closeBtn: { marginTop: 20, backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: 'white', fontWeight: 'bold' }
});