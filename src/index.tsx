import { Hono } from "hono"
import { renderToString } from "react-dom/server"
import { z } from "zod"
import { zValidator } from '@hono/zod-validator'
import { Genre, StemCategory, UploadTrackRequest } from '@audius/sdk'
import type { AudiusSdk } from '@audius/sdk/dist/sdk'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import fetch from 'cross-fetch'

const audioShakeToken = import.meta.env.VITE_AUDIO_SHAKE_TOKEN
const environment = import.meta.env.VITE_ENVIRONMENT as 'staging' | 'production'
const apiKey = import.meta.env.VITE_AUDIUS_API_SECRET as string
const apiSecret = import.meta.env.VITE_AUDIUS_API_SECRET as string
const audioShakeCallbackUrl = import.meta.env.VITE_AUDIO_SHAKE_CALLBACK_URL as string

const app = new Hono()
app.use(logger())

let audiusSdk: AudiusSdk

const getAudiusSdk = async () => {
  // Need to dynamically import the SDK to prevent exceeding startup CPU time limit
  const { sdk } = await import('@audius/sdk')

  if (!audiusSdk) {
    audiusSdk = sdk({
      environment,
      apiKey,
      apiSecret,
      appName: 'Audius Shake'
    })
  }

  return audiusSdk
}

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
          <link rel="icon" type="image/x-icon" href="/static/favicon.ico" />
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

type AudioShakeUsageResponse = {
  clientId: string
  usage: Array<{
    month: string
    totalJobs: number
    totalMinutes: number
  }>
}

app.post(
  '/generate',
  zValidator('json', z.object({ trackId: z.string() })),
  async (c) => {
    console.log('Generate called')
    try {
      const audiusSdk = await getAudiusSdk()
      console.log('Audius SDK fetched')
      const { trackId } = c.req.valid('json')
      console.log('Track ID fetched', trackId)
      if (!trackId) {
        throw new Error('no trackId')
      }
      const track = await audiusSdk.tracks.getTrack({ trackId })
      console.log('Track fetched', track)
      if (!track) {
        throw new Error('no track found')
      }
      const link = await audiusSdk.tracks.getTrackStreamUrl({ trackId })
      console.log('Stream link fetched', link)
      if (!link) {
        throw new Error('no stream link')
      }

      const body = JSON.stringify({
        link,
        name: track.data?.title
      })
      console.log('Generate called with body', body)
      const res = await fetch('https://groovy.audioshake.ai/upload/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${audioShakeToken}`
        },
        body
      })
      const uploadJson: AudioShakeUploadResponse | AudioShakeError = await res.json()
      console.log('Generate response', uploadJson)

      if (!res.ok || 'error' in uploadJson) {
        throw new Error('message' in uploadJson ? uploadJson.message : undefined)
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
              format: 'mp3',
              name: stemOption
            },
            callbackUrl: audioShakeCallbackUrl,
            assetId: uploadJson.id
          })
        })
        const json: AudioShakeStemUploadResponse | AudioShakeError = await res.json()
        if (!res.ok || 'error' in json) {
          throw new Error('message' in json ? json.message : undefined)
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
  zValidator('query', z.object({ jobId: z.string() })),
  async (c) => {
    try {
      const { jobId } = c.req.valid('query')
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
        throw new Error('message' in json ? json.message : undefined)
      }

      return c.json(json)
    } catch (e) {
      console.error('Caught error: ', e)
      throw new HTTPException(500, { message: (e as Error).message || 'Unknown server error', cause: e })
    }
  }
)

// stem should have title, category, link
app.post(
  '/upload',
  zValidator('json', z.object({
    trackId: z.string(),
    userId: z.string(),
    isMonetized: z.boolean().default(false),
    amount: z.number().optional(),
    stems: z.array(z.object({
      job: z.object({
        metadata: z.object({
          name: z.string(),
        }),
        outputAssets: z.array(z.object({
          name: z.string(),
          link: z.string()
        }))
      })
    }))
  })),
  async (c) => {
    const audiusSdk = await getAudiusSdk()
    const { trackId, userId, isMonetized, amount, stems } = c.req.valid('json')
    const track = await audiusSdk.tracks.getTrack({ trackId })
    if (!track || !track.data || !track.data.id) {
      throw new Error('no track found')
    }
    
    for (const stem of stems) {
      let category
      switch (stem.job.metadata.name) {
        case 'vocals':
          category = StemCategory.LEAD_VOCALS
          break
        case 'instrumental':
          category = StemCategory.INSTRUMENTAL
          break
        case 'bass':
          category = StemCategory.BASS
          break
        case 'drums':
          category = StemCategory.PERCUSSION
          break
        default:
          category = StemCategory.OTHER
      }
      const trackFileResponse = await fetch(stem.job.outputAssets[0].link)
      const trackFileBuffer = Buffer.from(await trackFileResponse.arrayBuffer())
      const trackImageResponse = await fetch(track.data?.artwork?._150x150 ?? '')
      const imageFileBuffer = Buffer.from(await trackImageResponse.arrayBuffer())
      const name = stem.job.outputAssets[0].name
      const metadata: UploadTrackRequest['metadata'] = {
        title: stem.job.metadata.name,
        genre: (track.data?.genre as Genre) ?? Genre.ALTERNATIVE,
        isDownloadable: true,
        stemOf: {
          parentTrackId: trackId,
          category
        },
        origFilename: name,
        isOriginalAvailable: true
      }
      await audiusSdk.tracks.uploadTrack({
        userId,
        metadata,
        trackFile: { buffer: trackFileBuffer, name },
        coverArtFile: { buffer: imageFileBuffer }
      })
    }

    if (isMonetized && amount) {
      await audiusSdk.tracks.updateTrack({
        userId,
        trackId: track.data?.id,
        metadata: {
          isDownloadable: true,
          isDownloadGated: true,
          downloadConditions: {
            usdcPurchase: {
              price: amount,
              splits: {}
            }
          }
        }
      })
    }
    return c.json({ link: track.data?.permalink })
  }
)

// stem should have title, category, link
app.post(
  '/monetize',
  zValidator('json', z.object({
    trackId: z.string(),
    userId: z.string(),
    amount: z.number(),
  })),
  async (c) => {
    const audiusSdk = await getAudiusSdk()
    const { trackId, userId, amount } = c.req.valid('json')
    const track = await audiusSdk.tracks.getTrack({ trackId })
    if (!track || !track.data || !track.data.id) {
      throw new Error('no track found')
    }
    await audiusSdk.tracks.updateTrack({
      userId,
      trackId: track.data?.id,
      metadata: {
        isDownloadable: true,
        isDownloadGated: true,
        downloadConditions: {
          usdcPurchase: {
            price: amount,
            splits: {}
          }
        }
      }
    })
    return c.json({ link: track.data?.permalink })
  }
)

app.get('/usage', async (c) => {
  try {
    const res = await fetch('https://groovy.audioshake.ai/usage', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${audioShakeToken}`
      }
    })
    
    const json: AudioShakeUsageResponse | AudioShakeError = await res.json()
    if (!res.ok || 'error' in json) {
      throw new Error('message' in json ? json.message : undefined)
    }

    return c.json(json)
  } catch (e) {
    console.error('Caught error: ', e)
    throw new HTTPException(500, { message: (e as Error).message || 'Unknown server error', cause: e })
  }
})

export type AppType = typeof app

export default app
