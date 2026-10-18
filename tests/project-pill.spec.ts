import { expect, test } from '@playwright/test'

test('fits the complete project pill inside a 280px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 640 })
  await page.goto('/')

  const pill = page.getByRole('group', { name: 'Choose a project' })
  const bounds = await pill.boundingBox()
  const pageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(280)
  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth)
})

test('renders as a translucent floating glass surface', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const surface = await page.getByRole('group', { name: 'Choose a project' }).evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      backdropFilter: styles.backdropFilter,
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      boxShadow: styles.boxShadow,
    }
  })

  const backgroundAlpha = Number(surface.backgroundColor.match(/,\s*([\d.]+)\)$/)?.[1])
  const borderAlpha = Number(surface.borderColor.match(/,\s*([\d.]+)\)$/)?.[1])

  expect(surface.backdropFilter).toContain('blur(')
  expect(backgroundAlpha).toBeGreaterThanOrEqual(0.4)
  expect(backgroundAlpha).toBeLessThanOrEqual(0.8)
  expect(borderAlpha).toBeGreaterThanOrEqual(0.6)
  expect(borderAlpha).toBeLessThanOrEqual(0.9)
  expect(surface.boxShadow).toContain('inset')
  expect(surface.boxShadow).toContain('0.12)')
})
