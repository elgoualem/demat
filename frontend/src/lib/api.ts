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
  createdAt: string;
  confirmedAt: string | null;
  events?: OrderEvent[];
  invoice?: Invoice | null;
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

export function createOrder(token: string, serviceId: string): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ serviceId }),
  });
}

export function getOrder(token: string, orderId: string): Promise<Order> {
  return request<Order>(`/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export { ApiError };
