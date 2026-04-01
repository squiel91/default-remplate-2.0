export interface TienduCartQuantityResponse {
  quantity: number;
}

export interface TienduCartOpenPayload {
  updatedCartItemsQuantity: number;
}

export interface TienduCartApi {
  getQuantity(): Promise<TienduCartQuantityResponse>;
  open(
    callback?: (payload: TienduCartOpenPayload) => void,
  ): Promise<HTMLIFrameElement>;
  addProductVariant(
    variant: ProductVariant,
    quantity: number,
    callback?: (payload: TienduCartOpenPayload) => void,
  ): Promise<void>;
}

export interface ProductListing {
  id: number;
  title?: string | null;
  basePriceInCents?: number | null;
  averageRating?: number | null;
  reviewsQuantity?: number | null;
  coverImage?: ProductImage | null;
  url?: string | null;
  publicUrl?: string | null;
  attributes?: ProductAttribute[] | null;
  variants?: ProductVariant[] | null;
}

export interface Category {
  id: number;
  name: string;
  publicUrl?: string | null;
  coverImage?: ProductImage | null;
  description?: string | null;
}

export interface PageListing {
  id: number;
  title?: string | null;
  publicUrl: string;
}

export interface SeoData {
  title?: string | null;
  description?: string | null;
}

export interface PageData {
  id: number;
  title?: string | null;
  content: unknown[];
  publicUrl: string;
  coverImage?: ProductImage | null;
  seo?: SeoData;
}

export interface BlogPostListing {
  id: number;
  title?: string | null;
  publicUrl: string;
  createdAt?: string | null;
  coverImage?: ProductImage | null;
  excerpt?: string | null;
}

export interface BlogPostData {
  id: number;
  title?: string | null;
  content?: string | unknown[] | null;
  publicUrl: string;
  excerpt?: string | null;
  coverImage?: ProductImage | null;
  seo?: SeoData;
}

export type SubscriberAddResult =
  | { success: true }
  | { success: false; errorCode: string };

export interface SearchTrackingParams {
  query: string;
  source: string;
  resultsCount: number;
}

export interface ViewContentTrackingParams {
  productId: number;
  productTitle: string;
  productVariantId?: number;
  priceInCents?: number | null;
  currency?: string;
}

export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number>;
export type QueryParams = Record<string, QueryParamValue>;

export interface TienduClient {
  products: {
    list(options?: QueryParams): Promise<{
      data: ProductListing[];
      pagination?: { total: number; page: number; size: number };
    }>;
    get(productId: number): Promise<ProductData>;
    getRelated(productId: number): Promise<ProductListing[]>;
  };
  reviews: {
    list(options?: QueryParams): Promise<{
      data: unknown[];
      pagination?: { total: number; page: number; size: number };
    }>;
  };
  categories: {
    list(): Promise<Category[]>;
    get(categoryId: number): Promise<Category>;
  };
  subscribers: {
    add(email: string): Promise<SubscriberAddResult>;
  };
  images: {
    get(imageId: number): Promise<ProductImage>;
  };
  pages: {
    list(): Promise<PageListing[]>;
    get(pageId: number): Promise<PageData>;
  };
  blogPosts: {
    list(): Promise<BlogPostListing[]>;
    get(blogPostId: number): Promise<BlogPostData>;
  };
  analytics: {
    trackSearch(params: SearchTrackingParams): void;
    trackViewContent(params: ViewContentTrackingParams): void;
  };
  cart: TienduCartApi;
}

export interface ProductImage {
  id?: number | string | null;
  url?: string | null;
  alt?: string | null;
}

export interface ProductAttributeValue {
  id?: number | string | null;
  value?: string | null;
  color?: string | null;
  image?: ProductImage | null;
}

export interface ProductAttribute {
  id?: number | string | null;
  name?: string | null;
  displayType?: string | null;
  values?: ProductAttributeValue[] | null;
}

export interface VariantAttributeValueRef {
  id?: number | string | null;
}

export interface VariantAttributeRef {
  id?: number | string | null;
  values?: VariantAttributeValueRef[] | null;
}

export interface ProductVariant {
  id: number;
  priceInCents?: number | null;
  compareAtPriceInCents?: number | null;
  stock?: number | null;
  coverImage?: ProductImage | null;
  attributes?: VariantAttributeRef[] | null;
}

export interface ProductData {
  title?: string | null;
  basePriceInCents?: number | null;
  baseCompareAtPriceInCents?: number | null;
  variants?: ProductVariant[] | null;
  attributes?: ProductAttribute[] | null;
}

export interface ProductGalleryHandle {
  setCurrentImageById(imageId: number | null): void;
  destroy(): void;
}

export type SelectionMap = Map<number, number>;
export type CleanupFn = () => void;
export type ScopeRoot = Document | HTMLElement;

declare global {
  interface Window {
    Tiendu?: () => TienduClient;
  }
  interface HTMLElement {
    __tienduHeroCarouselCleanup?: CleanupFn;
  }
}

export {};
