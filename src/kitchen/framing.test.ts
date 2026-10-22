import { describe, expect, it } from 'vitest'
import { deviceCameraDistance } from './framing'

const FACE_SIZE = 14.55
const FOV = 30

function projectedFaceHeight(distance: number, viewportHeight: number) {
  const visibleHeight = 2 * distance * Math.tan((FOV * Math.PI) / 360)
  return (FACE_SIZE / visibleHeight) * viewportHeight
}

describe('device camera framing', () => {
  it('fills about 64% of a landscape viewport height', () => {
    const viewportWidth = 1440
    const viewportHeight = 900
    const distance = deviceCameraDistance(FACE_SIZE, FOV, viewportWidth / viewportHeight)

    expect(projectedFaceHeight(distance, viewportHeight) / viewportHeight).toBeCloseTo(0.64, 2)
  })

  it('keeps the device inside 82% of a portrait viewport width', () => {
    const viewportWidth = 390
    const viewportHeight = 844
    const aspect = viewportWidth / viewportHeight
    const distance = deviceCameraDistance(FACE_SIZE, FOV, aspect)
    const projectedWidth = projectedFaceHeight(distance, viewportHeight)

    expect(projectedWidth / viewportWidth).toBeCloseTo(0.82, 2)
  })
})
