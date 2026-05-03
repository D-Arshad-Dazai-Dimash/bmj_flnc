'use client'

import * as signalR from '@microsoft/signalr'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

/**
 * Создаёт и стартует SignalR-соединение.
 * Аутентификация — через httpOnly access_token cookie (передаётся
 * автоматически благодаря `withCredentials`), плюс fallback через
 * `?access_token=` для веб-сокет хэндшейка, если cookie не дошёл.
 */
export async function createConnection(
  hubPath: '/hubs/chat' | '/hubs/notifications',
): Promise<signalR.HubConnection> {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}${hubPath}`, {
      withCredentials: true,
      // skipNegotiation = false, чтобы дойти до WebSockets через negotiate
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000])
    .configureLogging(signalR.LogLevel.Warning)
    .build()

  await conn.start()
  return conn
}
