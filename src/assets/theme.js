var activeOverlayCleanup = null;
var wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
var isRecord = (value) => typeof value === "object" && value !== null;
var buildUrl = (url, queryParams) => {
  if (!queryParams) return url;
  const resolved = new URL(url, window.location.origin);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value === void 0 || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === void 0 || item === null) continue;
        resolved.searchParams.append(key, String(item));
      }
      continue;
    }
    resolved.searchParams.set(key, String(value));
  }
  return resolved.toString();
};
var createRequester = (baseFetch) => {
  const request = async (url, options = {}) => {
    const { queryParams, ...fetchOptions } = options;
    const finalUrl = buildUrl(url, queryParams);
    const response = await baseFetch(finalUrl, fetchOptions);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  };
  return {
    get: (url, options = {}) => request(url, { ...options, method: "GET" }),
    post: (url, body, options = {}) => {
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      return request(url, {
        ...options,
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
    }
  };
};
var unwrapData = (response) => {
  if (isRecord(response) && "data" in response) {
    return response.data ?? response;
  }
  return response;
};
var waitForCartSync = async (getQuantity, previousQuantity) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { quantity } = await getQuantity();
      if (quantity > previousQuantity) return;
    } catch {
    }
    await wait(60);
  }
};
var Tiendu = () => {
  const requester = createRequester(fetch);
  const baseApiUrl = "/tiendu/api";
  const openOverlayIframe = async ({
    src,
    onMessage,
    waitForReady = false
  }) => {
    if (typeof activeOverlayCleanup === "function") {
      activeOverlayCleanup();
      activeOverlayCleanup = null;
    }
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.id = "left-iframe";
    let isClosed = false;
    let hasSettled = false;
    let resolveOpen = null;
    let rejectOpen = null;
    const isTrustedIframeMessage = (event) => {
      if (event.origin !== window.location.origin) return false;
      return iframe.contentWindow !== null && event.source === iframe.contentWindow;
    };
    const settleReject = (error) => {
      if (hasSettled) return;
      hasSettled = true;
      resolveOpen = null;
      rejectOpen?.(error);
      rejectOpen = null;
    };
    const settleResolve = () => {
      if (hasSettled) return;
      hasSettled = true;
      resolveOpen?.(iframe);
      resolveOpen = null;
      rejectOpen = null;
    };
    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      window.removeEventListener("message", handleIframeMessage);
      iframe.onload = null;
      iframe.onerror = null;
      iframe.remove();
      if (activeOverlayCleanup === cleanup) activeOverlayCleanup = null;
      if (waitForReady) {
        settleReject(new Error("Overlay closed before it became ready"));
      }
    };
    activeOverlayCleanup = cleanup;
    const handleIframeMessage = (event) => {
      if (!isTrustedIframeMessage(event)) return;
      onMessage?.(event.data);
      if (event.data?.type === "ready" && waitForReady && !hasSettled) {
        settleResolve();
      }
      if (event.data?.type === "close") {
        cleanup();
      }
    };
    return await new Promise((resolve, reject) => {
      resolveOpen = resolve;
      rejectOpen = reject;
      window.addEventListener("message", handleIframeMessage);
      iframe.onerror = () => {
        cleanup();
        settleReject(new Error("Failed to load overlay iframe"));
      };
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.zIndex = "9999";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      if (!waitForReady) {
        settleResolve();
      }
    });
  };
  const methods = {
    products: {
      list: async (options = {}) => await requester.get(
        `${baseApiUrl}/products`,
        {
          queryParams: options
        }
      ),
      get: async (productId) => {
        const response = await requester.get(`${baseApiUrl}/products/${productId}`);
        return unwrapData(response);
      },
      getRelated: async (productId) => {
        const response = await requester.get(`${baseApiUrl}/products/${productId}/related`);
        return unwrapData(response);
      }
    },
    reviews: {
      list: async (options = {}) => await requester.get(
        `${baseApiUrl}/reviews`,
        { queryParams: options }
      )
    },
    categories: {
      list: async () => {
        const response = await requester.get(`${baseApiUrl}/categories`);
        return unwrapData(response);
      },
      get: async (categoryId) => {
        const response = await requester.get(
          `${baseApiUrl}/categories/${categoryId}`
        );
        return unwrapData(response);
      }
    },
    subscribers: {
      add: async (email) => {
        const response = await requester.post(`${baseApiUrl}/subscribers`, { email });
        return unwrapData(response);
      }
    },
    images: {
      get: async (imageId) => {
        const response = await requester.get(`${baseApiUrl}/images/${imageId}`);
        return unwrapData(response);
      }
    },
    pages: {
      list: async () => {
        const response = await requester.get(`${baseApiUrl}/pages`);
        return unwrapData(response);
      },
      get: async (pageId) => {
        const response = await requester.get(
          `${baseApiUrl}/pages/${pageId}`
        );
        return unwrapData(response);
      }
    },
    blogPosts: {
      list: async () => {
        const response = await requester.get(`${baseApiUrl}/blog-posts`);
        return unwrapData(response);
      },
      get: async (blogPostId) => {
        const response = await requester.get(`${baseApiUrl}/blog-posts/${blogPostId}`);
        return unwrapData(response);
      }
    },
    analytics: {
      trackSearch: () => {
      },
      trackViewContent: () => {
      }
    },
    search: {
      open: async (options = {}) => {
        const query = options.query?.trim() ?? "";
        const src = buildUrl(
          "/tiendu/search",
          query ? { q: query } : void 0
        );
        return await openOverlayIframe({ src, waitForReady: true });
      }
    },
    cart: {
      addProductVariant: async (productVariant, quantity, onClose) => {
        const previousCart = await methods.cart.getQuantity().catch(() => ({ quantity: 0 }));
        await requester.post(
          `${baseApiUrl}/cart/products/variants/${productVariant.id}`,
          { quantity }
        );
        await waitForCartSync(methods.cart.getQuantity, previousCart.quantity);
        await methods.cart.open(onClose);
      },
      getQuantity: async () => {
        const response = await requester.get(
          `${baseApiUrl}/cart/quantity`
        );
        return {
          quantity: typeof response.data?.quantity === "number" ? response.data.quantity : typeof response.quantity === "number" ? response.quantity : 0
        };
      },
      open: async (onClose) => {
        return await openOverlayIframe({
          src: "/tiendu/checkout",
          waitForReady: true,
          onMessage: (message) => {
            if (message.type === "close" && onClose && typeof message.updatedCartItemsQuantity === "number") {
              onClose({
                updatedCartItemsQuantity: message.updatedCartItemsQuantity
              });
            }
          }
        });
      }
    }
  };
  return methods;
};
var getTiendu = () => Tiendu();
window.Tiendu = Tiendu;

