import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Track } from '@audius/sdk'
import {
  Button,
  ThemeProvider as HarmonyThemeProvider,
  IconButton,
  IconCloudDownload,
  IconPause,
  IconPlay,
  Paper,
  Text,
  TextLink
} from '@audius/harmony'
import { Flex } from '@audius/harmony'
import { Animation } from './components/Animation'
import { PreloadImage } from './components/PreloadImage'
import { useSdk } from './hooks/useSdk'
import { AuthProvider, useAuth } from './contexts/AuthProvider'
import { Status } from './contexts/types'
import { keyframes } from '@emotion/react'
import { Scrubber } from './components/Scrubber'
import { AppType } from '..'
import { hc } from "hono/client";

const environment = import.meta.env.VITE_ENVIRONMENT as 'staging' | 'production'
const client = hc<AppType>('/');

const audiusHostname = environment === 'staging' ? 'staging.audius.co' : 'audius.co'

const loadingAnimation = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

const prettyDate = (date: Date) => {
  const now = new Date()
  // @ts-ignore
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return years === 1 ? "1 year ago" : `${years} years ago`
  if (months > 0) return months === 1 ? "1 month ago" : `${months} months ago`
  if (weeks > 0) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`
  if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  if (minutes > 0) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  if (seconds > 0) return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`
  return "just now";
}

const prettyTime = (seconds: number) => {
  const units = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
  ];

  const result = [];
  
  for (const unit of units) {
      const quotient = Math.floor(seconds / unit.seconds);
      if (quotient > 0) {
          result.push(`${quotient} ${unit.label}${quotient > 1 ? 's' : ''}`);
          seconds %= unit.seconds;
      }
  }

  return result.length > 0 ? result.join(', ') : '0 seconds';
}

const dollarsToCents = (dollars: number | string) => {
  // Ensure the input is a number and handle the conversion
  if (typeof dollars === 'number' && !isNaN(dollars)) {
    return Math.round(dollars * 100);
  } else if (typeof dollars === 'string' && !isNaN(parseFloat(dollars))) {
    return Math.round(parseFloat(dollars) * 100);
  } else {
    throw new Error('Invalid input: please provide a valid number or numeric string.');
  }
}

const Catalog = ({tracks}: {tracks: Track[]}) => {
  return (
    <Flex direction='column' gap='xl' pv='xl' w='100%'>
      <Flex ph='xl'>
        <Text variant='heading' color='subdued'>Your Tracks</Text>
      </Flex>
      {tracks.map(track => (
        <TrackTile key={track.id} track={track} />
      ))}
    </Flex>
  )
}

