import { sdk } from '@audius/sdk'

const environment = import.meta.env.VITE_ENVIRONMENT as 'staging' | 'production'
const apiKey = import.meta.env.VITE_AUDIUS_API_KEY as string

const instance = sdk({
  environment,
  apiKey
})

export const useSdk = () => ({ sdk: instance })
