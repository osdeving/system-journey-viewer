import { describe, expect, it } from 'vitest'
import { resolveHexConnectorRole } from './hexConnectorRole'

describe('resolveHexConnectorRole', () => {
  it('maps ports to female connector icon', () => {
    expect(resolveHexConnectorRole('port-in')).toBe('female')
    expect(resolveHexConnectorRole('port-out')).toBe('female')
  })

  it('maps adapters to male connector icon', () => {
    expect(resolveHexConnectorRole('adapter-in')).toBe('male')
    expect(resolveHexConnectorRole('adapter-out')).toBe('male')
  })

  it('returns null for non-hex connector kinds', () => {
    expect(resolveHexConnectorRole('container')).toBeNull()
    expect(resolveHexConnectorRole('db')).toBeNull()
  })
})
