export interface ButtonStateOptions {
	label?: string
	icon?: string
	disabled?: boolean
	loading?: boolean
}

export const setButtonState = (
	button: HTMLButtonElement | null | undefined,
	{ label, icon, disabled = false, loading = false }: ButtonStateOptions = {}
): void => {
	if (!(button instanceof HTMLButtonElement)) return

	const nextLabel = loading ? button.dataset.loadingLabel || label || '' : label || ''
	const nextIcon = loading
		? button.dataset.loadingIcon || 'loader-2'
		: icon || button.dataset.icon || 'plus'

	button.dataset.icon = icon || button.dataset.icon || 'plus'
	button.disabled = Boolean(disabled || loading)

	const labelNode = button.querySelector('.button__label')
	if (labelNode instanceof HTMLElement) labelNode.textContent = nextLabel

	for (const iconNode of button.querySelectorAll<HTMLElement>('[data-button-icon]')) {
		iconNode.hidden = iconNode.dataset.buttonIcon !== nextIcon
	}
}
