import { createHopfFrame, createHopfSamples, hopf, hopfParticle } from './hopf'
import type { HopfSample, Point3 } from './hopf'

export const flowShapes = ['hopf', 'lorenz', 'boys'] as const
export type FlowShape = typeof flowShapes[number]
export const flowTargets = {
  hopf: { label: 'Hopf fibration', href: 'https://en.wikipedia.org/wiki/Hopf_fibration' },
  lorenz: { label: 'Lorenz equations', href: 'https://en.wikipedia.org/wiki/Lorenz_system' },
  boys: { label: "Boy's surface", href: 'https://en.wikipedia.org/wiki/Boy%27s_surface' },
} satisfies Record<FlowShape, { label: string; href: string }>
export const flowStageDuration = 2 * hopf.transportDuration + hopf.hopfHoldDuration + hopf.gaussianHoldDuration
export const flowCycleDuration = flowStageDuration * flowShapes.length

type FlowGuide = { points: Point3[]; tone: number; strength: number; width: number }
const tau = 2 * Math.PI

// Bryant–Kusner immersion of the projective plane, parameterized by |w| <= 1.
// Multiplying out the complex denominator before inversion avoids huge
// intermediate coordinates at the three removable poles.
// https://drorbn.net/AcademicPensieve/2013-04/nb/Boy.pdf
export function boySurfacePoint(radius: number, angle: number): Point3 {
  const power = (n: number) => ({ x: radius ** n * Math.cos(n * angle), y: radius ** n * Math.sin(n * angle) })
  const w = power(1), w3 = power(3), w5 = power(5), w6 = power(6)
  const dx = w6.x + Math.sqrt(5) * w3.x - 1
  const dy = w6.y + Math.sqrt(5) * w3.y
  const denominator = dx * dx + dy * dy
  if (denominator < 1e-20) return { x: 0, y: 0, z: 0 }
  const h1 = -1.5 * ((w.y - w5.y) * dx - (w.x - w5.x) * dy)
  const h2 = -1.5 * ((w.x + w5.x) * dx + (w.y + w5.y) * dy)
  const h3 = w6.y * dx - (1 + w6.x) * dy - denominator / 2
  const scale = denominator / (h1 * h1 + h2 * h2 + h3 * h3)
  return { x: h1 * scale, y: h2 * scale, z: h3 * scale }
}

function createBoySurface() {
  const rings = 96, slices = 128
  const grid = Array.from({ length: rings + 1 }, (_, r) =>
    Array.from({ length: slices + 1 }, (_, s) => boySurfacePoint(r / rings, tau * s / slices)))
  const area = (a: Point3, b: Point3, c: Point3) => {
    const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
    const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }
    return Math.hypot(u.y * v.z - u.z * v.y, u.z * v.x - u.x * v.z, u.x * v.y - u.y * v.x) / 2
  }
  // Equal-area radial bands prevent the folded center from swallowing most
  // particles while the broad, smooth lobes are left empty.
  const cumulative = [0]
  for (let r = 0; r < rings; r++) {
    let bandArea = 0
    for (let s = 0; s < slices; s++) {
      bandArea += area(grid[r][s], grid[r + 1][s], grid[r][s + 1])
        + area(grid[r + 1][s], grid[r + 1][s + 1], grid[r][s + 1])
    }
    cumulative.push(cumulative[r] + bandArea)
  }
  const flat = grid.flat()
  const center = {
    x: (Math.min(...flat.map(p => p.x)) + Math.max(...flat.map(p => p.x))) / 2,
    y: (Math.min(...flat.map(p => p.y)) + Math.max(...flat.map(p => p.y))) / 2,
    z: (Math.min(...flat.map(p => p.z)) + Math.max(...flat.map(p => p.z))) / 2,
  }
  const bound = Math.max(...flat.map(p => Math.hypot(p.x - center.x, p.y - center.y, p.z - center.z)))
  const normalize = (p: Point3): Point3 => ({ x: (p.x - center.x) * 2.2 / bound, y: (p.z - center.z) * 2.2 / bound, z: (p.y - center.y) * 2.2 / bound })
  const orbits = Array.from({ length: hopf.fiberCount }, (_, i) => {
    const targetArea = cumulative[rings] * (i + 0.5) / hopf.fiberCount
    let band = 0
    while (cumulative[band + 1] < targetArea) band++
    const radius = (band + (targetArea - cumulative[band]) / (cumulative[band + 1] - cumulative[band])) / rings
    const points = Array.from({ length: 513 }, (_, j) => normalize(boySurfacePoint(radius, tau * j / 512)))
    const normals = points.map((_, j) => {
      const angle = tau * j / 512
      const a = normalize(boySurfacePoint(Math.min(1, radius + 0.001), angle))
      const b = normalize(boySurfacePoint(Math.max(0, radius - 0.001), angle))
      const c = normalize(boySurfacePoint(radius, angle + 0.001))
      const d = normalize(boySurfacePoint(radius, angle - 0.001))
      const u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
      const v = { x: c.x - d.x, y: c.y - d.y, z: c.z - d.z }
      const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x }
      const length = Math.hypot(n.x, n.y, n.z) || 1
      return { x: n.x / length, y: n.y / length, z: n.z / length }
    })
    return { points, normals, tone: i / (hopf.fiberCount - 1) * 3 }
  })
  const guides: FlowGuide[] = orbits.filter((_, i) => i % 2 === 0).map(orbit => ({
    points: orbit.points.filter((_, i) => i % 2 === 0), tone: orbit.tone, strength: 0.48, width: 0.85,
  }))
  for (let meridian = 0; meridian < 12; meridian++) {
    guides.push({
      points: Array.from({ length: 129 }, (_, i) => normalize(boySurfacePoint(i / 128, tau * meridian / 12))),
      tone: meridian / 12 * 3, strength: 0.48, width: 0.85,
    })
  }
  return { orbits, guides }
}

