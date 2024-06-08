import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Track } from '@audius/sdk'
import {
  Button,
  Divider,
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

const environment = import.meta.env.VITE_ENVIRONMENT as 'staging' | 'production'

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
  const [trackState, setTrackState] = useState<'idle' | 'generating' | 'generated' | 'uploading' | 'uploaded'>(
    'idle'
  )
  const [isMonetized, setIsMonetized] = useState<boolean>(false)
  const [amount, setAmount] = useState<string>('')

  const audioRef = useRef(new Audio())
  const { sdk } = useSdk()
  useEffect(() => {
    const fn = async () => {
      if (track) {
        audioRef.current.src = await sdk.tracks.streamTrack({ trackId: track.id })
      }
    }
    fn()
  }, [track])

  const onPlay = useCallback(() => {
    audioRef.current.play()
    setIsPlaying(true)
  }, [audioRef, setIsPlaying])

  const onPause = useCallback(() => {
    audioRef.current.pause()
    setIsPlaying(false)
  }, [audioRef, setIsPlaying])

  const handleCheckboxChange = () => {
    setIsMonetized(!isMonetized)
    if (!isMonetized) {
        setAmount('') // Clear the amount when unchecking
    }
  }

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value)
  }

  return (
    <Flex p='xl' gap='xl' direction='column' css={{ ':hover': { backgroundColor: 'var(--harmony-n-50)' }}}>
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
              target='_blank'
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
            {/* @ts-ignore */}
            <Text variant='body' color='default'>{prettyDate(new Date(track.releaseDate))}</Text>
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
          {trackState === 'idle'
            ? <Flex>
              <Button
                size='small'
                variant='secondary'
              >
                generate stems
              </Button>
            </Flex>
            : null
          }
          {trackState === 'generating'
            ? <Flex>
              <Button
                size='small'
                variant='secondary'
                disabled
                css={{
                  backgroundImage: `linear-gradient(to right,
                    rgba(0,0,0,0.01)   0%, 
                    rgba(0,0,0,0.03)  25%, 
                    rgba(0,0,0,0.00)  50%, 
                    rgba(0,0,0,0.01)  75%, 
                    rgba(0,0,0,0.00) 100%
                  )`,
                  backgroundSize: '200%',
                  animation: `3s cubic-bezier(.25,.50,.75,.50) infinite ${loadingAnimation}`
                }}
              >
                generating stems...
              </Button>
            </Flex>
            : null
          }
          {trackState === 'generated'
            ? <Flex direction='column' gap='m' alignItems='flex-end'>
              <Flex>
                <Button
                  size='small'
                  variant='secondary'
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
                    />
                  </Flex>
              )}
            </Flex>
            : null
          }
          {trackState === 'uploading'
            ? <Flex>
              <Button
                size='small'
                variant='secondary'
                disabled
              >
                uploading to Audius...
              </Button>
            </Flex>
            : null
          }
          {trackState === 'uploaded'
            ? <Flex>
              <Button
                size='small'
                variant='secondary'
                css={{ backgroundColor: 'var(--harmony-light-green)'}}
                disabled
              >
                uploaded
              </Button>
            </Flex>
            : null
          }
        </Flex>
      </Flex>
      {trackState === 'generated' || trackState === 'uploading' || trackState === 'uploaded'
        ? <Flex direction='column' gap='l'>
            <Text variant='label' color='accent'>AI Generated Stems ✨</Text>
            <Flex gap='l' alignItems='flex-start' border='strong' borderRadius='s' p='m'>
              <IconButton
                icon={isPlaying ? IconPause : IconPlay}
                aria-label='play'
                color='active'
                size='s'
                onClick={isPlaying ? onPause : onPlay}
              />
              <IconButton
                icon={IconCloudDownload}
                aria-label='play'
                color='active'
                size='s'
                onClick={isPlaying ? onPause : onPlay}
              />
              <Flex direction='column'>
                <Text variant='label' color='subdued'>Vocal</Text>
                <Text variant='body' color='default'>{track.title}</Text>
              </Flex>
            </Flex>
          </Flex>
        : null
      }
    </Flex>
  )
}

const Page = () => {
  const loginWithAudiusButtonRef = useRef<HTMLDivElement>(null)

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
  }, [loginWithAudiusButtonRef])

  const { sdk } = useSdk()
  const { user, login, status } = useAuth()
  const [tracks, setTracks] = useState<Track[]>([])

  const fetchTracks = async () => {
    const { data: tracks } = await sdk.users.getTracksByUser({
      id: user?.id ?? '',
      userId: user?.id ?? ''
    })

    setTracks(tracks ?? [])
  }

  useEffect(() => {
    if (user) {
      fetchTracks()
    }
  }, [user])

  if (status === Status.LOADING) {
    return null
  }

  return (<>
    <style>{`.audiusLoginButton { font-family: 'Avenir Next LT Pro' };`}</style>
    <Flex pv='3xl' direction='column' alignItems='center' backgroundColor='surface1' w='100vw' css={{ overflow: 'scroll', minHeight: '100vh', userSelect: 'none' }} gap='xl'>
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
                <Text variant='body' strength='strong'>audius shake</Text> lets you take your tracks on Audius, split them up into stems using AI✨ and attach them back
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
