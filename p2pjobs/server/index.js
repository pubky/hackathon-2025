// Minimal registry server for dev (ESM)
import express from 'express'
import cors from 'cors'
import { Pubky } from '@synonymdev/pubky'

const app = express()
app.use(cors())
app.use(express.json())
// Disable caching on all responses
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  next()
})
const sdk = Pubky.testnet()
const DEFAULT_HOME_HOST = process.env.PUBKY_HOME_HOST || process.env.VITE_PUBKY_HOME_HOST || ''

const state = {
  pubkeys: new Set(),
  homeservers: new Map(), // pubkey -> https origin
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/pubkeys', (_req, res) => {
  res.json(Array.from(state.pubkeys))
})

app.post('/pubkeys', (req, res) => {
  const { pubkey, host } = req.body || {}
  if (!pubkey || typeof pubkey !== 'string') return res.status(400).json({ error: 'pubkey required' })
  state.pubkeys.add(pubkey)
  if (host && typeof host === 'string') state.homeservers.set(pubkey, host)
  res.json({ ok: true })
})

app.get('/applications', async (req, res) => {
  const employer = req.query.employer
  if (!employer || typeof employer !== 'string') return res.status(400).json({ error: 'employer required' })
  const APPS_DIR = '/pub/p2pjobs/applications/'
  const out = []
  const tasks = []
  const pks = Array.from(state.pubkeys)
  for (const pk of pks) {
    const dirAddr = `pubky://${pk}${APPS_DIR}`
    tasks.push((async () => {
      try {
        // Shallow list of application files for this user
        const names = await sdk.publicStorage.list(dirAddr, null, null, 65535, true)
        if (Array.isArray(names)) {
          for (const url of names) {
            if (typeof url !== 'string' || !url.endsWith('.json')) continue
            try {
              const app = await sdk.publicStorage.getJson(url)
              if (!app || typeof app !== 'object') continue
              if ((app.employerPubkey || app.employer) !== employer) continue
              const base = url.split('/').pop() || ''
              out.push({
                ...app,
                id: app.id || base.replace(/\.json$/, ''),
                applicantPubkey: app.applicantPubkey || pk,
                url,
                createdAt: app.createdAt || (app.timestamp ? Date.parse(app.timestamp) : undefined),
              })
            } catch {}
          }
        }
      } catch {}
    })())
  }
  await Promise.all(tasks)
  out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  res.json(out)
})

app.get('/profiles/:pk', async (req, res) => {
  const pk = req.params.pk
  if (!pk || typeof pk !== 'string') return res.status(400).json({ error: 'pubkey required' })
  const PROFILE_PATH = '/pub/p2pjobs/profile.json'
  const knownHost = state.homeservers.get(pk) || DEFAULT_HOME_HOST
  const addr = knownHost ? `${knownHost}${PROFILE_PATH}?t=${Date.now()}` : `pubky://${pk}${PROFILE_PATH}`
  try {
    const data = await sdk.publicStorage.getJson(addr)
    if (!data || typeof data !== 'object') return res.status(404).end()
    return res.json(data)
  } catch (e) {
    return res.status(404).end()
  }
})

app.get('/jobs', async (_req, res) => {
  const JOBS_PATH = '/pub/p2pjobs/jobs.json'
  const out = []
  const tasks = []
  const pks = Array.from(state.pubkeys)
  for (const pk of pks) {
    const knownHost = state.homeservers.get(pk) || DEFAULT_HOME_HOST
    const addr = knownHost ? `${knownHost}${JOBS_PATH}?t=${Date.now()}` : `pubky://${pk}${JOBS_PATH}`
    tasks.push((async () => {
      try {
        const list = await sdk.publicStorage.getJson(addr)
        if (Array.isArray(list)) {
          for (const j of list) {
            if (!j || typeof j !== 'object') continue
            const id = j.id
            if (!id) continue
            out.push({ ...j, authorPubKey: j.authorPubKey || pk })
          }
        }
      } catch (e) {}
    })())
  }
  await Promise.all(tasks)
  const seen = new Set()
  const uniq = []
  for (const j of out) {
    const key = `${j.authorPubKey || ''}:${j.id}`
    if (seen.has(key)) continue
    seen.add(key)
    uniq.push(j)
  }
  uniq.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  res.json(uniq)
})

// Note: Applications are read-only via aggregation. No server-side mutations.

const PORT = process.env.PORT || 8787
app.listen(PORT)


