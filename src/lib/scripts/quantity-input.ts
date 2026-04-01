export interface QuantityInputElements {
	container: Element | null
	field: Element | null
	decreaseButton: Element | null
	increaseButton: Element | null
}

export interface QuantityInputState {
	hidden: boolean
	enabled: boolean
	value: number
	maxQuantity: number | null
}

export const clampQuantityValue = (value: unknown, maxQuantity: number | null): number => {
	const numericValue = Number(value)
	const normalizedValue = Number.isFinite(numericValue) ? Math.floor(numericValue) : 1
	if (typeof maxQuantity === 'number' && maxQuantity > 0) {
		return Math.max(1, Math.min(maxQuantity, normalizedValue))
	}
	return Math.max(1, normalizedValue)
}

export const syncQuantityInputUi = (elements: QuantityInputElements, state: QuantityInputState): void => {
	const { container, field, decreaseButton, increaseButton } = elements
	const { hidden, enabled, value, maxQuantity } = state
	const atMin = value <= 1
	const atMax = typeof maxQuantity === 'number' ? value >= maxQuantity : false

	if (container instanceof HTMLElement) container.hidden = hidden

	if (field instanceof HTMLInputElement) {
		field.min = '1'
		if (typeof maxQuantity === 'number' && maxQuantity > 0) field.max = String(maxQuantity)
		else field.removeAttribute('max')
		field.disabled = !enabled
		field.value = String(value)
	}

	if (decreaseButton instanceof HTMLButtonElement) {
		decreaseButton.disabled = !enabled || atMin
	}

	if (increaseButton instanceof HTMLButtonElement) {
		increaseButton.disabled = !enabled || atMax
	}
}
