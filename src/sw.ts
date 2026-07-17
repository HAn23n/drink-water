/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
}

self.addEventListener('push', (event) => {
  const payload: PushPayload = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Drink Water', {
      body: payload.body ?? 'ถึงเวลาดื่มน้ำแล้ว 💧',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
