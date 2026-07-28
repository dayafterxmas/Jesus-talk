import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ GitHub Pages 배포 시 반드시 확인하세요.
// 저장소 이름이 'jesus-talk'가 아니라면 아래 값을 '/실제저장소이름/'으로 바꿔주세요.
// (예: 저장소가 omj-talk 라면 → '/omj-talk/')
// Vercel / Netlify로 배포하거나 로컬에서 실행할 때는 '/' 로 두면 됩니다.
const BASE_PATH = '/jesus-talk/'

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
