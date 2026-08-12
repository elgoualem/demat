import { ProviderConnector } from "./types";
import { MockConnector } from "./mockConnector";
import { GenericRestConnector } from "./genericRestConnector";

// Registre des connecteurs codés en dur, indexé par connectorKey (colonne Provider.connectorKey en DB).
// L'orchestrateur ne connaît jamais un fournisseur directement : il passe toujours par ce registre.
// mock-telecom/mock-finance/mock-voyage pointent vers le même connecteur de démo générique :
// il n'y a qu'un seul connecteur mock, dupliqué par clé pour préparer l'arrivée de vrais
// connecteurs par verticale sans changer la forme du registre.
const connectors: Record<string, ProviderConnector> = {
  "mock-telecom": new MockConnector(),
  "mock-finance": new MockConnector(),
  "mock-voyage": new MockConnector(),
};

// connectorKey pour lequel il n'existe pas d'instance unique en registre : la
// config (URL, clé API, mapping) vit sur chaque Provider en base, donc le
// connecteur est reconstruit à la demande plutôt que partagé.
export const GENERIC_REST_CONNECTOR_KEY = "generic-rest";

interface ProviderConnectorConfig {
  connectorKey: string;
  apiBaseUrl: string | null;
  apiKey: string | null;
  apiAuthHeader: string;
  apiAuthPrefix: string;
  apiOrderPath: string;
  apiStatusField: string;
  apiOrderIdField: string;
  apiConfirmedValue: string;
}

export function getConnector(provider: ProviderConnectorConfig): ProviderConnector {
  if (provider.connectorKey === GENERIC_REST_CONNECTOR_KEY) {
    if (!provider.apiBaseUrl) {
      throw new Error(`Fournisseur configuré en connecteur générique sans apiBaseUrl`);
    }
    return new GenericRestConnector({
      key: provider.connectorKey,
      apiBaseUrl: provider.apiBaseUrl,
      apiKey: provider.apiKey,
      apiAuthHeader: provider.apiAuthHeader,
      apiAuthPrefix: provider.apiAuthPrefix,
      apiOrderPath: provider.apiOrderPath,
      apiStatusField: provider.apiStatusField,
      apiOrderIdField: provider.apiOrderIdField,
      apiConfirmedValue: provider.apiConfirmedValue,
    });
  }

  const connector = connectors[provider.connectorKey];
  if (!connector) {
    throw new Error(`Aucun connecteur enregistré pour la clé: ${provider.connectorKey}`);
  }
  return connector;
}
