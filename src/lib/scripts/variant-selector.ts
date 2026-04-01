import { setButtonState } from './add-to-cart'
import { setCartQuantity } from './cart'
import { createProductGallery } from './product-gallery'
import { clampQuantityValue, syncQuantityInputUi } from './quantity-input'
import { getTiendu } from './tiendu-sdk'
import type {
	CleanupFn,
	ProductAttribute,
	ProductData,
	ProductVariant,
	ScopeRoot,
	SelectionMap
} from './types'
import { formatMoney, toFiniteNumber, toFiniteStock } from './utils'

interface VariantSetPriceDataArgs {
	product: ProductData
	variants: ProductVariant[]
	currencyCode: string
}

type StockMode = 'unknown' | 'untracked' | 'exact' | 'variable'

interface VariantSetStockData {
	mode: StockMode
	value: number | null
}

const hasPurchasablePrice = (product: ProductData, variant: ProductVariant | null): boolean => {
	if (variant) return typeof variant.priceInCents === 'number'
	return typeof product.basePriceInCents === 'number'
}

const normalizeVariants = (variants: ProductData['variants']): ProductVariant[] => {
	if (!Array.isArray(variants)) return []
	return variants.filter((variant): variant is ProductVariant => Boolean(variant && typeof variant.id === 'number'))
}

const extractVariantValueMap = (variant: ProductVariant | null): SelectionMap => {
	const valueMap: SelectionMap = new Map()
	if (!Array.isArray(variant?.attributes)) return valueMap

	for (const attribute of variant.attributes) {
		const attributeId = Number(attribute?.id)
		const valueId = Number(attribute?.values?.[0]?.id)
		if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
		valueMap.set(attributeId, valueId)
	}

	return valueMap
}

const serializeMap = (valueMap: SelectionMap): string =>
	Array.from(valueMap.entries())
		.sort(([left], [right]) => left - right)
		.map(([attributeId, valueId]) => `${attributeId}:${valueId}`)
		.join(';')

const buildVariantIndex = (variants: ProductVariant[]): Map<string, ProductVariant> => {
	const index = new Map<string, ProductVariant>()
	for (const variant of variants) {
		index.set(serializeMap(extractVariantValueMap(variant)), variant)
	}
	return index
}

const getPriceDataForVariant = (
	product: ProductData,
	variant: ProductVariant | null,
	currencyCode: string
): { label: string; compareLabel: string } => {
	const priceInCents = toFiniteNumber(variant?.priceInCents) ?? toFiniteNumber(product.basePriceInCents)
	const compareInCents = toFiniteNumber(variant?.compareAtPriceInCents)
	const compareLabel =
		priceInCents != null && compareInCents != null && compareInCents > priceInCents
			? formatMoney(compareInCents, currencyCode)
			: ''

	return {
		label: priceInCents != null ? formatMoney(priceInCents, currencyCode) : '',
		compareLabel
	}
}

const getVariantSetPriceData = ({ product, variants, currencyCode }: VariantSetPriceDataArgs) => {
	const pricedVariants = variants.filter((variant): variant is ProductVariant & { priceInCents: number } => typeof variant.priceInCents === 'number')
	if (pricedVariants.length === 0) {
		const basePrice = toFiniteNumber(product.basePriceInCents)
		const baseCompare = toFiniteNumber(product.baseCompareAtPriceInCents)
		return {
			label: basePrice != null ? formatMoney(basePrice, currencyCode) : '',
			compareLabel:
				basePrice != null && baseCompare != null && baseCompare > basePrice
					? formatMoney(baseCompare, currencyCode)
					: ''
		}
	}

	const prices = pricedVariants.map(variant => variant.priceInCents)
	const minPrice = Math.min(...prices)
	const maxPrice = Math.max(...prices)

	const compareValues: number[] = []
	let hasSharedCompare = true
	for (const variant of pricedVariants) {
		const price = toFiniteNumber(variant.priceInCents)
		const compare = toFiniteNumber(variant.compareAtPriceInCents)
		if (price == null || compare == null || compare <= price) {
			hasSharedCompare = false
			break
		}
		compareValues.push(compare)
	}

	const minCompare = hasSharedCompare && compareValues.length > 0 ? Math.min(...compareValues) : null
	const priceLabel =
		minPrice !== maxPrice ? `Desde ${formatMoney(minPrice, currencyCode)}` : formatMoney(minPrice, currencyCode)
	const compareLabel = minCompare != null ? formatMoney(minCompare, currencyCode) : ''

	return {
		label: priceLabel,
		compareLabel:
			minCompare != null
				? minCompare !== Math.max(...compareValues)
					? `Desde ${compareLabel}`
					: compareLabel
				: ''
	}
}

