import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Org/user root site (frangione-org.github.io) serves from the domain root,
// so base is '/'. If this ever moves to a project repo, set base to '/<repo>/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
