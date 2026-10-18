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
