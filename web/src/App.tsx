import { useEffect, useRef, useState } from 'react'
import { Track } from '@audius/sdk'
import {
  Button,
  Divider,
  ThemeProvider as HarmonyThemeProvider,
  Paper,
  Text
} from '@audius/harmony'
import { Flex } from '@audius/harmony'
import { Animation } from './components/Animation'
import { PreloadImage } from './components/PreloadImage'
import { useSdk } from './hooks/useSdk'
import { AuthProvider, useAuth } from './contexts/AuthProvider'
import { Status } from './contexts/types'

const environment = import.meta.env.VITE_ENVIRONMENT as 'staging' | 'production'

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

const Catalog = ({tracks}: {tracks: Track[]}) => {
  return (
    <Flex direction='column' gap='xl' p='xl'>
      <Text variant='heading' color='subdued'>Your Tracks</Text>
      {tracks.map(track => (
        <TrackTile key={track.id} track={track} />
      ))}
    </Flex>
  )
}

const TrackTile = ({track}: {track: Track}) => {
  return (
    <Flex gap='m' w='100%'>
      <Flex borderRadius='m' w='50px' h='50px' css={{overflow: 'hidden' }}>
        <PreloadImage src={track.artwork?._480x480 || ''} />
      </Flex>
      <Flex direction='column' gap='m' w='100%'>
        <Flex direction='column'>
          <Text variant='label' color='subdued'>Title</Text>
          <Text variant='body' color='default'>{track.title}</Text>
        </Flex>
        <Flex direction='column'>
          <Text variant='label' color='subdued'>Released</Text>
          {/* @ts-ignore */}
          <Text variant='body' color='default'>{prettyDate(new Date(track.releaseDate))}</Text>
        </Flex>
        <Button size='small' variant='tertiary'>
          generate stems
        </Button>
        <Divider />
      </Flex>
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
    <Flex pv='3xl' direction='column' alignItems='center' backgroundColor='surface1' w='100vw' css={{ overflow: 'scroll', minHeight: '100vh' }} gap='xl'>
      <Animation />
      <Flex w='50%' direction='column' gap='xl'>
      {user
        ?
        (
          <Paper>
          <Flex>
            <Catalog tracks={tracks} />
          </Flex>
          </Paper>
          ) : (
            <>
            <Text variant='body' color='default'>
              <Text variant='body' strength='strong'>audius shake</Text> lets you take your tracks on Audius, split them up into stems and attach them back
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
          </>)
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
