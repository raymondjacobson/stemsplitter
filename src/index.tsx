import { Hono } from "hono";
import { renderToString } from "react-dom/server";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { UploadTrackRequest, sdk } from '@audius/sdk'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import fetch from 'cross-fetch'

const audioShakeToken = import.meta.env.VITE_AUDIO_SHAKE_TOKEN
const environment = import.meta.env.VITE_ENVIRONMENT as 'staging' | 'production'
const apiKey = import.meta.env.VITE_AUDIUS_API_SECRET as string
const apiSecret = import.meta.env.VITE_AUDIUS_API_SECRET as string

const app = new Hono()
app.use(logger())

const audiusSdk = sdk({
  environment,
  apiKey,
  apiSecret,
  appName: 'Audius Shake'
})

const STEM_OPTIONS = [
  'vocals',
  'instrumental',
  'bass',
  'drums'
]

app.get('/', (c) => {
  return c.html(
    renderToString(
      <html>
        <head>
          <meta charSet='utf-8' />
          <meta content='width=device-width, initial-scale=1' name='viewport' />
          {import.meta.env.PROD ? (
            <script type='module' src='/static/client/main.js'></script>
          ) : (
            <script type='module' src='/src/client/main.tsx'></script>
          )}
        </head>
        <body>
          <div id='root'></div>
          <script src='https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js'></script>
        </body>
      </html>
    )
  )
})

type AudioShakeError = {
  error: string, message: string
}

type AudioShakeUploadResponse = {
  name: string
  id: string
  fileType: 'audio/mpeg'
  format: 'mp3' | 'wav' 
  link: string
}

type AudioShakeStemUploadResponse = {
  job: {
    id: string
    clientId: string
    requestId: string
    metadata: {
      format: 'mp3' | 'wav',
      name: 'vocals'
    },
    assetId: string
  }
}

type AudioShakeStatusResponse = {
  link: string
}
  

app.post(
  '/generate',
  zValidator('json', z.object({ trackId: z.string() })),
  async (c) => {
    try {
      const { trackId } = c.req.valid('json')
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

      const res = await fetch('https://groovy.audioshake.ai/upload/link', {
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
      const uploadJson: AudioShakeUploadResponse | AudioShakeError = await uploadResponse.json()
      console.log(uploadJson)
      if (!res.ok || uploadJson.error) {
        throw new Error(uploadJson.message)
      }
  
      const stems = await Promise.all(STEM_OPTIONS.map(async stemOption => {
        const res = await fetch('https://groovy.audioshake.ai/job/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${audioShakeToken}`
          },
          body: JSON.stringify({
            metadata: {
              format: 'wav',
              name: stemOption
            },
            callbackUrl: '',
            assetId: uploadJson.id
          })
        })
        const json: AudioShakeStemUploadResponse | AudioShakeError = await response.json()
        if (!res.ok || 'error' in json) {
          throw new Error(json.message)
        }
        return json
      }))
  
      return c.json(stems)
    } catch (e) {
      console.error('Caught error: ', e)
      throw new HTTPException(500, { message: (e as Error).message || 'Unknown server error', cause: e })
    }
  }
)

app.get(
  '/status',
  zValidator('param', z.object({ trackId: z.string() })),
  async (c) => {
    try {
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
      const json: AudioShakeStatusResponse | AudioShakeError = await res.json()
      if (!res.ok || 'error' in json) {
        throw new Error(res.message)
      }

      return c.json(res)
    } catch (e) {
      console.error('Caught error: ', e)
      throw new HTTPException(500, { message: (e as Error).message || 'Unknown server error', cause: e })
    }
  }
)

// stem should have title, category, link
app.post('/upload', async (c) => {
  const body = await c.req.json()
  const trackId = body.trackId
  const userId = body.userId
  const isMonetized = body.isMonetized
  const amount = body.amount
  const track = await audiusSdk.tracks.getTrack({ trackId })
  if (!track) {
    throw new Error('no track found')
  }

  for (const stem of body.stems) {
    const trackFileResponse = await fetch(stem.link)
    const trackFileBuffer = Buffer.from(await trackFileResponse.arrayBuffer())
    const metadata: UploadTrackRequest['metadata'] = {
      ...track.data,
      title: stem.title,
      // @ts-ignore
      isDownloadable: true,
      // @ts-ignore
      stemOf: {
        parent_track_id: trackId,
        category: stem.category
      } 
    }
    if (isMonetized) {
      metadata.isDownloadGated = true
      metadata.downloadConditions = {
        usdcPurchase: {
          price: amount
        }
      }
    }
    await audiusSdk.tracks.uploadTrack({
      userId,
      metadata,
      trackFile: { buffer: trackFileBuffer },
      coverArtFile: { buffer: Buffer.from('') }
    })
  }
  return c.json({ link: track.data?.permalink })
})

export type AppType = typeof app;

export default app;