import { getTiendu } from './tiendu-sdk.js'

export const setCartQuantity = (quantity: unknown): void => {
	const badge = document.getElementById('cart-quantity-badge')
	if (!(badge instanceof HTMLElement)) return
	badge.textContent = String(Math.max(0, Number(quantity) || 0))
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
		try {
			await tiendu.cart.open(({ updatedCartItemsQuantity }) => {
				setCartQuantity(updatedCartItemsQuantity)
			})
		} catch {
			window.alert('No se pudo abrir el carrito')
		} finally {
			button.disabled = false
		}
	})

	void syncCartQuantity()
}
