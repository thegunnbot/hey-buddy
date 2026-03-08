import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/**/*.js'],
      exclude: ['server/__tests__/**'],
    },
    // Use a separate test DB so we never touch the real one
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
    },
  },
})
