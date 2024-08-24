import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { UserConfig, defineConfig } from 'vite'
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react'
// import nodePolyfills from 'rollup-plugin-polyfill-node'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [
        react(),
      ],
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis'
          },
          // plugins: [
          //   NodeGlobalsPolyfillPlugin({
          //     buffer: true,
          //   })
          // ]
        }
      },
      build: {
        rollupOptions: {
          input: './src/client/main.tsx',
          output: {
            entryFileNames: 'static/client/main.js',
          },
        },
      }
    } as UserConfig
  }

  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ['crypto', 'stream', 'fs']
      }),
      pages({
        entry: 'src/index.tsx'
      }),
      devServer({
        entry: 'src/index.tsx'
      })
    ],
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        // plugins: [
        //   NodeGlobalsPolyfillPlugin({
        //     buffer: true
        //   })
        // ]
      }
    }
  } as UserConfig
})
