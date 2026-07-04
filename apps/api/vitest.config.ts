import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // integratiesuites bouwen elk het schema op (drop + migraties) tegen
    // dezelfde databank — testbestanden dus nooit parallel draaien
    fileParallelism: false,
  },
})
