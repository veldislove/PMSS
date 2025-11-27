import { Tabs } from 'expo-router';
import { SystemProvider } from '../../context/SystemContext';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export default function Layout() {
  return (
    <SystemProvider>
      {/* Загальний фон додатку */}
      <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}> 
        <Tabs screenOptions={{ 
          headerStyle: { backgroundColor: '#FFFFFF', shadowColor: 'transparent', elevation: 0 },
          headerTintColor: '#000000',
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          tabBarStyle: { 
            backgroundColor: '#FFFFFF', 
            borderTopWidth: 0, 
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 10,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8
          },
          tabBarActiveTintColor: '#FF9500', // Apple Amber color
          tabBarInactiveTintColor: '#8E8E93',
        }}>
          <Tabs.Screen 
            name="index" 
            options={{ 
              title: 'Home', 
              tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} /> 
            }} 
          />
          <Tabs.Screen 
            name="controls" 
            options={{ 
              title: 'Devices', 
              tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "bulb" : "bulb-outline"} size={24} color={color} /> 
            }} 
          />
          <Tabs.Screen 
            name="logs" 
            options={{ 
              title: 'History', 
              tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} /> 
            }} 
          />
        </Tabs>
      </View>
    </SystemProvider>
  );
}