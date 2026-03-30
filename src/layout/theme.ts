import { initHeaderCart } from '../lib/cart.js'
import { initHeroCarousels } from '../lib/hero-carousel.js'
import { initVariantSelectors } from '../lib/variant-selector.js'

const initializeTheme = (scope: Document | HTMLElement = document): void => {
	initHeaderCart()
	initHeroCarousels(scope)
	initVariantSelectors(scope)
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => initializeTheme(document), { once: true })
} else {
	initializeTheme(document)
}

window.addEventListener('tiendu:section-updated', event => {
	const detail = (event as Event & { detail?: { sectionId?: unknown } }).detail
	const sectionId = detail?.sectionId
	if (typeof sectionId !== 'string' || !sectionId) {
		initializeTheme(document)
		return
	}

	const sectionRoot = document.querySelector(`[data-section-id="${sectionId}"]`)
	if (sectionRoot instanceof HTMLElement) {
		initializeTheme(sectionRoot)
		return
	}

	initializeTheme(document)
})