// Integrate the classical Lorenz system with RK4 after discarding its transient.
// The same orbit supplies the silhouette and the moving particle positions.
function createLorenzOrbit() {
  const dt = 0.006
  const derivative = (p: Point3): Point3 => ({
    x: 10 * (p.y - p.x),
    y: p.x * (28 - p.z) - p.y,
    z: p.x * p.y - 8 / 3 * p.z,
  })
  const advance = (p: Point3, v: Point3, h: number): Point3 => ({
    x: p.x + v.x * h, y: p.y + v.y * h, z: p.z + v.z * h,
  })
  const step = (p: Point3): Point3 => {
    const a = derivative(p)
    const b = derivative(advance(p, a, dt / 2))
    const c = derivative(advance(p, b, dt / 2))
    const d = derivative(advance(p, c, dt))
    return {
      x: p.x + dt / 6 * (a.x + 2 * b.x + 2 * c.x + d.x),
      y: p.y + dt / 6 * (a.y + 2 * b.y + 2 * c.y + d.y),
      z: p.z + dt / 6 * (a.z + 2 * b.z + 2 * c.z + d.z),
    }
  }
  let p = { x: 0.1, y: 0, z: 0 }
  for (let i = 0; i < 2500; i++) p = step(p)
  const raw: Point3[] = []
  for (let i = 0; i < 12000; i++) {
    raw.push(p)
    p = step(p)
  }
  // Close at the nearest recurrence in the latter half of the orbit. This
  // keeps the particle stream's wrap short instead of crossing the butterfly.
  let end = 6000
  let distance = Infinity
  for (let i = 6000; i < raw.length; i++) {
    const d = Math.hypot(raw[i].x - raw[0].x, raw[i].y - raw[0].y, raw[i].z - raw[0].z)
    if (d < distance) { distance = d; end = i }
  }
  const points = raw.slice(0, end + 1).map((q) => ({
    x: q.x / 12, y: (q.z - 25) / 15, z: q.y / 22,
  }))
  const radius = Math.max(...points.map((q) => Math.hypot(q.x, q.y, q.z)))
  const scale = 2.35 / radius
  points.forEach((q) => { q.x *= scale; q.y *= scale; q.z *= scale })
  // Blend the tiny recurrence gap over the final few samples, preserving a
  // continuous stream while leaving the visible attractor unchanged.
  const last = points[points.length - 1]
  const gap = { x: points[0].x - last.x, y: points[0].y - last.y, z: points[0].z - last.z }
  for (let i = 0; i < 24; i++) {
    const q = points[points.length - 24 + i]
    const weight = i / 23
    q.x += gap.x * weight; q.y += gap.y * weight; q.z += gap.z * weight
  }
  return points
}

const lorenzOrbit = createLorenzOrbit()
const boySurface = createBoySurface()
const lorenzGuides: FlowGuide[] = []
for (let i = 0; i < lorenzOrbit.length - 1; i += 48) {
  const points = lorenzOrbit.slice(i, Math.min(i + 49, lorenzOrbit.length)).filter((_, j) => j % 2 === 0)
  if (points.length < 2) continue
  lorenzGuides.push({ points, tone: (i + 24) / (lorenzOrbit.length - 1) * 4 % 4, strength: 0.42, width: 0.9 })
}

export function createFlowSamples(random = Math.random) {
  const model = createHopfSamples(random)
  return {
    ...model,
    targetRadii: { hopf: model.targetRadius, lorenz: 2.4, boys: 2.25 },
    guides: {
      hopf: model.fibers.map((f) => ({ points: f.guide, tone: f.tone, strength: 0.72, width: 0.95 })),
      lorenz: lorenzGuides,
      boys: boySurface.guides,
    } satisfies Record<FlowShape, FlowGuide[]>,
  }
}

export type FlowModel = ReturnType<typeof createFlowSamples>