var setCartButtonLoading = (button, loading) => {
  for (const iconNode of button.querySelectorAll(
    "[data-cart-button-icon]"
  )) {
    iconNode.hidden = iconNode.dataset.cartButtonIcon !== (loading ? "loader" : "shopping-bag");
  }
};
var setCartQuantity = (quantity) => {
  const badge = document.getElementById("cart-quantity-badge");
  if (!(badge instanceof HTMLElement)) return;
  const nextQuantity = Math.max(0, Number(quantity) || 0);
  badge.textContent = String(nextQuantity);
  badge.hidden = nextQuantity <= 0;
};
var syncCartQuantity = async () => {
  const tiendu = getTiendu();
  if (!tiendu) return;
  try {
    const { quantity } = await tiendu.cart.getQuantity();
    setCartQuantity(quantity);
  } catch {
    setCartQuantity(0);
  }
};
var initHeaderCart = () => {
  const button = document.getElementById("open-cart-button");
  if (!(button instanceof HTMLButtonElement)) return;
  if (button.dataset.bound === "true") {
    void syncCartQuantity();
    return;
  }
  button.dataset.bound = "true";
  button.addEventListener("click", async () => {
    const tiendu = getTiendu();
    if (!tiendu) {
      window.alert("No se pudo inicializar el carrito");
      return;
    }
    button.disabled = true;
    setCartButtonLoading(button, true);
    try {
      await tiendu.cart.open(({ updatedCartItemsQuantity }) => {
        setCartQuantity(updatedCartItemsQuantity);
      });
    } catch {
      window.alert("No se pudo abrir el carrito");
    } finally {
      setCartButtonLoading(button, false);
      button.disabled = false;
    }
  });
  void syncCartQuantity();
};

var buildChevron = () => {
  const chevron = document.createElement("span");
  chevron.className = "inline-flex text-slate-300";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "\u203A";
  return chevron;
};
var buildCrumb = ({ label, href }) => {
  if (href) {
    const link = document.createElement("a");
    link.href = href;
    link.className = "font-semibold text-[var(--color-primary)] transition hover:opacity-80 hover:no-underline";
    link.textContent = label;
    return link;
  }
  const span = document.createElement("span");
  span.className = "text-slate-900";
  span.textContent = label;
  return span;
};
var initBreadcrumbContexts = (scope = document) => {
  const navs = scope instanceof HTMLElement && scope.matches("[data-breadcrumb-nav]") ? [scope] : Array.from(scope.querySelectorAll("[data-breadcrumb-nav]"));
  for (const nav of navs) {
    const currentTitle = nav.dataset.currentTitle?.trim() ?? "";
    const currentType = nav.dataset.currentType?.trim() ?? "";
    if (!currentTitle && !currentType) continue;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("url-from")?.trim() ?? "";
    const fromTitle = params.get("title-from")?.trim() ?? "";
    const crumbs = [{ label: "Inicio", href: "/" }];
    if (currentType === "product" || currentType === "category" || currentType === "article") {
      if (fromUrl && fromTitle && fromUrl !== "/" && fromTitle.toLowerCase() !== "inicio") {
        crumbs.push({ label: fromTitle, href: fromUrl });
      }
      crumbs.push({ label: currentTitle });
    } else {
      continue;
    }
    nav.innerHTML = "";
    crumbs.forEach((crumb, index) => {
      if (index > 0) nav.appendChild(buildChevron());
      nav.appendChild(buildCrumb(crumb));
    });
  }
};

var getTriggers = () => Array.from(
  document.querySelectorAll(
    "[data-header-search-trigger]"
  )
);
var setSearchButtonLoading = (button, loading) => {
  for (const iconNode of button.querySelectorAll(
    "[data-search-button-icon]"
  )) {
    iconNode.hidden = iconNode.dataset.searchButtonIcon !== (loading ? "loader" : "search");
  }
};
var initHeaderSearch = () => {
  const triggers = getTriggers();
  if (triggers.length === 0) return;
  for (const trigger of triggers) {
    if (trigger.dataset.bound === "true") continue;
    trigger.dataset.bound = "true";
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const tiendu = getTiendu();
      trigger.disabled = true;
      setSearchButtonLoading(trigger, true);
      const resetTrigger = () => {
        setSearchButtonLoading(trigger, false);
        trigger.disabled = false;
      };
      void tiendu.search.open({
        query: trigger.dataset.headerSearchQuery || ""
      }).then(() => {
        resetTrigger();
      }).catch(() => {
        resetTrigger();
        window.alert("No se pudo abrir el buscador");
      });
    });
  }
};

var SWIPE_PROGRESS_THRESHOLD = 0.25;
var HERO_AUTOPLAY_INTERVAL = 5e3;
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
var toFiniteStock = (value) => {
  const number = toFiniteNumber(value);
  if (number == null) return null;
  return Math.max(0, Math.floor(number));
};
var formatMoney = (amountInCents, currencyCode) => {
  if (typeof amountInCents !== "number") return "";
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: currencyCode || "UYU"
  }).format(amountInCents / 100);
};

