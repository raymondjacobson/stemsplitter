import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { sdk } from '@audius/sdk'
import fetch from 'cross-fetch'

const audioShakeToken = ''

const app = new Hono()
const audiusSdk = sdk({
  environment: 'staging',
  apiKey: '54121fbe1b6a7391a3b7edc548135ace6ef47c9b',
  apiSecret: '1978effdaa2d44af26a72945c7d79533719aa704acc0b68aeef5d6b93b55da6c'
})

app.post('/original', async (c) => {
  const trackId = c.req.param('trackId')
  if (!trackId) {
    throw new Error('no trackId')
  }
  const track = await audiusSdk.tracks.getTrack({ trackId })
  if (!track) {
    throw new Error('no track found')
  }
  const link = await audiusSdk.tracks.streamTrack({ trackId })
  if (!link) {
    throw new Error('no stream link')
  }

  // {
  //   name: "<Your-File.mp3>",
  //   id: "clmgn7nkg50527f0mulbhwi6z8",
  //   fileType: "audio/mpeg",
  //   format: "mp3",
  //   link: "<LINK TO FILE>",
  // }
  const uploadResponse = await fetch('https://groovy.audioshake.ai/upload/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${audioShakeToken}`
    },
    body: JSON.stringify({
      link,
      name: track.data?.title
    })
  })
  .then(response => response.json())

  // {
  //   job: {
  //     id: "clmgndrvo001neumu6nr7gt9i",
  //     clientId: "<YOUR CLIENT ID>",
  //     requestId: "clmgndrvo001neumu6nr7gt9i",
  //     metadata: {
  //       format: "wav",
  //       name: "vocals"
  //     },
  //     callbackUrl: "https://example.com/webhook/vocals",
  //     assetId: "abc123"
  //   },
  // }
  const json = await fetch('https://groovy.audioshake.ai/job/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${audioShakeToken}`
    },
    body: JSON.stringify({
      metadata: {
        format: 'wav',
        name: 'vocals'
      },
      callbackUrl: '',
      assetId: uploadResponse.id
    })
  })
  .then(response => response.json())
  
  return c.json(json)
})

app.get('/status', async (c) => {
  const jobId = c.req.param('jobId')
  if (!jobId) {
    throw new Error('no jobId')
  }
  // Poll for completion of job
  const res = await fetch(`https://groovy.audioshake.ai/job/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${audioShakeToken}`
    }
  })
  .then(response => response.json())
  return c.json(res)
})

// stem should have title, category
app.post('/stems', async (c) => {
  const body = await c.req.json()
  const trackId = body.trackId
  const track = await audiusSdk.tracks.getTrack({ trackId })
  if (!track) {
    throw new Error('no track found')
  }

  for (const stem of body.stems) {
    await audiusSdk.tracks.uploadTrack({
      metadata: {
        ...track.data,
        title: stem.title,
        isDownloadable: 'true',
        // @ts-ignore
        stemOf: {
          parent_track_id: trackId,
          category: stem.category
        } 
      }
    })
  }
  return c.json({ link: track.data?.permalink })
})

app.get('/', (c) => {
  return c.text('Hello')
})

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
