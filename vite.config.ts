import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import commonjs from 'vite-plugin-commonjs'
import { defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { cjsInterop } from "vite-plugin-cjs-interop"


export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
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
      },
      build: {
        commonjsOptions: {
          include: [/node_modules/],
          transformMixedEsModules: true
        },
        rollupOptions: {
          input: './src/client/main.tsx',
          output: {
            entryFileNames: 'static/client/main.js',
          },
        },
      },
    }
  } else {
    return {
      resolve: {
        preserveSymlinks: true,
      },
      plugins: [
        cjsInterop({
          dependencies: [
            '@coral-xyz/**',
            'lodash',
            'eth-sig-util'
          ]
        }),
        commonjs(),
        pages(),
        devServer({
          entry: 'src/index.tsx',
        }),
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
      },
    }
  }
})