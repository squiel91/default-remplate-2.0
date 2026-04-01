export const SWIPE_PROGRESS_THRESHOLD = 0.25
export const HERO_AUTOPLAY_INTERVAL = 5000

export const clamp = (value: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, value))

export const toFiniteNumber = (value: unknown): number | null => {
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

export const toFiniteStock = (value: unknown): number | null => {
	const number = toFiniteNumber(value)
	if (number == null) return null
	return Math.max(0, Math.floor(number))
}

export const formatMoney = (amountInCents: number | null | undefined, currencyCode: string): string => {
	if (typeof amountInCents !== 'number') return ''
	return new Intl.NumberFormat('es-UY', {
		style: 'currency',
		currency: currencyCode || 'UYU'
	}).format(amountInCents / 100)
}
