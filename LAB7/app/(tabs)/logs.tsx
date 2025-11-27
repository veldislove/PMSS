import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSystem } from '../../context/SystemContext';
import { Ionicons } from '@expo/vector-icons';

export default function Logs() {
  const { logs } = useSystem();

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.logItem}>
      <View style={styles.logLeft}>
        <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</Text>
        <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.logMiddle}>
        <View style={styles.tag}>
            <Ionicons name="sunny" size={10} color="#8E8E93" />
            <Text style={styles.tagText}>{item.illuminance} lx</Text>
        </View>
        <View style={styles.tag}>
            <Ionicons name="eye" size={10} color="#8E8E93" />
            <Text style={styles.tagText}>{item.visibility}%</Text>
        </View>
      </View>

      <View style={styles.logRight}>
         {item.isSynced ? (
             <Ionicons name="cloud-done" size={18} color="#34C759" />
         ) : (
             <Ionicons name="cloud-offline" size={18} color="#FF9500" />
         )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListHeaderComponent={<Text style={styles.headerTitle}>Recent Activity</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 10, marginLeft: 5 },
  
  logItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 3 },
  
  logLeft: { width: 80 },
  time: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  date: { fontSize: 10, color: '#8E8E93' },

  logMiddle: { flex: 1, flexDirection: 'row', gap: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  tagText: { fontSize: 12, color: '#1C1C1E' },

  logRight: { width: 30, alignItems: 'flex-end' }
});