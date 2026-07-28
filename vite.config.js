import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE_PATH = '/Jesus-talk/'

// JESUS TALK — 참가자 / 관리자 / LED 송출 3화면 SPA
export default defineConfig(({ command }) => ({
  // 개발 서버(npm run dev)에서는 항상 '/' 를 사용해 로컬 확인이 편하도록 합니다.
  base: command === 'build' ? BASE_PATH : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
}))
