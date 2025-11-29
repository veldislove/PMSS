import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

const SERVER_URL = 'ВАШ IP';

export default function PredictionScreen() {
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState('Idle');
  
  const dataBuffer = useRef<any[]>([]);
  const lastGyro = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    const subG = Gyroscope.addListener(d => lastGyro.current = d);
    const subA = Accelerometer.addListener(d => {
      if (isPredicting) {
        dataBuffer.current.push({
            ax: d.x, ay: d.y, az: d.z,
            gx: lastGyro.current.x, gy: lastGyro.current.y, gz: lastGyro.current.z,
        });

        if (dataBuffer.current.length >= 20) {
           predictActivity([...dataBuffer.current]);
           dataBuffer.current = [];
        }
      }
    });

    return () => { subG.remove(); subA.remove(); };
  }, [isPredicting]);

  const predictActivity = async (windowData: any[]) => {
    const features: number[] = [];
    ['ax','ay','az','gx','gy','gz'].forEach(axis => {
        const vals = windowData.map((d: any) => d[axis]);
        const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
        const std = Math.sqrt(vals.reduce((a,b)=>a+Math.pow(b-mean,2),0)/vals.length);
        features.push(mean, std);
    });

    try {
        const res = await fetch(`${SERVER_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(features),
        });
        const result = await res.json();
        setPrediction(result.class);
    } catch (e) { 
        console.log(e);
        setPrediction("Conn Error");
    }
  };

  const getColor = () => {
      if (!isPredicting) return '#333';
      if (prediction === 'Conn Error') return '#FF3B30';
      
      switch(prediction) {
          case 'normal': return '#34C759';
          case 'fast':   return '#FF9500';
          case 'heavy':  return '#FF3B30';
          case 'tiptoe': return '#AF52DE';
          case 'slow':   return '#0A84FF';
          case 'idle':   return '#8E8E93';
          default: return '#555';
      }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.content}>
            <Text style={styles.label}>AI Status</Text>
            
            <View style={[styles.visualizer, { borderColor: getColor(), shadowColor: getColor() }]}>
                <IconSymbol 
                  name={prediction === 'idle' ? "pause.circle.fill" : "waveform.path.ecg"} 
                  size={80} 
                  color={getColor()} 
                />
                <Text style={[styles.resultText, { color: getColor() }]}>
                    {isPredicting ? prediction.toUpperCase() : "READY"}
                </Text>
            </View>

            <Text style={styles.hint}>
                {isPredicting ? "Analyzing movement..." : "Press start to classify walk style"}
            </Text>
        </View>

        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.btn, isPredicting ? styles.btnStop : styles.btnStart]}
                onPress={() => setIsPredicting(!isPredicting)}
            >
                <Text style={styles.btnText}>
                    {isPredicting ? 'STOP ANALYSIS' : 'START ANALYSIS'}
                </Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { color: '#666', letterSpacing: 2, marginBottom: 40, fontSize: 14 },
  visualizer: { 
    width: 250, height: 250, borderRadius: 125, 
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#111',
    shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: {width:0, height:0}
  },
  resultText: { fontSize: 32, fontWeight: '900', marginTop: 20, letterSpacing: 1, textAlign: 'center' },
  hint: { color: '#444', marginTop: 40 },
  footer: { paddingHorizontal: 30, paddingBottom: 100 }, 
  btn: { padding: 20, borderRadius: 18, alignItems: 'center' },
  btnStart: { backgroundColor: '#fff' },
  btnStop: { backgroundColor: '#FF453A' },
  btnText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});