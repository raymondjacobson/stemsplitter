import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { UserConfig, defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import wasm from 'vite-plugin-wasm'
import commonjs from '@rollup/plugin-commonjs'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  let config: UserConfig = {
    plugins: [
      pages({
        entry: 'src/index.tsx'
      }),
      devServer({
        entry: 'src/index.tsx',
      }),
      wasm(),
      commonjs({
        include: [/node_modules/],
        transformMixedEsModules: true
      })
    ],
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true
          })
        ]
      }
    }
  }

  if (mode === 'client') {
    config = {
      ...config,
      plugins: [
        react(),
        wasm()
      ],
      build: {
        ...config.build,
        rollupOptions: {
          input: './src/client/main.tsx',
          output: {
            entryFileNames: 'static/client/main.js',
          },
        },
      },
    }
  }
  return config
})
