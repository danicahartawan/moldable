import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// next/navigation's router only exists inside a running Next app; components that navigate get this stand-in.
export const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }
vi.mock('next/navigation', async (original) => ({ ...(await original<typeof import('next/navigation')>()), useRouter: () => router }))