var createHeroCarousel = (root) => {
  const existingCleanup = root.__tienduHeroCarouselCleanup;
  if (typeof existingCleanup === "function") existingCleanup();
  const viewport = root.querySelector('[data-role="viewport"]');
  const track = root.querySelector('[data-role="track"]');
  const dots = root.querySelector('[data-role="dots"]');
  const prevButton = root.querySelector('[data-role="prev-image"]');
  const nextButton = root.querySelector('[data-role="next-image"]');
  const slides = Array.from(track?.querySelectorAll("[data-hero-carousel-slide]") || []);
  if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement) || slides.length === 0) {
    return null;
  }
  let currentIndex = 0;
  let autoplayTimer = null;
  let suppressClick = false;
  const drag = {
    active: false,
    pointerId: null,
    startX: 0,
    offsetX: 0
  };
  const parsedAutoplayInterval = Number(root.dataset.autoplayInterval);
  const autoplayInterval = Number.isFinite(parsedAutoplayInterval) && parsedAutoplayInterval > 0 ? parsedAutoplayInterval : HERO_AUTOPLAY_INTERVAL;
  const hasMultiple = () => slides.length > 1;
  const maxIndex = Math.max(0, slides.length - 1);
  const slideWidth = () => viewport.clientWidth || 1;
  const stopAutoplay = () => {
    if (autoplayTimer == null) return;
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  };
  const next = () => {
    if (!hasMultiple()) return;
    goTo(currentIndex === maxIndex ? 0 : currentIndex + 1, {
      animate: true,
      force: currentIndex === maxIndex
    });
  };
  const startAutoplay = () => {
    stopAutoplay();
    if (!hasMultiple()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    autoplayTimer = window.setInterval(() => {
      next();
    }, autoplayInterval);
  };
  const handleResize = () => {
    updateTrack({ animate: false });
  };
  const syncSlides = () => {
    for (const [index, slide] of slides.entries()) {
      slide.setAttribute("aria-hidden", index === currentIndex ? "false" : "true");
    }
  };
  const syncDots = () => {
    if (!(dots instanceof HTMLElement)) return;
    for (const button of dots.querySelectorAll("[data-dot-index]")) {
      const index = Number(button.getAttribute("data-dot-index"));
      const isActive = index === currentIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  };
  const syncControls = () => {
    const multiple = hasMultiple();
    if (prevButton instanceof HTMLButtonElement) {
      prevButton.hidden = !multiple;
      prevButton.disabled = !multiple;
    }
    if (nextButton instanceof HTMLButtonElement) {
      nextButton.hidden = !multiple;
      nextButton.disabled = !multiple;
    }
    if (dots instanceof HTMLElement) dots.hidden = !multiple;
  };
  const updateTrack = ({ animate }) => {
    const baseTranslate = -currentIndex * slideWidth();
    const dragOffset = drag.active ? drag.offsetX : 0;
    track.style.transition = animate && !drag.active ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    track.style.transform = `translate3d(${baseTranslate + dragOffset}px, 0, 0)`;
  };
  const goTo = (index, { animate = true, force = false } = {}) => {
    const nextIndex = clamp(index, 0, maxIndex);
    if (nextIndex === currentIndex && !drag.active && !force) return;
    currentIndex = nextIndex;
    syncSlides();
    syncDots();
    syncControls();
    updateTrack({ animate });
  };
  const prev = () => {
    if (!hasMultiple()) return;
    goTo(currentIndex === 0 ? maxIndex : currentIndex - 1, {
      animate: true,
      force: currentIndex === 0
    });
  };
  const resolveReleaseIndex = (offsetX) => {
    const threshold = Math.max(slideWidth(), 1) * SWIPE_PROGRESS_THRESHOLD;
    if (Math.abs(offsetX) < threshold) return currentIndex;
    if (offsetX < 0) return clamp(currentIndex + 1, 0, maxIndex);
    if (offsetX > 0) return clamp(currentIndex - 1, 0, maxIndex);
    return currentIndex;
  };
  const handlePointerDown = (event) => {
    if (!hasMultiple()) return;
    if (event.button !== void 0 && event.button !== 0) return;
    const interactiveTarget = event.target instanceof Element ? event.target.closest("a, button, input, select, textarea, summary") : null;
    if (interactiveTarget && viewport.contains(interactiveTarget)) return;
    stopAutoplay();
    drag.active = true;
    drag.pointerId = event.pointerId;
    drag.startX = event.clientX;
    drag.offsetX = 0;
    viewport.setPointerCapture?.(event.pointerId);
    viewport.dataset.dragging = "true";
    updateTrack({ animate: false });
  };
  const handlePointerMove = (event) => {
    if (!drag.active) return;
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return;
    const rawDelta = event.clientX - drag.startX;
    let delta = rawDelta;
    if (currentIndex === 0 && rawDelta > 0 || currentIndex === maxIndex && rawDelta < 0) {
      delta = rawDelta * 0.35;
    }
    drag.offsetX = delta;
    updateTrack({ animate: false });
  };
  const handlePointerEnd = (event) => {
    if (!drag.active) return;
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return;
    viewport.releasePointerCapture?.(event.pointerId);
    viewport.dataset.dragging = "false";
    const moved = Math.abs(drag.offsetX);
    const nextIndex = resolveReleaseIndex(drag.offsetX);
    drag.active = false;
    drag.pointerId = null;
    drag.offsetX = 0;
    suppressClick = moved > 6;
    goTo(nextIndex, { animate: true, force: true });
    startAutoplay();
  };
  const handleViewportClick = (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  };
  const handlePrevClick = () => {
    prev();
    startAutoplay();
  };
  const handleNextClick = () => {
    next();
    startAutoplay();
  };
  const handleDotClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-dot-index]") : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const index = Number(button.dataset.dotIndex);
    if (!Number.isFinite(index)) return;
    goTo(index, { animate: true });
    startAutoplay();
  };
  const handleMouseEnter = () => {
    stopAutoplay();
  };
  const handleMouseLeave = () => {
    startAutoplay();
  };
  const handleFocusIn = () => {
    stopAutoplay();
  };
  const handleFocusOut = (event) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    startAutoplay();
  };
  viewport.addEventListener("pointerdown", handlePointerDown);
  viewport.addEventListener("pointermove", handlePointerMove);
  viewport.addEventListener("pointerup", handlePointerEnd);
  viewport.addEventListener("pointercancel", handlePointerEnd);
  viewport.addEventListener("click", handleViewportClick);
  prevButton?.addEventListener("click", handlePrevClick);
  nextButton?.addEventListener("click", handleNextClick);
  dots?.addEventListener("click", handleDotClick);
  root.addEventListener("mouseenter", handleMouseEnter);
  root.addEventListener("mouseleave", handleMouseLeave);
  root.addEventListener("focusin", handleFocusIn);
  root.addEventListener("focusout", handleFocusOut);
  window.addEventListener("resize", handleResize);
  syncSlides();
  syncDots();
  syncControls();
  updateTrack({ animate: false });
  startAutoplay();
  const destroy = () => {
    stopAutoplay();
    viewport.removeEventListener("pointerdown", handlePointerDown);
    viewport.removeEventListener("pointermove", handlePointerMove);
    viewport.removeEventListener("pointerup", handlePointerEnd);
    viewport.removeEventListener("pointercancel", handlePointerEnd);
    viewport.removeEventListener("click", handleViewportClick);
    prevButton?.removeEventListener("click", handlePrevClick);
    nextButton?.removeEventListener("click", handleNextClick);
    dots?.removeEventListener("click", handleDotClick);
    root.removeEventListener("mouseenter", handleMouseEnter);
    root.removeEventListener("mouseleave", handleMouseLeave);
    root.removeEventListener("focusin", handleFocusIn);
    root.removeEventListener("focusout", handleFocusOut);
    window.removeEventListener("resize", handleResize);
    delete root.__tienduHeroCarouselCleanup;
  };
  root.__tienduHeroCarouselCleanup = destroy;
  return { destroy };
};
var initHeroCarousels = (scope = document) => {
  const root = scope instanceof HTMLElement ? scope : document.documentElement;
  const heroCarousels = root.matches("[data-hero-carousel]") ? [root] : Array.from(root.querySelectorAll("[data-hero-carousel]"));
  for (const carousel of heroCarousels) {
    createHeroCarousel(carousel);
  }
};

var DESCRIPTION_THRESHOLD = 280;
var initProductAboutSections = (scope = document) => {
  const roots = scope instanceof HTMLElement && scope.matches("[data-product-about]") ? [scope] : Array.from(scope.querySelectorAll("[data-product-about]"));
  for (const root of roots) {
    if (root.dataset.bound === "true") continue;
    root.dataset.bound = "true";
    const description = root.querySelector("[data-product-about-description]");
    const toggle = root.querySelector("[data-product-about-toggle]");
    const label = root.querySelector("[data-product-about-toggle-label]");
    if (!(description instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement) || !(label instanceof HTMLElement)) {
      continue;
    }
    const descriptionText = description.textContent?.trim() ?? "";
    if (descriptionText.length <= DESCRIPTION_THRESHOLD) {
      toggle.hidden = true;
      root.dataset.expanded = "true";
      continue;
    }
    root.dataset.expanded = "false";
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const isExpanded = root.dataset.expanded === "true";
      root.dataset.expanded = isExpanded ? "false" : "true";
      label.textContent = isExpanded ? "Ver mas" : "Ver menos";
    });
  }
};

