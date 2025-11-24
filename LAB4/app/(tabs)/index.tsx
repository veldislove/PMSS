import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { addMeasurement, clearHistory, getMeasurements, initDB } from '../../db/database';
import { PulseRecord } from '../../types/interfaces';

const screenWidth = Dimensions.get('window').width;

const PulsingHeart = ({ isRecording }: { isRecording: boolean }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
        ])
      ).start();
    } else {
      scaleValue.setValue(1);
      scaleValue.stopAnimation();
    }
  }, [isRecording]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <FontAwesome5 name="heartbeat" size={28} color={isRecording ? "#e94560" : "#4a4e69"} />
    </Animated.View>
  );
};

export default function HomeScreen() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentBpm, setCurrentBpm] = useState<number>(0);
  const [historyData, setHistoryData] = useState<PulseRecord[]>([]);
  const [timeRange, setTimeRange] = useState<number>(1); 
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      initDB();
      fetchData();
    } catch (e) {
      console.log("DB Error:", e);
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        const simulatedBpm = Math.floor(Math.random() * (180 - 60 + 1)) + 60;
        setCurrentBpm(simulatedBpm);
        addMeasurement(simulatedBpm);
        fetchData();
      }, 2000); 
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRecording]);

  const fetchData = () => {
    const data = getMeasurements(timeRange);
    setHistoryData(data); 
  };

  const handleRangeChange = (hours: number) => {
    setTimeRange(hours);
    const data = getMeasurements(hours);
    setHistoryData(data);
  };

  const handleClear = () => {
    Alert.alert("RESET SYSTEM", "Видалити всі дані пацієнта?", [
      { text: "Скасувати", style: "cancel" },
      { 
        text: "ВИДАЛИТИ", 
        style: 'destructive',
        onPress: () => { 
          clearHistory(); 
          setHistoryData([]); 
          setCurrentBpm(0); 
        } 
      }
    ]);
  };

  const stats = {
    min: historyData.length ? Math.min(...historyData.map(d => d.value)) : 0,
    max: historyData.length ? Math.max(...historyData.map(d => d.value)) : 0,
    avg: historyData.length ? (historyData.reduce((a, b) => a + b.value, 0) / historyData.length).toFixed(0) : "0",
  };

  const getZone = (bpm: number) => {
    if (bpm < 100) return { label: 'СПОКІЙ', desc: 'Відпочинок / Розминка', color: '#00d2d3' };
    if (bpm < 140) return { label: 'АЕРОБНА', desc: 'Спалювання жиру / Витривалість', color: '#feca57' };
    return { label: 'ПІКОВА', desc: 'Анаеробна / Макс. навантаження', color: '#ff6b6b' };
  };

  const currentZone = getZone(currentBpm);

  const formatXLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === 1) return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
    if (timeRange === 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>MED•MONITOR <Text style={{fontWeight:'300', fontSize: 16}}>v.13</Text></Text>
          <PulsingHeart isRecording={isRecording} />
        </View>

        <View style={[styles.mainCard, { borderColor: isRecording ? currentZone.color : '#333' }]}>
          <View style={styles.bpmContainer}>
            <Text style={styles.bpmLabel}>HEART RATE</Text>
            <Text style={[styles.bpmValue, { textShadowColor: currentZone.color, textShadowRadius: 10 }]}>
              {currentBpm > 0 ? currentBpm : '--'} 
              <Text style={styles.bpmUnit}> BPM</Text>
            </Text>
          </View>

          <View style={styles.zoneContainer}>
            <Text style={[styles.zoneTitle, { color: currentZone.color }]}>
              {currentBpm > 0 ? currentZone.label : 'ОЧІКУВАННЯ'}
            </Text>
            <Text style={styles.zoneDesc}>
              {currentBpm > 0 ? currentZone.desc : 'Натисніть старт для діагностики'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isRecording ? '#ff4757' : '#2ed573' }]}
            onPress={() => setIsRecording(!isRecording)}
          >
            <Text style={styles.btnText}>
              {isRecording ? "ЗУПИНИТИ СКАНУВАННЯ" : "ПОЧАТИ МОНІТОРИНГ"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>EKG HISTORY</Text>
            <MaterialIcons name="show-chart" size={20} color="#57606f" />
          </View>

          {historyData.length > 1 ? (
            <LineChart
              data={{
                labels: historyData.slice(-6).map(d => formatXLabel(d.timestamp)),
                datasets: [{ data: historyData.map(d => d.value) }]
              }}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#1e272e",
                backgroundGradientFrom: "#1e272e",
                backgroundGradientTo: "#1e272e",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(233, 69, 96, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#ffa502" }
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>NO SIGNAL</Text>
            </View>
          )}

          <View style={styles.filterContainer}>
            {[1, 24, 168].map((h) => (
              <TouchableOpacity 
                key={h} 
                onPress={() => handleRangeChange(h)} 
                style={[styles.filterBtn, timeRange === h && styles.activeFilterBtn]}
              >
                <Text style={[styles.filterText, timeRange === h && styles.activeFilterText]}>
                  {h === 1 ? '1H' : h === 24 ? '24H' : '7D'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MIN</Text>
            <Text style={styles.statValue}>{stats.min}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statLabel, {color: '#feca57'}]}>AVG</Text>
            <Text style={styles.statValue}>{stats.avg}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statLabel, {color: '#ff6b6b'}]}>MAX</Text>
            <Text style={styles.statValue}>{stats.max}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.resetLink} onPress={handleClear}>
          <Text style={styles.resetText}>[ SYSTEM RESET ]</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f0f12' }, // Дуже темний фон
  container: { padding: 20, paddingBottom: 40 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#f1f2f6', letterSpacing: 1 },

  mainCard: { 
    backgroundColor: '#1e272e', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  bpmContainer: { alignItems: 'center', marginBottom: 10 },
  bpmLabel: { color: '#808e9b', fontSize: 12, letterSpacing: 2, marginBottom: 5 },
  bpmValue: { fontSize: 64, fontWeight: '900', color: '#fff' },
  bpmUnit: { fontSize: 20, fontWeight: '300', color: '#d2dae2' },

  zoneContainer: { alignItems: 'center', marginBottom: 20 },
  zoneTitle: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  zoneDesc: { color: '#808e9b', fontSize: 12, marginTop: 4 },

  actionBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

  chartCard: { backgroundColor: '#1e272e', borderRadius: 20, padding: 15, marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#d2dae2', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  chart: { marginVertical: 8, borderRadius: 16, paddingRight: 40 }, // paddingRight щоб текст не різався
  noDataContainer: { height: 220, justifyContent: 'center', alignItems: 'center', borderColor: '#485460', borderWidth: 1, borderRadius: 16, borderStyle: 'dashed' },
  noDataText: { color: '#485460', fontSize: 18, letterSpacing: 2 },

  filterContainer: { flexDirection: 'row', backgroundColor: '#0f0f12', borderRadius: 10, padding: 4, marginTop: 10 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeFilterBtn: { backgroundColor: '#485460' },
  filterText: { color: '#808e9b', fontSize: 12, fontWeight: 'bold' },
  activeFilterText: { color: '#fff' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: '#1e272e', padding: 15, borderRadius: 15, marginHorizontal: 4, alignItems: 'center' },
  statLabel: { color: '#808e9b', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  resetLink: { alignItems: 'center', padding: 10 },
  resetText: { color: '#ff4757', fontSize: 12, letterSpacing: 1, opacity: 0.8 },
});