export type Point3 = { x: number; y: number; z: number }
export type HopfFiber = { eta: number; phase: number; tone: number; guide: Point3[] }
export type HopfSample = {
  source: Point3
  noise: Point3
  fiber: number
  phase: number
  emphasis: number
  tracer: boolean
}

export const hopf = {
  fiberCount: 32,
  particleCount: 10000,
  pointScale: 1.55,
  transportDuration: 7,
  hopfHoldDuration: 10,
  gaussianHoldDuration: 0.5,
  flowSpeed: 0.24,
  twist: 0.65,
  bend: 0.14,
  sigma: 0.007,
  trailDuration: 0.5,
  rotationSpeed: 2 * Math.PI / 18,
  tilt: 0.82,
}

const tau = 2 * Math.PI

// (z1,z2) = (cos(eta)e^(i*psi), sin(eta)e^(i*(psi+phase))) lies on S^3.
// Varying psi is the diagonal U(1) action, hence one genuine Hopf fiber.
// Stereographic projection from q4 = 1 maps each selected fiber to a circle.
// https://sites.science.oregonstate.edu/physics/coursewikis/GO/book/go/hopf.html
export function hopfFiberPoint(eta: number, phase: number, psi: number): Point3 {
  const c = Math.cos(eta), s = Math.sin(eta)
  const denominator = 1 - s * Math.sin(psi + phase)
  return {
    x: c * Math.cos(psi) / denominator,
    y: c * Math.sin(psi) / denominator,
    z: s * Math.cos(psi + phase) / denominator,
  }
}

export function createHopfSamples(random = Math.random) {
  const fibers: HopfFiber[] = []
  let inner = 0, outer = 0
  for (let index = 0; index < hopf.fiberCount; index++) {
    const isInner = index % 4 === 0
    const eta = isInner ? 0.49 : 0.77
    const phase = isInner ? tau * (inner++ + 0.5) / 8 : tau * outer++ / 24
    const tone = index % 8 === 3 ? 3 : isInner ? 1 : index % 3 === 0 ? 2 : 0
    const guide = Array.from({ length: 129 }, (_, step) => hopfFiberPoint(eta, phase, tau * step / 128))
    fibers.push({ eta, phase, tone, guide })
  }

  let spare: number | undefined
  const normal = () => {
    if (spare !== undefined) {
      const value = spare
      spare = undefined
      return value
    }
    const radius = Math.sqrt(-2 * Math.log(1 - random()))
    const angle = tau * random()
    spare = radius * Math.sin(angle)
    return radius * Math.cos(angle)
  }

  const count = hopf.particleCount
  const sources = Array.from({ length: count }, () => ({ x: normal(), y: normal(), z: normal() }))
  // Couple neighboring Gaussian layers to neighboring fibers; angular rank
  // coupling keeps nearby particles moving together instead of crisscrossing.
  sources.sort((a, b) => a.z - b.z)
  let sourceRadius = 0
  let targetRadius = 0
  const samples: HopfSample[] = []
  const azimuth = (point: Point3) => (Math.atan2(point.y, point.x) + tau) % tau
  let sourceOffset = 0
  fibers.forEach((fiber, fiberIndex) => {
    const sampleCount = Math.floor(count / hopf.fiberCount) + (fiberIndex < count % hopf.fiberCount ? 1 : 0)
    const group = sources.slice(sourceOffset, sourceOffset + sampleCount).sort((a, b) => azimuth(a) - azimuth(b))
    sourceOffset += sampleCount
    group.forEach((source, index) => {
      const phase = tau * (index + random()) / sampleCount
      const noise = { x: hopf.sigma * normal(), y: hopf.sigma * normal(), z: hopf.sigma * normal() }
      sourceRadius = Math.max(sourceRadius, Math.hypot(source.x, source.y, source.z))
      const bound = Math.sqrt((1 + Math.sin(fiber.eta)) / (1 - Math.sin(fiber.eta)))
      targetRadius = Math.max(targetRadius, bound + Math.hypot(noise.x, noise.y, noise.z))
      samples.push({
        source, noise, fiber: fiberIndex, phase,
        emphasis: Math.max(0, Math.cos(2 * phase + fiber.phase)) ** 18,
        tracer: index % 8 === 0,
      })
    })
  })
  return { fibers, samples, sourceRadius, targetRadius }
}

export function smootherstep(t: number) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * x * (10 + x * (-15 + 6 * x))
}

