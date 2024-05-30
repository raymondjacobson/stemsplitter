import { MouseEventHandler, useEffect, useRef, useState } from 'react'
import { sdk, full as FullSdk } from '@audius/sdk'
import {
  ThemeProvider as HarmonyThemeProvider,
  Hint,
  IconInfo,
  IconPause,
  IconPlay,
  Paper,
  Text,
  TextInput,
  TextInputSize
} from '@audius/harmony'
import { Button, Flex } from '@audius/harmony'
import { css } from '@emotion/react'
import { Animation } from './components/Animation'

type User = { userId: string; handle: string }

const audiusSdk = sdk({
  environment: 'staging',
  apiKey: '54121fbe1b6a7391a3b7edc548135ace6ef47c9b'
})

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [tracks, setTracks] = useState<FullSdk.TrackFull[]>([])
  const loginWithAudiusButtonRef = useRef<HTMLDivElement>(null)

  /**
   * Init @audius/sdk oauth
   */
  useEffect(() => {
    audiusSdk.oauth?.init({
      env: 'staging',
      successCallback: (user: User) => setUser(user),
      errorCallback: (error: string) => console.log('Got error', error)
    })

    if (loginWithAudiusButtonRef.current) {
      audiusSdk.oauth?.renderButton({
        element: loginWithAudiusButtonRef.current,
        scope: 'write'
      })
    }
  }, [])

  const fetchTracks = async () => {
    const { data: tracks } = await audiusSdk.full.users.getTracksByUser({
      id: user?.userId ?? '',
      userId: user?.userId ?? ''
    })

    setTracks(tracks ?? [])
  }

  return (
    <HarmonyThemeProvider theme='day'>
      <Flex p='4xl' direction='column' alignItems='center' backgroundColor='surface1' w='100vw' h='100vh' gap='xl'>
        <Animation />
        <Flex w='50%' direction='column' gap='xl'>
        {/* <Text color='heading' strength='strong' variant='heading' size='xs'>
          audius shake
        </Text> */}
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
        {!user
          ?
            <Flex>
              <style>{`.audiusLoginButton { font-family: 'Avenir Next LT Pro' };`}</style>
              <div ref={loginWithAudiusButtonRef} />
            </Flex>
          : <Flex>{JSON.stringify(tracks)}</Flex>
          }
        </Flex>
      </Flex>
    </HarmonyThemeProvider>
  )
}
