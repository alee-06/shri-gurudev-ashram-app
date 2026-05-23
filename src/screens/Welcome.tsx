import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Welcome() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Login" onPress={() => navigation.navigate('Login' as never)} />
        <Button title="Sign Up" onPress={() => navigation.navigate('Signup' as never)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 16 },
});
