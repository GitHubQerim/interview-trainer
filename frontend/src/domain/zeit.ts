export function formatZeit(sekunden: number): string {
  const minuten = Math.floor(sekunden / 60)
  const rest = sekunden % 60
  return `${minuten.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}
