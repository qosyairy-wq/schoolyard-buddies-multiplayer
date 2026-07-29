import { DurableObject } from "cloudflare:workers";

const MAX_PLAYERS = 32;
const MAX_CHAT_LENGTH = 120;
const ROOM_NAME_RE = /^[a-z0-9_-]{1,48}$/;
const BLOCKED_CHAT = /\b(?:idiot|stupid|hate|kill|bodoh|babi)\b/i;
const APPEARANCE_KEYS = new Set([
  "type", "characterType", "gender", "headwear", "hairColor", "hairHighlight",
  "skin", "shirt", "pants", "shoes", "backpack", "hasBackpack", "accessory",
  "hijabPattern", "headwearAccent", "clothingStyle", "clothingAccent",
  "clothingAccent2", "hooded", "hoodColor", "maleTieColor", "pantsStyle",
  "pantsAccent"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function cleanText(value, max = 120) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function clamp(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : 0;
}

function sanitizeState(raw) {
  const state = raw && typeof raw === "object" ? raw : {};
  return {
    x: clamp(state.x, -600, 600),
    y: clamp(state.y, -20, 80),
    z: clamp(state.z, -600, 600),
    rotationY: clamp(state.rotationY, -Math.PI * 8, Math.PI * 8),
    action: ["idle", "walk", "run", "jump", "wave", "cheer"].includes(state.action)
      ? state.action
      : "idle"
  };
}

function sanitizeAppearance(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const output = {};
  for (const [key, value] of Object.entries(source)) {
    if (!APPEARANCE_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "boolean") output[key] = value;
    else if (typeof value === "string") output[key] = cleanText(value, 32);
    else if (value === null) output[key] = null;
  }
  return output;
}

function defaultSharedState() {
  const now = new Date();
  return {
    boss: {
      id: "exam-robot",
      name: "Exam Robot",
      hp: 5000,
      maxHp: 5000,
      defeated: false
    },
    festival: {
      season: `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`,
      name: "Festival Ilmu / Knowledge Festival",
      points: 0,
      target: 1000
    },
    communityPoints: 0,
    updatedAt: Date.now()
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "schoolyard-buddies-multiplayer", time: new Date().toISOString() });
    }

    if (url.pathname === "/ws") {
      if (request.method !== "GET") return new Response("GET required", { status: 405 });
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("WebSocket upgrade required", { status: 426 });
      }

      const requestedRoom = cleanText(url.searchParams.get("room") || "schoolyard-main", 48)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-");
      const room = ROOM_NAME_RE.test(requestedRoom) ? requestedRoom : "schoolyard-main";
      const stub = env.GAME_ROOMS.getByName(room);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sessions = new Map();
    this.shared = defaultSharedState();

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment();
      if (attachment) this.sessions.set(ws, attachment);
    }

    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    this.ctx.blockConcurrencyWhile(async () => {
      this.shared = (await this.ctx.storage.get("shared")) || defaultSharedState();
    });
  }

  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const attachment = {
      id: crypto.randomUUID(),
      joined: false,
      name: "Student",
      appearance: {},
      state: sanitizeState({}),
      lastStateAt: 0,
      lastChatAt: 0,
      joinedAt: Date.now()
    };
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);

    return new Response(null, { status: 101, webSocket: client });
  }

  getJoinedSessions() {
    return [...this.sessions.entries()].filter(([, session]) => session?.joined);
  }

  send(ws, type, payload = {}) {
    try {
      ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    } catch {
      // The close/error handler will clean up dead sockets.
    }
  }

  broadcast(type, payload = {}, except = null) {
    for (const [ws, session] of this.getJoinedSessions()) {
      if (ws === except || !session.joined) continue;
      this.send(ws, type, payload);
    }
  }

  broadcastPresence() {
    const onlineCount = this.getJoinedSessions().length;
    this.broadcast("presence", { onlineCount });
  }

  playerSnapshot(session) {
    return {
      id: session.id,
      name: session.name,
      appearance: session.appearance,
      state: session.state
    };
  }

  saveAttachment(ws, session) {
    this.sessions.set(ws, session);
    ws.serializeAttachment(session);
  }

  async persistShared() {
    this.shared.updatedAt = Date.now();
    await this.ctx.storage.put("shared", this.shared);
  }

  async webSocketMessage(ws, rawMessage) {
    if (typeof rawMessage !== "string" || rawMessage.length > 16_384) return;
    if (rawMessage === "ping") return;

    let message;
    try {
      message = JSON.parse(rawMessage);
    } catch {
      this.send(ws, "error", { message: "Invalid JSON message." });
      return;
    }

    const session = this.sessions.get(ws) || ws.deserializeAttachment();
    if (!session) return;
    const payload = message.payload && typeof message.payload === "object" ? message.payload : {};

    switch (message.type) {
      case "join": {
        if (!session.joined && this.getJoinedSessions().length >= MAX_PLAYERS) {
          this.send(ws, "error", { message: "This test room is full." });
          ws.close(1013, "Room full");
          return;
        }

        session.joined = true;
        session.name = cleanText(payload.name || "Student", 28) || "Student";
        session.appearance = sanitizeAppearance(payload.appearance);
        session.state = sanitizeState(payload.state);
        this.saveAttachment(ws, session);

        const players = this.getJoinedSessions()
          .filter(([otherWs]) => otherWs !== ws)
          .map(([, other]) => this.playerSnapshot(other));

        this.send(ws, "welcome", {
          playerId: session.id,
          players,
          onlineCount: this.getJoinedSessions().length,
          bossState: this.shared.boss,
          festivalState: this.shared.festival
        });
        this.broadcast("player_joined", this.playerSnapshot(session), ws);
        this.broadcastPresence();
        break;
      }

      case "player_state": {
        if (!session.joined) return;
        const now = Date.now();
        if (now - session.lastStateAt < 50) return;
        session.lastStateAt = now;
        session.state = sanitizeState(payload);
        this.saveAttachment(ws, session);
        this.broadcast("player_state", {
          playerId: session.id,
          name: session.name,
          appearance: session.appearance,
          ...session.state
        }, ws);
        break;
      }

      case "appearance_update": {
        if (!session.joined) return;
        session.appearance = sanitizeAppearance(payload.appearance);
        this.saveAttachment(ws, session);
        this.broadcast("appearance_update", this.playerSnapshot(session), ws);
        break;
      }

      case "chat": {
        if (!session.joined) return;
        const now = Date.now();
        if (now - session.lastChatAt < 1000) {
          this.send(ws, "error", { message: "Please wait before sending another message." });
          return;
        }
        session.lastChatAt = now;
        this.saveAttachment(ws, session);
        const text = cleanText(payload.text, MAX_CHAT_LENGTH);
        if (!text || BLOCKED_CHAT.test(text)) {
          this.send(ws, "error", { message: "Message blocked by the friendly chat filter." });
          return;
        }
        this.broadcast("chat", { name: session.name, text });
        break;
      }

      case "boss_attack": {
        if (!session.joined || this.shared.boss.defeated) return;
        const damage = clamp(payload.damage, 1, 150);
        this.shared.boss.hp = Math.max(0, this.shared.boss.hp - damage);
        this.shared.communityPoints += Math.ceil(damage / 5);
        this.shared.festival.points += Math.ceil(damage / 5);
        if (this.shared.boss.hp <= 0) this.shared.boss.defeated = true;
        await this.persistShared();
        this.broadcast("boss_state", this.shared.boss);
        this.broadcast("festival_state", this.shared.festival);
        break;
      }

      case "progress": {
        if (!session.joined) return;
        const amount = clamp(payload.amount, 1, 100);
        this.shared.communityPoints += amount;
        this.shared.festival.points += amount;
        await this.persistShared();
        this.broadcast("festival_state", this.shared.festival);
        break;
      }

      case "leave": {
        this.removeSession(ws, session, true);
        ws.close(1000, "Player left");
        break;
      }
    }
  }

  removeSession(ws, session, announce) {
    const wasJoined = Boolean(session?.joined);
    if (session) {
      session.joined = false;
      try { ws.serializeAttachment(session); } catch { /* Socket may already be closed. */ }
    }
    this.sessions.delete(ws);
    if (announce && wasJoined) {
      this.broadcast("player_left", { playerId: session.id, name: session.name }, ws);
      this.broadcastPresence();
    }
  }

  async webSocketClose(ws, code, reason) {
    const session = this.sessions.get(ws) || ws.deserializeAttachment();
    this.removeSession(ws, session, true);
    try { ws.close(code, reason); } catch { /* Runtime may already have completed the close. */ }
  }

  async webSocketError(ws) {
    const session = this.sessions.get(ws) || ws.deserializeAttachment();
    this.removeSession(ws, session, true);
  }
}
