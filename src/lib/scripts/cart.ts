import { getTiendu } from './tiendu-sdk'

const CART_LOADING_MS = 4000

const setCartButtonLoading = (
	button: HTMLButtonElement,
	loading: boolean
): void => {
	for (const iconNode of button.querySelectorAll<HTMLElement>('[data-cart-button-icon]')) {
		iconNode.hidden = iconNode.dataset.cartButtonIcon !== (loading ? 'loader' : 'shopping-bag')
	}
}

export const setCartQuantity = (quantity: unknown): void => {
	const badge = document.getElementById('cart-quantity-badge')
	if (!(badge instanceof HTMLElement)) return
	const nextQuantity = Math.max(0, Number(quantity) || 0)
	badge.textContent = String(nextQuantity)
	badge.hidden = nextQuantity <= 0
}

export const syncCartQuantity = async (): Promise<void> => {
	const tiendu = getTiendu()
	if (!tiendu) return

	try {
		const { quantity } = await tiendu.cart.getQuantity()
		setCartQuantity(quantity)
	} catch {
		setCartQuantity(0)
	}
}

export const initHeaderCart = (): void => {
	const button = document.getElementById('open-cart-button')
	if (!(button instanceof HTMLButtonElement)) return

	if (button.dataset.bound === 'true') {
		void syncCartQuantity()
		return
	}

	button.dataset.bound = 'true'
	button.addEventListener('click', async () => {
		const tiendu = getTiendu()
		if (!tiendu) {
			window.alert('No se pudo inicializar el carrito')
			return
		}

		button.disabled = true
		setCartButtonLoading(button, true)
		try {
			await tiendu.cart.open(({ updatedCartItemsQuantity }) => {
				setCartQuantity(updatedCartItemsQuantity)
			})
		} catch {
			window.alert('No se pudo abrir el carrito')
		} finally {
			await new Promise(resolve => window.setTimeout(resolve, CART_LOADING_MS))
			setCartButtonLoading(button, false)
			button.disabled = false
		}
	})

	void syncCartQuantity()
}
