import { expect, test, type Page } from '@playwright/test'

async function prepareRecorder(page: Page) {
  await page.clock.install()
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
      onresult = null
      onerror = null
      onend = null
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 760, height: 900 }]) {
  test(`keeps recording and transcript together at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await prepareRecorder(page)
    await page.goto('/')

    const display = page.locator('.grandma-homeview')
    const displayBox = await display.boundingBox()
    expect(displayBox).not.toBeNull()
    expect(Math.abs(displayBox!.width - displayBox!.height)).toBeLessThanOrEqual(1)

    const cornerGlow = await display.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    )
    expect(cornerGlow).toContain('radial-gradient')
    expect(cornerGlow).toMatch(/(left top|0% 0%|0px 0px)/)

    await expect(page.getByRole('button', { name: 'Record' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Grandma companion' })).toBeVisible()
    await page.getByRole('button', { name: 'Record' }).click()
    await expect(page.getByRole('region', { name: 'Live transcript' })).toContainText(
      'I remember making this for Nev when he was little.',
    )
    await page.clock.fastForward(10_000)
    await expect(page.getByText('How old was Nev when that happened?')).toBeVisible()
  })
}

test('keeps the combined screen immediate with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepareRecorder(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Record' }).click()
  await page.clock.fastForward(10_000)

  await expect(page.locator('.grandma-question-rail__question[data-offset="0"]')).toHaveCSS(
    'transition-duration',
    '0s',
  )
  await expect(page.getByRole('region', { name: 'Live transcript' })).toBeVisible()
})
