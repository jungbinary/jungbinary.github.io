export type Point3 = { x: number; y: number; z: number }
export type InitialPoint = { x: number; y: number }

export const defaultInitial: InitialPoint = { x: 1.32, y: -0.38 }

export const minimax = {
  mu: 0.2,
  lambda: 1.15,
  duration: 24,
  playbackRate: 1.7,
  restDuration: 1.8,
  initialAngle: -0.15,
}

export function saddleValue(x: number, y: number) {
  return (minimax.mu / 2) * (x * x - y * y) + minimax.lambda * x * y
}

export function randomInitial(): InitialPoint {
  const angle = Math.random() * Math.PI * 2
  // This disk stays inside the mesh throughout the contracting spiral.
  const radius = Math.sqrt(0.9 ** 2 + Math.random() * (1.42 ** 2 - 0.9 ** 2))
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
}

// Exact solution of x' = -mu*x - lambda*y, y' = lambda*x - mu*y.
export function flowPoint(t: number, initial: InitialPoint = defaultInitial): Point3 {
  const radius = Math.exp(-minimax.mu * t)
  const angle = minimax.lambda * t
  const x = radius * (initial.x * Math.cos(angle) - initial.y * Math.sin(angle))
  const y = radius * (initial.x * Math.sin(angle) + initial.y * Math.cos(angle))
  return { x, y, z: saddleValue(x, y) }
}

// Sample the mesh along the saddle's principal directions.
const principalAngle = Math.atan2(minimax.lambda, minimax.mu) / 2
function surfacePoint(u: number, v: number): Point3 {
  const x = u * Math.cos(principalAngle) - v * Math.sin(principalAngle)
  const y = u * Math.sin(principalAngle) + v * Math.cos(principalAngle)
  return { x, y, z: saddleValue(x, y) }
}

const extent = 1.48
const gridSteps = 16
const curveSteps = 40

export const mesh = Array.from({ length: (gridSteps + 1) * 2 }, (_, index) => {
  const gridIndex = index % (gridSteps + 1)
  const fixed = -extent + (2 * extent * gridIndex) / gridSteps
  return {
    central: gridIndex === gridSteps / 2,
    points: Array.from({ length: curveSteps + 1 }, (_, step) => {
      const moving = -extent + (2 * extent * step) / curveSteps
      return index <= gridSteps
        ? surfacePoint(fixed, moving)
        : surfacePoint(moving, fixed)
    }),
  }
})

export function createFlow(initial: InitialPoint = defaultInitial) {
  const points = Array.from({ length: 541 }, (_, i) =>
    flowPoint((minimax.duration * i) / 540, initial),
  )
  const distances = [0]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    distances.push(distances[i - 1] + Math.hypot(
      b.x - a.x, b.y - a.y, (b.z - a.z) * heightScale,
    ))
  }
  return { initial, points, distances }
}

export const ballRadius = 5.4
const heightScale = 0.82
const plotScale = 59
const elevation = 0.57
export const defaultFlow = createFlow()
export const trajectory = defaultFlow.points

export const axes: { label: string; points: Point3[] }[] = [
  { label: 'x', points: [{ x: -1.9, y: 0, z: 0 }, { x: 1.9, y: 0, z: 0 }] },
  { label: 'y', points: [{ x: 0, y: -1.9, z: 0 }, { x: 0, y: 1.9, z: 0 }] },
]

export function project(point: Point3, angle: number) {
  const horizontal = point.x * Math.cos(angle) - point.y * Math.sin(angle)
  const depth = point.x * Math.sin(angle) + point.y * Math.cos(angle)
  const height = point.z * heightScale
  return {
    x: 160 + horizontal * plotScale,
    y: 116 + (depth * Math.sin(elevation) - height * Math.cos(elevation)) * plotScale,
    depth: depth * Math.cos(elevation) + height * Math.sin(elevation),
  }
}

