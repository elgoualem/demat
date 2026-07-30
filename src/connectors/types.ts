// Contrat commun que tout connecteur fournisseur doit implémenter.
// Un nouveau fournisseur = une nouvelle classe qui implémente cette interface,
// sans toucher au reste du système (orchestrateur, routes, facturation).

export interface CatalogOffer {
  externalId: string;
  name: string;
  price: number; // centimes
  currency: string;
}

export interface CreateOrderRequest {
  serviceExternalId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
}

export interface ProviderOrderResult {
  success: boolean;
  providerOrderId?: string;
  status: "CONFIRMED" | "PENDING" | "FAILED";
  reason?: string;
}

export interface ProviderConnector {
  key: string;
  fetchCatalog(): Promise<CatalogOffer[]>;
  createOrder(req: CreateOrderRequest): Promise<ProviderOrderResult>;
  checkStatus(providerOrderId: string): Promise<ProviderOrderResult>;
}
