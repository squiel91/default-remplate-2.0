import { SWIPE_PROGRESS_THRESHOLD, clamp } from './utils'
import type { ProductGalleryHandle } from './types'

interface GalleryImage {
	id: number | null
	url: string
	alt: string
}

export const createProductGallery = (root: Element | null): ProductGalleryHandle | null => {
	if (!(root instanceof HTMLElement)) return null

	const viewport = root.querySelector<HTMLElement>('[data-role="viewport"]')
	const track = root.querySelector<HTMLElement>('[data-role="track"]')
	const openButton = root.querySelector<HTMLButtonElement>('[data-role="open-lightbox"]')
	const thumbs = root.querySelector<HTMLElement>('[data-role="thumbs"]')
	const prevButton = root.querySelector<HTMLButtonElement>('[data-role="prev-image"]')
	const nextButton = root.querySelector<HTMLButtonElement>('[data-role="next-image"]')
	const lightbox = document.getElementById('product-gallery-lightbox')
	const lightboxImage = lightbox?.querySelector<HTMLImageElement>('[data-role="lightbox-image"]')
	const backdrop = lightbox?.querySelector<HTMLElement>('[data-role="backdrop"]')
	const content = lightbox?.querySelector<HTMLElement>('[data-role="content"]')
	const closeButton = lightbox?.querySelector<HTMLButtonElement>('[data-role="close-lightbox"]')
	const slides = Array.from(track?.querySelectorAll<HTMLElement>('[data-product-gallery-slide]') || [])
	const images: GalleryImage[] = slides.map(slide => {
		const image = slide.querySelector('img')
		return {
			id: Number(slide.dataset.imageId) || null,
			url: image?.getAttribute('src') || '',
			alt: image?.getAttribute('alt') || ''
		}
	})

	if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement) || images.length === 0) {
		return null
	}

	let currentIndex = 0
	let closeTimer: number | null = null
	let suppressClick = false
	const drag = {
		active: false,
		pointerId: null as number | null,
		startX: 0,
		offsetX: 0
	}

	const maxIndex = Math.max(0, images.length - 1)
	const slideWidth = (): number => viewport.clientWidth || 1
	const canOpenLightbox = images.some(image => image.url)

	const syncThumbs = (): void => {
		if (!(thumbs instanceof HTMLElement)) return
		for (const button of thumbs.querySelectorAll<HTMLElement>('[data-thumb-index]')) {
			const index = Number(button.getAttribute('data-thumb-index'))
			button.setAttribute('aria-current', index === currentIndex ? 'true' : 'false')
		}
	}

	const syncControls = (): void => {
		const hasMultiple = images.length > 1
		if (prevButton instanceof HTMLButtonElement) {
			prevButton.hidden = !hasMultiple
			prevButton.disabled = !hasMultiple || currentIndex === 0
		}
		if (nextButton instanceof HTMLButtonElement) {
			nextButton.hidden = !hasMultiple
			nextButton.disabled = !hasMultiple || currentIndex === maxIndex
		}
		if (thumbs instanceof HTMLElement) thumbs.hidden = !hasMultiple
		if (openButton instanceof HTMLButtonElement) openButton.disabled = !canOpenLightbox
	}

	const updateTrack = ({ animate }: { animate: boolean }): void => {
		const baseTranslate = -currentIndex * slideWidth()
		const dragOffset = drag.active ? drag.offsetX : 0
		track.style.transition =
			animate && !drag.active ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
		track.style.transform = `translate3d(${baseTranslate + dragOffset}px, 0, 0)`
	}

	const syncLightboxImage = (): void => {
		if (!(lightboxImage instanceof HTMLImageElement)) return
		const current = images[currentIndex]
		if (!current) return
		lightboxImage.src = current.url
		lightboxImage.alt = current.alt
	}

	const goTo = (
		index: number,
		{ animate = true, force = false }: { animate?: boolean; force?: boolean } = {}
	): void => {
		const nextIndex = clamp(index, 0, maxIndex)
		if (nextIndex === currentIndex && !drag.active && !force) return
		currentIndex = nextIndex
		syncThumbs()
		syncControls()
		updateTrack({ animate })
		syncLightboxImage()
	}

	const resolveReleaseIndex = (offsetX: number): number => {
		const threshold = Math.max(slideWidth(), 1) * SWIPE_PROGRESS_THRESHOLD
		if (Math.abs(offsetX) < threshold) return currentIndex
		if (offsetX < 0) return clamp(currentIndex + 1, 0, maxIndex)
		if (offsetX > 0) return clamp(currentIndex - 1, 0, maxIndex)
		return currentIndex
	}

	const openLightbox = (): void => {
		if (!(lightbox instanceof HTMLElement) || !canOpenLightbox) return
		if (closeTimer != null) {
			clearTimeout(closeTimer)
			closeTimer = null
		}
		syncLightboxImage()
		lightbox.hidden = false
		lightbox.dataset.state = 'open'
		document.body.style.overflow = 'hidden'
	}

	const closeLightbox = (): void => {
		if (!(lightbox instanceof HTMLElement) || lightbox.hidden || lightbox.dataset.state === 'closing') return
		lightbox.dataset.state = 'closing'
		if (closeTimer != null) clearTimeout(closeTimer)
		closeTimer = window.setTimeout(() => {
			lightbox.hidden = true
			delete lightbox.dataset.state
			document.body.style.overflow = ''
			closeTimer = null
		}, 180)
	}

	const handlePointerDown = (event: PointerEvent): void => {
		if (images.length < 2) return
		if (event.button !== undefined && event.button !== 0) return
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
	}

	const handleOpenClick = (event: MouseEvent): void => {
		if (suppressClick) {
			event.preventDefault()
			event.stopPropagation()
			suppressClick = false
			return
		}
		openLightbox()
	}

	const handleThumbClick = (event: MouseEvent): void => {
		const button = event.target instanceof Element ? event.target.closest('[data-thumb-index]') : null
		if (!(button instanceof HTMLButtonElement)) return
		const index = Number(button.dataset.thumbIndex)
		if (!Number.isFinite(index)) return
		goTo(index, { animate: true })
	}

	const handleContentClick = (event: MouseEvent): void => {
		if (event.target === event.currentTarget) closeLightbox()
	}

	const handleEscape = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') closeLightbox()
	}

	viewport.addEventListener('pointerdown', handlePointerDown)
	viewport.addEventListener('pointermove', handlePointerMove)
	viewport.addEventListener('pointerup', handlePointerEnd)
	viewport.addEventListener('pointercancel', handlePointerEnd)
	viewport.addEventListener('click', handleOpenClick)
	prevButton?.addEventListener('click', () => goTo(currentIndex - 1, { animate: true }))
	nextButton?.addEventListener('click', () => goTo(currentIndex + 1, { animate: true }))
	thumbs?.addEventListener('click', handleThumbClick)
	backdrop?.addEventListener('click', closeLightbox)
	closeButton?.addEventListener('click', closeLightbox)
	content?.addEventListener('click', handleContentClick)
	document.addEventListener('keydown', handleEscape)

	const resizeObserver = new ResizeObserver(() => updateTrack({ animate: false }))
	resizeObserver.observe(viewport)

	syncThumbs()
	syncControls()
	syncLightboxImage()
	updateTrack({ animate: false })

	return {
		setCurrentImageById(imageId: number | null): void {
			if (imageId == null) return
			const index = images.findIndex(image => image.id === Number(imageId))
			if (index < 0) return
			goTo(index, { animate: true })
		},
		destroy(): void {
			resizeObserver.disconnect()
			document.removeEventListener('keydown', handleEscape)
			if (closeTimer != null) clearTimeout(closeTimer)
		}
	}
}
