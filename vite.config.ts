import { defineConfig } from "vite"

import packageJson from "./package.json"

const dependencies = Object.keys({
  ...packageJson.dependencies
  // ...packageJson.devDependencies
})
//
// const noExternal = process.env.NODE_ENV === "production" ? dependencies : []

export default defineConfig({
  build: {
    ssr: "./src/index.ts",
    outDir: "./build",
    sourcemap: true,
    minify: false,
    rollupOptions: {}
  },
  ssr: { noExternal: dependencies }
})
