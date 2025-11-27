import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useSystem } from '../../context/SystemContext';

const screenWidth = Dimensions.get("window").width;

export default function Dashboard() {
  const { currentData, history, isOnline, isSimulatedOffline, stats, deviceState } = useSystem();
  const [chartRange, setChartRange] = useState(20); 

  if (!currentData) return <View style={styles.center}><Text>Connecting...</Text></View>;

  const dataSlice = history.slice(-chartRange);
  const chartData = dataSlice.map(d => d.illuminance);
  
  const labels = dataSlice.map((d, index) => {
    const step = Math.ceil(chartRange / 5);
    if (index % step === 0) {
        const date = new Date(d.timestamp);
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');

        if (chartRange === 10) {
            return `${minutes}:${seconds}`;
        }
        return `${hours}:${minutes}`;
    }
    return ''; 
  });

  const safeData = chartData.length > 0 ? chartData : [0];
  const safeLabels = labels.length > 0 ? labels : ["Now"];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
            <Text style={styles.greeting}>Smart Light</Text>
            <Text style={styles.subGreeting}>System Dashboard</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isOnline && !isSimulatedOffline ? '#E1F7E6' : '#FFE5E5' }]}>
            <Ionicons name={isOnline && !isSimulatedOffline ? "cloud-done" : "cloud-offline"} size={16} color={isOnline && !isSimulatedOffline ? "#34C759" : "#FF3B30"} />
            <Text style={[styles.statusText, { color: isOnline && !isSimulatedOffline ? "#34C759" : "#FF3B30" }]}>
                {isSimulatedOffline ? "Offline" : isOnline ? "Cloud" : "Local"}
            </Text>
        </View>
      </View>

      {/* SENSORS */}
      <View style={styles.grid}>
        <View style={[styles.card, styles.cardMain]}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF4E5' }]}>
                <Ionicons name="sunny" size={24} color="#FF9500" />
            </View>
            <Text style={styles.cardValue}>{currentData.illuminance.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Lux Level</Text>
        </View>

        <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: '#E5F1FF' }]}>
                <Ionicons name="eye" size={24} color="#007AFF" />
            </View>
            <Text style={styles.cardValue}>{currentData.visibility}%</Text>
            <Text style={styles.cardLabel}>Visibility</Text>
        </View>
      </View>

      {/* MOTION */}
      <View style={styles.wideCard}>
        <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: currentData.motion ? '#FFE5E5' : '#F2F2F7' }]}>
                <Ionicons name="walk" size={24} color={currentData.motion ? "#FF3B30" : "#8E8E93"} />
            </View>
            <View style={{marginLeft: 15}}>
                <Text style={styles.cardTitle}>Motion Sensor</Text>
                <Text style={{color: currentData.motion ? "#FF3B30" : "#8E8E93"}}>
                    {currentData.motion ? "Motion Detected" : "No movement"}
                </Text>
            </View>
        </View>
      </View>

      {/* STATS */}
      <Text style={styles.sectionTitle}>Statistics</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={styles.statValue}>{stats.averageLux.toFixed(0)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
            <Text style={styles.statLabel}>Median</Text>
            <Text style={styles.statValue}>{stats.medianLux.toFixed(0)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
            <Text style={styles.statLabel}>Trend</Text>
            <Ionicons 
                name={stats.trend === 'UP' ? "trending-up" : stats.trend === 'DOWN' ? "trending-down" : "remove"} 
                size={20} color="#FF9500" 
            />
        </View>
      </View>

      {/* CHART SECTION */}
      <Text style={styles.sectionTitle}>Light History</Text>
      <View style={styles.chartCard}>
        <LineChart
            data={{
                labels: safeLabels,
                datasets: [{ data: safeData }]
            }}
            width={screenWidth - 30} 
            height={240}
            yAxisSuffix="k"
            formatYLabel={(val) => {
                const num = parseInt(val);
                if (num >= 1000) return (num / 1000).toFixed(0);
                return num.toString();
            }}
            withInnerLines={true}
            withOuterLines={false}
            withDots={true}
            bezier
            chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#ffa726" },
                propsForBackgroundLines: { strokeDasharray: "5, 5", stroke: "#e3e3e3" },
            }}
            style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 35, 
                paddingLeft: 20 
            }}
        />

        <View style={styles.timeToggleContainer}>
            {[10, 20, 50].map((r, index) => {
                const label = index === 0 ? "1H" : index === 1 ? "24H" : "7D";
                return (
                    <TouchableOpacity 
                        key={r} 
                        style={[styles.timeBtn, chartRange === r && styles.timeBtnActive]}
                        onPress={() => setChartRange(r)}
                    >
                        <Text style={[styles.timeBtnText, chartRange === r && styles.timeBtnTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
      </View>

      {/* DEVICES */}
      <Text style={styles.sectionTitle}>Active Devices</Text>
      <View style={styles.grid}>
         <View style={[styles.miniCard, deviceState.ledBrightness > 0 && styles.miniCardActive]}>
             <Ionicons name={deviceState.ledBrightness > 0 ? "bulb" : "bulb-outline"} size={20} color={deviceState.ledBrightness > 0 ? "#FF9500" : "#8E8E93"} />
             <Text style={styles.miniCardText}>LED: {deviceState.ledBrightness}%</Text>
         </View>
         <View style={[styles.miniCard, deviceState.fogLights && styles.miniCardActive]}>
             <Ionicons name={deviceState.fogLights ? "cloud" : "cloud-outline"} size={20} color={deviceState.fogLights ? "#007AFF" : "#8E8E93"} />
             <Text style={styles.miniCardText}>Fog: {deviceState.fogLights ? "On" : "Off"}</Text>
         </View>
      </View>
      
      <View style={{height: 30}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E' },
  subGreeting: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { marginLeft: 5, fontSize: 12, fontWeight: '600' },
  
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: '48%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardMain: { width: '48%' }, 
  wideCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: '100%', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  cardLabel: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  row: { flexDirection: 'row', alignItems: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 10, marginTop: 10 },
  
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  divider: { width: 1, height: 25, backgroundColor: '#E5E5EA' },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center', 
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden'
  },
  
  timeToggleContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#F2F2F7', 
    borderRadius: 12, 
    padding: 4,
    width: '90%', 
    marginTop: 5,
    marginBottom: 10
  },
  timeBtn: { 
    flex: 1, 
    paddingVertical: 8, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  timeBtnActive: { 
    backgroundColor: '#fff', 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    elevation: 1
  },
  timeBtnText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  timeBtnTextActive: { color: '#1C1C1E', fontWeight: '600' },

  miniCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, width: '48%', gap: 8 },
  miniCardActive: { backgroundColor: '#FFF4E5', borderWidth: 1, borderColor: '#FF9500' },
  miniCardText: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' }
});