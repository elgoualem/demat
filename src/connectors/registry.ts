import { ProviderConnector } from "./types";
import { MockConnector } from "./mockConnector";

// Registre des connecteurs disponibles, indexé par connectorKey (colonne Provider.connectorKey en DB).
// L'orchestrateur ne connaît jamais un fournisseur directement : il passe toujours par ce registre.
const connectors: Record<string, ProviderConnector> = {
  "mock-telecom": new MockConnector(),
};

export function getConnector(connectorKey: string): ProviderConnector {
  const connector = connectors[connectorKey];
  if (!connector) {
    throw new Error(`Aucun connecteur enregistré pour la clé: ${connectorKey}`);
  }
  return connector;
}
