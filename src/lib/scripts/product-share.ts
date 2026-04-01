import type { ScopeRoot } from './types'

const COPY_RESET_MS = 1800

export const initProductShareButtons = (scope: ScopeRoot = document): void => {
	const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>('[data-share-product]'))

	for (const button of buttons) {
		if (button.dataset.bound === 'true') continue
		button.dataset.bound = 'true'

		const label = button.querySelector<HTMLElement>('[data-share-label]')
		const defaultLabel = label?.textContent ?? 'Compartir'

		button.addEventListener('click', async () => {
			try {
				if (navigator.share) {
					await navigator.share({
						title: document.title,
						url: window.location.href
					})
					return
				}

				await navigator.clipboard.writeText(window.location.href)
				if (label) {
					label.textContent = 'Link copiado'
					window.setTimeout(() => {
						label.textContent = defaultLabel
					}, COPY_RESET_MS)
				}
			} catch {
				if (label) {
					label.textContent = defaultLabel
				}
			}
		})
	}
}
