const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface Provider {
  id?: string;
  name: string;
  slug: string;
  status?: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface SubcategoryRef {
  id: string;
  name: string;
  slug: string;
  category: CategoryRef;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  // Legacy : conservé le temps que tous les produits soient reclassés dans la
  // taxonomie DigiGo (subcategory). Ne plus utiliser pour l'affichage client —
  // préférer subcategory.category quand il est renseigné.
  category: string;
  subcategory: SubcategoryRef | null;
  description: string;
  imageUrl: string | null;
  currency: string;
  fromPrice: number | null;
  offerCount: number;
  popularityScore: number;
  journeyType: "NATIVE" | "HYBRID" | "EXTERNAL";
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  icon: string;
  productCount: number;
  subcategories: Array<{ id: string; name: string; slug: string; productCount: number }>;
}


export interface Offer {
  id: string;
  price: number;
  rating: number | null;
  salesCount: number;
  deliverySeconds: number | null;
  kycVerified: boolean;
  provider: Provider;
}

export interface ProductDetail extends Omit<Product, "fromPrice" | "offerCount"> {
  offers: Offer[];
}

export interface OrderEvent {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  vatRate: number | null;
  currency: string;
  status: string;
  issuedAt: string;
}

export interface Order {
  id: string;
  status: "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED" | "EXPIRED";
  amount: number;
  currency: string;
  organizationId?: string | null;
  createdAt: string;
  confirmedAt: string | null;
  events?: OrderEvent[];
  invoice?: Invoice | null;
  user?: AuthUser;
  product?: { name: string; slug: string; category: string };
  provider?: { name: string; slug: string };
}

// Sections du back-office (voir schema.prisma AdminScope) : isAdmin ouvre le
// panneau, adminScopes détermine les sections visibles (voir AdminGuard).
export type AdminScope = "PROVIDERS" | "CATALOG" | "ORDERS" | "COMMISSIONS" | "ANALYTICS" | "USERS";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin?: boolean;
  adminScopes?: AdminScope[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Membership {
  role: MembershipRole;
  createdAt: string;
  user: AuthUser;
}

export interface Organization {
  id: string;
  name: string;
  vatNumber: string | null;
  createdAt: string;
  role?: MembershipRole;
  memberships?: Membership[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error || "unknown_error");
  }
  return body as T;
}

export function getProducts(filters?: { categorySlug?: string; subcategory?: string }): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.categorySlug) params.set("categorySlug", filters.categorySlug);
  if (filters?.subcategory) params.set("subcategory", filters.subcategory);
  const qs = params.toString();
  return request<Product[]>(`/products${qs ? `?${qs}` : ""}`);
}

export function getCategories(): Promise<CategoryTreeNode[]> {
  return request<CategoryTreeNode[]>("/categories");
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return request<ProductDetail>(`/products/${slug}`);
}

export function register(email: string, name: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });
}

export function login(email: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function createOrder(token: string, offerId: string, organizationId?: string | null): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ offerId, organizationId: organizationId || undefined }),
  });
}