const TrackTile = ({track}: {track: Track}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackState, setTrackState] = useState<'idle' | 'generating' | 'generated' | 'uploading' | 'uploaded' | 'error'>(
    'idle'
  )
  const [isMonetized, setIsMonetized] = useState<boolean>(false)
  const [amount, setAmount] = useState<string>('')
  const [stems, setStems] = useState<any>()
  const [stemPlaying, setStemPlaying] = useState<any>({})

  const audioRef = useRef(new Audio())
  const { sdk } = useSdk()

  const onPlay = useCallback(async () => {
    const src = await sdk.tracks.streamTrack({ trackId: track.id })
    if (audioRef.current.src !== src) {
      audioRef.current.src = src
    }
    audioRef.current.play()
    setIsPlaying(true)
  }, [audioRef, setIsPlaying, sdk.tracks, track.id])

  const onPause = useCallback(() => {
    audioRef.current.pause()
    setIsPlaying(false)
  }, [audioRef, setIsPlaying])

  const onPlayStemFile = useCallback((link: string) => {
    setStemPlaying({...stemPlaying, [link]: true})
    if (audioRef.current.src !== link) {
      audioRef.current.src = link
    }
    audioRef.current.play()

  }, [stemPlaying, setStemPlaying])

  const onPauseStemFile = useCallback((link: string) => {
    setStemPlaying({...stemPlaying, [link]: false})
    audioRef.current.pause()
  }, [stemPlaying, setStemPlaying])

  const downloadStemFile = useCallback(async (link: string, name: string) => {
    const element = document.createElement('a')
    element.href = link
    element.download = name
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }, [])

  const handleCheckboxChange = () => {
    setIsMonetized(!isMonetized)
    if (!isMonetized) {
        setAmount('') // Clear the amount when unchecking
    }
  }

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value)
  }

  const onGenerate = useCallback(async () => {
    setTrackState('generating')
    console.log('generate stems')

    try {
      const res = await client.generate.$post({
        json: {
          trackId: track.id
        }
      })
      console.log(res)
  
      const json: { job: { id: number }}[] = await res.json()
      const jobIds = json.map(({ job }) => job.id)
      const uploadedStems = await new Promise(resolve => {
        const checkStatuses = async () => {
          try {
            const statuses = await Promise.all(jobIds.map(async jobId => {
              const res = await client.status.$get({
                query: {
                  jobId
                }
              });
              if (res.ok) {
                const json = await res.json();
                if (json.job.status === 'completed') {
                  return json;
                }
              }
              throw new Error('not resolved');
            }));
            resolve(statuses);
          } catch (e) {
            // wait for 5 seconds before polling again
            setTimeout(checkStatuses, 5000);
          }
        };
      
        checkStatuses();
      })
  
      setStems(uploadedStems)
      setTrackState('generated')
    } catch (e) {
      console.error(e)
      setTrackState('error')
    }
  }, [track, setTrackState, setStems])

  const onUpload = useCallback(async () => {
    setTrackState('uploading')
    console.log('uploading stems')

    try {
      const res = await client.upload.$post({
        json: {
          trackId: track.id,
          userId: track.user.id,
          stems,
          isMonetized,
          amount: amount ? dollarsToCents(amount) : undefined
        }
      })
      if (!res.ok) {
        throw new Error('Error uploading tracks')
      }
      console.log(res)
      setTrackState('uploaded')
    } catch (e) {
      console.error(e)
      setTrackState('error')
    }

  }, [stems, amount, isMonetized, track.id, track.user.id])

  return (
    <Flex p='xl' gap='xl' direction='column' css={{ ':hover': { backgroundColor: 'var(--harmony-n-50)' } }}>
      <Flex alignItems='flex-start' gap='xl' w='100%'>
        <Flex borderRadius='m' css={{ overflow: 'hidden' }}>
          <PreloadImage width='100' height='100' src={track.artwork?._480x480 || ''} />
        </Flex>
        <Flex direction='column' gap='m' flex={1}>
          <Flex direction='column'>
            <Text variant='label' color='subdued'>Title</Text>
            <Text variant='body' color='default'>{track.title}</Text>
          </Flex>
          <Flex direction='column'>
            <Text variant='label' color='subdued'>Link</Text>
            <TextLink
              variant='visible'
              color='default'
              href={`https://${audiusHostname}${track.permalink}`}
              textVariant='body'
              isExternal
            >
              {`${audiusHostname}${track.permalink}`}
            </TextLink>
          </Flex>
          <Flex direction='column'>
            <Text variant='label' color='subdued'>Artist</Text>
            <Text variant='body' color='default'>{track.user.name}</Text>
          </Flex>
          <Flex direction='column'>
            <Text variant='label' color='subdued'>Released</Text>
            <Text variant='body' color='default'>{prettyDate(new Date(track?.releaseDate ?? ''))}</Text>
          </Flex>
          <Flex direction='column'>
            <Text variant='label' color='subdued'>Duration</Text>
            <Text variant='body' color='default'>{prettyTime(track.duration)}</Text>
          </Flex>
        </Flex>
        <Flex direction='column' gap='xl' alignItems='flex-end'>
          <IconButton
            icon={isPlaying ? IconPause : IconPlay}
            aria-label='play'
            color='active'
            onClick={isPlaying ? onPause : onPlay}
          />
          {trackState === 'idle' || trackState === 'error'
            ? <Flex>
              <Button
                size='small'
                onClick={onGenerate}
                variant='secondary'
              >
                generate AI ✨ stems
              </Button>
            </Flex>
            : null
          }
          {trackState === 'generating'
            ? <Flex direction='column'>
              <Button
                size='small'
                variant='secondary'
                disabled
                css={{
                  backgroundImage: `linear-gradient(
                    to right,
                    rgba(0, 0, 0, 0.1) 0%,
                    rgba(0, 0, 0, 0.05) 25%,
                    rgba(0, 0, 0, 0.0) 50%,
                    rgba(0, 0, 0, 0.05) 75%,
                    rgba(0, 0, 0, 0.1) 100%
                  )`,
                  backgroundSize: '300%',
                  backgroundPosition: '0% 0%',
                  animation: `${loadingAnimation} 5s ease-in-out infinite`
                }}
              >
                generating stems...
              </Button>
              <Text color='subdued' strength='strong' variant='body'>This may take a minute</Text>
            </Flex>
            : null
          }
          {trackState === 'generated'
            ? <Flex direction='column' gap='m' alignItems='flex-end'>
              <Flex>
                <Button
                  size='small'
                  variant='secondary'
                  onClick={onUpload}
                >
                  upload to Audius
                </Button>
              </Flex>
              <Flex as='label' justifyContent='space-between' alignItems='center' gap='s'>
                <Text variant='label' color='subdued'>Monetize Downloads</Text>
                <input
                    type="checkbox"
                    checked={isMonetized}
                    onChange={handleCheckboxChange}
                    style={{
                      color: 'var(--harmony-n-400)',
                      borderRadius: '3px',
                      border: '1px solid var(--harmony-n-400)'
                    }}
                />
              </Flex>
              {isMonetized && (
                  <Flex as='label' justifyContent='space-between' alignItems='center' gap='s'>
                    <Text variant='label' color='subdued'>Enter Amount: $</Text>
                    <input
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        style={{
                          color: 'var(--harmony-n-400)',
                          borderRadius: '3px',
                          border: '1px solid var(--harmony-n-400)'
                        }}
                    />
                  </Flex>
              )}
            </Flex>
            : null
          }
          {trackState === 'uploading'
            ? <Flex direction='column'>
              <Button
                size='small'
                variant='secondary'
                disabled
                css={{
                  backgroundImage: `linear-gradient(
                    to right,
                    rgba(0, 0, 0, 0.1) 0%,
                    rgba(0, 0, 0, 0.05) 25%,
                    rgba(0, 0, 0, 0.0) 50%,
                    rgba(0, 0, 0, 0.05) 75%,
                    rgba(0, 0, 0, 0.1) 100%
                  )`,
                  backgroundSize: '300%',
                  backgroundPosition: '0% 0%',
                  animation: `${loadingAnimation} 5s ease-in-out infinite`
                }}
              >
                uploading to Audius...
              </Button>
              <Text color='subdued' strength='strong' variant='body'>This may take a minute</Text>
            </Flex>
            : null
          }
          {trackState === 'uploaded'
            ? <Flex>
              <Button
                size='small'
                variant='secondary'
                css={{ backgroundColor: 'var(--harmony-light-green)', color: 'var(--harmony-white)'}}
                disabled
              >
                uploaded
              </Button>
            </Flex>
            : null
          }
          {trackState === 'error'
            ? <Flex>
              <Text
                variant='label'
                color='danger'
              >
                Error. Please Try Again.
              </Text>
            </Flex>
            : null
          }
        </Flex>
      </Flex>
      {trackState === 'generated' || trackState === 'uploading' || trackState === 'uploaded'
        ? <Flex direction='column' gap='l'>
            <Text variant='label' color='accent'>AI Generated Stems ✨</Text>
            {stems?.map((stem: any) => {
              const link = stem.job.outputAssets[0].link
              const category = stem.job.metadata.name
              const name = stem.job.outputAssets[0].name
              const isPlaying = stemPlaying[link]
              return (
                <Flex key={link} gap='l' alignItems='flex-start' border='strong' borderRadius='s' p='m'>
                  <IconButton
                    icon={isPlaying ? IconPause : IconPlay}
                    aria-label='play'
                    color='active'
                    size='s'
                    onClick={() => isPlaying ? onPauseStemFile(link) : onPlayStemFile(link)}
                  />
                  <IconButton
                    icon={IconCloudDownload}
                    aria-label='play'
                    color='active'
                    size='s'
                    onClick={() => downloadStemFile(link, name)}
                  />
                  <Flex direction='column'>
                    <Text variant='label' color='subdued'>{category}</Text>
                    <Text variant='body' color='default'>{name}</Text>
                  </Flex>
                </Flex>
              )
            })}
          </Flex>
        : null
      }
      {track.stems?.length > 0
        ? <Flex direction='column' gap='l'>
            <Text variant='label' color='accent'>Existing Stems</Text>
            {track.stems?.map((stem: { id: string, category: string, orig_filename: string }) => {
              const category = stem.category
              const name = stem.orig_filename
              return (
                <Flex key={stem.id} gap='l' alignItems='flex-start' border='strong' borderRadius='s' p='m'>
                  <Flex direction='column'>
                    <Text variant='label' color='subdued'>{category}</Text>
                    <Text variant='body' color='default'>{name}</Text>
                  </Flex>
                </Flex>
              )
            })}
          </Flex>
        : null }
      <Scrubber audioRef={audioRef} />
    </Flex>
  )
}

