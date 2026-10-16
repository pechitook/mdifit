import { describe, expect, it } from 'vitest'
import { isAllowedHost } from './host.ts'

describe('isAllowedHost', () => {
  it('accepts loopback names with or without a port', () => {
    expect(isAllowedHost('localhost:1905')).toBe(true)
    expect(isAllowedHost('127.0.0.1:1905')).toBe(true)
    expect(isAllowedHost('[::1]:1905')).toBe(true)
    expect(isAllowedHost('LOCALHOST')).toBe(true)
  })

  it('refuses anything else', () => {
    expect(isAllowedHost('evil.example:1905')).toBe(false)
    expect(isAllowedHost('localhost.evil.example')).toBe(false)
    expect(isAllowedHost('192.168.1.10:1905')).toBe(false)
    expect(isAllowedHost('')).toBe(false)
    expect(isAllowedHost(undefined)).toBe(false)
  })
})
