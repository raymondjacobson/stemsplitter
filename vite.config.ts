import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
// import commonjs from 'vite-plugin-commonjs'
import { UserConfig, defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react'
// import { cjsInterop } from "vite-plugin-cjs-interop"
import wasm from 'vite-plugin-wasm'
import resolve from '@rollup/plugin-node-resolve'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
// import { resolve } from 'path'
import rollupCjs from "@rollup/plugin-commonjs";

export default defineConfig(({ mode }) => {
  let config: UserConfig = {
    // resolve: {
    //   preserveSymlinks: true,
    // },
    plugins: [
      // react({
      //   jsxImportSource: '@emotion/react',
      //   babel: {
      //     plugins: ['@emotion/babel-plugin']
      //   }
      // }),
      // resolve(),
      // cjsInterop({
      //   dependencies: [
      //     '@coral-xyz/anchor',
      //     'lodash',
      //     'eth-sig-util',
      //     'eventemitter3'
      //   ]
      // }),
      // commonjs(),
      // rollupCjs({
      //   include: [/node_modules/],
        // exclude: ['node_modules/snake-case'],
        // requireReturnsDefault: true,
      //   // requireReturnsDefault: 'namespace',
      //   // transformMixedEsModules: true
      // }),
      // nodePolyfills(),
      pages({
        entry: 'src/index.tsx'
      }),
      // nodePolyfills({
      //   exclude: ['fs'],
      //   globals: {
      //     Buffer: true,
      //     global: true,
      //     process: true
      //   },
      //   protocolImports: true
      // }),
      wasm(),
      devServer({
        entry: 'src/index.tsx',
      }),
    ],
    // esbuild: {
    //   target:"es2018"
    // },
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
        // exclude: [/node_modules/],
        include: [/node_modules/],
        // exclude: [/node_modules\/@audius\/sdk/],
        // include: [/node_modules\/@audius\/sdk/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        // plugins: [rollupCjs({ extensions: [".js", ".ts"] })]
      }
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

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import svgr from 'vite-plugin-svgr'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'
// import wasm from 'vite-plugin-wasm'

// export default defineConfig({
//   plugins: [
//     react({
//       jsxImportSource: '@emotion/react',
//       babel: {
//         plugins: ['@emotion/babel-plugin']
//       }
//     }),
//     wasm(),
//     svgr(),
//     devServer({
//       entry: 'src/index.tsx',
//     }),
    
//     nodePolyfills({
//       exclude: ['fs'],
//       globals: {
//         Buffer: true,
//         global: true,
//         process: true
//       },
//       protocolImports: true
//     }),
//     pages({
//       entry: 'src/index.tsx',
//       minify: false
//       // external: ['node_modules/*']
//     }),
//   ],
//   build: {
//     commonjsOptions: {
//       include: [/node_modules/],
//       transformMixedEsModules: true
//     }
//   }
// })
