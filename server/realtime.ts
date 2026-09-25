import type { Response } from "express";

export type RelayloopEvent = {
  type: string;
  occurredAt: number;
  actorUserId?: number;
  audienceUserIds?: number[];
  deliveryId?: number;
  riderId?: number;
  payload?: Record<string, unknown>;
};

type Client = { userId: number; isAdmin: boolean; res: Response };
const clients = new Set<Client>();

export function addRealtimeClient(client: Client) {
  clients.add(client);
  client.res.on("close", () => clients.delete(client));
  return () => clients.delete(client);
}

export function publishRealtime(event: RelayloopEvent) {
  const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  clients.forEach(client => {
    const allowed = client.isAdmin || !event.audienceUserIds || event.audienceUserIds.includes(client.userId);
    if (allowed && !client.res.writableEnded) client.res.write(message);
  });
}

export function clientCount() {
  return clients.size;
}
