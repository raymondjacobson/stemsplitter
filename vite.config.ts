import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { UserConfig, defineConfig } from 'vite'
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react'
// import nodePolyfills from 'rollup-plugin-polyfill-node'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

function replaceNodeImports(): Plugin {
  return {
    name: 'replace-node-imports',
    generateBundle(options, bundle) {
      // Iterate over all the generated files in the bundle
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          // Replace 'crypto', 'fs', and 'stream' with their 'node:' counterparts
          chunk.code = chunk.code
            // Match various patterns for `crypto`, `fs`, and `stream` imports
            .replace(/from\s*['"]crypto['"]/g, 'from "node:crypto"')
            .replace(/from\s*['"]fs['"]/g, 'from "node:fs"')
            .replace(/from\s*['"]stream['"]/g, 'from "node:stream"');
        }
      }
    },
  };
}

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
      }),
      replaceNodeImports()
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
