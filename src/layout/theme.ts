import { initHeaderCart } from '../lib/scripts/cart'
import { initBreadcrumbContexts } from '../lib/scripts/breadcrumb-context'
import { initHeaderSearch } from '../lib/scripts/header-search'
import { initHeroCarousels } from '../lib/scripts/hero-carousel'
import { initProductAboutSections } from '../lib/scripts/product-about'
import { initProductShareButtons } from '../lib/scripts/product-share'
import { initVariantSelectors } from '../lib/scripts/variant-selector'

const initializeTheme = (scope: Document | HTMLElement = document): void => {
	initBreadcrumbContexts(scope)
	initHeaderCart()
	initHeaderSearch()
	initHeroCarousels(scope)
	initProductAboutSections(scope)
	initProductShareButtons(scope)
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
