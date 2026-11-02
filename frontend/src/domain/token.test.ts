import { beforeEach, describe, expect, it } from 'vitest'
import { holeToken, setzeNeuenToken } from './token'

describe('holeToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('erzeugt ein neues Token, wenn noch keins gespeichert ist', () => {
    const token = holeToken()

    expect(token).toMatch(/^[0-9a-f-]{36}$/)
    expect(localStorage.getItem('interview-trainer:token')).toBe(token)
  })

  it('gibt bei wiederholtem Aufruf dasselbe Token zurueck', () => {
    const erstesToken = holeToken()
    const zweitesToken = holeToken()

    expect(zweitesToken).toBe(erstesToken)
  })
})

describe('setzeNeuenToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ueberschreibt ein vorhandenes Token mit einem neuen', () => {
    const altesToken = holeToken()
    const neuesToken = setzeNeuenToken()

    expect(neuesToken).not.toBe(altesToken)
    expect(holeToken()).toBe(neuesToken)
  })
})
