const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface Provider {
  name: string;
  slug: string;
  status: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  provider: Provider;
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
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
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

export function getServices(): Promise<Service[]> {
  return request<Service[]>("/services");
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

export function createOrder(token: string, serviceId: string, organizationId?: string | null): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ serviceId, organizationId: organizationId || undefined }),
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

export { ApiError };
