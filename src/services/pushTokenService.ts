import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import api from '../api/axiosClient'

const PUSH_TOKEN_LOG_PREFIX = '[pushToken]'
const DEFAULT_ANDROID_CHANNEL_ID = 'default'

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ffffff',
  })
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) {
      return
    }

    await ensureAndroidNotificationChannel()

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      return
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId

    if (!projectId || typeof projectId !== 'string') {
      console.error(`${PUSH_TOKEN_LOG_PREFIX} projectId missing.`)
      return
    }

    // TODO: Replace the reused app icon in the expo-notifications plugin with a dedicated all-white notification icon.
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data

    try {
      await api.put('/api/users/me', { pushToken: token })
    } catch (error) {
      console.warn(`${PUSH_TOKEN_LOG_PREFIX} token save failure.`, error)
    }
  } catch (error) {
    console.warn(`${PUSH_TOKEN_LOG_PREFIX} registration failed.`, error)
  }
}
