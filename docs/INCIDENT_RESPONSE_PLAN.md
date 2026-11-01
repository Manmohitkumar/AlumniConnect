# Incident Response Plan

## Process

Detect -> Assess -> Contain -> Revoke -> Recover -> Verify -> Document

## Detection

Monitor unusual logins, failed auth spikes, suspicious API patterns, permission changes, DB access, file uploads.

## API key breach

1. Identify integration.
2. Revoke key.
3. Issue replacement.
4. Update server config.
5. Review logs.
6. Verify.
7. Document.

## Token compromise

- Revoke sessions via tokenVersion increment.
- Require reauthentication.
- Review account changes.

## Database breach

- Restrict access.
- Preserve logs.
- Rotate credentials.
- Restore from trusted backup if needed.
- Verify integrity.
- Document and notify per obligations.

## Contacts

- Platform administrator (provisioned account).
- Database owner.
- Hosting provider support.
