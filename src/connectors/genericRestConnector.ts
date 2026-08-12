import { CatalogOffer, CreateOrderRequest, ProviderConnector, ProviderOrderResult } from "./types";

// Connecteur REST générique : couvre le cas courant d'une API fournisseur qui
// accepte un POST JSON simple et répond avec un statut. Configuré par
// fournisseur (URL, clé API, mapping de réponse) depuis /admin/providers —
// aucun déploiement de code nécessaire pour brancher un nouveau fournisseur
// tant que son API suit ce contrat.
//
// Contrat attendu par défaut (personnalisable via apiStatusField/apiOrderIdField/
// apiConfirmedValue — voir README) :
//   POST {apiBaseUrl}{apiOrderPath}
//   Body: { "external_reference": string, "idempotency_key": string, "amount": number, "currency": string }
//   Réponse JSON attendue : { "status": "confirmed" | "pending" | "failed", "provider_order_id"?: string, "reason"?: string }
//
// Si l'API d'un fournisseur ne rentre pas dans ce moule (auth propriétaire,
// webhooks asynchrones, forme de réponse trop différente), écrire un connecteur
// dédié qui implémente ProviderConnector — l'orchestrateur ne fait aucune
// distinction entre les deux.

export interface GenericConnectorConfig {
  key: string;
  apiBaseUrl: string;
  apiKey: string | null;
  apiAuthHeader: string;
  apiAuthPrefix: string;
  apiOrderPath: string;
  apiStatusField: string;
  apiOrderIdField: string;
  apiConfirmedValue: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export class GenericRestConnector implements ProviderConnector {
  key: string;
  private config: GenericConnectorConfig;

  constructor(config: GenericConnectorConfig) {
    this.key = config.key;
    this.config = config;
  }

  private authHeaders(): Record<string, string> {
    if (!this.config.apiKey) return {};
    return { [this.config.apiAuthHeader]: `${this.config.apiAuthPrefix}${this.config.apiKey}` };
  }

  private async request(method: string, path: string, body?: unknown): Promise<{ ok: boolean; json: unknown; httpStatus: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.config.apiBaseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...this.authHeaders() },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      return { ok: res.ok, json, httpStatus: res.status };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResult(json: unknown, httpStatus: number, ok: boolean): ProviderOrderResult {
    if (!ok || json === null) {
      return { success: false, status: "FAILED", reason: `http_${httpStatus}` };
    }
    const statusValue = getByPath(json, this.config.apiStatusField);
    const providerOrderId = getByPath(json, this.config.apiOrderIdField);
    const reason = getByPath(json, "reason");

    if (statusValue === this.config.apiConfirmedValue) {
      return {
        success: true,
        status: "CONFIRMED",
        providerOrderId: typeof providerOrderId === "string" ? providerOrderId : undefined,
      };
    }
    return {
      success: false,
      status: "FAILED",
      reason: typeof reason === "string" ? reason : `unexpected_status:${String(statusValue)}`,
    };
  }

  async createOrder(req: CreateOrderRequest): Promise<ProviderOrderResult> {
    try {
      const { ok, json, httpStatus } = await this.request("POST", this.config.apiOrderPath, {
        external_reference: req.serviceExternalId,
        idempotency_key: req.idempotencyKey,
        amount: req.amount,
        currency: req.currency,
      });
      return this.parseResult(json, httpStatus, ok);
    } catch {
      return { success: false, status: "FAILED", reason: "network_error" };
    }
  }

  async checkStatus(providerOrderId: string): Promise<ProviderOrderResult> {
    try {
      const { ok, json, httpStatus } = await this.request(
        "GET",
        `${this.config.apiOrderPath}/${encodeURIComponent(providerOrderId)}`
      );
      return this.parseResult(json, httpStatus, ok);
    } catch {
      return { success: false, status: "FAILED", reason: "network_error" };
    }
  }

  async fetchCatalog(): Promise<CatalogOffer[]> {
    // Non utilisé par l'orchestrateur aujourd'hui (le catalogue est géré côté
    // plateforme via Product/Offer) — laissé vide plutôt que de deviner une forme.
    return [];
  }
}
