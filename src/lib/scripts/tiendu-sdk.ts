import type {
  BlogPostData,
  BlogPostListing,
  Category,
  CleanupFn,
  PageData,
  PageListing,
  ProductData,
  ProductImage,
  ProductListing,
  ProductVariant,
  QueryParams,
  SubscriberAddResult,
  TienduCartOpenPayload,
  TienduSearchOpenOptions,
  TienduClient,
} from "./types";

type RequestOptions = Omit<RequestInit, "body"> & {
  queryParams?: QueryParams;
  body?: BodyInit | null;
};

interface ApiResponse<T> {
  data?: T;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    size: number;
  };
}

interface CartQuantityResponse {
  data?: {
    quantity?: number;
  };
  quantity?: number;
}

type IframeMessage =
  | {
      type: "ready";
    }
  | {
      type: "step-changed";
      step: string;
      totalPriceInCents: number;
      items: Array<{ productVariantId: number; quantity: number }>;
      currencyCode?: string;
      orderId?: string | number;
      paymentExternalReference?: string | number;
    }
  | {
      type: "close";
      updatedCartItemsQuantity?: number;
    };

let activeOverlayCleanup: CleanupFn | null = null;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const buildUrl = (url: string, queryParams?: QueryParams): string => {
  if (!queryParams) return url;
  const resolved = new URL(url, window.location.origin);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        resolved.searchParams.append(key, String(item));
      }
      continue;
    }
    resolved.searchParams.set(key, String(value));
  }
  return resolved.toString();
};

const createRequester = (baseFetch: typeof fetch) => {
  const request = async <T>(
    url: string,
    options: RequestOptions = {},
  ): Promise<T> => {
    const { queryParams, ...fetchOptions } = options;
    const finalUrl = buildUrl(url, queryParams);
    const response = await baseFetch(finalUrl, fetchOptions);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as T;
  };

  return {
    get: <T>(url: string, options: RequestOptions = {}): Promise<T> =>
      request<T>(url, { ...options, method: "GET" }),
    post: <T>(
      url: string,
      body: unknown,
      options: RequestOptions = {},
    ): Promise<T> => {
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      return request<T>(url, {
        ...options,
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    },
  };
};

const unwrapData = <T>(response: ApiResponse<T> | T): T => {
  if (isRecord(response) && "data" in response) {
    return ((response as ApiResponse<T>).data ?? response) as T;
  }
  return response as T;
};

const waitForCartSync = async (
  getQuantity: () => Promise<{ quantity: number }>,
  previousQuantity: number,
): Promise<void> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { quantity } = await getQuantity();
      if (quantity > previousQuantity) return;
    } catch {
      // Keep retrying briefly; checkout opening is the fallback.
    }
    await wait(60);
  }
};