export function createFlowFrame(seconds: number) {
  const time = ((seconds % flowCycleDuration) + flowCycleDuration) % flowCycleDuration
  const shape = flowShapes[Math.min(flowShapes.length - 1, Math.floor(time / flowStageDuration))]
  const pose = createHopfFrame(seconds)
  const targetTilt = shape === 'lorenz' ? 0.12 : shape === 'boys' ? 0.38 : hopf.tilt
  const tilt = hopf.tilt + (targetTilt - hopf.tilt) * pose.alpha
  return { ...pose, shape, sinTilt: Math.sin(tilt), cosTilt: Math.cos(tilt) }
}

export type FlowFrame = ReturnType<typeof createFlowFrame>

export function flowParticle(sample: HopfSample, model: FlowModel, pose: FlowFrame) {
  const fiber = model.fibers[sample.fiber]
  if (pose.shape === 'hopf') return { ...hopfParticle(sample, fiber, pose), tone: fiber.tone, light: 1 }

  let target: Point3
  let velocity: Point3
  let tone: number
  let light = 1
  if (pose.shape === 'boys') {
    const orbit = boySurface.orbits[sample.fiber]
    const offset = ((sample.phase + pose.phase * 0.35) % tau) / tau * (orbit.points.length - 1)
    const index = Math.floor(offset), mix = offset - index
    const a = orbit.points[index], b = orbit.points[index + 1]
    target = { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix, z: a.z + (b.z - a.z) * mix }
    const rate = hopf.flowSpeed * 0.35 / tau * (orbit.points.length - 1)
    velocity = { x: (b.x - a.x) * rate, y: (b.y - a.y) * rate, z: (b.z - a.z) * rate }
    const n = rotateFlow(orbit.normals[index], pose)
    light = Math.abs(n.x * -0.35 + n.y * 0.55 + n.z * 0.76)
    tone = orbit.tone
  } else {
    const u = ((sample.fiber + sample.phase / tau) / hopf.fiberCount + pose.phase * 0.04) % 1
    const offset = u * (lorenzOrbit.length - 1)
    const index = Math.floor(offset)
    const a = lorenzOrbit[index], b = lorenzOrbit[index + 1]
    const mix = offset - index
    target = { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix, z: a.z + (b.z - a.z) * mix }
    const rate = hopf.flowSpeed * 0.04 * (lorenzOrbit.length - 1)
    velocity = { x: (b.x - a.x) * rate, y: (b.y - a.y) * rate, z: (b.z - a.z) * rate }
    tone = u * 4
  }
  target = { x: target.x + sample.noise.x, y: target.y + sample.noise.y, z: target.z + sample.noise.z }
  const sx = pose.cosSpin * sample.source.x - pose.sinSpin * sample.source.y
  const sy = pose.sinSpin * sample.source.x + pose.cosSpin * sample.source.y
  const sz = sample.source.z
  const a = pose.alpha, da = pose.alphaVelocity
  // Interpolate around the palette so color also returns smoothly to the
  // shared Gaussian before a new structure starts to form.
  const toneDelta = ((tone - fiber.tone + 6) % 4) - 2
  return {
    tone: ((fiber.tone + toneDelta * a) % 4 + 4) % 4,
    light,
    point: { x: (1 - a) * sx + a * target.x, y: (1 - a) * sy + a * target.y, z: (1 - a) * sz + a * target.z },
    velocity: {
      x: da * (target.x - sx) - (1 - a) * pose.spinVelocity * sy + a * velocity.x,
      y: da * (target.y - sy) + (1 - a) * pose.spinVelocity * sx + a * velocity.y,
      z: da * (target.z - sz) + a * velocity.z,
    },
  }
}

export function rotateFlow(point: Point3, frame: FlowFrame): Point3 {
  const y = point.y * frame.cosTilt - point.z * frame.sinTilt
  const z = point.y * frame.sinTilt + point.z * frame.cosTilt
  return { x: point.x * frame.cosView + z * frame.sinView, y, z: -point.x * frame.sinView + z * frame.cosView }
}

export const flowPerspective = (depth: number) => 1 / (1 - 0.28 * depth)

export function createFlowProjection(model: FlowModel, pose: FlowFrame) {
  const viewRadius = (1 - pose.alpha) * model.sourceRadius + pose.alpha * model.targetRadii[pose.shape] + pose.bend
  let scale = 102 / viewRadius
  let centerX = 160, centerY = 116
  if (pose.shape !== 'hopf') {
    // Fit each projected silhouette, rather than its enclosing sphere, with
    // room for the particle halos at every camera angle.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const guide of model.guides[pose.shape]) {
      for (const point of guide.points) {
        const p = rotateFlow(point, pose)
        const perspective = flowPerspective(p.z / model.targetRadii[pose.shape])
        const x = p.x * perspective, y = p.y * perspective
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    }
    const fitScale = Math.min(296 / (maxX - minX), 208 / (maxY - minY))
    scale += (fitScale - scale) * pose.alpha
    centerX -= (minX + maxX) / 2 * scale * pose.alpha
    centerY += (minY + maxY) / 2 * scale * pose.alpha
  }
  return { viewRadius, scale, centerX, centerY }
}
