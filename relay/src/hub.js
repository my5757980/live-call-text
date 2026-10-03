// The relay hub: one Durable Object that passes the agent's words to customer pages.
// Uses the WebSocket Hibernation API; all routing comes from socket tags and small
// attachments, and nothing is ever written to storage (Constitution V, research R6).
import { DurableObject } from 'cloudflare:workers';
import { isValidSid } from '../../web/js/core/link-session.js';
import { buildStatus } from '../../web/js/core/protocol.js';
import {
  decideAgentUpgrade, decideViewerJoin, onAgentFrame, onAgentClose, parseUpgrade, CLOSE,
} from './hub-logic.js';

const OPEN = 1;

function safeClose(ws, code, reason) {
  try { ws.close(code, reason); } catch { /* already closing */ }
}

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Heartbeats are answered without waking the object (no duration charge).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }
    const { role } = parseUpgrade(request.url);
    if (role === 'agent') return this.acceptAgent(request);
    if (role === 'viewer') return this.acceptViewer(request);
    return new Response('Unknown role', { status: 400 });
  }

  async acceptAgent(request) {
    const d = await decideAgentUpgrade({
      url: request.url,
      protocols: request.headers.get('Sec-WebSocket-Protocol'),
      now: Date.now(),
    });
    if (!d.ok) return new Response('Not allowed', { status: d.status });

    // A valid reconnect replaces an older socket that may still look open.
    for (const old of this.ctx.getWebSockets(`agent:${d.sid}`)) {
      old.serializeAttachment({ ...(old.deserializeAttachment() ?? {}), replaced: true });
      safeClose(old, CLOSE.REPLACED, 'replaced');
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, ['agent', `agent:${d.sid}`]);
    server.serializeAttachment({ role: 'agent', sid: d.sid, created: d.created, windowStart: 0, count: 0, drops: 0 });
    server.send(buildStatus('live'));
    this.broadcast(d.sid, buildStatus('live'));
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': d.protocol } });
  }

  acceptViewer(request) {
    const { sid } = parseUpgrade(request.url);
    if (!isValidSid(sid)) return new Response('Bad session id', { status: 400 });
    const d = decideViewerJoin({
      liveAgent: Boolean(this.liveAgent(sid)),
      viewerCount: this.ctx.getWebSockets(`viewer:${sid}`).length,
    });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, ['viewer', `viewer:${sid}`]);
    server.serializeAttachment({ role: 'viewer', sid });
    if (d.send) server.send(buildStatus(d.send));
    if (d.close) safeClose(server, d.close, d.send ?? 'closed');
    return new Response(null, { status: 101, webSocket: client });
  }

  liveAgent(sid) {
    return this.ctx.getWebSockets(`agent:${sid}`).find((ws) => {
      const a = ws.deserializeAttachment();
      return a && !a.replaced && !a.ended && ws.readyState === OPEN;
    });
  }

  broadcast(sid, frame) {
    for (const ws of this.ctx.getWebSockets(`viewer:${sid}`)) {
      try { ws.send(frame); } catch { /* viewer gone */ }
    }
  }

  endForViewers(sid, state, code) {
    for (const ws of this.ctx.getWebSockets(`viewer:${sid}`)) {
      try { ws.send(buildStatus(state)); } catch { /* viewer gone */ }
      safeClose(ws, code, state);
    }
  }

  async webSocketMessage(ws, message) {
    const a = ws.deserializeAttachment() ?? {};
    if (a.role !== 'agent') return;   // viewers only ping (answered automatically)

    const r = onAgentFrame({ frame: message, attachment: a, now: Date.now() });
    if (r.expired) {
      ws.serializeAttachment({ ...r.attachment, ended: true });
      this.endForViewers(a.sid, 'expired', CLOSE.EXPIRED);
      safeClose(ws, CLOSE.EXPIRED, 'expired');
      return;
    }
    if (r.end) {
      ws.serializeAttachment({ ...r.attachment, ended: true });
      this.endForViewers(a.sid, 'ended', CLOSE.ENDED);
      safeClose(ws, CLOSE.NORMAL, 'ended');
      return;
    }
    ws.serializeAttachment(r.attachment);
    if (r.close) safeClose(ws, r.close, 'too many invalid frames');
    else if (r.forward) this.broadcast(a.sid, r.forward);
  }

  async webSocketClose(ws, code) {
    const a = ws.deserializeAttachment() ?? {};
    safeClose(ws, code === 1005 || code === 1006 ? CLOSE.NORMAL : code, 'closing');
    this.agentGone(a, code);
  }

  async webSocketError(ws) {
    this.agentGone(ws.deserializeAttachment() ?? {}, 1006);
  }

  agentGone(a, code) {
    if (a.role !== 'agent') return;
    const outcome = onAgentClose({ code, attachment: a });
    if (outcome === 'ended') this.endForViewers(a.sid, 'ended', CLOSE.ENDED);
    else if (outcome === 'paused' && !this.liveAgent(a.sid)) this.broadcast(a.sid, buildStatus('paused'));
  }
}
