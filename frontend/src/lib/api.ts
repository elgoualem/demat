const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface Provider {
  id?: string;
  name: string;
  slug: string;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  currency: string;
  fromPrice: number | null;
  offerCount: number;
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
  amount: number;
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

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin?: boolean;
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

export function getProducts(): Promise<Product[]> {
  return request<Product[]>("/products");
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
  createdAt: string;
  _count: { offers: number };
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  currency: string;
  consumptionType: "UNIT" | "SUBSCRIPTION" | "USAGE";
  journeyType: "NATIVE" | "HYBRID" | "EXTERNAL";
  isActive: boolean;
  createdAt: string;
  _count: { offers: number };
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
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface CommissionsReport {
  totalCommission: number;
  orderCount: number;
  byProvider: Array<{ providerId: string; providerName: string; totalCommission: number; orderCount: number }>;
  orders: Array<{ id: string; amount: number; platformFee: number; currency: string; createdAt: string; provider: { id: string; name: string } }>;
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

export function createAdminProvider(
  token: string,
  data: { name: string; slug: string; connectorKey: string; commissionType: string; commissionValue: number }
): Promise<AdminProvider> {
  return adminRequest(token, "/admin/providers", { method: "POST", body: JSON.stringify(data) });
}

export function updateAdminProvider(token: string, id: string, data: Partial<AdminProvider>): Promise<AdminProvider> {
  return adminRequest(token, `/admin/providers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getAdminProducts(token: string): Promise<AdminProduct[]> {
  return adminRequest(token, "/admin/products");
}

export function getAdminProduct(token: string, id: string): Promise<AdminProductDetail> {
  return adminRequest(token, `/admin/products/${id}`);
}

export function createAdminProduct(
  token: string,
  data: { name: string; slug: string; category: string; description: string; consumptionType?: string; journeyType?: string; currency?: string }
): Promise<AdminProduct> {
  return adminRequest(token, "/admin/products", { method: "POST", body: JSON.stringify(data) });
}

export function updateAdminProduct(token: string, id: string, data: Partial<AdminProduct>): Promise<AdminProduct> {
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

export function getAdminUsers(token: string): Promise<AdminUser[]> {
  return adminRequest(token, "/admin/users");
}

export function updateAdminUser(token: string, id: string, isAdmin: boolean): Promise<AdminUser> {
  return adminRequest(token, `/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isAdmin }) });
}

export { ApiError };
