import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { UserConfig, defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import wasm from 'vite-plugin-wasm'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig(({ mode }) => {
  let config: UserConfig = {
    plugins: [
      pages({
        entry: 'src/index.tsx'
      }),
      wasm(),
      devServer({
        entry: 'src/index.tsx',
      }),
      replace({
        preventAssignment: true,
        'require$$0': 'require$$0_renamed',
      }),
      commonjs({
        include: [/node_modules/],
        transformMixedEsModules: true
      })
    ],
    optimizeDeps: {
      include: ['eventemitter3'],  // Ensure it pre-bundles the dependency
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
        transformMixedEsModules: true,
      },
    }
  }

  if (mode === 'client') {
    config = {
      ...config,
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
