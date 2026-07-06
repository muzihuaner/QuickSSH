import type { QuickSshApi } from './index'

declare global {
  interface Window {
    quickssh: QuickSshApi
  }
}

export {}
