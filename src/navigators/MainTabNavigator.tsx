import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../constants/theme';
import HomeScreen from '../screens/main/HomeScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import TravelStackNavigator from './TravelStackNavigator';

export type MainTabParamList = {
  Home: undefined;
  Travel: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Bottom tabs define the main app areas and keep the root layout simple.
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: theme.typography.sizes.xs,
          fontWeight: theme.typography.weights.semibold,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Travel" component={TravelStackNavigator} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
