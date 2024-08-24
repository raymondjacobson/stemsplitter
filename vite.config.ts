import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { UserConfig, defineConfig } from 'vite'
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react'
// import nodePolyfills from 'rollup-plugin-polyfill-node'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import replace from '@rollup/plugin-replace'
import alias from '@rollup/plugin-alias'
import resolve from '@rollup/plugin-node-resolve';



function replaceNodeImports(): Plugin {
  return {
    name: 'replace-node-imports',
    generateBundle(options, bundle) {
      // Iterate over all the generated files in the bundle
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          chunk.code = chunk.code
            // Match various patterns for `crypto` and `stream` imports
            // .replace(/from\s*['"]fs['"]/g, 'from"browserify-fs"')
            // .replace(/from\s*['"]crypto['"]/g, 'from"node:crypto"')
            // .replace(/from\s*['"]stream['"]/g, 'from"node:stream"');
            .replaceAll("\"crypto\"", "\"node:crypto\"")
            .replaceAll("\"stream\"", "\"node:stream\"")
            .replaceAll("\"fs\"", "\"browserify-fs\"")
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
      // nodePolyfills({
      //   // include: ['crypto', 'stream', 'fs']
      // }),
      pages({
        entry: 'src/index.tsx'
      }),
      devServer({
        entry: 'src/index.tsx'
      }),
      // alias({
      //   entries: [
      //     { find: 'fs', replacement: 'browserify-fs' },
      //     { find: 'crypto', replacement: 'node:crypto' },
      //     { find: 'stream', replacement: 'node:stream' }
      //   ]
      // }),
      // replace({
      //   delimiters: ['',''],
      //   sourcemap: true,
      //   verbose: true,
      //   preventAssignment: true,
      //   'from"fs"': 'from "browserify-fs"',
      //   'from"crypto"': 'from "node:crypto"',
      //   'from"stream"': 'from "node:stream"'
      // }),
      // replaceNodeImports(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true
        },
        protocolImports: true
      })
      // resolve({
      //   browser: true,
      //   preferBuiltins: false
      // })
    ],
    // build: {
    //   rollupOptions: {
    //     external: ['fwd-stream', 'readable-stream'],  // Exclude them from the bundle
    //   },
    // },
    // resolve: {
    //   // dedupe: ['fwd-stream', 'readable-stream'],  // Ensure only one version of these packages is used
    //   alias: {
    //     stream: 'stream-browserify'
    //   }
    // },
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
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true
      }
    }
  } as UserConfig
})
