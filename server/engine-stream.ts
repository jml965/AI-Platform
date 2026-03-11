export type EngineStreamClient = {
  projectId: string;
  send: (payload: any) => void;
  sendEvent: (event: string, data: any) => void;
};

const engineStreamClients = new Map<string, Set<EngineStreamClient>>();

export function addEngineClient(projectId: string, client: EngineStreamClient) {
  const set = engineStreamClients.get(projectId) ?? new Set<EngineStreamClient>();
  set.add(client);
  engineStreamClients.set(projectId, set);
}

export function removeEngineClient(projectId: string, client: EngineStreamClient) {
  const set = engineStreamClients.get(projectId);
  if (!set) return;

  set.delete(client);

  if (set.size === 0) {
    engineStreamClients.delete(projectId);
  }
}

export function emitEngineStream(projectId: string, payload: any) {
  const set = engineStreamClients.get(projectId);
  if (!set?.size) return;

  Array.from(set).forEach(client => {
    try {
      client.send(payload);
    } catch (error) {
      console.error("engine stream send error", error);
    }
  });
}

export function emitEngineStreamEvent(projectId: string, event: string, data: any) {
  const set = engineStreamClients.get(projectId);
  if (!set?.size) return;

  Array.from(set).forEach(client => {
    try {
      client.sendEvent(event, data);
    } catch (error) {
      console.error("engine stream sendEvent error", error);
    }
  });
}
