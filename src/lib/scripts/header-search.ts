import type { ProductListing } from './types'
import { getTiendu } from './tiendu-sdk'

const OPEN_STATE_KEY = 'tienduHeaderSearchOpen'
const SEARCH_DEBOUNCE_MS = 400
const CLOSE_ANIMATION_MS = 220

let currentOverlay: HTMLElement | null = null
let cleanupCurrentSearch: (() => void) | null = null
let previousBodyOverflow = ''
let previousBodyPaddingRight = ''
let previousDocumentOverflow = ''

type SearchElements = {
	overlay: HTMLElement
	dialog: HTMLElement
	form: HTMLFormElement
	input: HTMLInputElement
	closeButton: HTMLButtonElement
	loader: HTMLElement
	results: HTMLElement
	empty: HTMLElement
	initial: HTMLElement
	template: HTMLTemplateElement
}

const getElements = (): SearchElements | null => {
	const overlay = document.querySelector<HTMLElement>('[data-header-search-overlay]')
	const dialog = overlay?.querySelector<HTMLElement>('[data-header-search-dialog]') ?? null
	const form = overlay?.querySelector<HTMLFormElement>('[data-header-search-form]') ?? null
	const input = overlay?.querySelector<HTMLInputElement>('[data-header-search-input]') ?? null
	const closeButton = overlay?.querySelector<HTMLButtonElement>('[data-header-search-close]') ?? null
	const loader = overlay?.querySelector<HTMLElement>('[data-header-search-loader]') ?? null
	const results = overlay?.querySelector<HTMLElement>('[data-header-search-results]') ?? null
	const empty = overlay?.querySelector<HTMLElement>('[data-header-search-empty]') ?? null
	const initial = overlay?.querySelector<HTMLElement>('[data-header-search-initial]') ?? null
	const template = overlay?.querySelector<HTMLTemplateElement>('[data-header-search-result-template]') ?? null

	if (
		!(overlay instanceof HTMLElement) ||
		!(dialog instanceof HTMLElement) ||
		!(form instanceof HTMLFormElement) ||
		!(input instanceof HTMLInputElement) ||
		!(closeButton instanceof HTMLButtonElement) ||
		!(loader instanceof HTMLElement) ||
		!(results instanceof HTMLElement) ||
		!(empty instanceof HTMLElement) ||
		!(initial instanceof HTMLElement) ||
		!(template instanceof HTMLTemplateElement)
	) {
		return null
	}

	return {
		overlay,
		dialog,
		form,
		input,
		closeButton,
		loader,
		results,
		empty,
		initial,
		template
	}
}

const getTriggers = (): HTMLElement[] =>
	Array.from(document.querySelectorAll<HTMLElement>('[data-header-search-trigger]'))

const getProductHref = (product: ProductListing): string => product.url || product.publicUrl || '#'

const lockPageScroll = (): void => {
	const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
	previousBodyOverflow = document.body.style.overflow
	previousBodyPaddingRight = document.body.style.paddingRight
	previousDocumentOverflow = document.documentElement.style.overflow
	document.body.style.overflow = 'hidden'
	document.documentElement.style.overflow = 'hidden'
	if (scrollbarWidth > 0) {
		document.body.style.paddingRight = `${scrollbarWidth}px`
	}
}

const unlockPageScroll = (): void => {
	document.body.style.overflow = previousBodyOverflow
	document.body.style.paddingRight = previousBodyPaddingRight
	document.documentElement.style.overflow = previousDocumentOverflow
}

const renderResults = (
	container: HTMLElement,
	template: HTMLTemplateElement,
	products: ProductListing[]
): void => {
	container.innerHTML = ''

	for (const product of products) {
		const fragment = template.content.cloneNode(true) as DocumentFragment
		const link = fragment.querySelector<HTMLAnchorElement>('[data-search-result-link]')
		const image = fragment.querySelector<HTMLImageElement>('[data-search-result-image]')
		const imageFallback = fragment.querySelector<HTMLElement>('[data-search-result-image-fallback]')
		const title = fragment.querySelector<HTMLElement>('[data-search-result-title]')
		const price = fragment.querySelector<HTMLElement>('[data-search-result-price]')

		if (!(link instanceof HTMLAnchorElement) || !(title instanceof HTMLElement) || !(price instanceof HTMLElement)) {
			continue
		}

		link.href = getProductHref(product)
		title.textContent = product.title || 'Producto'
		price.textContent =
			typeof product.basePriceInCents === 'number'
				? new Intl.NumberFormat('es-UY', {
						style: 'currency',
						currency: 'UYU'
					}).format(product.basePriceInCents / 100)
				: ''

		if (image instanceof HTMLImageElement && imageFallback instanceof HTMLElement) {
			if (product.coverImage?.url) {
				image.src = product.coverImage.url
				image.alt = product.coverImage.alt || product.title || 'Producto'
				image.hidden = false
				imageFallback.hidden = true
			} else {
				image.hidden = true
				imageFallback.hidden = false
			}
		}

		container.appendChild(fragment)
	}
}

