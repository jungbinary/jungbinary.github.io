import assert from 'node:assert/strict'
import test from 'node:test'
import {
  conditionalMeanY, createChain, createProjection, hamiltonian, hmc, integrate,
  pickPosition, potential, potentialGradient, project, propose,
} from '../src/lib/hmc.ts'

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

test('the 3D target gradient agrees with finite differences', () => {
  const random = seededRandom(9183)
  for (let i = 0; i < 100; i++) {
    const q = { x: (random() - 0.5) * 4, y: (random() - 0.5) * 4, z: (random() - 0.5) * 4 }
    const gradient = potentialGradient(q), epsilon = 1e-5
    for (const axis of ['x', 'y', 'z']) {
      const plus = { ...q, [axis]: q[axis] + epsilon }
      const minus = { ...q, [axis]: q[axis] - epsilon }
      assert.ok(Math.abs(gradient[axis] - (potential(plus) - potential(minus)) / (2 * epsilon)) < 1e-6)
    }
  }
})

test('leapfrog is reversible and approximately conserves Hamiltonian energy', () => {
  const initial = { q: { x: -0.8, y: -0.3, z: -0.6 }, p: { x: 0.7, y: -0.2, z: 0.6 } }
  const path = integrate(initial, hmc.stepSize, 80), last = path.at(-1)
  const reverse = integrate({ q: last.q, p: { x: -last.p.x, y: -last.p.y, z: -last.p.z } }, hmc.stepSize, 80).at(-1)
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(reverse.q[axis] - initial.q[axis]) < 1e-10)
    assert.ok(Math.abs(reverse.p[axis] + initial.p[axis]) < 1e-10)
  }
  assert.ok(Math.max(...path.map(state => Math.abs(hamiltonian(state) - hamiltonian(initial)))) < 0.02)
})

test('retained HMC states reproduce the known 3D conditional moments', () => {
  const random = seededRandom(92173)
  let q = { x: -0.8, y: -0.3, z: -0.65 }
  let x = 0, xx = 0, y = 0, yy = 0, z = 0, zz = 0, energy = 0, accepted = 0
  const count = 14000, burn = 1000
  for (let i = 0; i < count + burn; i++) {
    const proposal = propose(q, random)
    if (!proposal.accepted) assert.deepEqual(proposal.next, q)
    q = proposal.next
    assert.ok(Object.values(q).every(Number.isFinite))
    if (i < burn) continue
    const residualY = q.y - conditionalMeanY(q.x)
    const residualZ = q.z - hmc.twist * Math.sin(q.x) - hmc.coupling * residualY
    x += q.x; xx += q.x * q.x
    y += residualY; yy += residualY * residualY
    z += residualZ; zz += residualZ * residualZ
    energy += potential(q); accepted += Number(proposal.accepted)
  }
  assert.ok(Math.abs(x / count) < 0.1)
  assert.ok(Math.abs(xx / count - hmc.sigmaX ** 2) < 0.12)
  assert.ok(Math.abs(y / count) < 0.025)
  assert.ok(Math.abs(yy / count - hmc.sigmaY ** 2) < 0.008)
  assert.ok(Math.abs(z / count) < 0.025)
  assert.ok(Math.abs(zz / count - hmc.sigmaZ ** 2) < 0.008)
  assert.ok(Math.abs(energy / count - 1.5) < 0.08)
  assert.ok(accepted / count > 0.9 && accepted < count)
})

test('cloud picking chooses a retained 3D state at the requested screen position', () => {
  const { samples } = createChain(seededRandom(17))
  assert.equal(samples.length, 768)
  for (const camera of [hmc.initialCamera, { yaw: 1.5, elevation: -0.2 }, { yaw: 3, elevation: 1.15 }]) {
    const view = createProjection(camera)
    assert.ok(Number.isFinite(view.scale) && view.scale > 0)
    for (let i = 0; i < samples.length; i += 37) {
      const point = project(samples[i], camera, view)
      const picked = pickPosition(point.x, point.y, samples, camera, view)
      assert.ok(samples.some(sample => sample.x === picked.x && sample.y === picked.y && sample.z === picked.z))
      const screen = project(picked, camera, view)
      assert.ok(Math.hypot(screen.x - point.x, screen.y - point.y) < 1)
    }
  }
})
