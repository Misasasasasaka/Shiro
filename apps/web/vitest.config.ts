import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
      'next/server': resolve(__dirname, 'node_modules/next/server.js'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