export const Tiendu = (): TienduClient => {
  const requester = createRequester(fetch);
  const baseApiUrl = "/tiendu/api";

  const openOverlayIframe = async ({
    src,
    onMessage,
    waitForReady = false,
  }: {
    src: string;
    onMessage?: (message: IframeMessage) => void;
    waitForReady?: boolean;
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
    let resolveOpen: ((iframe: HTMLIFrameElement) => void) | null = null;
    let rejectOpen: ((error: Error) => void) | null = null;

    const isTrustedIframeMessage = (
      event: MessageEvent<IframeMessage>,
    ): boolean => {
      if (event.origin !== window.location.origin) return false;
      return (
        iframe.contentWindow !== null && event.source === iframe.contentWindow
      );
    };

    const settleReject = (error: Error): void => {
      if (hasSettled) return;
      hasSettled = true;
      resolveOpen = null;
      rejectOpen?.(error);
      rejectOpen = null;
    };

    const settleResolve = (): void => {
      if (hasSettled) return;
      hasSettled = true;
      resolveOpen?.(iframe);
      resolveOpen = null;
      rejectOpen = null;
    };

    const cleanup = (): void => {
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

    const handleIframeMessage = (event: MessageEvent<IframeMessage>): void => {
      if (!isTrustedIframeMessage(event)) return;
      onMessage?.(event.data);
      if (event.data?.type === "ready" && waitForReady && !hasSettled) {
        settleResolve();
      }
      if (event.data?.type === "close") {
        cleanup();
      }
    };

    return await new Promise<HTMLIFrameElement>((resolve, reject) => {
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

  const methods: TienduClient = {
    products: {
      list: async (options = {}) =>
        await requester.get<PaginatedResponse<ProductListing>>(
          `${baseApiUrl}/products`,
          {
            queryParams: options,
          },
        ),
      get: async (productId) => {
        const response = await requester.get<
          ApiResponse<ProductData> | ProductData
        >(`${baseApiUrl}/products/${productId}`);
        return unwrapData(response);
      },
      getRelated: async (productId) => {
        const response = await requester.get<
          ApiResponse<ProductListing[]> | ProductListing[]
        >(`${baseApiUrl}/products/${productId}/related`);
        return unwrapData(response);
      },
    },
    reviews: {
      list: async (options = {}) =>
        await requester.get<PaginatedResponse<unknown>>(
          `${baseApiUrl}/reviews`,
          { queryParams: options },
        ),
    },
    categories: {
      list: async () => {
        const response = await requester.get<
          ApiResponse<Category[]> | Category[]
        >(`${baseApiUrl}/categories`);
        return unwrapData(response);
      },
      get: async (categoryId) => {
        const response = await requester.get<ApiResponse<Category> | Category>(
          `${baseApiUrl}/categories/${categoryId}`,
        );
        return unwrapData(response);
      },
    },
    subscribers: {
      add: async (email) => {
        const response = await requester.post<
          ApiResponse<SubscriberAddResult> | SubscriberAddResult
        >(`${baseApiUrl}/subscribers`, { email });
        return unwrapData(response);
      },
    },
    images: {
      get: async (imageId) => {
        const response = await requester.get<
          ApiResponse<ProductImage> | ProductImage
        >(`${baseApiUrl}/images/${imageId}`);
        return unwrapData(response);
      },
    },
    pages: {
      list: async () => {
        const response = await requester.get<
          ApiResponse<PageListing[]> | PageListing[]
        >(`${baseApiUrl}/pages`);
        return unwrapData(response);
      },
      get: async (pageId) => {
        const response = await requester.get<ApiResponse<PageData> | PageData>(
          `${baseApiUrl}/pages/${pageId}`,
        );
        return unwrapData(response);
      },
    },
    blogPosts: {
      list: async () => {
        const response = await requester.get<
          ApiResponse<BlogPostListing[]> | BlogPostListing[]
        >(`${baseApiUrl}/blog-posts`);
        return unwrapData(response);
      },
      get: async (blogPostId) => {
        const response = await requester.get<
          ApiResponse<BlogPostData> | BlogPostData
        >(`${baseApiUrl}/blog-posts/${blogPostId}`);
        return unwrapData(response);
      },
    },
    analytics: {
      trackSearch: () => {},
      trackViewContent: () => {},
    },
    search: {
      open: async (options: TienduSearchOpenOptions = {}) => {
        const query = options.query?.trim() ?? "";
        const src = buildUrl(
          "/tiendu/search",
          query ? { q: query } : undefined,
        );
        return await openOverlayIframe({ src, waitForReady: true });
      },
    },
    cart: {
      addProductVariant: async (
        productVariant: ProductVariant,
        quantity: number,
        onClose,
      ) => {
        const previousCart = await methods.cart
          .getQuantity()
          .catch(() => ({ quantity: 0 }));
        await requester.post(
          `${baseApiUrl}/cart/products/variants/${productVariant.id}`,
          { quantity },
        );
        await waitForCartSync(methods.cart.getQuantity, previousCart.quantity);
        await methods.cart.open(onClose);
      },
      getQuantity: async () => {
        const response = await requester.get<CartQuantityResponse>(
          `${baseApiUrl}/cart/quantity`,
        );
        return {
          quantity:
            typeof response.data?.quantity === "number"
              ? response.data.quantity
              : typeof response.quantity === "number"
                ? response.quantity
                : 0,
        };
      },
      open: async (onClose?: (data: TienduCartOpenPayload) => void) => {
        return await openOverlayIframe({
          src: "/tiendu/checkout",
          waitForReady: true,
          onMessage: (message) => {
            if (
              message.type === "close" &&
              onClose &&
              typeof message.updatedCartItemsQuantity === "number"
            ) {
              onClose({
                updatedCartItemsQuantity: message.updatedCartItemsQuantity,
              });
            }
          },
        });
      },
    },
  };

  return methods;
};

export const getTiendu = (): TienduClient => Tiendu();

window.Tiendu = Tiendu;
