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

test('keeps the centered rail and right actions separated inside a translucent bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const surface = await page.locator('.project-bar-stack').evaluate((stack) => {
    const rail = getComputedStyle(stack.querySelector('.project-pill')!)
    const actions = getComputedStyle(stack.querySelector('.project-pill__actions')!)
    const bar = getComputedStyle(stack.querySelector('.project-bar')!)
    const barRect = stack.querySelector('.project-bar')!.getBoundingClientRect()
    const railRect = stack.querySelector('.project-pill')!.getBoundingClientRect()
    const actionRect = stack.querySelector('.project-pill__actions')!.getBoundingClientRect()
    return {
      railCenterDelta: Math.abs(railRect.left + railRect.width / 2 - innerWidth / 2),
      actionRightGap: barRect.right - actionRect.right,
      railBorder: rail.borderTopWidth,
      railBackground: rail.backgroundColor,
      actionsBorder: actions.borderTopWidth,
      actionsBackground: actions.backgroundColor,
      barBackground: bar.backgroundColor,
      barBackdrop: bar.backdropFilter,
    }
  })

  expect(surface.railCenterDelta).toBeLessThanOrEqual(1)
  expect(surface.actionRightGap).toBeGreaterThanOrEqual(20)
  expect(surface.actionRightGap).toBeLessThanOrEqual(40)
  expect(surface.railBorder).toBe('0px')
  expect(surface.actionsBorder).toBe('0px')
  expect(surface.railBackground).toBe('rgba(0, 0, 0, 0)')
  expect(surface.actionsBackground).toBe('rgba(0, 0, 0, 0)')
  expect(surface.barBackground).toContain('0.58')
  expect(surface.barBackdrop).toContain('blur')
})

test('shows four project pictures and scrolls to the remaining choices', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const chooser = page.getByRole('group', { name: 'Choose a project' })
  const initial = await chooser.evaluate((element) => {
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')]
    const styles = getComputedStyle(element)
    const gap = Number.parseFloat(styles.columnGap)
    const usableWidth = element.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight)
    const visibleCount = Math.floor((usableWidth + gap) / (buttons[0].offsetWidth + gap))

    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      visibleCount,
    }
  })

  expect(initial.visibleCount).toBe(4)
  expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth)

  await chooser.evaluate((element) => element.scrollTo({ left: element.scrollWidth }))
  await expect.poll(() => chooser.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
})

test('moves the project rail at thirty percent of the wheel delta', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const chooser = page.getByRole('group', { name: 'Choose a project' })
  const initialLeft = await chooser.evaluate((element) => element.scrollLeft)

  await chooser.dispatchEvent('wheel', { deltaY: 160 })

  await expect.poll(() => chooser.evaluate((element) => element.scrollLeft)).toBeGreaterThanOrEqual(initialLeft + 45)
  expect(await chooser.evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(initialLeft + 55)
})

test('curves project art around a faded orbital rail with ink action glyphs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const appearance = await page.locator('.project-bar').evaluate((bar) => {
    const items = [...bar.querySelectorAll<HTMLElement>('.project-pill__item')]
    const edge = getComputedStyle(items[0])
    const center = getComputedStyle(items[2])
    const rail = getComputedStyle(bar.querySelector('.project-pill')!)
    const action = getComputedStyle(bar.querySelector('.project-pill__action')!)
    return {
      edgeOpacity: Number(edge.opacity),
      centerOpacity: Number(center.opacity),
      edgeTransform: edge.transform,
      centerTransform: center.transform,
      mask: rail.maskImage,
      actionColor: action.color,
    }
  })

  expect(appearance.edgeOpacity).toBeLessThan(appearance.centerOpacity)
  expect(appearance.edgeTransform).not.toBe(appearance.centerTransform)
  expect(appearance.mask).toContain('linear-gradient')
  expect(appearance.actionColor).toBe('rgb(31, 28, 25)')
})

test('keeps centered projects clear of the right controls on narrower screens', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 720 })
  await page.goto('/')

  const overlapArea = await page.locator('.project-bar').evaluate((bar) => {
    const rail = bar.querySelector('.project-pill')!.getBoundingClientRect()
    const actions = bar.querySelector('.project-pill__actions')!.getBoundingClientRect()
    const overlapWidth = Math.max(0, Math.min(rail.right, actions.right) - Math.max(rail.left, actions.left))
    const overlapHeight = Math.max(0, Math.min(rail.bottom, actions.bottom) - Math.max(rail.top, actions.top))
    return overlapWidth * overlapHeight
  })

  expect(overlapArea).toBe(0)
})
