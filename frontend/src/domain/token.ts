const STORAGE_KEY = 'interview-trainer:token'

export function holeToken(): string {
  const vorhandenesToken = localStorage.getItem(STORAGE_KEY)
  if (vorhandenesToken) {
    return vorhandenesToken
  }

  return setzeNeuenToken()
}

export function setzeNeuenToken(): string {
  const token = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, token)
  return token
}
