import { describe, expect, it } from 'vitest'
import { formatZeit } from './zeit'

describe('formatZeit', () => {
  it.each([
    [0, '00:00'],
    [2, '00:02'],
    [9, '00:09'],
    [59, '00:59'],
    [60, '01:00'],
    [65, '01:05'],
    [600, '10:00'],
  ])('formatZeit(%d) === %s', (sekunden, erwartet) => {
    expect(formatZeit(sekunden)).toBe(erwartet)
  })
})
