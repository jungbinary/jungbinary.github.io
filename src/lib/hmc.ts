export type Position = { x: number; y: number; z: number }
export type Camera = { yaw: number; elevation: number }
export type PhasePoint = { q: Position; p: Position }

export const hmc = {
  sigmaX: 1.05,
  sigmaY: 0.42,
  sigmaZ: 0.46,
  bend: 0.58,
  flatten: 0.45,
  twist: 0.95,
  coupling: 0.25,
  stepSize: 0.04,
  playbackRate: 1.12,
  momentumDuration: 0.65,
  decisionDuration: 0.9,
  initialCamera: { yaw: -0.48, elevation: 0.48 },
}

// A genuinely three-dimensional, curved Gaussian target. Its triangular
// conditional form is normalizable and has known moments for sampler tests.
// The bounded bend keeps the tail of the cloud from forming tall, sharp tips.
export function conditionalMeanY(x: number) {
  return hmc.bend * (x * x - hmc.sigmaX ** 2) / (1 + hmc.flatten * x * x)
}

function conditionalMeanYDerivative(x: number) {
  return 2 * hmc.bend * x * (1 + hmc.flatten * hmc.sigmaX ** 2) / (1 + hmc.flatten * x * x) ** 2
}

// y|x ~ N(meanY(x), sy²); z|x,y ~ N(c sin(x)+d residualY, sz²).
export function potential(q: Position) {
  const y = q.y - conditionalMeanY(q.x)
  const z = q.z - hmc.twist * Math.sin(q.x) - hmc.coupling * y
  return (q.x / hmc.sigmaX) ** 2 / 2 + (y / hmc.sigmaY) ** 2 / 2 + (z / hmc.sigmaZ) ** 2 / 2
}

export function potentialGradient(q: Position): Position {
  const y = q.y - conditionalMeanY(q.x)
  const z = q.z - hmc.twist * Math.sin(q.x) - hmc.coupling * y
  const dy = conditionalMeanYDerivative(q.x)
  return {
    x: q.x / hmc.sigmaX ** 2 - dy * y / hmc.sigmaY ** 2
      + z / hmc.sigmaZ ** 2 * (-hmc.twist * Math.cos(q.x) + hmc.coupling * dy),
    y: y / hmc.sigmaY ** 2 - hmc.coupling * z / hmc.sigmaZ ** 2,
    z: z / hmc.sigmaZ ** 2,
  }
}

export function hamiltonian(state: PhasePoint) {
  return potential(state.q) + (state.p.x ** 2 + state.p.y ** 2 + state.p.z ** 2) / 2
}

// Standard reversible kick-drift-kick leapfrog with an identity mass matrix.
// Neal, MCMC using Hamiltonian dynamics: https://arxiv.org/abs/1206.1901
export function integrate(initial: PhasePoint, stepSize: number, steps: number): PhasePoint[] {
  let q = { ...initial.q }, p = { ...initial.p }
  const path: PhasePoint[] = [{ q: { ...q }, p: { ...p } }]
  for (let i = 0; i < steps; i++) {
    let g = potentialGradient(q)
    p = { x: p.x - stepSize * g.x / 2, y: p.y - stepSize * g.y / 2, z: p.z - stepSize * g.z / 2 }
    q = { x: q.x + stepSize * p.x, y: q.y + stepSize * p.y, z: q.z + stepSize * p.z }
    g = potentialGradient(q)
    p = { x: p.x - stepSize * g.x / 2, y: p.y - stepSize * g.y / 2, z: p.z - stepSize * g.z / 2 }
    path.push({ q: { ...q }, p: { ...p } })
  }
  return path
}

function normalPair(random: () => number) {
  const r = Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, 1 - random())))
  const angle = 2 * Math.PI * random()
  return [r * Math.cos(angle), r * Math.sin(angle)]
}

