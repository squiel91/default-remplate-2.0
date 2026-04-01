import type { ScopeRoot } from './types'

const DESCRIPTION_THRESHOLD = 280

export const initProductAboutSections = (scope: ScopeRoot = document): void => {
	const roots = scope instanceof HTMLElement && scope.matches('[data-product-about]')
		? [scope]
		: Array.from(scope.querySelectorAll<HTMLElement>('[data-product-about]'))

	for (const root of roots) {
		if (root.dataset.bound === 'true') continue
		root.dataset.bound = 'true'

		const description = root.querySelector<HTMLElement>('[data-product-about-description]')
		const toggle = root.querySelector<HTMLButtonElement>('[data-product-about-toggle]')
		const label = root.querySelector<HTMLElement>('[data-product-about-toggle-label]')

		if (!(description instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement) || !(label instanceof HTMLElement)) {
			continue
		}

		const descriptionText = description.textContent?.trim() ?? ''
		if (descriptionText.length <= DESCRIPTION_THRESHOLD) {
			toggle.hidden = true
			root.dataset.expanded = 'true'
			continue
		}

		root.dataset.expanded = 'false'
		toggle.hidden = false

		toggle.addEventListener('click', () => {
			const isExpanded = root.dataset.expanded === 'true'
			root.dataset.expanded = isExpanded ? 'false' : 'true'
			label.textContent = isExpanded ? 'Ver mas' : 'Ver menos'
		})
	}
}
