import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Dimensions, Alert, SafeAreaView, Animated, Easing, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';

// Firebase
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { auth, db as firestoreDB } from '../../firebaseConfig';

// DB
import { 
  initDB, 
  addLocalMeasurement, 
  getMeasurements, 
  getUnsyncedData, 
  markAsSynced, 
  saveCloudMeasurement, 
  clearLocalDB, 
  PulseRecord 
} from '../../db/Database';

const screenWidth = Dimensions.get('window').width;

// --- COMPONENT: Pulsing Heart ---
const PulsingHeart = ({ isRecording }: { isRecording: boolean }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, { toValue: 1.2, duration: 400, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(scaleValue, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.ease }),
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
  // --- STATE: Auth ---
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- STATE: Data ---
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentBpm, setCurrentBpm] = useState<number>(0);
  const [historyData, setHistoryData] = useState<PulseRecord[]>([]);
  const [timeRange, setTimeRange] = useState<number>(1); 

  // --- STATE: Device Info ---
  const [myDeviceId, setMyDeviceId] = useState('unknown');
  const [myDeviceName, setMyDeviceName] = useState('Generic Device');
  const [visibleDevices, setVisibleDevices] = useState<string[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. INITIALIZATION
  useEffect(() => {
    try {
      initDB();
      
      const fetchDeviceInfo = async () => {
         const id = Device.osBuildId || Device.modelName || 'dev-' + Math.floor(Math.random()*10000);
         setMyDeviceId(id);
         setMyDeviceName(Device.modelName || 'Unknown Device');
         setVisibleDevices([id]);
      };
      fetchDeviceInfo();

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) loadData();
      });
      return unsubscribe;
    } catch (e) { console.log("Init Error:", e); }
  }, []);

  // 2. CLOUD SYNC
  useEffect(() => {
    if (!user) return;

    // Pull
    const q = query(collection(firestoreDB, "pulse_logs"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          saveCloudMeasurement(data.value, data.timestamp, data.deviceId, data.deviceName);
        }
      });
      loadData();
    });

    // Push
    const syncInterval = setInterval(async () => {
      const netState = await Network.getNetworkStateAsync();
      if (netState.isConnected && netState.isInternetReachable) {
        const unsynced = getUnsyncedData();
        for (const record of unsynced) {
          try {
            await addDoc(collection(firestoreDB, "pulse_logs"), {
              value: record.value,
              timestamp: record.timestamp,
              deviceId: record.deviceId,
              deviceName: record.deviceName,
              userEmail: user.email 
            });
            markAsSynced(record.id);
          } catch (e) { console.log("Sync error:", e); }
        }
      }
    }, 5000);

    return () => { unsubscribeSnapshot(); clearInterval(syncInterval); };
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [timeRange]);

  // 3. SIMULATION
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        const simulatedBpm = Math.floor(Math.random() * (180 - 60 + 1)) + 60;
        setCurrentBpm(simulatedBpm);
        addLocalMeasurement(simulatedBpm, myDeviceId, myDeviceName);
        loadData();
      }, 2000); 
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRecording, myDeviceId]);

  const loadData = () => {
    const data = getMeasurements(timeRange);
    setHistoryData(data); 
  };

  const handleRangeChange = (hours: number) => {
    setTimeRange(hours);
  };

  const handleClear = () => {
    Alert.alert("RESET SYSTEM", "Delete local database history?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "DELETE", style: 'destructive',
        onPress: () => { 
          clearLocalDB(); 
          setHistoryData([]); 
          setCurrentBpm(0); 
        } 
      }
    ]);
  };

  // --- Auth Handlers ---
  const handleAuth = async () => {
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: any) { Alert.alert("Access Denied", e.message); }
  };
  
  const handleLogout = async () => {
    setIsRecording(false);
    await signOut(auth);
    setEmail(''); setPassword('');
  };

  const toggleAuthMode = () => {
    setIsLoginMode(!isLoginMode);
    setEmail(''); setPassword('');
  };

  // --- CHART HELPERS ---
  const formatXLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === 1) return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
    if (timeRange === 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const getChartData = () => {
    if (historyData.length === 0) return null;
    const allDevices = [...new Set(historyData.map(d => d.deviceId))];
    const datasets = allDevices
      .filter(devId => visibleDevices.includes(devId))
      .map((devId) => {
        const color = devId === myDeviceId 
          ? (opacity = 1) => `rgba(0, 210, 211, ${opacity})`
          : (opacity = 1) => `rgba(162, 155, 254, ${opacity})`;
        
        const deviceData = historyData.filter(d => d.deviceId === devId);
        return { data: deviceData.map(d => d.value), color: color, strokeWidth: 2 };
      });

    if (datasets.length === 0 || datasets[0].data.length === 0) return null;

    const step = Math.ceil(historyData.length / 6);
    const labels = historyData.filter((_, i) => i % step === 0).map(d => formatXLabel(d.timestamp));

    return { labels, datasets };
  };

  const toggleDeviceVisibility = (devId: string) => {
    if (visibleDevices.includes(devId)) setVisibleDevices(visibleDevices.filter(id => id !== devId));
    else setVisibleDevices([...visibleDevices, devId]);
  };

  // Stats
  const stats = {
    min: historyData.length ? Math.min(...historyData.map(d => d.value)) : 0,
    max: historyData.length ? Math.max(...historyData.map(d => d.value)) : 0,
    avg: historyData.length ? (historyData.reduce((a, b) => a + b.value, 0) / historyData.length).toFixed(0) : "0",
  };

  const getZone = (bpm: number) => {
    if (bpm < 100) return { label: 'RESTING', desc: 'Relaxed / Warm Up', color: '#00d2d3' };
    if (bpm < 140) return { label: 'AEROBIC', desc: 'Cardio / Endurance', color: '#feca57' };
    return { label: 'PEAK', desc: 'Anaerobic / Max Effort', color: '#ff6b6b' };
  };
  const currentZone = getZone(currentBpm);
  const chartData = getChartData();
  const uniqueDevices = [...new Set(historyData.map(d => d.deviceId))];


  // --- VIEW: LOGIN SCREEN ---
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <KeyboardAvoidingView 
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
         >
            
            <View style={{alignItems: 'center', marginBottom: 30}}>
               <PulsingHeart isRecording={true} /> 
               <Text style={[styles.headerTitle, {marginTop: 10}]}>MED•MONITOR <Text style={{fontWeight:'300', fontSize: 16}}>SECURE</Text></Text>
            </View>

            {/* Added extra paddingVertical to fix layout issues */}
            <View style={[styles.mainCard, { paddingVertical: 40 }]}>
              <View style={{alignItems: 'center', marginBottom: 30}}>
                <MaterialIcons name="security" size={50} color="#00d2d3" />
                <Text style={[styles.zoneTitle, {color: '#fff', marginTop: 15}]}>SYSTEM ACCESS</Text>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color="#808e9b" style={{marginRight: 10}} />
                <TextInput 
                  placeholder="Email" 
                  placeholderTextColor="#57606f" 
                  style={{flex: 1, color: '#fff'}} 
                  value={email} onChangeText={setEmail} 
                  autoCapitalize="none" 
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="key" size={20} color="#808e9b" style={{marginRight: 10}} />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="#57606f" 
                  style={{flex: 1, color: '#fff'}} 
                  value={password} onChangeText={setPassword} 
                  secureTextEntry 
                />
              </View>

              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#00d2d3', marginTop: 25}]} onPress={handleAuth}>
                 <Text style={[styles.btnText, {color: '#1e272e'}]}>{isLoginMode ? "AUTHENTICATE" : "CREATE AN ACCOUNT"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleAuthMode} style={{marginTop: 25, alignItems: 'center'}}>
                 <Text style={{color: '#808e9b', fontSize: 12}}>{isLoginMode ? "Don't have an account? Register now >" : "< Return to Login"}</Text>
              </TouchableOpacity>
            </View>
         </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- VIEW: MAIN DASHBOARD ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>MED•MONITOR <Text style={{fontWeight:'300', fontSize: 16}}>v.13</Text></Text>
            {/* Added Device Info Display */}
            <Text style={{color: '#808e9b', fontSize: 10, marginTop: 4}}>USER: {user.email}</Text>
            <Text style={{color: '#808e9b', fontSize: 10}}>DEVICE: {myDeviceName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={{padding: 5}}>
             <MaterialIcons name="logout" size={24} color="#ff6b6b" />
          </TouchableOpacity>
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
              {currentBpm > 0 ? currentZone.label : 'STANDBY'}
            </Text>
            <Text style={styles.zoneDesc}>
              {currentBpm > 0 ? currentZone.desc : 'Press Start to Diagnose'}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
               <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ed573', marginRight: 5}} />
               <Text style={{color: '#2ed573', fontSize: 10}}>CLOUD SYNC ACTIVE</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isRecording ? '#ff4757' : '#2ed573' }]}
            onPress={() => setIsRecording(!isRecording)}
          >
            <Text style={styles.btnText}>
              {isRecording ? "STOP SCANNING" : "START MONITORING"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>EKG HISTORY</Text>
            <MaterialIcons name="multiline-chart" size={20} color="#57606f" />
          </View>

{chartData ? (
            <LineChart
              data={chartData}
              // ВИПРАВЛЕННЯ ТУТ: Зменшуємо ширину, щоб влізло в картку
              width={screenWidth - 72} 
              height={220}
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#1e272e",
                backgroundGradientFrom: "#1e272e",
                backgroundGradientTo: "#1e272e",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "3", strokeWidth: "1", stroke: "#1e272e" }
              }}
              bezier
              // ВИПРАВЛЕННЯ ТУТ: Прибираємо зайві відступи стилю, якщо вони заважають
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>NO SIGNAL</Text>
            </View>
          )}

          {/* Time Filter */}
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

          {/* Device Filter */}
          <Text style={{color: '#57606f', fontSize: 10, marginTop: 15, marginBottom: 5, fontWeight: 'bold'}}>DEVICE SOURCE:</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {uniqueDevices.map(devId => (
              <TouchableOpacity 
                key={devId} 
                style={[
                  styles.filterChip, 
                  visibleDevices.includes(devId) ? styles.filterActive : styles.filterInactive,
                  devId === myDeviceId ? { borderColor: '#00d2d3' } : { borderColor: '#a29bfe' }
                ]}
                onPress={() => toggleDeviceVisibility(devId)}
              >
                <Text style={[styles.filterText, visibleDevices.includes(devId) ? { color: '#1e272e' } : { color: '#808e9b' }]}>
                  {devId === myDeviceId ? "THIS DEVICE" : devId.slice(0, 6)}
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
  safeArea: { flex: 1, backgroundColor: '#0f0f12' }, 
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
    width: '90%', // For Auth screen centering
    alignSelf: 'center',
  },
  
  // Inputs for Login
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2f3542', borderRadius: 10, marginBottom: 15, paddingHorizontal: 15, height: 50 },

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
  chart: { marginVertical: 8, borderRadius: 16, paddingRight: 40 },
  noDataContainer: { height: 220, justifyContent: 'center', alignItems: 'center', borderColor: '#485460', borderWidth: 1, borderRadius: 16, borderStyle: 'dashed' },
  noDataText: { color: '#485460', fontSize: 18, letterSpacing: 2 },

  filterContainer: { flexDirection: 'row', backgroundColor: '#0f0f12', borderRadius: 10, padding: 4, marginTop: 10 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeFilterBtn: { backgroundColor: '#485460' },
  filterText: { color: '#808e9b', fontSize: 12, fontWeight: 'bold' },
  activeFilterText: { color: '#fff' },

  // Device Filter Chips
  filterChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  filterActive: { backgroundColor: '#fff', borderColor: '#fff' },
  filterInactive: { backgroundColor: 'transparent' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: '#1e272e', padding: 15, borderRadius: 15, marginHorizontal: 4, alignItems: 'center' },
  statLabel: { color: '#808e9b', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  resetLink: { alignItems: 'center', padding: 10 },
  resetText: { color: '#ff4757', fontSize: 12, letterSpacing: 1, opacity: 0.8 },
});