var COPY_RESET_MS = 1800;
var initProductShareButtons = (scope = document) => {
  const buttons = Array.from(scope.querySelectorAll("[data-share-product]"));
  for (const button of buttons) {
    if (button.dataset.bound === "true") continue;
    button.dataset.bound = "true";
    const label = button.querySelector("[data-share-label]");
    const defaultLabel = label?.textContent ?? "Compartir";
    button.addEventListener("click", async () => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: document.title,
            url: window.location.href
          });
          return;
        }
        await navigator.clipboard.writeText(window.location.href);
        if (label) {
          label.textContent = "Link copiado";
          window.setTimeout(() => {
            label.textContent = defaultLabel;
          }, COPY_RESET_MS);
        }
      } catch {
        if (label) {
          label.textContent = defaultLabel;
        }
      }
    });
  }
};

var setButtonState = (button, { label, icon, disabled = false, loading = false } = {}) => {
  if (!(button instanceof HTMLButtonElement)) return;
  const nextLabel = loading ? button.dataset.loadingLabel || label || "" : label || "";
  const nextIcon = loading ? button.dataset.loadingIcon || "loader-2" : icon || button.dataset.icon || "plus";
  button.dataset.icon = icon || button.dataset.icon || "plus";
  button.disabled = Boolean(disabled || loading);
  const labelNode = button.querySelector(".button__label");
  if (labelNode instanceof HTMLElement) labelNode.textContent = nextLabel;
  for (const iconNode of button.querySelectorAll("[data-button-icon]")) {
    iconNode.hidden = iconNode.dataset.buttonIcon !== nextIcon;
  }
};

var createProductGallery = (root) => {
  if (!(root instanceof HTMLElement)) return null;
  const viewport = root.querySelector('[data-role="viewport"]');
  const track = root.querySelector('[data-role="track"]');
  const openButton = root.querySelector('[data-role="open-lightbox"]');
  const thumbs = root.querySelector('[data-role="thumbs"]');
  const prevButton = root.querySelector('[data-role="prev-image"]');
  const nextButton = root.querySelector('[data-role="next-image"]');
  const lightbox = document.getElementById("product-gallery-lightbox");
  const lightboxImage = lightbox?.querySelector('[data-role="lightbox-image"]');
  const backdrop = lightbox?.querySelector('[data-role="backdrop"]');
  const content = lightbox?.querySelector('[data-role="content"]');
  const closeButton = lightbox?.querySelector('[data-role="close-lightbox"]');
  const slides = Array.from(track?.querySelectorAll("[data-product-gallery-slide]") || []);
  const images = slides.map((slide) => {
    const image = slide.querySelector("img");
    return {
      id: Number(slide.dataset.imageId) || null,
      url: image?.getAttribute("src") || "",
      alt: image?.getAttribute("alt") || ""
    };
  });
  if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement) || images.length === 0) {
    return null;
  }
  let currentIndex = 0;
  let closeTimer = null;
  let suppressClick = false;
  const drag = {
    active: false,
    pointerId: null,
    startX: 0,
    offsetX: 0
  };
  const maxIndex = Math.max(0, images.length - 1);
  const slideWidth = () => viewport.clientWidth || 1;
  const canOpenLightbox = images.some((image) => image.url);
  const syncThumbs = () => {
    if (!(thumbs instanceof HTMLElement)) return;
    for (const button of thumbs.querySelectorAll("[data-thumb-index]")) {
      const index = Number(button.getAttribute("data-thumb-index"));
      button.setAttribute("aria-current", index === currentIndex ? "true" : "false");
    }
  };
  const syncControls = () => {
    const hasMultiple = images.length > 1;
    if (prevButton instanceof HTMLButtonElement) {
      prevButton.hidden = !hasMultiple;
      prevButton.disabled = !hasMultiple || currentIndex === 0;
    }
    if (nextButton instanceof HTMLButtonElement) {
      nextButton.hidden = !hasMultiple;
      nextButton.disabled = !hasMultiple || currentIndex === maxIndex;
    }
    if (thumbs instanceof HTMLElement) thumbs.hidden = !hasMultiple;
    if (openButton instanceof HTMLButtonElement) openButton.disabled = !canOpenLightbox;
  };
  const updateTrack = ({ animate }) => {
    const baseTranslate = -currentIndex * slideWidth();
    const dragOffset = drag.active ? drag.offsetX : 0;
    track.style.transition = animate && !drag.active ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    track.style.transform = `translate3d(${baseTranslate + dragOffset}px, 0, 0)`;
  };
  const syncLightboxImage = () => {
    if (!(lightboxImage instanceof HTMLImageElement)) return;
    const current = images[currentIndex];
    if (!current) return;
    lightboxImage.src = current.url;
    lightboxImage.alt = current.alt;
  };
  const goTo = (index, { animate = true, force = false } = {}) => {
    const nextIndex = clamp(index, 0, maxIndex);
    if (nextIndex === currentIndex && !drag.active && !force) return;
    currentIndex = nextIndex;
    syncThumbs();
    syncControls();
    updateTrack({ animate });
    syncLightboxImage();
  };
  const resolveReleaseIndex = (offsetX) => {
    const threshold = Math.max(slideWidth(), 1) * SWIPE_PROGRESS_THRESHOLD;
    if (Math.abs(offsetX) < threshold) return currentIndex;
    if (offsetX < 0) return clamp(currentIndex + 1, 0, maxIndex);
    if (offsetX > 0) return clamp(currentIndex - 1, 0, maxIndex);
    return currentIndex;
  };
  const openLightbox = () => {
    if (!(lightbox instanceof HTMLElement) || !canOpenLightbox) return;
    if (closeTimer != null) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    syncLightboxImage();
    lightbox.hidden = false;
    lightbox.dataset.state = "open";
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    if (!(lightbox instanceof HTMLElement) || lightbox.hidden || lightbox.dataset.state === "closing") return;
    lightbox.dataset.state = "closing";
    if (closeTimer != null) clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      lightbox.hidden = true;
      delete lightbox.dataset.state;
      document.body.style.overflow = "";
      closeTimer = null;
    }, 180);
  };
  const handlePointerDown = (event) => {
    if (images.length < 2) return;
    if (event.button !== void 0 && event.button !== 0) return;
    drag.active = true;
    drag.pointerId = event.pointerId;
    drag.startX = event.clientX;
    drag.offsetX = 0;
    viewport.setPointerCapture?.(event.pointerId);
    viewport.dataset.dragging = "true";
    updateTrack({ animate: false });
  };
  const handlePointerMove = (event) => {
    if (!drag.active) return;
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return;
    const rawDelta = event.clientX - drag.startX;
    let delta = rawDelta;
    if (currentIndex === 0 && rawDelta > 0 || currentIndex === maxIndex && rawDelta < 0) {
      delta = rawDelta * 0.35;
    }
    drag.offsetX = delta;
    updateTrack({ animate: false });
  };
  const handlePointerEnd = (event) => {
    if (!drag.active) return;
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return;
    viewport.releasePointerCapture?.(event.pointerId);
    viewport.dataset.dragging = "false";
    const moved = Math.abs(drag.offsetX);
    const nextIndex = resolveReleaseIndex(drag.offsetX);
    drag.active = false;
    drag.pointerId = null;
    drag.offsetX = 0;
    suppressClick = moved > 6;
    goTo(nextIndex, { animate: true, force: true });
  };
  const handleOpenClick = (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      return;
    }
    openLightbox();
  };
  const handleThumbClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-thumb-index]") : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const index = Number(button.dataset.thumbIndex);
    if (!Number.isFinite(index)) return;
    goTo(index, { animate: true });
  };
  const handleContentClick = (event) => {
    if (event.target === event.currentTarget) closeLightbox();
  };
  const handleEscape = (event) => {
    if (event.key === "Escape") closeLightbox();
  };
  viewport.addEventListener("pointerdown", handlePointerDown);
  viewport.addEventListener("pointermove", handlePointerMove);
  viewport.addEventListener("pointerup", handlePointerEnd);
  viewport.addEventListener("pointercancel", handlePointerEnd);
  viewport.addEventListener("click", handleOpenClick);
  prevButton?.addEventListener("click", () => goTo(currentIndex - 1, { animate: true }));
  nextButton?.addEventListener("click", () => goTo(currentIndex + 1, { animate: true }));
  thumbs?.addEventListener("click", handleThumbClick);
  backdrop?.addEventListener("click", closeLightbox);
  closeButton?.addEventListener("click", closeLightbox);
  content?.addEventListener("click", handleContentClick);
  document.addEventListener("keydown", handleEscape);
  const resizeObserver = new ResizeObserver(() => updateTrack({ animate: false }));
  resizeObserver.observe(viewport);
  syncThumbs();
  syncControls();
  syncLightboxImage();
  updateTrack({ animate: false });
  return {
    setCurrentImageById(imageId) {
      if (imageId == null) return;
      const index = images.findIndex((image) => image.id === Number(imageId));
      if (index < 0) return;
      goTo(index, { animate: true });
    },
    destroy() {
      resizeObserver.disconnect();
      document.removeEventListener("keydown", handleEscape);
      if (closeTimer != null) clearTimeout(closeTimer);
    }
  };
};

