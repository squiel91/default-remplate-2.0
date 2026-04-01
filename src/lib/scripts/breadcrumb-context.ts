import type { ScopeRoot } from './types'

type Crumb = {
	label: string
	href?: string
}

const buildChevron = (): HTMLElement => {
	const chevron = document.createElement('span')
	chevron.className = 'inline-flex text-slate-300'
	chevron.setAttribute('aria-hidden', 'true')
	chevron.textContent = '›'
	return chevron
}

const buildCrumb = ({ label, href }: Crumb): HTMLElement => {
	if (href) {
		const link = document.createElement('a')
		link.href = href
		link.className = 'font-semibold text-[var(--color-primary)] transition hover:opacity-80 hover:no-underline'
		link.textContent = label
		return link
	}

	const span = document.createElement('span')
	span.className = 'text-slate-900'
	span.textContent = label
	return span
}

export const initBreadcrumbContexts = (scope: ScopeRoot = document): void => {
	const navs =
		scope instanceof HTMLElement && scope.matches('[data-breadcrumb-nav]')
			? [scope]
			: Array.from(scope.querySelectorAll<HTMLElement>('[data-breadcrumb-nav]'))

	for (const nav of navs) {
		const currentTitle = nav.dataset.currentTitle?.trim() ?? ''
		const currentType = nav.dataset.currentType?.trim() ?? ''
		if (!currentTitle && !currentType) continue

		const params = new URLSearchParams(window.location.search)
		const fromUrl = params.get('url-from')?.trim() ?? ''
		const fromTitle = params.get('title-from')?.trim() ?? ''

		const crumbs: Crumb[] = [{ label: 'Inicio', href: '/' }]

		if (currentType === 'product' || currentType === 'category' || currentType === 'article') {
			if (fromUrl && fromTitle && fromUrl !== '/' && fromTitle.toLowerCase() !== 'inicio') {
				crumbs.push({ label: fromTitle, href: fromUrl })
			}
			crumbs.push({ label: currentTitle })
		} else {
			continue
		}

		nav.innerHTML = ''
		crumbs.forEach((crumb, index) => {
			if (index > 0) nav.appendChild(buildChevron())
			nav.appendChild(buildCrumb(crumb))
		})
	}
}
