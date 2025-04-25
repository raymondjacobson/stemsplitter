import { useEffect, useState } from 'react'
import { Flex, Text } from '@audius/harmony'
import { hc } from 'hono/client'
import { AppType } from '../..'
import { useAuth } from '../contexts/AuthProvider'
const client = hc<AppType>('/')

type UsageData = {
  clientId: string
  usage: Array<{
    month: string
    totalJobs: number
    totalMinutes: number
  }>
}

export const UsageBanner = () => {
  const { user } = useAuth()
  const [remainingMinutes, setRemainingMinutes] = useState<number>(3000)

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await client.usage.$get()
        if (res.ok) {
          const data = await res.json() as UsageData
          const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
          const currentMonthUsage = data.usage.find((u) => u.month === currentMonth)
          const usedMinutes = currentMonthUsage?.totalMinutes || 0
          setRemainingMinutes(3000 - usedMinutes)
        }
      } catch (e) {
        console.error('Error fetching usage:', e)
      }
    }

    fetchUsage()
  }, [])

  return user ? (
    <Flex 
      w="100%" 
      p="m" 
      backgroundColor="accent" 
      justifyContent="center"
      css={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'var(--harmony-n-100)',
      }}
    >
      <Text variant="body" strength='strong' size='xs' color="heading">
        stem splitter is entirely free to use! ✨ &nbsp; shared minutes remaining this month: {remainingMinutes.toFixed(0)} 
      </Text>
    </Flex>
  ) : null
} 