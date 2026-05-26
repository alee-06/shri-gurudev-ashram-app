import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import AuthNavigator from './AuthNavigator';
import MainStackNavigator from './MainStackNavigator';

// RootNavigator is intentionally small: it only switches between auth and app shells.
export default function RootNavigator() {
  const user = useAuthStore((state) => state.user);

  return <NavigationContainer>{user ? <MainStackNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