const getVariantSetStockData = (variants: ProductVariant[]): VariantSetStockData => {
	if (variants.length === 0) return { mode: 'unknown', value: null }

	const stocks = variants.map(variant => toFiniteStock(variant.stock))
	const tracked = stocks.filter((value): value is number => value != null)

	if (tracked.length === 0) return { mode: 'untracked', value: null }

	const min = Math.min(...tracked)
	const max = Math.max(...tracked)
	const hasUntracked = tracked.length !== stocks.length

	if (min === max && !hasUntracked) return { mode: 'exact', value: min }
	return { mode: 'variable', value: null }
}

const getSharedVariantCoverImageId = (variants: ProductVariant[]): number | null => {
	const imageIds = variants
		.map(variant => toFiniteNumber(variant.coverImage?.id))
		.filter((id): id is number => id != null)

	if (imageIds.length === 0) return null
	const [firstId] = imageIds
	return imageIds.every(id => id === firstId) ? firstId : null
}

const readSelectedValuesFromDom = (root: Element | null): SelectionMap => {
	const selectedValues: SelectionMap = new Map()
	if (!(root instanceof HTMLElement)) return selectedValues

	for (const button of root.querySelectorAll<HTMLButtonElement>('.option-chip[aria-pressed="true"]')) {
		const attributeId = Number(button.dataset.attributeId)
		const valueId = Number(button.dataset.valueId)
		if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
		selectedValues.set(attributeId, valueId)
	}

	for (const option of root.querySelectorAll<HTMLButtonElement>('.variant-select__option[aria-selected="true"]')) {
		const select = option.closest('.variant-select')
		if (!(select instanceof HTMLElement)) continue
		const attributeId = Number(select.dataset.attributeId)
		const valueId = Number(option.dataset.valueId)
		if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
		selectedValues.set(attributeId, valueId)
	}

	return selectedValues
}

let activeProductCleanup: CleanupFn | null = null

