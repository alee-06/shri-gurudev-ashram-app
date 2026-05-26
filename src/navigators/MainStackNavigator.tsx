import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import SettingsScreen from '../screens/main/SettingsScreen';
import HelpSupportScreen from '../screens/main/HelpSupportScreen';
import CollectorDashboardScreen from '../screens/collector/CollectorDashboardScreen';
import CollectorVerificationScreen from '../screens/collector/CollectorVerificationScreen';

export type MainStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  CollectorDashboard: undefined;
  CollectorVerification: { bookingId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// The main app shell stays in a stack so tab screens can open global app pages without extra plumbing.
export default function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainTabs">
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="CollectorDashboard" component={CollectorDashboardScreen} />
      <Stack.Screen name="CollectorVerification" component={CollectorVerificationScreen} />
    </Stack.Navigator>
  );
}
