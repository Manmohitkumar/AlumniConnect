import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

export function integrityHash(certificate: {
  code: string
  userId: string
  challengeId: string | null
  kind: string
  issuedAt: Date
}) {
  return createHash('sha256')
    .update([certificate.code, certificate.userId, certificate.challengeId ?? '', certificate.kind, certificate.issuedAt.toISOString()].join('|'))
    .digest('hex')
}

// pdf-lib standard fonts only cover WinAnsi (Latin-1); strip anything beyond it.
function toWinAnsi(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}

export type CertificatePdfData = {
  code: string
  title: string
  kind: string
  recipientName: string
  issuerName: string
  challengeTitle: string | null
  issuedAt: Date
  revokedAt: Date | null
  integrity: string
  verifyUrl: string
}

export async function renderCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  const qrPng = await QRCode.toBuffer(data.verifyUrl, { width: 220, margin: 1, errorCorrectionLevel: 'M' })

  const doc = await PDFDocument.create()
  doc.setTitle(`${data.code} — AlumniConnect recognition record`)
  doc.setAuthor('AlumniConnect')

  const page = doc.addPage([841.89, 595.28]) // A4 landscape
  const { width, height } = page.getSize()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const ink = rgb(0.09, 0.08, 0.17)
  const muted = rgb(0.42, 0.4, 0.5)
  const brand = rgb(0.29, 0.36, 0.94)
  const red = rgb(0.73, 0.11, 0.11)

  // Border frame
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: brand, borderWidth: 1.5 })
  page.drawRectangle({ x: 36, y: 36, width: width - 72, height: height - 72, borderColor: rgb(0.85, 0.84, 0.92), borderWidth: 0.75 })

  const centerX = width / 2
  page.drawText('ALUMNICONNECT', { x: centerX - 62, y: height - 96, size: 13, font: fontBold, color: brand })
  page.drawText('RECOGNITION RECORD', { x: centerX - 92, y: height - 116, size: 9, font, color: muted })

  page.drawText(toWinAnsi(data.title), { x: 64, y: height - 190, size: 22, font: fontBold, color: ink, maxWidth: width - 320 })

  page.drawText('presented to', { x: 64, y: height - 244, size: 10, font, color: muted })
  page.drawText(toWinAnsi(data.recipientName), { x: 64, y: height - 284, size: 26, font: fontBold, color: ink, maxWidth: width - 320 })

  const lines = [
    `${data.kind.replace(/_/g, ' ')}`,
    data.challengeTitle ? `Challenge: ${data.challengeTitle}` : 'Alumni appreciation',
    `Issued by ${data.issuerName}`,
    `Issued ${data.issuedAt.toISOString().slice(0, 10)}`,
  ]
  lines.forEach((line, index) => {
    page.drawText(toWinAnsi(line), { x: 64, y: height - 330 - index * 18, size: 11, font, color: muted, maxWidth: width - 320 })
  })

  page.drawText(`Certificate ID  ${data.code}`, { x: 64, y: 84, size: 9, font, color: muted })
  page.drawText(`Integrity hash (SHA-256)  ${data.integrity.slice(0, 48)}`, { x: 64, y: 64, size: 8, font, color: muted, maxWidth: width - 200 })
  page.drawText('…' + data.integrity.slice(48), { x: 64, y: 52, size: 8, font, color: muted, maxWidth: width - 200 })

  const qr = await doc.embedPng(qrPng)
  const qrSize = 130
  page.drawImage(qr, { x: width - 190, y: height - 250, width: qrSize, height: qrSize })
  page.drawText('Scan to verify', { x: width - 190, y: height - 268, size: 8, font, color: muted })
  page.drawText(data.verifyUrl.replace(/^https?:\/\//, ''), { x: width - 190, y: height - 282, size: 7, font, color: muted, maxWidth: 160 })

  const disclosure =
    'This record confirms an AlumniConnect achievement. It is alumni appreciation and platform recognition, not a university degree, credit or professional licence.'
  page.drawText(toWinAnsi(disclosure), { x: 64, y: 118, size: 8.5, font, color: muted, maxWidth: width - 128 })

  if (data.revokedAt) {
    page.drawText('REVOKED', { x: centerX - 60, y: height - 360, size: 34, font: fontBold, color: red, opacity: 0.55, rotate: degrees(-12) })
    page.drawText(`Revoked on ${data.revokedAt.toISOString().slice(0, 10)}`, { x: 64, y: height - 390, size: 10, font: fontBold, color: red })
  }

  return Buffer.from(await doc.save())
}
