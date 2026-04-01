import { HERO_AUTOPLAY_INTERVAL, SWIPE_PROGRESS_THRESHOLD, clamp } from './utils'
import type { ScopeRoot } from './types'

interface HeroCarouselHandle {
	destroy(): void
}

const createHeroCarousel = (root: HTMLElement): HeroCarouselHandle | null => {
	const existingCleanup = root.__tienduHeroCarouselCleanup
	if (typeof existingCleanup === 'function') existingCleanup()

	const viewport = root.querySelector<HTMLElement>('[data-role="viewport"]')
	const track = root.querySelector<HTMLElement>('[data-role="track"]')
	const dots = root.querySelector<HTMLElement>('[data-role="dots"]')
	const prevButton = root.querySelector<HTMLButtonElement>('[data-role="prev-image"]')
	const nextButton = root.querySelector<HTMLButtonElement>('[data-role="next-image"]')
	const slides = Array.from(track?.querySelectorAll<HTMLElement>('[data-hero-carousel-slide]') || [])

	if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement) || slides.length === 0) {
		return null
	}

	let currentIndex = 0
	let autoplayTimer: number | null = null
	let suppressClick = false
	const drag = {
		active: false,
		pointerId: null as number | null,
		startX: 0,
		offsetX: 0
	}

	const parsedAutoplayInterval = Number(root.dataset.autoplayInterval)
	const autoplayInterval =
		Number.isFinite(parsedAutoplayInterval) && parsedAutoplayInterval > 0
			? parsedAutoplayInterval
			: HERO_AUTOPLAY_INTERVAL
	const hasMultiple = (): boolean => slides.length > 1
	const maxIndex = Math.max(0, slides.length - 1)
	const slideWidth = (): number => viewport.clientWidth || 1

	const stopAutoplay = (): void => {
		if (autoplayTimer == null) return
		window.clearInterval(autoplayTimer)
		autoplayTimer = null
	}

	const next = (): void => {
		if (!hasMultiple()) return
		goTo(currentIndex === maxIndex ? 0 : currentIndex + 1, {
			animate: true,
			force: currentIndex === maxIndex
		})
	}

	const startAutoplay = (): void => {
		stopAutoplay()
		if (!hasMultiple()) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		autoplayTimer = window.setInterval(() => {
			next()
		}, autoplayInterval)
	}

	const handleResize = (): void => {
		updateTrack({ animate: false })
	}

	const syncSlides = (): void => {
		for (const [index, slide] of slides.entries()) {
			slide.setAttribute('aria-hidden', index === currentIndex ? 'false' : 'true')
		}
	}

	const syncDots = (): void => {
		if (!(dots instanceof HTMLElement)) return
		for (const button of dots.querySelectorAll<HTMLElement>('[data-dot-index]')) {
			const index = Number(button.getAttribute('data-dot-index'))
			const isActive = index === currentIndex
			button.classList.toggle('is-active', isActive)
			button.setAttribute('aria-selected', isActive ? 'true' : 'false')
		}
	}

	const syncControls = (): void => {
		const multiple = hasMultiple()
		if (prevButton instanceof HTMLButtonElement) {
			prevButton.hidden = !multiple
			prevButton.disabled = !multiple
		}
		if (nextButton instanceof HTMLButtonElement) {
			nextButton.hidden = !multiple
			nextButton.disabled = !multiple
		}
		if (dots instanceof HTMLElement) dots.hidden = !multiple
	}

	const updateTrack = ({ animate }: { animate: boolean }): void => {
		const baseTranslate = -currentIndex * slideWidth()
		const dragOffset = drag.active ? drag.offsetX : 0
		track.style.transition =
			animate && !drag.active ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
		track.style.transform = `translate3d(${baseTranslate + dragOffset}px, 0, 0)`
	}

	const goTo = (
		index: number,
		{ animate = true, force = false }: { animate?: boolean; force?: boolean } = {}
	): void => {
		const nextIndex = clamp(index, 0, maxIndex)
		if (nextIndex === currentIndex && !drag.active && !force) return
		currentIndex = nextIndex
		syncSlides()
		syncDots()
		syncControls()
		updateTrack({ animate })
	}

	const prev = (): void => {
		if (!hasMultiple()) return
		goTo(currentIndex === 0 ? maxIndex : currentIndex - 1, {
			animate: true,
			force: currentIndex === 0
		})
	}

	const resolveReleaseIndex = (offsetX: number): number => {
		const threshold = Math.max(slideWidth(), 1) * SWIPE_PROGRESS_THRESHOLD
		if (Math.abs(offsetX) < threshold) return currentIndex
		if (offsetX < 0) return clamp(currentIndex + 1, 0, maxIndex)
		if (offsetX > 0) return clamp(currentIndex - 1, 0, maxIndex)
		return currentIndex
	}

	const handlePointerDown = (event: PointerEvent): void => {
		if (!hasMultiple()) return
		if (event.button !== undefined && event.button !== 0) return
		const interactiveTarget =
			event.target instanceof Element
				? event.target.closest('a, button, input, select, textarea, summary')
				: null
		if (interactiveTarget && viewport.contains(interactiveTarget)) return

		stopAutoplay()
		drag.active = true
		drag.pointerId = event.pointerId
		drag.startX = event.clientX
		drag.offsetX = 0
		viewport.setPointerCapture?.(event.pointerId)
		viewport.dataset.dragging = 'true'
		updateTrack({ animate: false })
	}

	const handlePointerMove = (event: PointerEvent): void => {
		if (!drag.active) return
		if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return
		const rawDelta = event.clientX - drag.startX
		let delta = rawDelta
		if ((currentIndex === 0 && rawDelta > 0) || (currentIndex === maxIndex && rawDelta < 0)) {
			delta = rawDelta * 0.35
		}
		drag.offsetX = delta
		updateTrack({ animate: false })
	}

	const handlePointerEnd = (event: PointerEvent): void => {
		if (!drag.active) return
		if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return
		viewport.releasePointerCapture?.(event.pointerId)
		viewport.dataset.dragging = 'false'
		const moved = Math.abs(drag.offsetX)
		const nextIndex = resolveReleaseIndex(drag.offsetX)
		drag.active = false
		drag.pointerId = null
		drag.offsetX = 0
		suppressClick = moved > 6
		goTo(nextIndex, { animate: true, force: true })
		startAutoplay()
	}

	const handleViewportClick = (event: MouseEvent): void => {
		if (!suppressClick) return
		event.preventDefault()
		event.stopPropagation()
		suppressClick = false
	}

	const handlePrevClick = (): void => {
		prev()
		startAutoplay()
	}

	const handleNextClick = (): void => {
		next()
		startAutoplay()
	}

	const handleDotClick = (event: MouseEvent): void => {
		const button = event.target instanceof Element ? event.target.closest('[data-dot-index]') : null
		if (!(button instanceof HTMLButtonElement)) return
		const index = Number(button.dataset.dotIndex)
		if (!Number.isFinite(index)) return
		goTo(index, { animate: true })
		startAutoplay()
	}

	const handleMouseEnter = (): void => {
		stopAutoplay()
	}

	const handleMouseLeave = (): void => {
		startAutoplay()
	}

	const handleFocusIn = (): void => {
		stopAutoplay()
	}

	const handleFocusOut = (event: FocusEvent): void => {
		if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return
		startAutoplay()
	}

	viewport.addEventListener('pointerdown', handlePointerDown)
	viewport.addEventListener('pointermove', handlePointerMove)
	viewport.addEventListener('pointerup', handlePointerEnd)
	viewport.addEventListener('pointercancel', handlePointerEnd)
	viewport.addEventListener('click', handleViewportClick)
	prevButton?.addEventListener('click', handlePrevClick)
	nextButton?.addEventListener('click', handleNextClick)
	dots?.addEventListener('click', handleDotClick)
	root.addEventListener('mouseenter', handleMouseEnter)
	root.addEventListener('mouseleave', handleMouseLeave)
	root.addEventListener('focusin', handleFocusIn)
	root.addEventListener('focusout', handleFocusOut)
	window.addEventListener('resize', handleResize)

	syncSlides()
	syncDots()
	syncControls()
	updateTrack({ animate: false })
	startAutoplay()

	const destroy = (): void => {
		stopAutoplay()
		viewport.removeEventListener('pointerdown', handlePointerDown)
		viewport.removeEventListener('pointermove', handlePointerMove)
		viewport.removeEventListener('pointerup', handlePointerEnd)
		viewport.removeEventListener('pointercancel', handlePointerEnd)
		viewport.removeEventListener('click', handleViewportClick)
		prevButton?.removeEventListener('click', handlePrevClick)
		nextButton?.removeEventListener('click', handleNextClick)
		dots?.removeEventListener('click', handleDotClick)
		root.removeEventListener('mouseenter', handleMouseEnter)
		root.removeEventListener('mouseleave', handleMouseLeave)
		root.removeEventListener('focusin', handleFocusIn)
		root.removeEventListener('focusout', handleFocusOut)
		window.removeEventListener('resize', handleResize)
		delete root.__tienduHeroCarouselCleanup
	}

	root.__tienduHeroCarouselCleanup = destroy
	return { destroy }
}

export const initHeroCarousels = (scope: ScopeRoot = document): void => {
	const root = scope instanceof HTMLElement ? scope : document.documentElement
	const heroCarousels = root.matches('[data-hero-carousel]')
		? [root]
		: Array.from(root.querySelectorAll<HTMLElement>('[data-hero-carousel]'))

	for (const carousel of heroCarousels) {
		createHeroCarousel(carousel)
	}
}
