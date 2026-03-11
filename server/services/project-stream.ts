// FILE: server/services/project-stream.ts

import { Response } from "express";

type Client = {
  projectId: string;
  res: Response;
};

const clients: Client[] = [];

export function addClient(projectId: string, res: Response) {
  clients.push({ projectId, res });
}

export function removeClient(res: Response) {
  const index = clients.findIndex(c => c.res === res);
  if (index !== -1) clients.splice(index, 1);
}

export function sendEvent(projectId: string, event: string, data: any) {
  clients
    .filter(c => c.projectId === projectId)
    .forEach(client => {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

setInterval(() => {
  clients.forEach(client => {
    client.res.write(`event: heartbeat\n`);
    client.res.write(`data: {}\n\n`);
  });
}, 15000);