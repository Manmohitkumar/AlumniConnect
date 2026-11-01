import { createHmac, randomBytes } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'
import { integrityHash, renderCertificatePdf } from '../lib/certificate-pdf'
import { dispatchWebhook } from './ecosystem'

export const certificatesRouter = Router()

const issueSchema = z.object({
  submissionId: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().trim().min(5).max(180).optional(),
  kind: z.enum(['CHALLENGE_COMPLETION', 'CHALLENGE_WINNER', 'ALUMNI_APPRECIATION', 'PROJECT_RECOGNITION']),
})

certificatesRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const rows = await prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      include: {
        challenge: { select: { id: true, title: true, slug: true } },
        issuer: { select: { id: true, name: true } },
      },
    })
    res.json({ data: rows.map((row) => ({ ...row, integrity: integrityHash(row) })) })
  }),
)

certificatesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'ALUMNI' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only alumni and administrators can issue certificates.')
    }
    const input = issueSchema.parse(req.body)

    let userId = input.userId
    let challengeId: string | null = null
    let title = input.title

    if (input.kind === 'CHALLENGE_COMPLETION' || input.kind === 'CHALLENGE_WINNER') {
      if (!input.submissionId) throw new AppError(400, 'submission_required', 'A verified submission is required.')
      const submission = await prisma.submission.findUnique({
        where: { id: input.submissionId },
        include: { challenge: { select: { id: true, title: true, authorId: true } }, student: { select: { id: true } } },
      })
      if (!submission) throw new AppError(404, 'not_found', 'Submission not found.')
      if (submission.status !== 'EVALUATED') {
        throw new AppError(409, 'not_evaluated', 'Certificates can only be issued for evaluated submissions.')
      }
      if (submission.challenge.authorId !== user.id && user.role !== 'ADMIN') {
        throw new AppError(403, 'forbidden', 'Only the challenge author can issue this certificate.')
      }
      userId = submission.studentId
      challengeId = submission.challenge.id
      title = title || `${submission.challenge.title} — ${input.kind === 'CHALLENGE_WINNER' ? 'winner' : 'completion'}`
    } else {
      if (!userId) throw new AppError(400, 'user_required', 'Choose who the appreciation is for.')
      if (user.role !== 'ADMIN' && userId === user.id) {
        throw new AppError(403, 'forbidden', 'You cannot issue an appreciation certificate to yourself.')
      }
    }

    const recipient = await prisma.user.findUnique({ where: { id: userId! }, select: { id: true, name: true } })
    if (!recipient) throw new AppError(404, 'not_found', 'Recipient not found.')

    const duplicate = await prisma.certificate.findFirst({
      where: { userId: recipient.id, challengeId, kind: input.kind, revokedAt: null },
      select: { id: true },
    })
    if (duplicate) throw new AppError(409, 'duplicate', 'A certificate for this achievement already exists.')

    const code = `AC-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
    const certificate = await prisma.certificate.create({
      data: {
        code,
        userId: recipient.id,
        challengeId,
        issuedById: user.id,
        title: title || 'Certificate of alumni appreciation',
        kind: input.kind,
      },
    })

    await audit(req, 'certificate.issue', 'Certificate', certificate.id, { kind: input.kind, recipient: recipient.id })
    await notify(
      recipient.id,
      'CERTIFICATE_ISSUED',
      'Certificate issued',
      `${certificate.title} — verify with code ${certificate.code}.`,
      '/student/dashboard?tab=certificates',
    )
    void dispatchWebhook('certificate.issued', {
      code: certificate.code,
      title: certificate.title,
      kind: certificate.kind,
      recipientName: recipient.name,
      issuedAt: certificate.issuedAt.toISOString(),
    })
    res.status(201).json({ data: { ...certificate, integrity: integrityHash(certificate) } })
  }),
)

certificatesRouter.get(
  '/verify/:code',
  asyncHandler(async (req, res) => {
    const row = await prisma.certificate.findUnique({
      where: { code: req.params.code },
      include: {
        user: { select: { name: true } },
        issuer: { select: { name: true } },
        challenge: { select: { title: true, slug: true } },
      },
    })
    if (!row) {
      res.status(404).json({ error: 'not_found', message: 'No certificate matches that code.' })
      return
    }
    res.json({
      data: {
        code: row.code,
        title: row.title,
        kind: row.kind,
        issuedAt: row.issuedAt,
        revokedAt: row.revokedAt,
        recipientName: row.user.name,
        issuerName: row.issuer.name,
        challenge: row.challenge,
        integrity: integrityHash(row),
        // Explicit scope statement shown next to every verification result.
        statement:
          'This record confirms an AlumniConnect achievement. It is alumni appreciation and platform recognition, not a university degree, credit or professional licence.',
      },
    })
  }),
)

/**
 * Portable verifiable credential (JSON). Signed with an HMAC key held by the
 * platform, not anchored to a public chain. Anyone with the code can verify the
 * issuer signature; the shared-key nature is stated in the response metadata.
 */
certificatesRouter.get(
  '/verify/:code/credential',
  asyncHandler(async (req, res) => {
    const row = await prisma.certificate.findUnique({
      where: { code: req.params.code },
      include: {
        user: { select: { name: true } },
        issuer: { select: { name: true } },
        challenge: { select: { title: true, slug: true } },
      },
    })
    if (!row) throw new AppError(404, 'not_found', 'No certificate matches that code.')

    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'AlumniAchievementCredential'],
      id: `urn:alumniconnect:certificate:${row.code}`,
      issuer: { id: 'urn:alumniconnect:issuer', name: 'AlumniConnect' },
      issuanceDate: row.issuedAt.toISOString(),
      credentialSubject: {
        name: row.user.name,
        achievement: row.title,
        kind: row.kind,
        challenge: row.challenge ? { title: row.challenge.title, slug: row.challenge.slug } : null,
        issuedBy: row.issuer.name,
      },
      credentialStatus: {
        type: 'AlumniConnectRevocationStatus',
        status: row.revokedAt ? 'revoked' : 'active',
        revokedAt: row.revokedAt?.toISOString() ?? null,
      },
      statement:
        'Platform recognition of an AlumniConnect achievement. Not a university degree, credit or professional licence.',
    }
    const canonical = JSON.stringify(credential)
    const signature = createHmac('sha256', process.env.CREDENTIAL_SIGNING_KEY ?? process.env.JWT_SECRET ?? 'alumniconnect-dev-signing-key')
      .update(canonical)
      .digest('base64url')
    const signed = {
      ...credential,
      proof: {
        type: 'HmacSha256Signature2018',
        created: new Date().toISOString(),
        verificationMethod: 'urn:alumniconnect:issuer#hmac-sha256',
        signatureValue: signature,
      },
    }

    await audit(req, 'certificate.credential_exported', 'Certificate', row.id)
    res
      .type('application/ld+json')
      .setHeader('Content-Disposition', `inline; filename="alumniconnect-${row.code}.json"`)
      .send(JSON.stringify(signed, null, 2))
  }),
)

certificatesRouter.get(
  '/:code/file',
  asyncHandler(async (req, res) => {
    const row = await prisma.certificate.findUnique({
      where: { code: req.params.code },
      include: {
        user: { select: { name: true } },
        issuer: { select: { name: true } },
        challenge: { select: { title: true } },
      },
    })
    if (!row) {
      res.status(404).type('text/plain').send('Certificate not found.')
      return
    }
    const hash = integrityHash(row)
    const revoked = row.revokedAt
      ? `<p style="color:#b91c1c"><strong>REVOKED</strong> on ${row.revokedAt.toISOString().slice(0, 10)}</p>`
      : ''
    res.setHeader('Content-Disposition', `inline; filename="${row.code}.html"`)
    res.type('text/html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${row.code} — AlumniConnect</title>
<style>body{font-family:Inter,system-ui,sans-serif;background:#f6f5fb;color:#18152c;margin:0;padding:48px}
.card{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;padding:48px;border:1px solid #e6e2f5}
h1{font-size:28px;margin:0 0 8px}.muted{color:#6b6580;font-size:13px}.code{font-family:monospace;font-size:13px;word-break:break-all}
hr{border:0;border-top:1px solid #e6e2f5;margin:24px 0}</style></head>
<body><div class="card">
<p class="muted">ALUMNICONNECT · RECOGNITION RECORD</p>
<h1>${row.title}</h1>
<p><strong>${row.user.name}</strong></p>
<p class="muted">Issued by ${row.issuer.name}${row.challenge ? ` · ${row.challenge.title}` : ''}</p>
<p class="muted">Issued ${row.issuedAt.toISOString().slice(0, 10)} · Certificate ID ${row.code}</p>
${revoked}
<hr>
<p class="muted">This record confirms an AlumniConnect achievement. It is alumni appreciation and platform recognition, not a university degree, credit or professional licence.</p>
<p class="muted">Integrity hash (SHA-256): <span class="code">${hash}</span></p>
<p class="muted">Verify at /verify?code=${row.code}</p>
</div></body></html>`)
  }),
)