export function propose(initial: Position, random = Math.random) {
  const [x, y] = normalPair(random), [z] = normalPair(random)
  const momentum = { x, y, z }
  const steps = 58 + Math.floor(random() * 33)
  const path = integrate({ q: initial, p: momentum }, hmc.stepSize, steps)
  const candidate = path[path.length - 1]
  // Negating momentum makes the map reversible without changing its energy.
  const energyError = hamiltonian({ q: candidate.q, p: { x: -candidate.p.x, y: -candidate.p.y, z: -candidate.p.z } }) - hamiltonian(path[0])
  const finite = path.every(s => [s.q.x, s.q.y, s.q.z, s.p.x, s.p.y, s.p.z].every(Number.isFinite))
  const uniform = random()
  const accepted = finite && Math.log(Math.max(Number.MIN_VALUE, uniform)) < Math.min(0, -energyError)
  return {
    initial: { ...initial },
    initialMomentum: momentum,
    path: finite ? path.map(s => s.q) : [{ ...initial }, { ...initial }],
    next: { ...(accepted ? candidate.q : initial) },
    accepted,
    energyError,
    uniform,
    acceptanceProbability: finite ? Math.exp(Math.min(0, -energyError)) : 0,
    duration: 2.65 + (steps - 58) / 32 * 0.5,
  }
}

export type Proposal = ReturnType<typeof propose>

export function createChain(random = Math.random) {
  let q = { x: -0.8, y: -0.3, z: -0.65 }
  const samples: Position[] = []
  // The cloud consists exclusively of retained HMC states, including repeated
  // states after rejections. No decorative direct samples are mixed into it.
  for (let i = 0; i < 1088; i++) {
    q = propose(q, random).next
    if (i >= 320) samples.push({ ...q })
  }
  return { q, samples }
}

function rotate(q: Position, camera: Camera) {
  // Permute axes so the banana opens vertically; all three coordinates remain
  // positions in the target distribution, rather than a potential-height axis.
  const x = q.x, y = q.z, z = q.y - 0.45
  const horizontal = x * Math.cos(camera.yaw) - y * Math.sin(camera.yaw)
  const depth = x * Math.sin(camera.yaw) + y * Math.cos(camera.yaw)
  return {
    x: horizontal,
    y: depth * Math.sin(camera.elevation) - z * Math.cos(camera.elevation),
    depth: depth * Math.cos(camera.elevation) + z * Math.sin(camera.elevation),
  }
}

// A fixed central-probability envelope keeps the camera stable as new samples
// arrive. Tail samples remain in the chain and fade at the viewport boundary.
const framingPoints: Position[] = []
for (let i = 0; i <= 24; i++) {
  const x = -2.1 + 4.2 * i / 24
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const residual = a * hmc.sigmaY * 1.8
    framingPoints.push({ x, y: conditionalMeanY(x) + residual,
      z: hmc.twist * Math.sin(x) + hmc.coupling * residual + b * hmc.sigmaZ * 1.8 })
  }
}

export function createProjection(camera: Camera) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const point of framingPoints) {
    const p = rotate(point, camera)
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  const scale = Math.min(264 / (maxX - minX), 146 / (maxY - minY))
  return { scale, x: 160 - (minX + maxX) / 2 * scale, y: 84 - (minY + maxY) / 2 * scale }
}

export type Projection = ReturnType<typeof createProjection>
export function project(point: Position, camera: Camera, view: Projection) {
  const p = rotate(point, camera)
  return { x: view.x + p.x * view.scale, y: view.y + p.y * view.scale, depth: p.depth }
}

export function pickPosition(x: number, y: number, samples: Position[], camera: Camera, view: Projection): Position {
  let nearest = samples[0], distance = Infinity
  for (const q of samples) {
    const p = project(q, camera, view)
    const d = (p.x - x) ** 2 + (p.y - y) ** 2 - p.depth * 0.05
    if (d < distance) { nearest = q; distance = d }
  }
  return { ...nearest }
}

export function proposalPosition(proposal: Proposal, progress: number): Position {
  const offset = Math.max(0, Math.min(1, progress)) * (proposal.path.length - 1)
  const index = Math.min(proposal.path.length - 2, Math.floor(offset)), mix = offset - index
  const a = proposal.path[index], b = proposal.path[index + 1]
  return { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix, z: a.z + (b.z - a.z) * mix }
}
