import { test } from '@playwright/test'

test('show current interface for grandma', async ({ page }) => {
  await page.goto('http://localhost:5174/')
  await page.waitForLoadState('networkidle')

  // Take initial screenshot
  await page.screenshot({ path: 'output/grandma-view-initial.png', fullPage: true })

  // Show the Record button
  const recordButton = page.locator('button', { hasText: 'Record' })
  await recordButton.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'output/grandma-view-record-button.png' })

  console.log('Screenshots saved to output/ directory')
})
