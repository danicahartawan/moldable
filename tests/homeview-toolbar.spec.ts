import { expect, test } from '@playwright/test'

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 760, height: 900 }]) {
  test(`keeps the HomeView square and tool ecosystem clear at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const display = page.locator('.moldable-display')
    const triggerBackground = await page.locator('.tool-rail__trigger').evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    )
    expect(triggerBackground).toContain('radial-gradient')
    expect(triggerBackground).toMatch(/(left top|0% 0%|0px 0px)/)
    const displayBox = await display.boundingBox()
    expect(displayBox).not.toBeNull()
    expect(Math.abs(displayBox!.width - displayBox!.height)).toBeLessThanOrEqual(1)
    expect(displayBox!.x).toBeGreaterThan(0)
    expect(displayBox!.y).toBeGreaterThan(0)
    expect(displayBox!.x + displayBox!.width).toBeLessThan(viewport.width)
    expect(displayBox!.y + displayBox!.height).toBeLessThan(viewport.height)

    const railBox = await page.locator('.tool-rail').boundingBox()
    const mascotBox = await page.locator('.moldable-mascot').boundingBox()
    expect(railBox).not.toBeNull()
    expect(mascotBox).not.toBeNull()
    expect(intersects(railBox!, mascotBox!)).toBe(false)

    await page.getByRole('button', { name: 'Open cooking tools' }).hover()
    await expect(page.getByRole('button', { name: 'Open cooking tools' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('toolbar', { name: 'Cooking tools' })).toHaveCSS('opacity', '1')

    const timer = page.getByRole('button', { name: 'Timer' })
    const microwave = page.getByRole('button', { name: 'Microwave' })
    await timer.hover()
    await expect(timer.locator('.tool-chip__label')).toHaveCSS('opacity', '1')
    const timerBox = await timer.boundingBox()
    const microwaveBox = await microwave.boundingBox()
    expect(timerBox!.width).toBeGreaterThan(microwaveBox!.width)
  })
}

test('removes tool motion when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open cooking tools' }).hover()

  const timer = page.getByRole('button', { name: 'Timer' })
  await timer.hover()
  await expect(timer).toHaveCSS('transition-duration', '0s')
  await expect(page.locator('.tool-rail__orbit')).toHaveCSS('transition-duration', '0s')
  await expect(page.getByRole('toolbar', { name: 'Cooking tools' })).toHaveCSS('opacity', '1')
})
