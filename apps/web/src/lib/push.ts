export type PushStatus = { enabled: boolean; publicKey: string | null; subscriptions: number; keyId?: string | null }

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  return existing ?? navigator.serviceWorker.register('/sw.js')
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

function base64Url(bytes: ArrayBuffer): string {
  let value = ''
  for (const byte of new Uint8Array(bytes)) value += String.fromCharCode(byte)
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** True when the existing subscription was created with the server's current key. */
export function subscriptionUsesKey(subscription: PushSubscription, publicKey: string): boolean {
  const current = subscription.options?.applicationServerKey
  if (!current) return false
  return base64Url(current as ArrayBuffer) === publicKey.replace(/=+$/, '')
}

export async function enablePush(publicKey: string): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error('This browser does not support device notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')
  const registration = await ensureRegistration()
  const existing = await registration.pushManager.getSubscription()
  if (existing && subscriptionUsesKey(existing, publicKey)) return existing
  // Rotated server keys invalidate old subscriptions; replace them transparently.
  if (existing) await existing.unsubscribe().catch(() => null)
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
}

export async function disablePush(): Promise<string | null> {
  const existing = await currentPushSubscription()
  if (!existing) return null
  const endpoint = existing.endpoint
  await existing.unsubscribe().catch(() => null)
  return endpoint
}