export function createHopfFrame(seconds: number) {
  const forwardEnd = hopf.transportDuration
  const returnStart = forwardEnd + hopf.hopfHoldDuration
  const returnEnd = returnStart + hopf.transportDuration
  const duration = returnEnd + hopf.gaussianHoldDuration
  const cycleTime = ((seconds % duration) + duration) % duration
  let t = 0
  let rate = 0
  if (cycleTime < forwardEnd) {
    t = cycleTime / hopf.transportDuration
    rate = 1 / hopf.transportDuration
  } else if (cycleTime < returnStart) {
    t = 1
  } else if (cycleTime < returnEnd) {
    t = 1 - (cycleTime - returnStart) / hopf.transportDuration
    rate = -1 / hopf.transportDuration
  }
  const alpha = smootherstep(t)
  const alphaVelocity = 30 * t * t * (1 - t) ** 2 * rate
  const phase = hopf.flowSpeed * seconds
  const spin = phase + hopf.twist * Math.sin(Math.PI * alpha)
  const angle = hopf.rotationSpeed * seconds + 0.18
  return {
    alpha, alphaVelocity, phase,
    sinSpin: Math.sin(spin), cosSpin: Math.cos(spin),
    spinVelocity: hopf.flowSpeed + hopf.twist * Math.PI * Math.cos(Math.PI * alpha) * alphaVelocity,
    bend: alpha > 0 && alpha < 1 ? hopf.bend * Math.sin(Math.PI * alpha) ** 2 : 0,
    bendVelocity: hopf.bend * Math.PI * Math.sin(tau * alpha) * alphaVelocity,
    sinView: Math.sin(angle), cosView: Math.cos(angle),
  }
}

export type HopfFrame = ReturnType<typeof createHopfFrame>

// Analytic transport with a spatially coherent coupling, not a trained model.
// The phase advances continuously while transport cycles between both distributions.
export function hopfParticle(sample: HopfSample, fiber: HopfFiber, frame: HopfFrame) {
  const psi = sample.phase + frame.phase
  const c = Math.cos(fiber.eta), s = Math.sin(fiber.eta)
  const cosPsi = Math.cos(psi), sinPsi = Math.sin(psi)
  const cosSum = Math.cos(psi + fiber.phase), sinSum = Math.sin(psi + fiber.phase)
  const denominator = 1 - s * sinSum
  const denominatorVelocity = -s * cosSum * hopf.flowSpeed
  const inverse = 1 / denominator
  const coordinates = { x: c * cosPsi, y: c * sinPsi, z: s * cosSum }
  const derivatives = {
    x: -c * sinPsi * hopf.flowSpeed,
    y: c * cosPsi * hopf.flowSpeed,
    z: -s * sinSum * hopf.flowSpeed,
  }
  const target = {
    x: coordinates.x * inverse + sample.noise.x,
    y: coordinates.y * inverse + sample.noise.y,
    z: coordinates.z * inverse + sample.noise.z,
  }
  const targetVelocity = {
    x: (derivatives.x - coordinates.x * denominatorVelocity * inverse) * inverse,
    y: (derivatives.y - coordinates.y * denominatorVelocity * inverse) * inverse,
    z: (derivatives.z - coordinates.z * denominatorVelocity * inverse) * inverse,
  }
  const sx = frame.cosSpin * sample.source.x - frame.sinSpin * sample.source.y
  const sy = frame.sinSpin * sample.source.x + frame.cosSpin * sample.source.y
  const sz = sample.source.z
  const a = frame.alpha, da = frame.alphaVelocity
  return {
    point: {
      x: (1 - a) * sx + a * target.x - frame.bend * sinPsi,
      y: (1 - a) * sy + a * target.y + frame.bend * cosPsi,
      z: (1 - a) * sz + a * target.z,
    },
    velocity: {
      x: da * (target.x - sx) - (1 - a) * frame.spinVelocity * sy + a * targetVelocity.x
        - frame.bendVelocity * sinPsi - frame.bend * hopf.flowSpeed * cosPsi,
      y: da * (target.y - sy) + (1 - a) * frame.spinVelocity * sx + a * targetVelocity.y
        + frame.bendVelocity * cosPsi - frame.bend * hopf.flowSpeed * sinPsi,
      z: da * (target.z - sz) + a * targetVelocity.z,
    },
  }
}

export function rotateHopf(point: Point3, frame: HopfFrame): Point3 {
  const y = point.y * Math.cos(hopf.tilt) - point.z * Math.sin(hopf.tilt)
  const z = point.y * Math.sin(hopf.tilt) + point.z * Math.cos(hopf.tilt)
  return {
    x: point.x * frame.cosView + z * frame.sinView,
    y,
    z: -point.x * frame.sinView + z * frame.cosView,
  }
}
