import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

const CIRCLE_SIZE = 68
const RING_WIDTH = 4
const OUTER_SIZE = CIRCLE_SIZE + RING_WIDTH * 2 // 76

export default function FloatingDonateButton() {
  console.log('=== FLOATING DONATE BUTTON MOUNTED ===');
  const router = useRouter()

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        onPress={() => router.push('/donation' as never)}
        style={styles.ring}
      >
        <LinearGradient
          colors={['#D49A2A', '#C4892B', '#B07518']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.circle}
        >
          <MaterialIcons name="volunteer-activism" size={24} color="#fff" />
          <Text style={styles.label}>Donate</Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  ring: {
    position: 'absolute',
    top: -28,
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b4636',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginTop: -1,
  },
})
