/**
 * Deployment configuration checker. Docker cannot run in every environment,
 * so this validates what can be checked statically: compose structure, volume
 * and file references, interpolation defaults, secret hygiene and that the
 * integration variables are documented consistently.
 *
 * Run with `npm run test:config`.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

let failures = 0
function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ok    ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const compose = read('docker-compose.yml')
const envExample = read('deploy/.env.example')
const docs = read('docs/ENVIRONMENT_CONFIGURATION.md')
const nginx = read('deploy/nginx.conf')
const ci = read('.github/workflows/ci.yml')

console.log('\nCompose structure')
for (const service of ['db', 'api', 'web', 'backup', 'clamav']) {
  check(`service "${service}" is declared`, new RegExp(`^  ${service}:`, 'm').test(compose))
}
for (const file of ['apps/api/Dockerfile', 'apps/web/Dockerfile', 'deploy/nginx.conf', 'deploy/backup-loop.sh']) {
  check(`${file} exists`, fs.existsSync(path.join(root, file)))
}

const declaredVolumes = new Set(
  [...compose.matchAll(/^volumes:\n((?: {2}\S.*\n)+)/gm)].flatMap((match) =>
    match[1].trim().split('\n').map((line) => line.trim().replace(/:$/, '')),
  ),
)
const usedVolumes = [...compose.matchAll(/^\s+- (\S+):\/[^\n]+$/gm)]
  .map((match) => match[1])
  .filter((volume) => !volume.startsWith('.') && !volume.startsWith('/'))
for (const volume of new Set(usedVolumes)) {
  check(`volume "${volume}" is declared`, declaredVolumes.has(volume))
}
check('clamav state has a persistent volume', usedVolumes.includes('clamav-data'))

console.log('\nInterpolation and secrets')
const interpolations = [...compose.matchAll(/\$\{([A-Z0-9_]+)([^}]*)\}/g)]
check('compose interpolation is present', interpolations.length > 0)
const required = new Set([...compose.matchAll(/\$\{([A-Z0-9_]+):\?/g)].map((match) => match[1]))
for (const [raw, name, modifier] of interpolations) {
  if (!modifier && !required.has(name)) check(`\${${name}} has a default or required guard`, false, raw)
}
check('database and JWT secrets require explicit values', /\$\{POSTGRES_PASSWORD:\?/.test(compose) && /\$\{JWT_SECRET:\?/.test(compose))
check('no literal production secrets in compose', !/(?:password|secret|token)\s*:\s*(?!\$\{)[A-Za-z0-9+/=]{24,}/i.test(compose))

console.log('\nIntegration wiring')
for (const name of ['CLAMAV_HOST', 'CLAMAV_PORT', 'CLAMAV_TIMEOUT_MS', 'UPLOAD_SCAN_REQUIRED', 'OTEL_EXPORTER_OTLP_ENDPOINT', 'OTEL_SERVICE_NAME']) {
  check(`${name} is wired in compose`, compose.includes(name))
  check(`${name} is documented`, docs.includes(name))
}
check('VAPID keys are forwarded and documented', compose.includes('VAPID_PRIVATE_KEY') && docs.includes('VAPID_PRIVATE_KEY'))
check('clamav image is pinned to a release channel', /image: clamav\/clamav:\S+/.test(compose))
check('the optional scan profile is documented', envExample.includes('--profile scan'))

console.log('\nReverse proxy and CI')
check('nginx proxies /api to the api service', nginx.includes('proxy_pass http://alumniconnect_api'))
check('nginx disables buffering for the presence stream', /location = \/api\/metaverse\/rooms\/stream[\s\S]*?proxy_buffering off;/.test(nginx))
check('nginx caps upload size above the API limit', nginx.includes('client_max_body_size 22m'))
check('nginx sends baseline security headers', nginx.includes('X-Content-Type-Options') && nginx.includes('X-Frame-Options'))
check('CI runs typecheck, build and tests', ['typecheck', 'build', 'test:unit', 'test:smoke'].every((step) => ci.includes(step)))
check('CI does not hardcode credentials', !/password:\s*['"]?[A-Za-z0-9]{16,}/i.test(ci))

console.log('\nDocumented deployment variables')
const composeVariables = new Set([...compose.matchAll(/\$\{([A-Z0-9_]+)/g)].map((match) => match[1]))
for (const name of ['POSTGRES_PASSWORD', 'JWT_SECRET', 'APP_URL', 'WEB_PORT']) {
  check(`${name} is used by compose`, composeVariables.has(name))
}
check('env example keeps VAPID secrets empty', /^VAPID_PUBLIC_KEY=\s*$/m.test(envExample) && /^VAPID_PRIVATE_KEY=\s*$/m.test(envExample))

console.log(failures === 0 ? '\nDeployment configuration: all checks passed' : `\nDeployment configuration: ${failures} problem(s) found`)
if (failures > 0) process.exitCode = 1
