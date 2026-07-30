import { ProviderConnector, CatalogOffer, CreateOrderRequest, ProviderOrderResult } from "./types";

// Connecteur de démonstration : simule un fournisseur réel avec latence
// et un taux d'échec configurable, pour valider le pattern retry/idempotency
// de l'orchestrateur sans dépendre d'une vraie API externe.
export class MockConnector implements ProviderConnector {
  key = "mock-telecom";
  private failureRate = 0.2;

  async fetchCatalog(): Promise<CatalogOffer[]> {
    return [
      { externalId: "mock-forfait-20go", name: "Forfait mobile 20Go", price: 999, currency: "EUR" },
      { externalId: "mock-forfait-illimite", name: "Forfait mobile illimité", price: 1999, currency: "EUR" },
    ];
  }

  async createOrder(req: CreateOrderRequest): Promise<ProviderOrderResult> {
    await this.simulateLatency();
    if (Math.random() < this.failureRate) {
      return { success: false, status: "FAILED", reason: "provider_timeout" };
    }
    return {
      success: true,
      status: "CONFIRMED",
      providerOrderId: `mock-${req.idempotencyKey}`,
    };
  }

  async checkStatus(providerOrderId: string): Promise<ProviderOrderResult> {
    await this.simulateLatency();
    return { success: true, status: "CONFIRMED", providerOrderId };
  }

  private simulateLatency() {
    return new Promise((resolve) => setTimeout(resolve, 150));
  }
}
