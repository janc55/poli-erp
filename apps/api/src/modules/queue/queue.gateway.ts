import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/queue' })
export class QueueGateway {
  @WebSocketServer()
  server!: Server;

  emitQueueUpdate(clinicId: string, specialtyId: string) {
    this.server.emit('queue:updated', { clinicId, specialtyId, at: new Date().toISOString() });
  }

  @SubscribeMessage('queue:subscribe')
  handleSubscribe(client: { join: (room: string) => void }, payload: { clinicId: string; specialtyId: string }) {
    const room = `queue:${payload.clinicId}:${payload.specialtyId}`;
    client.join(room);
    return { event: 'queue:subscribed', room };
  }
}
