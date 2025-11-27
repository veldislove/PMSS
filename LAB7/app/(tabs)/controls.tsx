import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSystem } from '../../context/SystemContext';
import { Ionicons } from '@expo/vector-icons';

export default function Controls() {
  const { 
    deviceState, isAutoMode, toggleAutoMode, toggleFogLights, setLedBrightness,
    isSimulatedOffline, toggleOfflineSimulation, thresholds, updateThresholds
  } = useSystem();

  return (
    <ScrollView style={styles.container}>
      
      {/* 1. Main Mode Switch */}
      <View style={styles.section}>
        <View style={styles.row}>
            <View style={styles.iconBox}>
                <Ionicons name="sparkles" size={20} color="#FF9500" />
            </View>
            <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.label}>Automatic Mode</Text>
                <Text style={styles.subLabel}>System manages lights based on sensors</Text>
            </View>
            <Switch 
                value={isAutoMode} 
                onValueChange={toggleAutoMode} 
                trackColor={{false: '#E5E5EA', true: '#FF9500'}}
            />
        </View>
      </View>

      {/* 2. Manual Controls (Visible only if Auto is OFF) */}
      <View style={[styles.section, isAutoMode && styles.disabled]}>
         <Text style={styles.sectionHeader}>Manual Override</Text>
         
         {/* Brightness */}
         <View style={styles.controlBlock}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                <Text style={styles.controlLabel}>LED Brightness</Text>
                <Text style={styles.valueText}>{deviceState.ledBrightness}%</Text>
            </View>
            <Slider
                style={{width: '100%', height: 40}}
                minimumValue={0}
                maximumValue={100}
                step={10}
                value={deviceState.ledBrightness}
                onValueChange={(val) => setLedBrightness(val)}
                minimumTrackTintColor="#FF9500"
                maximumTrackTintColor="#E5E5EA"
                thumbTintColor="#FF9500"
                disabled={isAutoMode}
            />
         </View>

         <View style={styles.separator} />

         {/* Fog Lights */}
         <View style={[styles.row, {paddingVertical: 10}]}>
            <Text style={styles.controlLabel}>Fog Lights</Text>
            <Switch 
                value={deviceState.fogLights} 
                onValueChange={toggleFogLights}
                trackColor={{false: '#E5E5EA', true: '#007AFF'}}
                disabled={isAutoMode}
            />
         </View>
      </View>

      {/* 3. Rule Configuration (Visible only if Auto is ON) */}
      {isAutoMode && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Automation Rules</Text>
            
            <View style={styles.controlBlock}>
                <View style={styles.flexRow}>
                    <Text style={styles.controlLabel}>Darkness Threshold</Text>
                    <Text style={styles.valueText}>{thresholds.luxTarget} lx</Text>
                </View>
                <Text style={styles.hint}>Turn on lights when lux is below this value</Text>
                <Slider
                    style={{width: '100%', height: 40}}
                    minimumValue={1000}
                    maximumValue={50000}
                    step={1000}
                    value={thresholds.luxTarget}
                    onValueChange={(val) => updateThresholds('luxTarget', val)}
                    minimumTrackTintColor="#8E8E93"
                    maximumTrackTintColor="#E5E5EA"
                    thumbTintColor="#8E8E93"
                />
            </View>

            <View style={styles.separator} />

            <View style={styles.controlBlock}>
                <View style={styles.flexRow}>
                    <Text style={styles.controlLabel}>Visibility Threshold</Text>
                    <Text style={styles.valueText}>{thresholds.visibilityLimit}%</Text>
                </View>
                <Text style={styles.hint}>Turn on fog lights when visibility is low</Text>
                <Slider
                    style={{width: '100%', height: 40}}
                    minimumValue={10}
                    maximumValue={80}
                    step={5}
                    value={thresholds.visibilityLimit}
                    onValueChange={(val) => updateThresholds('visibilityLimit', val)}
                    minimumTrackTintColor="#8E8E93"
                    maximumTrackTintColor="#E5E5EA"
                    thumbTintColor="#8E8E93"
                />
            </View>
          </View>
      )}

      {/* 4. Developer / Simulation */}
      <Text style={styles.groupHeader}>DEVELOPER OPTIONS</Text>
      <View style={styles.section}>
        <View style={styles.row}>
            <View style={{flex: 1}}>
                <Text style={styles.label}>Simulate Offline</Text>
                <Text style={styles.subLabel}>Disconnect from Cloud (Force Local DB)</Text>
            </View>
            <Switch 
                value={isSimulatedOffline} 
                onValueChange={toggleOfflineSimulation} 
                trackColor={{false: '#E5E5EA', true: '#FF3B30'}}
            />
        </View>
      </View>
      <View style={{height: 30}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F2F2F7' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginBottom: 15, color: '#1C1C1E' },
  groupHeader: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginLeft: 10, marginTop: 10 },
  
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF4E5', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  subLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  
  controlBlock: { paddingVertical: 5 },
  controlLabel: { fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  valueText: { fontSize: 15, fontWeight: '600', color: '#FF9500' },
  hint: { fontSize: 11, color: '#8E8E93', marginBottom: 5 },
  
  separator: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 10 },
  disabled: { opacity: 0.5, pointerEvents: 'none' } 
});