export function getOrder(token: string, orderId: string): Promise<Order> {
  return request<Order>(`/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getOrders(token: string): Promise<Order[]> {
  return request<Order[]>("/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Le PDF est derrière une route authentifiée (Bearer JWT) : un <a href> classique
// ne peut pas porter l'en-tête, donc on le récupère en blob puis on déclenche
// le téléchargement via une URL objet temporaire.
export async function downloadInvoicePdf(token: string, orderId: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}/orders/${orderId}/invoice.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status, "invoice_download_failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function listOrganizations(token: string): Promise<Organization[]> {
  return request<Organization[]>("/organizations", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createOrganization(token: string, name: string, vatNumber?: string): Promise<Organization> {
  return request<Organization>("/organizations", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, vatNumber: vatNumber || undefined }),
  });
}

export function getOrganization(token: string, id: string): Promise<Organization> {
  return request<Organization>(`/organizations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getOrganizationOrders(token: string, id: string): Promise<Order[]> {
  return request<Order[]>(`/organizations/${id}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function addOrganizationMember(token: string, id: string, email: string, role?: MembershipRole): Promise<Membership> {
  return request<Membership>(`/organizations/${id}/members`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, role }),
  });
}

export function removeOrganizationMember(token: string, id: string, userId: string): Promise<void> {
  return request<void>(`/organizations/${id}/members/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---- Panier ----

export interface CartItem {
  id: string;
  quantity: number;
  available: boolean;
  subtotal: number;
  offer: { id: string; price: number; provider: Provider };
  product: { id: string; name: string; slug: string; imageUrl: string | null; currency: string; journeyType: Product["journeyType"] };
}

export interface CartSummary {
  items: CartItem[];
  total: number;
}

export interface CheckoutResult {
  orders: Order[];
  skipped: { productName: string; reason: string }[];
}

export function getCart(token: string): Promise<CartSummary> {
  return request<CartSummary>("/cart", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function addToCart(token: string, offerId: string, quantity?: number): Promise<CartItem> {
  return request<CartItem>("/cart", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ offerId, quantity }),
  });
}

export function updateCartItem(token: string, id: string, quantity: number): Promise<CartItem> {
  return request<CartItem>(`/cart/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(token: string, id: string): Promise<void> {
  return request<void>(`/cart/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function checkoutCart(token: string, organizationId?: string | null): Promise<CheckoutResult> {
  return request<CheckoutResult>("/cart/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ organizationId: organizationId || undefined }),
  });
}

// ---- Admin ----
// Réservé aux comptes User.isAdmin = true (backend renvoie 403 sinon).

export interface AdminProvider {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "DEGRADED" | "DOWN";
  connectorKey: string;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
  // Config du connecteur REST générique (connectorKey === "generic-rest").
  // apiKey n'est jamais renvoyée par l'API — apiKeySet indique juste si une clé
  // est enregistrée ; un nouveau champ vide dans le formulaire ne l'écrase pas.
  apiBaseUrl: string | null;
  apiKeySet: boolean;
  apiAuthHeader: string;
  apiAuthPrefix: string;
  apiOrderPath: string;
  apiStatusField: string;
  apiOrderIdField: string;
  apiConfirmedValue: string;
  apiCatalogPath: string;
  createdAt: string;
  _count: { offers: number };
}

export interface AdminProviderWrite {
  name?: string;
  slug?: string;
  status?: AdminProvider["status"];
  connectorKey?: string;
  commissionType?: AdminProvider["commissionType"];
  commissionValue?: number;
  apiBaseUrl?: string;
  apiKey?: string;
  apiAuthHeader?: string;
  apiAuthPrefix?: string;
  apiOrderPath?: string;
  apiStatusField?: string;
  apiOrderIdField?: string;
  apiConfirmedValue?: string;
  apiCatalogPath?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: SubcategoryRef | null;
  description: string;
  imageUrl: string | null;
  currency: string;
  consumptionType: "UNIT" | "SUBSCRIPTION" | "USAGE";
  journeyType: "NATIVE" | "HYBRID" | "EXTERNAL";
  isActive: boolean;
  createdAt: string;
  _count: { offers: number };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  subcategories: Array<{ id: string; name: string; slug: string; categoryId: string }>;
}

export function getAdminCategories(token: string): Promise<AdminCategory[]> {
  return adminRequest(token, "/admin/categories");
}

export interface AdminOffer {
  id: string;
  price: number;
  rating: number | null;
  salesCount: number;
  deliverySeconds: number | null;
  kycVerified: boolean;
  isActive: boolean;
  provider: { id: string; name: string; slug: string };
}

export interface AdminProductDetail extends Omit<AdminProduct, "_count"> {
  offers: AdminOffer[];
}

export interface AdminOrder {
  id: string;
  status: Order["status"];
  amount: number;
  platformFee: number;
  currency: string;
  createdAt: string;
  confirmedAt: string | null;
  user: { id: string; email: string; name: string | null };
  product: { id: string; name: string; slug: string };
  provider: { id: string; name: string; slug: string };
  invoice: { number: string; status: string; issuedAt: string } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  // null = accès permanent. Vérifié côté serveur à chaque requête /admin/* —
  // ce champ n'est qu'un affichage, jamais la barrière elle-même.
  adminAccessExpiresAt: string | null;
  createdAt: string;
  permissions: AdminScope[];
}

export const ADMIN_SCOPES: { value: AdminScope; label: string }[] = [
  { value: "PROVIDERS", label: "Fournisseurs" },
  { value: "CATALOG", label: "Catalogue (produits & offres)" },
  { value: "ORDERS", label: "Commandes" },
  { value: "COMMISSIONS", label: "Commissions" },
  { value: "ANALYTICS", label: "Analytique" },
  { value: "USERS", label: "Comptes & accès (super-admin)" },
];

export interface CommissionsReport {
  totalCommission: number;
  orderCount: number;
  byProvider: Array<{ providerId: string; providerName: string; totalCommission: number; orderCount: number }>;
  orders: Array<{ id: string; amount: number; platformFee: number; currency: string; createdAt: string; provider: { id: string; name: string } }>;
}

export interface AnalyticsDailyPoint {
  date: string;
  byProvider: Record<string, { amount: number; platformFee: number; orderCount: number }>;
}

export interface AnalyticsSummary {
  providerId: string;
  providerName: string;
  amount: number;
  platformFee: number;
  orderCount: number;
  confirmedCount: number;
  failedCount: number;
  avgOrderValue: number;
  confirmationRate: number | null;
}

export interface Analytics {
  since: string;
  until: string;
  providers: Array<{ id: string; name: string }>;
  daily: AnalyticsDailyPoint[];
  summary: AnalyticsSummary[];
}

export type AnalyticsRange = { days: number } | { from: string; to: string };

export function getAdminAnalytics(token: string, range: AnalyticsRange): Promise<Analytics> {
  const query = "days" in range ? `days=${range.days}` : `from=${range.from}&to=${range.to}`;
  return adminRequest(token, `/admin/analytics?${query}`);
}

function adminRequest<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
}

export function getCommissionsReport(token: string): Promise<CommissionsReport> {
  return adminRequest(token, "/admin/commissions");
}

export function getAdminProviders(token: string): Promise<AdminProvider[]> {
  return adminRequest(token, "/admin/providers");
}

export interface ProviderOffer {
  id: string;
  price: number;
  rating: number | null;
  salesCount: number;
  deliverySeconds: number | null;
  kycVerified: boolean;
  isActive: boolean;
  product: { id: string; name: string; slug: string; category: string };
}

export interface ProviderOrder {
  id: string;
  status: Order["status"];
  amount: number;
  platformFee: number;
  currency: string;
  createdAt: string;
  product: { name: string };
  user: { email: string };
}

export interface ProviderDetail {
  provider: Omit<AdminProvider, "_count">;
  offers: ProviderOffer[];
  summary: { orderCount: number; confirmedCount: number; failedCount: number; totalAmount: number; totalCommission: number };
  orders: ProviderOrder[];
}

export function getAdminProviderDetail(token: string, id: string): Promise<ProviderDetail> {
  return adminRequest(token, `/admin/providers/${id}`);
}

export interface CatalogImportResult {
  imported: number;
  items: Array<{ productName: string; productSlug: string; price: number }>;
}

export function importProviderCatalog(token: string, id: string): Promise<CatalogImportResult> {
  return adminRequest(token, `/admin/providers/${id}/import-catalog`, { method: "POST" });
}

export function createAdminProvider(token: string, data: AdminProviderWrite): Promise<AdminProvider> {
  return adminRequest(token, "/admin/providers", { method: "POST", body: JSON.stringify(data) });
}

export function updateAdminProvider(token: string, id: string, data: AdminProviderWrite): Promise<AdminProvider> {
  return adminRequest(token, `/admin/providers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getAdminProducts(token: string): Promise<AdminProduct[]> {
  return adminRequest(token, "/admin/products");
}

export function getAdminProduct(token: string, id: string): Promise<AdminProductDetail> {
  return adminRequest(token, `/admin/products/${id}`);
}

export interface AdminProductWrite {
  name?: string;
  slug?: string;
  category?: string;
  subcategoryId?: string | null;
  description?: string;
  consumptionType?: string;
  journeyType?: string;
  currency?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export function createAdminProduct(
  token: string,
  data: { name: string; slug: string; category: string; subcategoryId?: string; description: string; consumptionType?: string; journeyType?: string; currency?: string; imageUrl?: string }
): Promise<AdminProduct> {
  return adminRequest(token, "/admin/products", { method: "POST", body: JSON.stringify(data) });
}

export function updateAdminProduct(token: string, id: string, data: AdminProductWrite): Promise<AdminProduct> {
  return adminRequest(token, `/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function createAdminOffer(
  token: string,
  data: { productId: string; providerId: string; price: number; rating?: number; salesCount?: number; deliverySeconds?: number; kycVerified?: boolean }
): Promise<AdminOffer> {
  return adminRequest(token, "/admin/offers", { method: "POST", body: JSON.stringify(data) });
}

export function updateAdminOffer(token: string, id: string, data: Partial<AdminOffer>): Promise<AdminOffer> {
  return adminRequest(token, `/admin/offers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getAdminOrders(token: string): Promise<AdminOrder[]> {
  return adminRequest(token, "/admin/orders");
}

export function resolveAdminOrder(token: string, id: string, status: "CONFIRMED" | "FAILED"): Promise<AdminOrder> {
  return adminRequest(token, `/admin/orders/${id}/resolve`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function getAdminUsers(token: string): Promise<AdminUser[]> {
  return adminRequest(token, "/admin/users");
}

// adminAccessExpiresAt : omis -> inchangé, null -> accès permanent, sinon ISO datetime future.
export function updateAdminUser(
  token: string,
  id: string,
  isAdmin: boolean,
  adminAccessExpiresAt?: string | null
): Promise<AdminUser> {
  return adminRequest(token, `/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isAdmin, ...(adminAccessExpiresAt !== undefined && { adminAccessExpiresAt }) }),
  });
}

export function updateAdminUserPermissions(token: string, id: string, scopes: AdminScope[]): Promise<AdminUser> {
  return adminRequest(token, `/admin/users/${id}/permissions`, { method: "PATCH", body: JSON.stringify({ scopes }) });
}

export { ApiError };
