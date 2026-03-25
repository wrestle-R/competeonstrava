export const CHALLENGE_NAME = "150KM Running Challenge"
export const CHALLENGE_GOAL_KM = 150
export const CHALLENGE_START = new Date("2026-03-16T00:00:00.000Z")
export const CHALLENGE_END = new Date("2026-04-16T23:59:59.999Z")
export const CHALLENGE_START_UNIX = Math.floor(CHALLENGE_START.getTime() / 1000)

export function getDaysRemaining(now = new Date()) {
  const diff = CHALLENGE_END.getTime() - now.getTime()
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatKm(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} km`
}
