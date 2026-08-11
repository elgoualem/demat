import { ProviderConnector } from "./types";
import { MockConnector } from "./mockConnector";

// Registre des connecteurs disponibles, indexé par connectorKey (colonne Provider.connectorKey en DB).
// L'orchestrateur ne connaît jamais un fournisseur directement : il passe toujours par ce registre.
// mock-telecom/mock-finance/mock-voyage pointent vers le même connecteur de démo générique :
// il n'y a qu'un seul connecteur mock, dupliqué par clé pour préparer l'arrivée de vrais
// connecteurs par verticale sans changer la forme du registre.
const connectors: Record<string, ProviderConnector> = {
  "mock-telecom": new MockConnector(),
  "mock-finance": new MockConnector(),
  "mock-voyage": new MockConnector(),
};

export function getConnector(connectorKey: string): ProviderConnector {
  const connector = connectors[connectorKey];
  if (!connector) {
    throw new Error(`Aucun connecteur enregistré pour la clé: ${connectorKey}`);
  }
  return connector;
}
