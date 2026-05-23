import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';

export default function Signup() {
  const navigation = useNavigation();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');

  const handleSignup = () => {
    setUser({ id: '2', name });
    navigation.reset({ index: 0, routes: [{ name: 'Home' as never }] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <Button title="Create Account" onPress={handleSignup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 6 },
});
