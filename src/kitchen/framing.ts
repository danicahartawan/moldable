export function deviceCameraDistance(faceSize: number, fieldOfView: number, aspect: number) {
  const tangent = Math.tan((fieldOfView * Math.PI) / 360)
  return Math.max(faceSize / (0.64 * 2 * tangent), faceSize / (0.82 * 2 * tangent * aspect))
}
