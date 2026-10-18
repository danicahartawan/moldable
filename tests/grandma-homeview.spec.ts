import { expect, test, type Page } from '@playwright/test'

type Box = { x: number; y: number; width: number; height: number }

function intersects(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function isInside(inner: Box, outer: Box) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height
}

async function prepareRecorder(page: Page) {
  await page.clock.install()
  await page.route('**/api/grandma/title', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title: 'Sunday Soto Stories' }) })
  })
  await page.addInitScript(() => {
    class FakeMediaRecorder {
      state = 'inactive'
      mimeType = 'audio/webm'
      ondataavailable = null
      start() { this.state = 'recording' }
      stop() { this.state = 'inactive' }
    }
    class FakeRecognition {
      continuous = false
      interimResults = false
      onresult: ((event: Event) => void) | null = null
      onerror = null
      onend = null
      constructor() { (window as typeof window & { __grandmaRecognition?: FakeRecognition }).__grandmaRecognition = this }
      start() {}
      stop() {}
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder })
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeRecognition })
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: FakeRecognition })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    })
  })
}

async function emitFinalTranscript(page: Page) {
  const diagnostic = await page.evaluate(() => {
    const recognition = (window as typeof window & { __grandmaRecognition?: { onresult: ((event: Event) => void) | null } }).__grandmaRecognition
    if (!recognition) return 'recognition missing'
    if (!recognition.onresult) return 'onresult missing'
    recognition.onresult({
      resultIndex: 0,
      results: Object.assign([Object.assign({
        0: { transcript: 'Grandma toasted the spices slowly. Then she added the broth and waited beside the stove. The whole kitchen smelled warm and peppery.' },
        isFinal: true,
      }, { length: 1 })], { length: 1 }),
    } as unknown as Event)
    return 'emitted'
  })
  expect(diagnostic).toBe('emitted')
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 760, height: 900 }]) {
  test(`keeps Grandma HomeView clear at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await prepareRecorder(page)
    await page.goto('/grandma')

    const display = page.locator('.grandma-homeview')
    const displayBox = await display.boundingBox() as Box
    expect(Math.abs(displayBox.width - displayBox.height)).toBeLessThanOrEqual(1)
    expect(displayBox.x).toBeGreaterThan(0)
    expect(displayBox.y).toBeGreaterThan(0)
    expect(displayBox.x + displayBox.width).toBeLessThan(viewport.width)
    expect(displayBox.y + displayBox.height).toBeLessThan(viewport.height)

    const mascotBox = await page.locator('.grandma-character').boundingBox() as Box
    const recordBox = await page.getByRole('button', { name: 'Record' }).boundingBox() as Box
    expect(isInside(mascotBox, displayBox)).toBe(true)
    expect(isInside(recordBox, displayBox)).toBe(true)
    expect(intersects(mascotBox, recordBox)).toBe(false)

    await page.getByRole('button', { name: 'Record' }).click()
    await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
    await page.clock.fastForward(30_000)
    const railBox = await page.getByRole('region', { name: 'Guiding questions' }).boundingBox() as Box
    expect(isInside(railBox, displayBox)).toBe(true)
    expect(railBox.width).toBeLessThanOrEqual(displayBox.width / 3)

    await emitFinalTranscript(page)
    await expect(page.getByRole('region', { name: 'Live transcript' })).toContainText('Grandma toasted the spices slowly.')
    await expect(page.getByRole('heading', { name: 'Sunday Soto Stories' })).toBeVisible()

    const transcriptBox = await page.locator('.grandma-rolling-transcript').boundingBox() as Box
    const titleBox = await page.getByRole('heading', { name: 'Sunday Soto Stories' }).boundingBox() as Box
    expect(intersects(transcriptBox, mascotBox)).toBe(false)
    expect(intersects(transcriptBox, railBox)).toBe(false)
    expect(intersects(titleBox, mascotBox)).toBe(false)
    expect(intersects(titleBox, railBox)).toBe(false)
    expect(intersects(titleBox, transcriptBox)).toBe(false)
  })
}

test('removes Grandma orbital and rolling motion when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepareRecorder(page)
  await page.goto('/grandma')
  await page.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
  await page.clock.fastForward(30_000)
  await emitFinalTranscript(page)
  await expect(page.getByRole('region', { name: 'Live transcript' })).toBeVisible()

  const question = page.locator('.grandma-question-rail__question[data-offset="0"]')
  await page.getByRole('region', { name: 'Live transcript' }).evaluate((region) => {
    const probe = document.createElement('span')
    probe.className = 'grandma-transcript__new grandma-transcript__motion-probe'
    probe.textContent = 'Motion probe'
    region.append(probe)
  })
  const newTranscript = page.locator('.grandma-transcript__motion-probe')
  await expect(question).toBeVisible()
  await expect(newTranscript).toBeVisible()
  await expect(question).toHaveCSS('transition-duration', '0s')
  await expect(newTranscript).toHaveCSS('animation-duration', '0s')
})