export const initHeaderSearch = (): void => {
	const elements = getElements()
	if (!elements) return
	const triggers = getTriggers()
	if (triggers.length === 0) return
	if (currentOverlay === elements.overlay) return
	if (cleanupCurrentSearch) {
		cleanupCurrentSearch()
		cleanupCurrentSearch = null
	}
	currentOverlay = elements.overlay

	let isOpen = false
	let debounceTimer: number | null = null
	let closeTimer: number | null = null
	let activeRequest = 0
	elements.overlay.dataset.state = 'closed'

	const setLoading = (loading: boolean): void => {
		elements.loader.hidden = !loading
	}

	const finishClose = (): void => {
		resetResults()
		elements.input.value = ''
		elements.overlay.hidden = true
		closeTimer = null
	}

	const resetResults = (): void => {
		elements.results.innerHTML = ''
		elements.results.hidden = true
		elements.empty.hidden = true
		elements.initial.hidden = false
		setLoading(false)
	}

	const showResults = (products: ProductListing[], query: string): void => {
		elements.initial.hidden = true
		setLoading(false)

		if (query.trim().length === 0) {
			elements.results.hidden = true
			elements.empty.hidden = true
			elements.initial.hidden = false
			return
		}

		if (products.length === 0) {
			elements.results.innerHTML = ''
			elements.results.hidden = true
			elements.empty.hidden = false
			return
		}

		renderResults(elements.results, elements.template, products)
		elements.results.hidden = false
		elements.empty.hidden = true
	}

	const closeOverlay = (fromHistory = false): void => {
		if (!isOpen) return
		isOpen = false
		elements.overlay.dataset.state = 'closed'
		unlockPageScroll()
		if (closeTimer !== null) {
			window.clearTimeout(closeTimer)
		}
		closeTimer = window.setTimeout(finishClose, CLOSE_ANIMATION_MS)

		if (!fromHistory && (window.history.state as Record<string, unknown> | null)?.[OPEN_STATE_KEY]) {
			window.history.back()
		}
	}

	const openOverlay = (query = ''): void => {
		if (isOpen) return
		isOpen = true
		if (closeTimer !== null) {
			window.clearTimeout(closeTimer)
			closeTimer = null
		}
		elements.overlay.hidden = false
		lockPageScroll()
		resetResults()
		elements.input.value = query
		window.history.pushState(
			{ ...(window.history.state as Record<string, unknown> | null), [OPEN_STATE_KEY]: true },
			'',
			window.location.href
		)
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				elements.overlay.dataset.state = 'open'
				elements.input.focus()
				if (query.trim().length > 0) {
					void runSearch(query)
				}
			})
		})
	}

	const runSearch = async (query: string): Promise<void> => {
		const trimmedQuery = query.trim()
		if (trimmedQuery.length === 0) {
			resetResults()
			return
		}

		const requestId = activeRequest + 1
		activeRequest = requestId
		setLoading(true)
		elements.initial.hidden = true
		elements.empty.hidden = true

		try {
			const tiendu = getTiendu()
			const response = await tiendu.products.list({ search: trimmedQuery, limit: 6 })
			if (requestId !== activeRequest) return
			showResults(response.data, trimmedQuery)
			tiendu.analytics.trackSearch({
				query: trimmedQuery,
				source: 'header-overlay',
				resultsCount: response.data.length
			})
		} catch {
			if (requestId !== activeRequest) return
			showResults([], trimmedQuery)
		} finally {
			if (requestId === activeRequest) {
				setLoading(false)
			}
		}
	}

	const handleTriggerClick = (event: Event) => {
		event.preventDefault()
		const trigger = event.currentTarget
		const query =
			trigger instanceof HTMLElement
				? trigger.dataset.headerSearchQuery || ''
				: ''
		openOverlay(query)
	}

	const handleCloseClick = () => {
		closeOverlay()
	}

	const handleOverlayClick = (event: MouseEvent) => {
		if (event.target === elements.overlay) {
			closeOverlay()
		}
	}

	const handleDialogClick = (event: MouseEvent) => {
		event.stopPropagation()
	}

	const handleFormSubmit = (event: SubmitEvent) => {
		if (elements.input.value.trim().length === 0) {
			event.preventDefault()
			return
		}
		closeOverlay()
	}

	const handleInput = () => {
		if (debounceTimer !== null) {
			window.clearTimeout(debounceTimer)
		}
		debounceTimer = window.setTimeout(() => {
			void runSearch(elements.input.value)
		}, SEARCH_DEBOUNCE_MS)
	}

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && isOpen) {
			closeOverlay()
		}
	}

	const handlePopstate = () => {
		if (isOpen) {
			closeOverlay(true)
		}
	}

	for (const trigger of triggers) {
		trigger.addEventListener('click', handleTriggerClick)
	}
	elements.closeButton.addEventListener('click', handleCloseClick)
	elements.overlay.addEventListener('click', handleOverlayClick)
	elements.dialog.addEventListener('click', handleDialogClick)
	elements.form.addEventListener('submit', handleFormSubmit)
	elements.input.addEventListener('input', handleInput)
	window.addEventListener('keydown', handleKeydown)
	window.addEventListener('popstate', handlePopstate)

	cleanupCurrentSearch = () => {
		if (debounceTimer !== null) {
			window.clearTimeout(debounceTimer)
		}
		if (closeTimer !== null) {
			window.clearTimeout(closeTimer)
		}
		if (isOpen) {
			unlockPageScroll()
		}
		for (const trigger of triggers) {
			trigger.removeEventListener('click', handleTriggerClick)
		}
		elements.closeButton.removeEventListener('click', handleCloseClick)
		elements.overlay.removeEventListener('click', handleOverlayClick)
		elements.dialog.removeEventListener('click', handleDialogClick)
		elements.form.removeEventListener('submit', handleFormSubmit)
		elements.input.removeEventListener('input', handleInput)
		window.removeEventListener('keydown', handleKeydown)
		window.removeEventListener('popstate', handlePopstate)
	}
}