var clampQuantityValue = (value, maxQuantity) => {
  const numericValue = Number(value);
  const normalizedValue = Number.isFinite(numericValue) ? Math.floor(numericValue) : 1;
  if (typeof maxQuantity === "number" && maxQuantity > 0) {
    return Math.max(1, Math.min(maxQuantity, normalizedValue));
  }
  return Math.max(1, normalizedValue);
};
var syncQuantityInputUi = (elements, state) => {
  const { container, field, decreaseButton, increaseButton } = elements;
  const { hidden, enabled, value, maxQuantity } = state;
  const atMin = value <= 1;
  const atMax = typeof maxQuantity === "number" ? value >= maxQuantity : false;
  if (container instanceof HTMLElement) container.hidden = hidden;
  if (field instanceof HTMLInputElement) {
    field.min = "1";
    if (typeof maxQuantity === "number" && maxQuantity > 0) field.max = String(maxQuantity);
    else field.removeAttribute("max");
    field.disabled = !enabled;
    field.value = String(value);
  }
  if (decreaseButton instanceof HTMLButtonElement) {
    decreaseButton.disabled = !enabled || atMin;
  }
  if (increaseButton instanceof HTMLButtonElement) {
    increaseButton.disabled = !enabled || atMax;
  }
};

var hasPurchasablePrice = (product, variant) => {
  if (variant) return typeof variant.priceInCents === "number";
  return typeof product.basePriceInCents === "number";
};
var normalizeVariants = (variants) => {
  if (!Array.isArray(variants)) return [];
  return variants.filter((variant) => Boolean(variant && typeof variant.id === "number"));
};
var extractVariantValueMap = (variant) => {
  const valueMap = /* @__PURE__ */ new Map();
  if (!Array.isArray(variant?.attributes)) return valueMap;
  for (const attribute of variant.attributes) {
    const attributeId = Number(attribute?.id);
    const valueId = Number(attribute?.values?.[0]?.id);
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue;
    valueMap.set(attributeId, valueId);
  }
  return valueMap;
};
var serializeMap = (valueMap) => Array.from(valueMap.entries()).sort(([left], [right]) => left - right).map(([attributeId, valueId]) => `${attributeId}:${valueId}`).join(";");
var buildVariantIndex = (variants) => {
  const index = /* @__PURE__ */ new Map();
  for (const variant of variants) {
    index.set(serializeMap(extractVariantValueMap(variant)), variant);
  }
  return index;
};
var getPriceDataForVariant = (product, variant, currencyCode) => {
  const priceInCents = toFiniteNumber(variant?.priceInCents) ?? toFiniteNumber(product.basePriceInCents);
  const compareInCents = toFiniteNumber(variant?.compareAtPriceInCents);
  const compareLabel = priceInCents != null && compareInCents != null && compareInCents > priceInCents ? formatMoney(compareInCents, currencyCode) : "";
  return {
    label: priceInCents != null ? formatMoney(priceInCents, currencyCode) : "",
    compareLabel
  };
};
var getVariantSetPriceData = ({ product, variants, currencyCode }) => {
  const pricedVariants = variants.filter((variant) => typeof variant.priceInCents === "number");
  if (pricedVariants.length === 0) {
    const basePrice = toFiniteNumber(product.basePriceInCents);
    const baseCompare = toFiniteNumber(product.baseCompareAtPriceInCents);
    return {
      label: basePrice != null ? formatMoney(basePrice, currencyCode) : "",
      compareLabel: basePrice != null && baseCompare != null && baseCompare > basePrice ? formatMoney(baseCompare, currencyCode) : ""
    };
  }
  const prices = pricedVariants.map((variant) => variant.priceInCents);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const compareValues = [];
  let hasSharedCompare = true;
  for (const variant of pricedVariants) {
    const price = toFiniteNumber(variant.priceInCents);
    const compare = toFiniteNumber(variant.compareAtPriceInCents);
    if (price == null || compare == null || compare <= price) {
      hasSharedCompare = false;
      break;
    }
    compareValues.push(compare);
  }
  const minCompare = hasSharedCompare && compareValues.length > 0 ? Math.min(...compareValues) : null;
  const priceLabel = minPrice !== maxPrice ? `Desde ${formatMoney(minPrice, currencyCode)}` : formatMoney(minPrice, currencyCode);
  const compareLabel = minCompare != null ? formatMoney(minCompare, currencyCode) : "";
  return {
    label: priceLabel,
    compareLabel: minCompare != null ? minCompare !== Math.max(...compareValues) ? `Desde ${compareLabel}` : compareLabel : ""
  };
};
var getVariantSetStockData = (variants) => {
  if (variants.length === 0) return { mode: "unknown", value: null };
  const stocks = variants.map((variant) => toFiniteStock(variant.stock));
  const tracked = stocks.filter((value) => value != null);
  if (tracked.length === 0) return { mode: "untracked", value: null };
  const min = Math.min(...tracked);
  const max = Math.max(...tracked);
  const hasUntracked = tracked.length !== stocks.length;
  if (min === max && !hasUntracked) return { mode: "exact", value: min };
  return { mode: "variable", value: null };
};
var getSharedVariantCoverImageId = (variants) => {
  const imageIds = variants.map((variant) => toFiniteNumber(variant.coverImage?.id)).filter((id) => id != null);
  if (imageIds.length === 0) return null;
  const [firstId] = imageIds;
  return imageIds.every((id) => id === firstId) ? firstId : null;
};
var readSelectedValuesFromDom = (root) => {
  const selectedValues = /* @__PURE__ */ new Map();
  if (!(root instanceof HTMLElement)) return selectedValues;
  for (const button of root.querySelectorAll('.option-chip[aria-pressed="true"]')) {
    const attributeId = Number(button.dataset.attributeId);
    const valueId = Number(button.dataset.valueId);
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue;
    selectedValues.set(attributeId, valueId);
  }
  for (const option of root.querySelectorAll('.variant-select__option[aria-selected="true"]')) {
    const select = option.closest(".variant-select");
    if (!(select instanceof HTMLElement)) continue;
    const attributeId = Number(select.dataset.attributeId);
    const valueId = Number(option.dataset.valueId);
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue;
    selectedValues.set(attributeId, valueId);
  }
  return selectedValues;
};
var activeProductCleanup = null;
var hydrateProduct = (root) => {
  const scriptEl = root.querySelector("#product-json");
  if (!(scriptEl instanceof HTMLScriptElement)) return null;
  let product;
  try {
    product = JSON.parse(scriptEl.textContent || "{}");
  } catch {
    return null;
  }
  const variants = normalizeVariants(product.variants);
  const productAttributes = Array.isArray(product.attributes) ? product.attributes : [];
  const variantIndex = buildVariantIndex(variants);
  const variantValueEntries = variants.map((variant) => ({ variant, valueMap: extractVariantValueMap(variant) }));
  const defaultVariant = variants[0] || null;
  const requiresVariantSelection = variants.length > 1 && productAttributes.length > 0;
  const variantSelector = root.querySelector("#variant-selector");
  const selectedValuesFromDom = readSelectedValuesFromDom(variantSelector);
  const variantFromDom = selectedValuesFromDom.size > 0 ? variantIndex.get(serializeMap(selectedValuesFromDom)) || null : null;
  const currentUrl = new URL(window.location.href);
  const initialVariantId = Number(currentUrl.searchParams.get("variant-id"));
  const variantFromUrl = variants.find((variant) => variant.id === initialVariantId) || null;
  const initialVariant = variantFromUrl || variantFromDom || (requiresVariantSelection ? null : defaultVariant);
  const selectedValues = initialVariant ? extractVariantValueMap(initialVariant) : selectedValuesFromDom.size > 0 ? new Map(selectedValuesFromDom) : /* @__PURE__ */ new Map();
  const currencyCode = root.dataset.currencyCode || "UYU";
  const gallery = createProductGallery(root.querySelector("#product-gallery"));
  const priceNode = root.querySelector("#product-price");
  const compareNode = root.querySelector("#product-compare");
  const priceLineNode = root.querySelector(".product-price-line");
  const stockNode = root.querySelector("#stock-note");
  const addToCartButton = root.querySelector("#add-to-cart-button");
  const quantityInput = root.querySelector("#product-quantity-input");
  const quantityField = quantityInput?.querySelector(".quantity-input__field") || null;
  const quantityDecreaseButton = quantityInput?.querySelector("[data-quantity-decrease]") || null;
  const quantityIncreaseButton = quantityInput?.querySelector("[data-quantity-increase]") || null;
  let variantOptionButtons = Array.from(variantSelector?.querySelectorAll(".option-chip") || []);
  let variantSelects = Array.from(variantSelector?.querySelectorAll(".variant-select") || []);
  const variantSelectCloseTimers = /* @__PURE__ */ new WeakMap();
  let currentVariant = initialVariant;
  let matchingVariants = variants;
  let quantity = 1;
  const getVariantMaxQuantity = () => {
    const stock = currentVariant?.stock;
    if (typeof stock !== "number") return null;
    if (stock <= 0) return 0;
    return Math.floor(stock);
  };
  const setStockNote = (tone, message) => {
    if (!(stockNode instanceof HTMLElement)) return;
    stockNode.setAttribute("data-tone", tone);
    const messageNode = stockNode.querySelector(".product-stock-note__message");
    if (messageNode instanceof HTMLElement) messageNode.textContent = message;
  };
  const setStockFromQuantity = (stock) => {
    if (stock === 0) {
      setStockNote("error", "Temporalmente agotado");
      return;
    }
    if (stock <= 4) {
      setStockNote("warning", `Quedan ${stock} ${stock === 1 ? "unidad" : "unidades"} en stock`);
      return;
    }
    setStockNote("success", `${stock} ${stock === 1 ? "unidad" : "unidades"} en stock`);
  };
  const setVariableStockNote = () => {
    setStockNote("neutral", "Selecciona una opci\xF3n para ver el stock");
  };
  const clampQuantity = (value) => clampQuantityValue(value, getVariantMaxQuantity());
  const syncQuantityUi = () => {
    const hasPrice = hasPurchasablePrice(product, currentVariant);
    const maxQuantity = getVariantMaxQuantity();
    const hasStock = typeof maxQuantity !== "number" || maxQuantity > 0;
    const shouldEnable = hasPrice && hasStock;
    quantity = clampQuantity(quantity);
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
    );
  };
  const isVariantSelectionComplete = () => !requiresVariantSelection || productAttributes.every((attribute) => selectedValues.has(Number(attribute.id)));
  const getMatchingVariants = () => {
    if (!requiresVariantSelection) return variants;
    if (selectedValues.size === 0) return variants;
    return variantValueEntries.filter(({ valueMap }) => {
      for (const [selectedAttrId, selectedValueId] of selectedValues.entries()) {
        if (valueMap.get(selectedAttrId) !== selectedValueId) return false;
      }
      return true;
    }).map(({ variant }) => variant);
  };
  const isValueEnabledForSelection = (attributeId, valueId) => variantValueEntries.some(({ valueMap }) => {
    if (valueMap.get(attributeId) !== valueId) return false;
    for (const [selectedAttrId, selectedValueId] of selectedValues.entries()) {
      if (selectedAttrId === attributeId) continue;
      if (valueMap.has(selectedAttrId) && valueMap.get(selectedAttrId) !== selectedValueId) return false;
    }
    return true;
  });
  const syncVariantSelectTrigger = (select, selectedValueId) => {
    const labelNode = select.querySelector("[data-variant-select-label]");
    const swatchNode = select.querySelector("[data-variant-select-trigger-swatch]");
    const selectedOption = Array.from(select.querySelectorAll(".variant-select__option")).find(
      (option) => Number(option.dataset.valueId) === Number(selectedValueId)
    );
    if (labelNode instanceof HTMLElement) {
      labelNode.textContent = selectedOption?.dataset.label || "Selecciona una opci\xF3n";
      labelNode.classList.toggle("variant-select__label--placeholder", !selectedOption);
    }
    if (swatchNode instanceof HTMLElement) {
      const swatch = selectedOption?.querySelector(".variant-select__swatch");
      swatchNode.innerHTML = swatch instanceof HTMLElement ? swatch.outerHTML : "";
      swatchNode.classList.toggle("variant-select__trigger-swatch--hidden", !swatch);
    }
  };
  const closeVariantSelect = (select, immediate = false) => {
    const menu = select.querySelector("[data-variant-select-menu]");
    const trigger = select.querySelector("[data-variant-select-trigger]");
    if (!(menu instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) return;
    const existingTimer = variantSelectCloseTimers.get(select);
    if (existingTimer != null) {
      window.clearTimeout(existingTimer);
      variantSelectCloseTimers.delete(select);
    }
    select.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
    if (immediate || menu.hidden) {
      menu.hidden = true;
      menu.removeAttribute("data-state");
      return;
    }
    menu.dataset.state = "closing";
    const timer = window.setTimeout(() => {
      menu.hidden = true;
      menu.removeAttribute("data-state");
      variantSelectCloseTimers.delete(select);
    }, 180);
    variantSelectCloseTimers.set(select, timer);
  };
  const openVariantSelect = (select) => {
    for (const otherSelect of variantSelects) {
      if (otherSelect === select) continue;
      closeVariantSelect(otherSelect, true);
    }
    const menu = select.querySelector("[data-variant-select-menu]");
    const trigger = select.querySelector("[data-variant-select-trigger]");
    if (!(menu instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) return;
    const existingTimer = variantSelectCloseTimers.get(select);
    if (existingTimer != null) {
      window.clearTimeout(existingTimer);
      variantSelectCloseTimers.delete(select);
    }
    select.dataset.open = "true";
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    menu.dataset.state = "open";
  };
  const updateVariantSelectorState = () => {
    if (!(variantSelector instanceof HTMLElement)) return;
    variantOptionButtons = Array.from(variantSelector.querySelectorAll(".option-chip"));
    variantSelects = Array.from(variantSelector.querySelectorAll(".variant-select"));
    for (const button of variantOptionButtons) {
      const attributeId = Number(button.dataset.attributeId);
      const valueId = Number(button.dataset.valueId);
      if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue;
      const selected = selectedValues.get(attributeId) === valueId;
      const enabled = isValueEnabledForSelection(attributeId, valueId);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.disabled = !enabled;
    }
    for (const select of variantSelects) {
      const attributeId = Number(select.dataset.attributeId);
      const attribute = productAttributes.find((item) => Number(item.id) === attributeId);
      if (!attribute || !Array.isArray(attribute.values)) continue;
      const selectedValueId = selectedValues.get(attributeId);
      for (const option of select.querySelectorAll(".variant-select__option")) {
        const valueId = Number(option.dataset.valueId);
        if (!Number.isFinite(valueId)) {
          option.disabled = false;
          continue;
        }
        option.setAttribute("aria-selected", selectedValueId === valueId ? "true" : "false");
        option.disabled = !isValueEnabledForSelection(attributeId, valueId);
      }
      syncVariantSelectTrigger(select, selectedValueId);
    }
  };
  const updatePrice = () => {
    if (requiresVariantSelection && !currentVariant) {
      const priceData2 = getVariantSetPriceData({ product, variants: matchingVariants, currencyCode });
      const hasPriceLabel2 = typeof priceData2.label === "string" && priceData2.label.length > 0;
      if (priceLineNode instanceof HTMLElement) priceLineNode.hidden = !hasPriceLabel2;
      if (priceNode instanceof HTMLElement) priceNode.textContent = hasPriceLabel2 ? priceData2.label : "";
      if (compareNode instanceof HTMLElement) {
        compareNode.textContent = hasPriceLabel2 ? priceData2.compareLabel || "" : "";
        compareNode.hidden = !hasPriceLabel2 || !priceData2.compareLabel;
      }
      if (stockNode instanceof HTMLElement) {
        const stockData = getVariantSetStockData(matchingVariants);
        if (stockData.mode === "exact" && typeof stockData.value === "number") setStockFromQuantity(stockData.value);
        else if (stockData.mode === "untracked") setStockNote("success", "Tenemos en stock");
        else setVariableStockNote();
      }
      return;
    }
    const priceData = getPriceDataForVariant(product, currentVariant, currencyCode);
    const hasPriceLabel = hasPurchasablePrice(product, currentVariant);
    if (priceLineNode instanceof HTMLElement) priceLineNode.hidden = !hasPriceLabel;
    if (priceNode instanceof HTMLElement) priceNode.textContent = hasPriceLabel ? priceData.label : "";
    if (compareNode instanceof HTMLElement) {
      compareNode.textContent = hasPriceLabel ? priceData.compareLabel || "" : "";
      compareNode.hidden = !hasPriceLabel || !priceData.compareLabel;
    }
    if (stockNode instanceof HTMLElement) {
      const stock = currentVariant?.stock;
      if (typeof stock === "number") setStockFromQuantity(Math.max(0, Math.floor(stock)));
      else setStockNote("success", "Tenemos en stock");
    }
  };
  const updateAddToCartAction = () => {
    if (!(addToCartButton instanceof HTMLButtonElement)) return;
    if (requiresVariantSelection && !currentVariant) {
      setButtonState(addToCartButton, {
        label: "Agregar al carrito",
        icon: "plus",
        disabled: false
      });
      syncQuantityUi();
      return;
    }
    const hasPriceLabel = hasPurchasablePrice(product, currentVariant);
    const isOutOfStock = Boolean(currentVariant && currentVariant.stock === 0);
    if (isOutOfStock) {
      setButtonState(addToCartButton, { label: "Consultar", icon: "message-square", disabled: false });
      syncQuantityUi();
      return;
    }
    if (!hasPriceLabel) {
      setButtonState(addToCartButton, { label: "Consultar precio", icon: "message-square", disabled: false });
      syncQuantityUi();
      return;
    }
    setButtonState(addToCartButton, {
      label: "Agregar al carrito",
      icon: "plus",
      disabled: !currentVariant
    });
    syncQuantityUi();
  };
  const syncVariantUrl = () => {
    const nextUrl = new URL(window.location.href);
    const hadVariantId = nextUrl.searchParams.has("variant-id");
    if (currentVariant?.id && variants.length > 1) nextUrl.searchParams.set("variant-id", String(currentVariant.id));
    else nextUrl.searchParams.delete("variant-id");
    const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextHref === currentHref && hadVariantId === nextUrl.searchParams.has("variant-id")) return;
    window.history.replaceState(window.history.state, "", nextHref);
  };
  const syncVariantFromSelection = () => {
    matchingVariants = getMatchingVariants();
    if (requiresVariantSelection && !isVariantSelectionComplete()) {
      currentVariant = null;
    } else {
      const selectedKey = serializeMap(selectedValues);
      currentVariant = variantIndex.get(selectedKey) || (requiresVariantSelection ? null : defaultVariant);
    }
    updatePrice();
    updateVariantSelectorState();
    updateAddToCartAction();
    syncVariantUrl();
    if (gallery && typeof currentVariant?.coverImage?.id === "number") {
      gallery.setCurrentImageById(currentVariant.coverImage.id);
      return;
    }
    if (gallery) {
      const sharedImageId = getSharedVariantCoverImageId(matchingVariants);
      if (typeof sharedImageId === "number") gallery.setCurrentImageById(sharedImageId);
    }
  };
  const onVariantClick = (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const selectTrigger = target.closest("[data-variant-select-trigger]");
    if (selectTrigger) {
      event.preventDefault();
      const select = selectTrigger.closest(".variant-select");
      if (!(select instanceof HTMLElement)) return;
      if (select.dataset.open === "true") closeVariantSelect(select);
      else openVariantSelect(select);
      return;
    }
    const selectOption = target.closest(".variant-select__option");
    if (selectOption instanceof HTMLButtonElement) {
      event.preventDefault();
      const select = selectOption.closest(".variant-select");
      if (!(select instanceof HTMLElement)) return;
      const attributeId2 = Number(select.dataset.attributeId);
      const valueId2 = Number(selectOption.dataset.valueId);
      if (!Number.isFinite(attributeId2) || !Number.isFinite(valueId2) || selectOption.disabled) return;
      selectedValues.set(attributeId2, valueId2);
      closeVariantSelect(select);
      syncVariantFromSelection();
      return;
    }
    const attributeId = Number(target.dataset.attributeId);
    const valueId = Number(target.dataset.valueId);
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) return;
    selectedValues.set(attributeId, valueId);
    syncVariantFromSelection();
  };
  const onDocumentClick = (event) => {
    if (!(event.target instanceof Node)) return;
    if (variantSelector?.contains(event.target)) return;
    for (const select of variantSelects) closeVariantSelect(select);
  };
  const onDocumentKeydown = (event) => {
    if (event.key !== "Escape") return;
    for (const select of variantSelects) closeVariantSelect(select);
  };
  variantSelector?.addEventListener("click", onVariantClick);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);
  const onDecrease = () => {
    quantity = clampQuantity(quantity - 1);
    syncQuantityUi();
  };
  const onIncrease = () => {
    quantity = clampQuantity(quantity + 1);
    syncQuantityUi();
  };
  const onQuantityInput = () => {
    quantity = clampQuantity(quantityField instanceof HTMLInputElement ? quantityField.value : 1);
    syncQuantityUi();
  };
  quantityDecreaseButton?.addEventListener("click", onDecrease);
  quantityIncreaseButton?.addEventListener("click", onIncrease);
  quantityField?.addEventListener("input", onQuantityInput);
  quantityField?.addEventListener("blur", onQuantityInput);
  const onAddToCart = () => {
    if (requiresVariantSelection && !currentVariant) {
      window.alert("Elegi una variante antes de agregarla al carrito");
      return;
    }
    if (!currentVariant) {
      window.alert("No hay variante seleccionada");
      return;
    }
    if (!hasPurchasablePrice(product, currentVariant)) {
      window.alert("Esta variante no tiene precio disponible");
      return;
    }
    if (currentVariant.stock === 0) {
      window.alert("Esta variante est\xE1 agotada");
      return;
    }
    const tiendu = getTiendu();
    if (!tiendu) {
      window.alert("No se pudo inicializar el carrito");
      return;
    }
    setButtonState(addToCartButton instanceof HTMLButtonElement ? addToCartButton : null, {
      label: addToCartButton instanceof HTMLButtonElement ? addToCartButton.querySelector(".button__label")?.textContent || "Agregar al carrito" : "Agregar al carrito",
      icon: addToCartButton instanceof HTMLButtonElement ? addToCartButton.dataset.icon || "plus" : "plus",
      loading: true
    });
    tiendu.cart.addProductVariant(currentVariant, clampQuantity(quantity), () => {
      updateAddToCartAction();
      void tiendu.cart.getQuantity().then(({ quantity: nextQuantity }) => {
        setCartQuantity(nextQuantity);
      });
    }).catch(() => {
      updateAddToCartAction();
      window.alert("No se pudo agregar al carrito");
    });
  };
  addToCartButton?.addEventListener("click", onAddToCart);
  syncVariantFromSelection();
  return () => {
    gallery?.destroy();
    variantSelector?.removeEventListener("click", onVariantClick);
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeydown);
    quantityDecreaseButton?.removeEventListener("click", onDecrease);
    quantityIncreaseButton?.removeEventListener("click", onIncrease);
    quantityField?.removeEventListener("input", onQuantityInput);
    quantityField?.removeEventListener("blur", onQuantityInput);
    addToCartButton?.removeEventListener("click", onAddToCart);
  };
};
var initVariantSelectors = (scope = document) => {
  const root = scope instanceof HTMLElement ? scope : document.documentElement;
  const productPage = root.matches(".main-product") ? root : root.querySelector(".main-product");
  if (!productPage) return;
  activeProductCleanup?.();
  activeProductCleanup = hydrateProduct(productPage);
};

var initializeTheme = (scope = document) => {
  initBreadcrumbContexts(scope);
  initHeaderCart();
  initHeaderSearch();
  initHeroCarousels(scope);
  initProductAboutSections(scope);
  initProductShareButtons(scope);
  initVariantSelectors(scope);
};
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initializeTheme(document), { once: true });
} else {
  initializeTheme(document);
}
window.addEventListener("tiendu:section-updated", (event) => {
  const detail = event.detail;
  const sectionId = detail?.sectionId;
  if (typeof sectionId !== "string" || !sectionId) {
    initializeTheme(document);
    return;
  }
  const sectionRoot = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (sectionRoot instanceof HTMLElement) {
    initializeTheme(sectionRoot);
    return;
  }
  initializeTheme(document);
});