const hydrateProduct = (root: HTMLElement): CleanupFn | null => {
	const scriptEl = root.querySelector('#product-json')
	if (!(scriptEl instanceof HTMLScriptElement)) return null

	let product: ProductData
	try {
		product = JSON.parse(scriptEl.textContent || '{}') as ProductData
	} catch {
		return null
	}

	const variants = normalizeVariants(product.variants)
	const productAttributes = Array.isArray(product.attributes) ? product.attributes : []
	const variantIndex = buildVariantIndex(variants)
	const variantValueEntries = variants.map(variant => ({ variant, valueMap: extractVariantValueMap(variant) }))
	const defaultVariant = variants[0] || null
	const requiresVariantSelection = variants.length > 1 && productAttributes.length > 0
	const variantSelector = root.querySelector<HTMLElement>('#variant-selector')
	const selectedValuesFromDom = readSelectedValuesFromDom(variantSelector)
	const variantFromDom =
		selectedValuesFromDom.size > 0 ? variantIndex.get(serializeMap(selectedValuesFromDom)) || null : null
	const currentUrl = new URL(window.location.href)
	const initialVariantId = Number(currentUrl.searchParams.get('variant-id'))
	const variantFromUrl = variants.find(variant => variant.id === initialVariantId) || null
	const initialVariant = variantFromUrl || variantFromDom || (requiresVariantSelection ? null : defaultVariant)
	const selectedValues: SelectionMap = initialVariant
		? extractVariantValueMap(initialVariant)
		: selectedValuesFromDom.size > 0
			? new Map(selectedValuesFromDom)
			: new Map()

	const currencyCode = root.dataset.currencyCode || 'UYU'
	const gallery = createProductGallery(root.querySelector('#product-gallery'))
	const priceNode = root.querySelector<HTMLElement>('#product-price')
	const compareNode = root.querySelector<HTMLElement>('#product-compare')
	const priceLineNode = root.querySelector<HTMLElement>('.product-price-line')
	const stockNode = root.querySelector<HTMLElement>('#stock-note')
	const addToCartButton = root.querySelector<HTMLButtonElement>('#add-to-cart-button')
	const quantityInput = root.querySelector<HTMLElement>('#product-quantity-input')
	const quantityField = quantityInput?.querySelector<HTMLInputElement>('.quantity-input__field') || null
	const quantityDecreaseButton = quantityInput?.querySelector<HTMLButtonElement>('[data-quantity-decrease]') || null
	const quantityIncreaseButton = quantityInput?.querySelector<HTMLButtonElement>('[data-quantity-increase]') || null
	let variantOptionButtons = Array.from(variantSelector?.querySelectorAll<HTMLButtonElement>('.option-chip') || [])
	let variantSelects = Array.from(variantSelector?.querySelectorAll<HTMLElement>('.variant-select') || [])
	const variantSelectCloseTimers = new WeakMap<HTMLElement, number>()

	let currentVariant = initialVariant
	let matchingVariants = variants
	let quantity = 1

	const getVariantMaxQuantity = (): number | null => {
		const stock = currentVariant?.stock
		if (typeof stock !== 'number') return null
		if (stock <= 0) return 0
		return Math.floor(stock)
	}

	const setStockNote = (tone: string, message: string): void => {
		if (!(stockNode instanceof HTMLElement)) return
		stockNode.setAttribute('data-tone', tone)
		const messageNode = stockNode.querySelector('.product-stock-note__message')
		if (messageNode instanceof HTMLElement) messageNode.textContent = message
	}

	const setStockFromQuantity = (stock: number): void => {
		if (stock === 0) {
			setStockNote('error', 'Temporalmente agotado')
			return
		}
		if (stock <= 4) {
			setStockNote('warning', `Quedan ${stock} ${stock === 1 ? 'unidad' : 'unidades'} en stock`)
			return
		}
		setStockNote('success', `${stock} ${stock === 1 ? 'unidad' : 'unidades'} en stock`)
	}

	const setVariableStockNote = (): void => {
		setStockNote('neutral', 'Selecciona una opción para ver el stock')
	}

	const clampQuantity = (value: unknown): number => clampQuantityValue(value, getVariantMaxQuantity())

	const syncQuantityUi = (): void => {
		const hasPrice = hasPurchasablePrice(product, currentVariant)
		const maxQuantity = getVariantMaxQuantity()
		const hasStock = typeof maxQuantity !== 'number' || maxQuantity > 0
		const shouldEnable = hasPrice && hasStock
		quantity = clampQuantity(quantity)
		syncQuantityInputUi(
			{
				container: quantityInput,
				field: quantityField,
				decreaseButton: quantityDecreaseButton,
				increaseButton: quantityIncreaseButton
			},
			{
				hidden: !hasPrice,
				enabled: shouldEnable,
				value: quantity,
				maxQuantity
			}
		)
	}

	const isVariantSelectionComplete = (): boolean =>
		!requiresVariantSelection ||
		productAttributes.every(attribute => selectedValues.has(Number(attribute.id)))

	const getMatchingVariants = (): ProductVariant[] => {
		if (!requiresVariantSelection) return variants
		if (selectedValues.size === 0) return variants
		return variantValueEntries
			.filter(({ valueMap }) => {
				for (const [selectedAttrId, selectedValueId] of selectedValues.entries()) {
					if (valueMap.get(selectedAttrId) !== selectedValueId) return false
				}
				return true
			})
			.map(({ variant }) => variant)
	}

	const isValueEnabledForSelection = (attributeId: number, valueId: number): boolean =>
		variantValueEntries.some(({ valueMap }) => {
			if (valueMap.get(attributeId) !== valueId) return false
			for (const [selectedAttrId, selectedValueId] of selectedValues.entries()) {
				if (selectedAttrId === attributeId) continue
				if (valueMap.has(selectedAttrId) && valueMap.get(selectedAttrId) !== selectedValueId) return false
			}
			return true
		})

	const syncVariantSelectTrigger = (select: HTMLElement, selectedValueId: number | undefined): void => {
		const labelNode = select.querySelector('[data-variant-select-label]')
		const swatchNode = select.querySelector('[data-variant-select-trigger-swatch]')
		const selectedOption = Array.from(select.querySelectorAll<HTMLButtonElement>('.variant-select__option')).find(
			option => Number(option.dataset.valueId) === Number(selectedValueId)
		)

		if (labelNode instanceof HTMLElement) {
			labelNode.textContent = selectedOption?.dataset.label || 'Selecciona una opción'
			labelNode.classList.toggle('variant-select__label--placeholder', !selectedOption)
		}

		if (swatchNode instanceof HTMLElement) {
			const swatch = selectedOption?.querySelector('.variant-select__swatch')
			swatchNode.innerHTML = swatch instanceof HTMLElement ? swatch.outerHTML : ''
			swatchNode.classList.toggle('variant-select__trigger-swatch--hidden', !swatch)
		}
	}

	const closeVariantSelect = (select: HTMLElement, immediate = false): void => {
		const menu = select.querySelector('[data-variant-select-menu]')
		const trigger = select.querySelector('[data-variant-select-trigger]')
		if (!(menu instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) return
		const existingTimer = variantSelectCloseTimers.get(select)
		if (existingTimer != null) {
			window.clearTimeout(existingTimer)
			variantSelectCloseTimers.delete(select)
		}
		select.dataset.open = 'false'
		trigger.setAttribute('aria-expanded', 'false')
		if (immediate || menu.hidden) {
			menu.hidden = true
			menu.removeAttribute('data-state')
			return
		}
		menu.dataset.state = 'closing'
		const timer = window.setTimeout(() => {
			menu.hidden = true
			menu.removeAttribute('data-state')
			variantSelectCloseTimers.delete(select)
		}, 180)
		variantSelectCloseTimers.set(select, timer)
	}

	const openVariantSelect = (select: HTMLElement): void => {
		for (const otherSelect of variantSelects) {
			if (otherSelect === select) continue
			closeVariantSelect(otherSelect, true)
		}
		const menu = select.querySelector('[data-variant-select-menu]')
		const trigger = select.querySelector('[data-variant-select-trigger]')
		if (!(menu instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) return
		const existingTimer = variantSelectCloseTimers.get(select)
		if (existingTimer != null) {
			window.clearTimeout(existingTimer)
			variantSelectCloseTimers.delete(select)
		}
		select.dataset.open = 'true'
		trigger.setAttribute('aria-expanded', 'true')
		menu.hidden = false
		menu.dataset.state = 'open'
	}

	const updateVariantSelectorState = (): void => {
		if (!(variantSelector instanceof HTMLElement)) return
		variantOptionButtons = Array.from(variantSelector.querySelectorAll<HTMLButtonElement>('.option-chip'))
		variantSelects = Array.from(variantSelector.querySelectorAll<HTMLElement>('.variant-select'))

		for (const button of variantOptionButtons) {
			const attributeId = Number(button.dataset.attributeId)
			const valueId = Number(button.dataset.valueId)
			if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
			const selected = selectedValues.get(attributeId) === valueId
			const enabled = isValueEnabledForSelection(attributeId, valueId)
			button.setAttribute('aria-pressed', selected ? 'true' : 'false')
			button.disabled = !enabled
		}

		for (const select of variantSelects) {
			const attributeId = Number(select.dataset.attributeId)
			const attribute = productAttributes.find((item: ProductAttribute) => Number(item.id) === attributeId)
			if (!attribute || !Array.isArray(attribute.values)) continue
			const selectedValueId = selectedValues.get(attributeId)
			for (const option of select.querySelectorAll<HTMLButtonElement>('.variant-select__option')) {
				const valueId = Number(option.dataset.valueId)
				if (!Number.isFinite(valueId)) {
					option.disabled = false
					continue
				}
				option.setAttribute('aria-selected', selectedValueId === valueId ? 'true' : 'false')
				option.disabled = !isValueEnabledForSelection(attributeId, valueId)
			}
			syncVariantSelectTrigger(select, selectedValueId)
		}
	}

	const updatePrice = (): void => {
		if (requiresVariantSelection && !currentVariant) {
			const priceData = getVariantSetPriceData({ product, variants: matchingVariants, currencyCode })
			const hasPriceLabel = typeof priceData.label === 'string' && priceData.label.length > 0
			if (priceLineNode instanceof HTMLElement) priceLineNode.hidden = !hasPriceLabel
			if (priceNode instanceof HTMLElement) priceNode.textContent = hasPriceLabel ? priceData.label : ''
			if (compareNode instanceof HTMLElement) {
				compareNode.textContent = hasPriceLabel ? priceData.compareLabel || '' : ''
				compareNode.hidden = !hasPriceLabel || !priceData.compareLabel
			}
			if (stockNode instanceof HTMLElement) {
				const stockData = getVariantSetStockData(matchingVariants)
				if (stockData.mode === 'exact' && typeof stockData.value === 'number') setStockFromQuantity(stockData.value)
				else if (stockData.mode === 'untracked') setStockNote('success', 'Tenemos en stock')
				else setVariableStockNote()
			}
			return
		}

		const priceData = getPriceDataForVariant(product, currentVariant, currencyCode)
		const hasPriceLabel = hasPurchasablePrice(product, currentVariant)
		if (priceLineNode instanceof HTMLElement) priceLineNode.hidden = !hasPriceLabel
		if (priceNode instanceof HTMLElement) priceNode.textContent = hasPriceLabel ? priceData.label : ''
		if (compareNode instanceof HTMLElement) {
			compareNode.textContent = hasPriceLabel ? priceData.compareLabel || '' : ''
			compareNode.hidden = !hasPriceLabel || !priceData.compareLabel
		}
		if (stockNode instanceof HTMLElement) {
			const stock = currentVariant?.stock
			if (typeof stock === 'number') setStockFromQuantity(Math.max(0, Math.floor(stock)))
			else setStockNote('success', 'Tenemos en stock')
		}
	}

	const updateAddToCartAction = (): void => {
		if (!(addToCartButton instanceof HTMLButtonElement)) return
		if (requiresVariantSelection && !currentVariant) {
			setButtonState(addToCartButton, {
				label: 'Agregar al carrito',
				icon: 'plus',
				disabled: false
			})
			syncQuantityUi()
			return
		}
		const hasPriceLabel = hasPurchasablePrice(product, currentVariant)
		const isOutOfStock = Boolean(currentVariant && currentVariant.stock === 0)
		if (isOutOfStock) {
			setButtonState(addToCartButton, { label: 'Consultar', icon: 'message-square', disabled: false })
			syncQuantityUi()
			return
		}
		if (!hasPriceLabel) {
			setButtonState(addToCartButton, { label: 'Consultar precio', icon: 'message-square', disabled: false })
			syncQuantityUi()
			return
		}
		setButtonState(addToCartButton, {
			label: 'Agregar al carrito',
			icon: 'plus',
			disabled: !currentVariant
		})
		syncQuantityUi()
	}

	const syncVariantUrl = (): void => {
		const nextUrl = new URL(window.location.href)
		const hadVariantId = nextUrl.searchParams.has('variant-id')
		if (currentVariant?.id && variants.length > 1) nextUrl.searchParams.set('variant-id', String(currentVariant.id))
		else nextUrl.searchParams.delete('variant-id')
		const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
		const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`
		if (nextHref === currentHref && hadVariantId === nextUrl.searchParams.has('variant-id')) return
		window.history.replaceState(window.history.state, '', nextHref)
	}

	const syncVariantFromSelection = (): void => {
		matchingVariants = getMatchingVariants()
		if (requiresVariantSelection && !isVariantSelectionComplete()) {
			currentVariant = null
		} else {
			const selectedKey = serializeMap(selectedValues)
			currentVariant = variantIndex.get(selectedKey) || (requiresVariantSelection ? null : defaultVariant)
		}

		updatePrice()
		updateVariantSelectorState()
		updateAddToCartAction()
		syncVariantUrl()

		if (gallery && typeof currentVariant?.coverImage?.id === 'number') {
			gallery.setCurrentImageById(currentVariant.coverImage.id)
			return
		}
		if (gallery) {
			const sharedImageId = getSharedVariantCoverImageId(matchingVariants)
			if (typeof sharedImageId === 'number') gallery.setCurrentImageById(sharedImageId)
		}
	}

	const onVariantClick = (event: MouseEvent): void => {
		const target = event.target instanceof Element ? event.target.closest('button') : null
		if (!(target instanceof HTMLButtonElement)) return

		const selectTrigger = target.closest('[data-variant-select-trigger]')
		if (selectTrigger) {
			event.preventDefault()
			const select = selectTrigger.closest('.variant-select')
			if (!(select instanceof HTMLElement)) return
			if (select.dataset.open === 'true') closeVariantSelect(select)
			else openVariantSelect(select)
			return
		}

		const selectOption = target.closest('.variant-select__option')
		if (selectOption instanceof HTMLButtonElement) {
			event.preventDefault()
			const select = selectOption.closest('.variant-select')
			if (!(select instanceof HTMLElement)) return
			const attributeId = Number(select.dataset.attributeId)
			const valueId = Number(selectOption.dataset.valueId)
			if (!Number.isFinite(attributeId) || !Number.isFinite(valueId) || selectOption.disabled) return
			selectedValues.set(attributeId, valueId)
			closeVariantSelect(select)
			syncVariantFromSelection()
			return
		}

		const attributeId = Number(target.dataset.attributeId)
		const valueId = Number(target.dataset.valueId)
		if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) return
		selectedValues.set(attributeId, valueId)
		syncVariantFromSelection()
	}

	const onDocumentClick = (event: MouseEvent): void => {
		if (!(event.target instanceof Node)) return
		if (variantSelector?.contains(event.target)) return
		for (const select of variantSelects) closeVariantSelect(select)
	}

	const onDocumentKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') return
		for (const select of variantSelects) closeVariantSelect(select)
	}

	variantSelector?.addEventListener('click', onVariantClick)
	document.addEventListener('click', onDocumentClick)
	document.addEventListener('keydown', onDocumentKeydown)

	const onDecrease = (): void => {
		quantity = clampQuantity(quantity - 1)
		syncQuantityUi()
	}
	const onIncrease = (): void => {
		quantity = clampQuantity(quantity + 1)
		syncQuantityUi()
	}
	const onQuantityInput = (): void => {
		quantity = clampQuantity(quantityField instanceof HTMLInputElement ? quantityField.value : 1)
		syncQuantityUi()
	}
	quantityDecreaseButton?.addEventListener('click', onDecrease)
	quantityIncreaseButton?.addEventListener('click', onIncrease)
	quantityField?.addEventListener('input', onQuantityInput)
	quantityField?.addEventListener('blur', onQuantityInput)

	const onAddToCart = (): void => {
		if (requiresVariantSelection && !currentVariant) {
			window.alert('Elegi una variante antes de agregarla al carrito')
			return
		}
		if (!currentVariant) {
			window.alert('No hay variante seleccionada')
			return
		}
		if (!hasPurchasablePrice(product, currentVariant)) {
			window.alert('Esta variante no tiene precio disponible')
			return
		}
		if (currentVariant.stock === 0) {
			window.alert('Esta variante está agotada')
			return
		}
		const tiendu = getTiendu()
		if (!tiendu) {
			window.alert('No se pudo inicializar el carrito')
			return
		}

		setButtonState(addToCartButton instanceof HTMLButtonElement ? addToCartButton : null, {
			label:
				addToCartButton instanceof HTMLButtonElement
					? addToCartButton.querySelector('.button__label')?.textContent || 'Agregar al carrito'
					: 'Agregar al carrito',
			icon: addToCartButton instanceof HTMLButtonElement ? addToCartButton.dataset.icon || 'plus' : 'plus',
			loading: true
		})

		tiendu.cart
			.addProductVariant(currentVariant, clampQuantity(quantity), () => {
				updateAddToCartAction()
				void tiendu.cart.getQuantity().then(({ quantity: nextQuantity }) => {
					setCartQuantity(nextQuantity)
				})
			})
			.catch(() => {
				updateAddToCartAction()
				window.alert('No se pudo agregar al carrito')
			})
	}
	addToCartButton?.addEventListener('click', onAddToCart)

	syncVariantFromSelection()

	return () => {
		gallery?.destroy()
		variantSelector?.removeEventListener('click', onVariantClick)
		document.removeEventListener('click', onDocumentClick)
		document.removeEventListener('keydown', onDocumentKeydown)
		quantityDecreaseButton?.removeEventListener('click', onDecrease)
		quantityIncreaseButton?.removeEventListener('click', onIncrease)
		quantityField?.removeEventListener('input', onQuantityInput)
		quantityField?.removeEventListener('blur', onQuantityInput)
		addToCartButton?.removeEventListener('click', onAddToCart)
	}
}

export const initVariantSelectors = (scope: ScopeRoot = document): void => {
	const root = scope instanceof HTMLElement ? scope : document.documentElement
	const productPage = root.matches('.main-product') ? root : root.querySelector<HTMLElement>('.main-product')
	if (!productPage) return
	activeProductCleanup?.()
	activeProductCleanup = hydrateProduct(productPage)
}