// Intersect an orthographic viewing ray with the actual quadratic surface.
// At folds, choose the frontmost intersection inside the displayed mesh.
export function pickSurface(screenX: number, screenY: number, angle: number): Point3 | null {
  const horizontal = (screenX - 160) / plotScale
  const vertical = (screenY - 116) / plotScale
  const baseX = horizontal * Math.cos(angle)
  const baseY = -horizontal * Math.sin(angle)
  const dx = Math.sin(angle)
  const dy = Math.cos(angle)
  const heightFactor = heightScale * Math.cos(elevation)
  const a = -heightFactor * saddleValue(dx, dy)
  const b = Math.sin(elevation) - heightFactor * (
    minimax.mu * (baseX * dx - baseY * dy)
    + minimax.lambda * (baseX * dy + baseY * dx)
  )
  const c = -heightFactor * saddleValue(baseX, baseY) - vertical
  let roots: number[]
  if (Math.abs(a) < 1e-10) {
    roots = Math.abs(b) < 1e-10 ? [] : [-c / b]
  } else {
    const discriminant = b * b - 4 * a * c
    if (discriminant < -1e-10) return null
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, discriminant)))
    roots = Math.abs(q) < 1e-10 ? [-b / (2 * a)] : [q / a, c / q]
  }
  for (const depth of roots.sort((a, b) => b - a)) {
    const x = baseX + depth * dx
    const y = baseY + depth * dy
    const u = x * Math.cos(principalAngle) + y * Math.sin(principalAngle)
    const v = -x * Math.sin(principalAngle) + y * Math.cos(principalAngle)
    if (Math.abs(u) <= extent + 1e-7 && Math.abs(v) <= extent + 1e-7) {
      return { x, y, z: saddleValue(x, y) }
    }
  }
  return null
}

export function ballFrame(t: number, angle: number, flow = defaultFlow) {
  const point = flowPoint(t, flow.initial)
  const contact = project(point, angle)

  // Offset the sphere along the displayed surface normal so it touches the mesh.
  const nx = -heightScale * (minimax.mu * point.x + minimax.lambda * point.y)
  const ny = -heightScale * (minimax.lambda * point.x - minimax.mu * point.y)
  const normalLength = Math.hypot(nx, ny, 1)
  const normal = { x: nx / normalLength, y: ny / normalLength, z: 1 / normalLength }
  const radius = ballRadius / plotScale
  const center = project({
    x: point.x + normal.x * radius,
    y: point.y + normal.y * radius,
    z: point.z + normal.z * radius / heightScale,
  }, angle)

  const screenNormalX = normal.x * Math.cos(angle) - normal.y * Math.sin(angle)
  const screenNormalY = (normal.x * Math.sin(angle) + normal.y * Math.cos(angle)) * Math.sin(elevation)
    - normal.z * Math.cos(elevation)
  const normalDepth = (normal.x * Math.sin(angle) + normal.y * Math.cos(angle)) * Math.cos(elevation)
    + normal.z * Math.sin(elevation)
  const shadowAngle = Math.atan2(screenNormalY, screenNormalX) * 180 / Math.PI + 90
  const shadowScale = Math.max(0.16, Math.abs(normalDepth))

  // The etched meridian rolls with distance travelled, slowing as the flow converges.
  const sample = Math.min(flow.points.length - 1, Math.max(0, t / minimax.duration * (flow.points.length - 1)))
  const index = Math.min(flow.points.length - 2, Math.floor(sample))
  const distance = flow.distances[index]
    + (flow.distances[index + 1] - flow.distances[index]) * (sample - index)
  const phase = distance * plotScale / ballRadius
  const next = project(flowPoint(t + 0.005, flow.initial), angle)
  const heading = Math.atan2(next.y - contact.y, next.x - contact.x)
  let seam = ''
  let connected = false
  for (let i = 0; i <= 72; i++) {
    const theta = 2 * Math.PI * i / 72
    if (Math.cos(phase) * Math.cos(theta) < 0) {
      connected = false
      continue
    }
    const x = ballRadius * Math.sin(phase) * Math.cos(theta)
    const y = ballRadius * Math.sin(theta)
    const sx = x * Math.cos(heading) - y * Math.sin(heading)
    const sy = x * Math.sin(heading) + y * Math.cos(heading)
    seam += `${connected ? 'L' : 'M'}${sx.toFixed(2)},${sy.toFixed(2)} `
    connected = true
  }

  return {
    center,
    contact,
    bodyTransform: `translate(${center.x.toFixed(2)} ${center.y.toFixed(2)})`,
    shadowTransform: `translate(${contact.x.toFixed(2)} ${contact.y.toFixed(2)}) rotate(${shadowAngle.toFixed(2)}) scale(1 ${shadowScale.toFixed(3)})`,
    seam,
  }
}

export function pathData(points: Point3[], angle: number) {
  return points.map((point, index) => {
    const projected = project(point, angle)
    return `${index ? 'L' : 'M'}${projected.x.toFixed(2)},${projected.y.toFixed(2)}`
  }).join(' ')
}

export function meshOpacity(points: Point3[], angle: number) {
  const depth = points.reduce((sum, point) => sum + project(point, angle).depth, 0) / points.length
  return Math.max(0.25, Math.min(0.6, 0.43 + depth * 0.1))
}