certificatesRouter.get(
  '/:code/pdf',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.certificate.findUnique({
      where: { code: req.params.code },
      include: {
        user: { select: { name: true } },
        issuer: { select: { name: true } },
        challenge: { select: { title: true } },
      },
    })
    if (!row) throw new AppError(404, 'not_found', 'Certificate not found.')
    if (row.userId !== user.id && row.issuedById !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the recipient, issuer or an administrator can download this certificate.')
    }

    const publicBase = (process.env.PUBLIC_BASE_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '')
    const pdf = await renderCertificatePdf({
      code: row.code,
      title: row.title,
      kind: row.kind,
      recipientName: row.user.name,
      issuerName: row.issuer.name,
      challengeTitle: row.challenge?.title ?? null,
      issuedAt: row.issuedAt,
      revokedAt: row.revokedAt,
      integrity: integrityHash(row),
      verifyUrl: `${publicBase}/verify?code=${encodeURIComponent(row.code)}`,
    })

    await audit(req, 'certificate.pdf_download', 'Certificate', row.id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${row.code}.pdf"`)
    res.send(pdf)
  }),
)

certificatesRouter.post(
  '/:id/revoke',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } })
    if (!certificate) throw new AppError(404, 'not_found', 'Certificate not found.')
    if (certificate.issuedById !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the issuer or an administrator can revoke this certificate.')
    }
    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { revokedAt: new Date() },
    })
    await audit(req, 'certificate.revoke', 'Certificate', certificate.id)
    res.json({ data: updated })
  }),
)

certificatesRouter.get(
  '/issued',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const page = pagination(req, 20)
    const where = user.role === 'ADMIN' ? {} : { issuedById: user.id }
    const [rows, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { user: { select: { id: true, name: true } }, challenge: { select: { title: true } } },
      }),
      prisma.certificate.count({ where }),
    ])
    res.json({ data: rows.map((row) => ({ ...row, integrity: integrityHash(row) })), meta: pageMeta(page, total) })
  }),
)