const Page = () => {
  const loginWithAudiusButtonRef = useRef<HTMLDivElement>(null)
  const { sdk } = useSdk()
  const { user, login, status } = useAuth()

  useEffect(() => {
    sdk.oauth?.init({
      env: environment,
      successCallback: async (u, token) => {
        const userRes = await sdk.users.getUser({ id: u.userId })
          if (!userRes?.data) {
            return
          }
    
          const user = userRes.data
          login(user, token)
      },
      errorCallback: (error: string) => console.log('Got error', error)
    })

    if (loginWithAudiusButtonRef.current) {
      sdk.oauth?.renderButton({
        element: loginWithAudiusButtonRef.current,
        scope: 'write'
      })
    }
  }, [loginWithAudiusButtonRef, sdk.users, sdk.oauth, login])

  const [tracks, setTracks] = useState<Track[]>([])

  const fetchTracks = useCallback(async () => {
    const { data: tracks } = await sdk.users.getTracksByUser({
      id: user?.id ?? '',
      userId: user?.id ?? ''
    })
    const dn = await sdk.services.discoveryNodeSelector.getSelectedEndpoint()
    const tracksWithStems = await Promise.all((tracks ?? []).map(
      async track => {
        try {
          const stems = await (await fetch(`${dn}/v1/full/tracks/${track.id}/stems`)).json()
          track.stems = stems.data
          return track
        } catch (e) {
          track.stems = []
          return track
        }
      }
    ))

    setTracks(tracksWithStems ?? [])
  }, [sdk, user, setTracks])

  useEffect(() => {
    if (user) {
      fetchTracks()
    }
  }, [user, fetchTracks])

  if (status === Status.LOADING) {
    return null
  }

  return (<>
    <style>{`.audiusLoginButton { font-family: 'Avenir Next LT Pro' };`}</style>
    <Flex pv='3xl' direction='column' alignItems='center' backgroundColor='surface1' w='100vw' h='100%' css={{ overflow: 'scroll', minHeight: '100vh', userSelect: 'none' }} gap='xl'>
      <Animation size={user ? 'small' : 'large'} />
      <Flex p='3xl' w='100%' direction='column' gap='xl'>
      {user
        ?
        (
          <Paper>
            <Catalog tracks={tracks} />
          </Paper>
          ) : (
            <Flex alignItems='center' justifyContent='center'>
              <Flex direction='column' gap='l' w='50%'>
              <Text variant='body' color='default'>
                <Text variant='body' strength='strong'>stem splitter</Text> lets you take your tracks on Audius, split them up into stems using AI✨ and attach them back
                onto your track. Offer bundled releases, host remix competitions, and reach more fans with just a few clicks.
              </Text>
              <Flex alignItems='center' gap='s'>
                <Text variant='body' color='default'>
                  powered by
                </Text>
                <img width='100' src="https://developer.audioshake.ai/img/audioshake-logo-black.svg" />
              </Flex>
              <Flex>
                <div ref={loginWithAudiusButtonRef} />
              </Flex>
              </Flex>
            </Flex>
          )
        }
      </Flex>
    </Flex>
    </>
  )
}

export default function App() {
  return (
    <HarmonyThemeProvider theme='day'>
      <AuthProvider>
        <Page />
      </AuthProvider>
    </HarmonyThemeProvider>
  )
}
