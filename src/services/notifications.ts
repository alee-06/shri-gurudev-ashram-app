import api from '../api/axiosClient'

export type NotificationItem = {
  id: string
  created_at: string
  is_read: boolean
  message: string
  title: string
  type: string
  metadata?: any
}

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const { data } = await api.get('/api/notifications')
  return data.notifications ?? []
}

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.put(`/api/notifications/${id}/read`)
}
