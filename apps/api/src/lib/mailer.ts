import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

/**
 * Auth email delivery.
 *
 * When `SMTP_URL` (or the individual SMTP_* variables) is configured, a real
 * SMTP transport is used and delivery is reported truthfully.
 * Outside production with no transport configured, the API returns a clearly
 * labelled "preview link" so the auth flow can be tested locally without an
 * SMTP server. In production with no transport configured it never claims an
 * email was sent.
 */
export type MailResult = { delivered: boolean; previewUrl: string | null }

export function mailDeliveryConfigured(): boolean {
  return Boolean(process.env.SMTP_URL || process.env.SMTP_HOST)
}

export function appBaseUrl(): string {
  return (process.env.APP_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '')
}

function createTransporter(): Transporter | null {
  const url = process.env.SMTP_URL
  let host = process.env.SMTP_HOST
  let port = Number(process.env.SMTP_PORT ?? 587)
  let secure = process.env.SMTP_SECURE === 'true'
  let user: string | undefined
  let pass: string | undefined

  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.hostname) host = parsed.hostname
      if (parsed.port) port = Number(parsed.port)
      if (parsed.protocol === 'smtps:') secure = true
      user = parsed.username ?? user
      pass = parsed.password ?? pass
    } catch {
      // fall through to individual variables if the URL is malformed
    }
  }

  if (!host) return null

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  })
}

function htmlBody(actionUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>AlumniConnect</h2>
      <p>Hello,</p>
      <p>You have an account verification or security email.</p>
      <p><a href="${actionUrl}" style="color: #F29559;">Continue</a></p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>— The AlumniConnect Team</p>
    </div>`
}

export async function sendAuthMail(input: {
  to: string
  subject: string
  text: string
  actionPath: string
}): Promise<MailResult> {
  const actionUrl = `${appBaseUrl()}${input.actionPath}`

  if (!mailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[api][mail-preview] to=${input.to} subject="${input.subject}" url=${actionUrl}`)
      return { delivered: false, previewUrl: actionUrl }
    }
    console.warn('[api] email delivery is not configured; auth message was not sent.')
    return { delivered: false, previewUrl: null }
  }

  const transporter = createTransporter()
  if (!transporter) {
    console.warn('[api] SMTP host is set but a usable transport could not be created; message not delivered.')
    return { delivered: false, previewUrl: null }
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'AlumniConnect <no-reply@example.com>',
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: htmlBody(actionUrl),
    })
    console.log(`[api][mail] delivered=true messageId=${info.messageId ?? 'unknown'} to=${input.to}`)
    return { delivered: true, previewUrl: null }
  } catch (error) {
    console.error('[api][mail] delivered=false error=' + (error instanceof Error ? error.message : String(error)))
    return { delivered: false, previewUrl: null }
  }
}
