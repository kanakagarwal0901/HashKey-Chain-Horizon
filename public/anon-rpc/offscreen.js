var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../node_modules/@kpstreams/core/dist/address.js
function parseAddress(s) {
  const malformed = () => new Error(`address: malformed (expected <ip>:<port>:<certhash> or [ipv6]:<port>:<certhash>): ${s}`);
  let ip;
  let rest;
  if (s.startsWith("[")) {
    const end = s.indexOf("]");
    if (end < 0 || s[end + 1] !== ":")
      throw malformed();
    ip = s.slice(1, end);
    rest = s.slice(end + 2);
  } else {
    const i = s.indexOf(":");
    if (i < 0)
      throw malformed();
    ip = s.slice(0, i);
    rest = s.slice(i + 1);
  }
  const j = rest.indexOf(":");
  if (j < 0)
    throw malformed();
  const portStr = rest.slice(0, j);
  const certhash = rest.slice(j + 1);
  if (!/^\d+$/.test(portStr))
    throw malformed();
  const port = Number(portStr);
  if (port < 1 || port > 65535)
    throw new Error("address: port out of range");
  if (!ip || !certhash)
    throw malformed();
  return { ip, port, certhash };
}
function formatAddress(addr) {
  const host = addr.ip.includes(":") ? `[${addr.ip}]` : addr.ip;
  return `${host}:${addr.port}:${addr.certhash}`;
}
var init_address = __esm({
  "../node_modules/@kpstreams/core/dist/address.js"() {
  }
});

// ../node_modules/@kpstreams/core/dist/certhash.js
function decodeCerthash(s) {
  if (!s.startsWith(MULTIBASE_BASE64URL_NOPAD)) {
    throw new Error(`certhash: expected multibase prefix '${MULTIBASE_BASE64URL_NOPAD}', got '${s[0] ?? ""}'`);
  }
  const bytes = base64urlDecode(s.slice(1));
  if (bytes.length !== 2 + MULTIHASH_SHA256_LEN) {
    throw new Error(`certhash: expected ${2 + MULTIHASH_SHA256_LEN} bytes, got ${bytes.length}`);
  }
  if (bytes[0] !== MULTIHASH_SHA256_CODE || bytes[1] !== MULTIHASH_SHA256_LEN) {
    throw new Error(`certhash: not a sha2-256 multihash (prefix ${bytes[0].toString(16)} ${bytes[1].toString(16)})`);
  }
  return bytes.slice(2);
}
function digestToSdpFingerprint(digest) {
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
function base64urlDecode(s) {
  const pad = (4 - s.length % 4) % 4;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    out[i] = bin.charCodeAt(i);
  return out;
}
var MULTIBASE_BASE64URL_NOPAD, MULTIHASH_SHA256_CODE, MULTIHASH_SHA256_LEN;
var init_certhash = __esm({
  "../node_modules/@kpstreams/core/dist/certhash.js"() {
    MULTIBASE_BASE64URL_NOPAD = "u";
    MULTIHASH_SHA256_CODE = 18;
    MULTIHASH_SHA256_LEN = 32;
  }
});

// ../node_modules/@kpstreams/core/dist/errors.js
function streamError(reason) {
  const e = new Error(reason.message ?? `kps: stream ${reason.code ?? "reset"}`);
  e.code = reason.code;
  return e;
}
function reasonFrom(x) {
  if (x == null)
    return void 0;
  if (typeof x === "object" && ("code" in x || "message" in x))
    return x;
  return { message: String(x?.message ?? x) };
}
var init_errors = __esm({
  "../node_modules/@kpstreams/core/dist/errors.js"() {
  }
});

// ../node_modules/@kpstreams/core/dist/index.js
var init_dist = __esm({
  "../node_modules/@kpstreams/core/dist/index.js"() {
    init_address();
    init_certhash();
  }
});

// ../node_modules/@kpstreams/core/dist/framing.js
function codeToNum(code) {
  return code ? CODE_TO_NUM[code] ?? 0 : 0;
}
function numToCode(n) {
  return n === 0 ? void 0 : NUM_TO_CODE[n] ?? "internal-error";
}
function encodeData(payload) {
  const out = new Uint8Array(1 + payload.length);
  out[0] = FRAME_DATA;
  out.set(payload, 1);
  return out;
}
function encodeFin() {
  return new Uint8Array([FRAME_FIN]);
}
function encodeCode(type, code) {
  const out = new Uint8Array(5);
  out[0] = type;
  new DataView(out.buffer).setUint32(1, code >>> 0, false);
  return out;
}
function encodeMaxStreamData(value) {
  const out = new Uint8Array(9);
  out[0] = FRAME_MAX_STREAM_DATA;
  new DataView(out.buffer).setBigUint64(1, value, false);
  return out;
}
function parseFrame(data) {
  if (data.length === 0)
    throw new ProtocolViolation("empty data-channel message");
  if (data.length > MAX_WEBRTC_FRAME_SIZE) {
    throw new ProtocolViolation(`frame exceeds ${MAX_WEBRTC_FRAME_SIZE} bytes (${data.length})`);
  }
  const type = data[0];
  const payload = data.subarray(1);
  const view = () => new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  switch (type) {
    case FRAME_DATA:
      if (payload.length === 0)
        throw new ProtocolViolation("empty DATA frame");
      return { type: "data", payload };
    case FRAME_FIN:
      if (payload.length !== 0)
        throw new ProtocolViolation("FIN with payload");
      return { type: "fin" };
    case FRAME_RESET:
      if (payload.length !== 4)
        throw new ProtocolViolation("RESET payload must be 4 bytes");
      return { type: "reset", code: view().getUint32(0, false) };
    case FRAME_STOP_SENDING:
      if (payload.length !== 4)
        throw new ProtocolViolation("STOP_SENDING payload must be 4 bytes");
      return { type: "stop-sending", code: view().getUint32(0, false) };
    case FRAME_MAX_STREAM_DATA: {
      if (payload.length !== 8)
        throw new ProtocolViolation("MAX_STREAM_DATA payload must be 8 bytes");
      const value = view().getBigUint64(0, false);
      if (value > MAX_OFFSET)
        throw new ProtocolViolation("MAX_STREAM_DATA above MAX_OFFSET");
      return { type: "max-stream-data", value };
    }
    default:
      throw new ProtocolViolation(`unknown frame type 0x${type.toString(16)}`);
  }
}
var FRAME_DATA, FRAME_FIN, FRAME_RESET, FRAME_STOP_SENDING, FRAME_MAX_STREAM_DATA, MAX_WEBRTC_FRAME_SIZE, MAX_FRAME_PAYLOAD, MAX_OFFSET, ProtocolViolation, CODE_TO_NUM, NUM_TO_CODE;
var init_framing = __esm({
  "../node_modules/@kpstreams/core/dist/framing.js"() {
    FRAME_DATA = 0;
    FRAME_FIN = 1;
    FRAME_RESET = 2;
    FRAME_STOP_SENDING = 3;
    FRAME_MAX_STREAM_DATA = 4;
    MAX_WEBRTC_FRAME_SIZE = 16384;
    MAX_FRAME_PAYLOAD = MAX_WEBRTC_FRAME_SIZE - 1;
    MAX_OFFSET = (1n << 62n) - 1n;
    ProtocolViolation = class extends Error {
    };
    CODE_TO_NUM = {
      cancelled: 1,
      closed: 2,
      reset: 3,
      timeout: 4,
      "network-error": 5,
      "protocol-error": 6,
      unsupported: 7,
      "too-large": 8,
      "queue-full": 9,
      "permission-denied": 10,
      "internal-error": 11
    };
    NUM_TO_CODE = Object.fromEntries(Object.entries(CODE_TO_NUM).map(([k, v]) => [v, k]));
  }
});

// ../node_modules/@kpstreams/core/dist/control.js
function encodeConnClose(code) {
  const out = new Uint8Array(5);
  out[0] = CTRL_CONNECTION_CLOSE;
  new DataView(out.buffer).setUint32(1, codeToNum(code), false);
  return out;
}
function encodeHello(limits, version = WIRE_VERSION) {
  const out = new Uint8Array(26);
  const v = new DataView(out.buffer);
  out[0] = CTRL_HELLO;
  out[1] = version;
  v.setBigUint64(2, limits.initialMaxStreamData, false);
  v.setBigUint64(10, limits.initialMaxData, false);
  v.setBigUint64(18, limits.initialMaxStreams, false);
  return out;
}
function encodeMaxData(value) {
  const out = new Uint8Array(9);
  out[0] = CTRL_MAX_DATA;
  new DataView(out.buffer).setBigUint64(1, value, false);
  return out;
}
function encodeMaxStreams(value) {
  const out = new Uint8Array(9);
  out[0] = CTRL_MAX_STREAMS;
  new DataView(out.buffer).setBigUint64(1, value, false);
  return out;
}
function decodeControl(data) {
  if (data.length === 0)
    throw new ProtocolViolation("empty control message");
  const type = data[0];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  switch (type) {
    case CTRL_CONNECTION_CLOSE:
      if (data.length !== 5)
        throw new ProtocolViolation("CONNECTION_CLOSE must be 5 bytes");
      return { t: "close", code: view.getUint32(1, false) };
    case CTRL_HELLO: {
      if (data.length !== 26)
        throw new ProtocolViolation("HELLO must be 26 bytes");
      const limits = {
        initialMaxStreamData: view.getBigUint64(2, false),
        initialMaxData: view.getBigUint64(10, false),
        initialMaxStreams: view.getBigUint64(18, false)
      };
      for (const v of Object.values(limits)) {
        if (v > MAX_OFFSET)
          throw new ProtocolViolation("HELLO credit above MAX_OFFSET");
      }
      return { t: "hello", version: data[1], limits };
    }
    case CTRL_MAX_DATA: {
      if (data.length !== 9)
        throw new ProtocolViolation("MAX_DATA must be 9 bytes");
      const value = view.getBigUint64(1, false);
      if (value > MAX_OFFSET)
        throw new ProtocolViolation("MAX_DATA above MAX_OFFSET");
      return { t: "max-data", value };
    }
    case CTRL_MAX_STREAMS: {
      if (data.length !== 9)
        throw new ProtocolViolation("MAX_STREAMS must be 9 bytes");
      const value = view.getBigUint64(1, false);
      if (value > MAX_OFFSET)
        throw new ProtocolViolation("MAX_STREAMS above MAX_OFFSET");
      return { t: "max-streams", value };
    }
    default:
      throw new ProtocolViolation(`unknown control message type 0x${type.toString(16)}`);
  }
}
var CTRL_CONNECTION_CLOSE, CTRL_HELLO, CTRL_MAX_DATA, CTRL_MAX_STREAMS, WIRE_VERSION;
var init_control = __esm({
  "../node_modules/@kpstreams/core/dist/control.js"() {
    init_framing();
    CTRL_CONNECTION_CLOSE = 0;
    CTRL_HELLO = 1;
    CTRL_MAX_DATA = 2;
    CTRL_MAX_STREAMS = 3;
    WIRE_VERSION = 1;
  }
});

// ../node_modules/@kpstreams/core/dist/flow.js
function resolveLimits(partial) {
  return {
    initialMaxStreamData: partial?.initialMaxStreamData ?? DEFAULT_INITIAL_MAX_STREAM_DATA,
    initialMaxData: partial?.initialMaxData ?? DEFAULT_INITIAL_MAX_DATA,
    initialMaxStreams: partial?.initialMaxStreams ?? DEFAULT_INITIAL_MAX_STREAMS
  };
}
function saturate(v) {
  return v > MAX_OFFSET ? MAX_OFFSET : v;
}
var DEFAULT_INITIAL_MAX_STREAM_DATA, DEFAULT_INITIAL_MAX_DATA, DEFAULT_INITIAL_MAX_STREAMS, Wakeable, ConnFlow, StreamFlow;
var init_flow = __esm({
  "../node_modules/@kpstreams/core/dist/flow.js"() {
    init_framing();
    DEFAULT_INITIAL_MAX_STREAM_DATA = 1n << 20n;
    DEFAULT_INITIAL_MAX_DATA = 8n << 20n;
    DEFAULT_INITIAL_MAX_STREAMS = 100n;
    Wakeable = class {
      #resolvers = [];
      wake() {
        const rs = this.#resolvers;
        this.#resolvers = [];
        for (const r of rs)
          r();
      }
      wait(signal) {
        return new Promise((resolve, reject) => {
          if (signal) {
            const onAbort = () => reject(new Error("kps: aborted"));
            signal.addEventListener("abort", onAbort, { once: true });
            this.#resolvers.push(() => {
              signal.removeEventListener("abort", onAbort);
              resolve();
            });
          } else {
            this.#resolvers.push(resolve);
          }
        });
      }
    };
    ConnFlow = class {
      // ---- our receive policy (what we grant the peer) ----
      local;
      // ---- sender side (peer-granted, all zero until the peer's HELLO) ----
      #peerMaxStreamDataInitial = 0n;
      // seeds each new StreamFlow's send window
      #peerMaxData = 0n;
      #peerMaxStreams = 0n;
      #connSent = 0n;
      #connReserved = 0n;
      #streamsOpened = 0n;
      #streamsReserved = 0n;
      // ---- receiver side ----
      #localMaxData;
      // enforcement limit (advances at commit-to-send)
      #connReceived = 0n;
      #connConsumed = 0n;
      #connAdvertisedAt = 0n;
      // connConsumed value at the last advertisement
      #peerOpenedStreams = 0n;
      #peerRetiredStreams = 0n;
      #advertisedMaxStreams;
      #credit = new Wakeable();
      #failure = null;
      #sink;
      constructor(local, sink) {
        this.local = local;
        this.#localMaxData = local.initialMaxData;
        this.#advertisedMaxStreams = local.initialMaxStreams;
        this.#sink = sink;
      }
      /** The peer's HELLO: seed every send-side limit. */
      onPeerHello(limits) {
        this.#peerMaxStreamDataInitial = limits.initialMaxStreamData;
        this.#peerMaxData = limits.initialMaxData;
        this.#peerMaxStreams = limits.initialMaxStreams;
        this.#credit.wake();
      }
      /** Peer raised the connection data limit (MAX_DATA). Decreases are ignored. */
      onPeerMaxData(value) {
        if (value > this.#peerMaxData) {
          this.#peerMaxData = value;
          this.#credit.wake();
        }
      }
      /** Peer raised the stream-count limit (MAX_STREAMS). Decreases are ignored. */
      onPeerMaxStreams(value) {
        if (value > this.#peerMaxStreams) {
          this.#peerMaxStreams = value;
          this.#credit.wake();
        }
      }
      /** Fail every pending and future credit wait (connection teardown). */
      fail(err) {
        if (this.#failure)
          return;
        this.#failure = err;
        this.#credit.wake();
      }
      /** Wake blocked reservations so they re-check (stream credit or failure). */
      wake() {
        this.#credit.wake();
      }
      get failed() {
        return this.#failure;
      }
      /**
       * The peer's per-stream initial window. A getter (not copied into
       * StreamFlow) so streams staged before the peer's HELLO see the window the
       * moment it arrives.
       */
      get peerInitialMaxStreamData() {
        return this.#peerMaxStreamDataInitial;
      }
      newStream(sendMaxStreamData) {
        return new StreamFlow(this, this.local.initialMaxStreamData, sendMaxStreamData);
      }
      // ---- sender: byte credit (called via StreamFlow) ----
      /**
       * Reserve up to `n` DATA payload bytes at both levels, waiting until at
       * least one byte of credit is available (a writer larger than the whole
       * window must split at the window boundary, like a QUIC sender — an
       * all-or-nothing reservation would deadlock). Returns the granted amount
       * (1..n). Rejects if the stream's write half fails (STOP_SENDING, reset,
       * close), the connection fails, or `signal` aborts.
       */
      async reserveData(sf, n, signal) {
        for (; ; ) {
          if (this.#failure)
            throw this.#failure;
          const sfErr = sf.sendFailed;
          if (sfErr)
            throw sfErr;
          if (signal?.aborted)
            throw new Error("kps: aborted");
          const streamAvail = sf.peerMaxStreamData - sf.sendSent - sf.sendReserved;
          const connAvail = this.#peerMaxData - this.#connSent - this.#connReserved;
          let grant = streamAvail < connAvail ? streamAvail : connAvail;
          if (grant > n)
            grant = n;
          if (grant >= 1n) {
            sf.sendReserved += grant;
            this.#connReserved += grant;
            return grant;
          }
          await this.#credit.wait(signal);
        }
      }
      /** Bytes passed to the transport: reserved → sent, both levels. */
      commitData(sf, n) {
        sf.sendReserved -= n;
        sf.sendSent += n;
        this.#connReserved -= n;
        this.#connSent += n;
      }
      /** A reserved-but-unsent frame was discarded: release its reservation. */
      releaseData(sf, n) {
        sf.sendReserved -= n;
        this.#connReserved -= n;
        this.#credit.wake();
      }
      // ---- sender: stream slots ----
      /** Reserve a slot to open one stream, waiting at the limit. */
      async reserveStreamSlot(signal) {
        for (; ; ) {
          if (this.#failure)
            throw this.#failure;
          if (signal?.aborted)
            throw new Error("kps: aborted");
          if (this.#streamsOpened + this.#streamsReserved < this.#peerMaxStreams) {
            this.#streamsReserved += 1n;
            return;
          }
          await this.#credit.wait(signal);
        }
      }
      /** Channel creation succeeded: the cumulative count never decreases. */
      commitStreamSlot() {
        this.#streamsReserved -= 1n;
        this.#streamsOpened += 1n;
      }
      /** Channel creation failed synchronously: release the slot. */
      releaseStreamSlot() {
        this.#streamsReserved -= 1n;
        this.#credit.wake();
      }
      // ---- receiver: byte credit (called via StreamFlow) ----
      /** @throws ProtocolViolation when the peer exceeds the connection window. */
      connDataReceived(n) {
        if (this.#connReceived + n > this.#localMaxData) {
          throw new ProtocolViolation("peer exceeded MAX_DATA");
        }
        this.#connReceived += n;
      }
      connDataConsumed(n) {
        this.#connConsumed += n;
        const window2 = this.local.initialMaxData;
        if (this.#connConsumed - this.#connAdvertisedAt >= window2 / 2n) {
          this.#connAdvertisedAt = this.#connConsumed;
          this.#localMaxData = saturate(this.#connConsumed + window2);
          this.#sink.sendMaxData(this.#localMaxData);
        }
      }
      // ---- receiver: stream count ----
      /**
       * A peer-initiated stream was observed (it consumes a slot immediately, even
       * unaccepted or pre-HELLO).
       * @throws ProtocolViolation when the peer exceeds MAX_STREAMS.
       */
      peerStreamOpened() {
        if (this.#peerOpenedStreams >= this.#advertisedMaxStreams) {
          throw new ProtocolViolation("peer exceeded MAX_STREAMS");
        }
        this.#peerOpenedStreams += 1n;
      }
      /** A peer-initiated stream retired: grant a replacement slot. */
      peerStreamRetired() {
        this.#peerRetiredStreams += 1n;
        this.#advertisedMaxStreams = saturate(this.local.initialMaxStreams + this.#peerRetiredStreams);
        this.#sink.sendMaxStreams(this.#advertisedMaxStreams);
      }
    };
    StreamFlow = class {
      // sender side
      sendSent = 0n;
      sendReserved = 0n;
      #peerMaxExplicit = 0n;
      // largest MAX_STREAM_DATA received on this stream
      #sendFailure = null;
      // receiver side
      #localMaxStreamData;
      // enforcement limit
      #received = 0n;
      #consumed = 0n;
      #advertisedAt = 0n;
      #cancelled = false;
      // local cancelRead: no further stream credit
      #conn;
      #sendMaxStreamData;
      constructor(conn, localMaxStreamData, sendMaxStreamData) {
        this.#conn = conn;
        this.#localMaxStreamData = localMaxStreamData;
        this.#sendMaxStreamData = sendMaxStreamData;
      }
      /** Effective peer window: explicit updates never lower it below the HELLO initial. */
      get peerMaxStreamData() {
        const initial = this.#conn.peerInitialMaxStreamData;
        return this.#peerMaxExplicit > initial ? this.#peerMaxExplicit : initial;
      }
      // ---- sender ----
      /** Reserve up to `n` bytes; resolves with the granted amount (1..n). */
      async reserve(n, signal) {
        return Number(await this.#conn.reserveData(this, BigInt(n), signal));
      }
      commit(n) {
        this.#conn.commitData(this, BigInt(n));
      }
      release(n) {
        this.#conn.releaseData(this, BigInt(n));
      }
      /** Fail pending and future reservations (STOP_SENDING, reset, close). */
      failSend(err) {
        if (this.#sendFailure)
          return;
        this.#sendFailure = err;
        this.#conn.wake();
      }
      get sendFailed() {
        return this.#sendFailure;
      }
      /** MAX_STREAM_DATA from the peer. Decreases are ignored. */
      onPeerMaxStreamData(value) {
        if (value > this.#peerMaxExplicit) {
          this.#peerMaxExplicit = value;
          this.#conn.wake();
        }
      }
      // ---- receiver ----
      /**
       * `n` inbound DATA payload bytes arrived; enforce both windows atomically
       * (single-threaded: check both, then count both).
       * @throws ProtocolViolation when the peer exceeds either window.
       */
      onDataReceived(n) {
        const bn = BigInt(n);
        if (this.#received + bn > this.#localMaxStreamData) {
          throw new ProtocolViolation("peer exceeded MAX_STREAM_DATA");
        }
        this.#conn.connDataReceived(bn);
        this.#received += bn;
      }
      /**
       * `n` bytes were consumed — read-fulfilled to the application or explicitly
       * discarded. Advertises replacement credit past the half-window threshold
       * (stream credit is withheld after cancelRead; connection credit always
       * flows so a discarded stream cannot starve unrelated streams).
       */
      onConsumed(n) {
        const bn = BigInt(n);
        this.#consumed += bn;
        const window2 = this.#conn.local.initialMaxStreamData;
        if (!this.#cancelled && this.#consumed - this.#advertisedAt >= window2 / 2n) {
          this.#advertisedAt = this.#consumed;
          this.#localMaxStreamData = saturate(this.#consumed + window2);
          this.#sendMaxStreamData(this.#localMaxStreamData);
        }
        this.#conn.connDataConsumed(bn);
      }
      /** Local cancelRead: stop granting stream credit; discards still free MAX_DATA. */
      markCancelled() {
        this.#cancelled = true;
      }
    };
  }
});

// ../node_modules/@kpstreams/core/dist/stream-core.js
var LOCAL_SEND_BUFFER_LOW, Wakeable2, KpsStream;
var init_stream_core = __esm({
  "../node_modules/@kpstreams/core/dist/stream-core.js"() {
    init_framing();
    init_errors();
    LOCAL_SEND_BUFFER_LOW = 1 << 20;
    Wakeable2 = class {
      #resolvers = [];
      wake() {
        const rs = this.#resolvers;
        this.#resolvers = [];
        for (const r of rs)
          r();
      }
      wait() {
        return new Promise((res) => this.#resolvers.push(res));
      }
    };
    KpsStream = class {
      readable;
      writable;
      closed;
      /** Resolves when the channel opens; rejects if it dies first. */
      opened;
      #ch;
      #sf;
      #hooks;
      #inbuf = [];
      #peerFin = false;
      #peerReset = null;
      #peerStop = null;
      #localTerminal = null;
      #readCancelled = false;
      // The reason a locally-terminated read half surfaces to a pending/subsequent
      // read. Per SPEC §9.2, EOF is reserved for the peer's FIN; a local
      // cancelRead/close or a connection teardown must make the read *error*.
      #readError = null;
      #channelClosed = false;
      #retiredFired = false;
      #readWake = new Wakeable2();
      #drainWake = new Wakeable2();
      #closeResolve;
      #closeSettled = false;
      #openResolve;
      #openReject;
      #openSettled = false;
      constructor(ch, connFlow, hooks) {
        this.#ch = ch;
        this.#hooks = hooks;
        this.#sf = connFlow.newStream((v) => {
          if (this.#ch.isOpen())
            this.#ch.send(encodeMaxStreamData(v));
        });
        this.closed = new Promise((res) => {
          this.#closeResolve = res;
        });
        this.opened = new Promise((res, rej) => {
          this.#openResolve = res;
          this.#openReject = rej;
        });
        this.opened.catch(() => {
        });
        ch.setBufferedAmountLowThreshold(LOCAL_SEND_BUFFER_LOW);
        ch.onBufferedAmountLow(() => this.#drainWake.wake());
        ch.onOpen(() => this.#settleOpen(null));
        if (ch.isOpen())
          this.#settleOpen(null);
        ch.onMessage((d) => this.#onFrame(d));
        ch.onClose(() => this.#onChannelClose());
        ch.onError((msg) => {
          this.#settle({ ok: false, reason: { code: "network-error", message: msg } });
          this.#settleOpen(new Error(`kps: stream failed: ${msg}`));
          this.#readWake.wake();
          this.#drainWake.wake();
        });
        this.readable = new ReadableStream({
          pull: async (controller) => {
            for (; ; ) {
              if (this.#readCancelled) {
                controller.error(streamError(this.#readError ?? { code: "cancelled" }));
                return;
              }
              const chunk = this.#inbuf.shift();
              if (chunk) {
                controller.enqueue(chunk);
                this.#sf.onConsumed(chunk.length);
                this.#maybeRetire();
                return;
              }
              if (this.#peerReset) {
                controller.error(streamError(this.#peerReset));
                return;
              }
              if (this.#peerFin) {
                controller.close();
                return;
              }
              if (this.#channelClosed) {
                controller.error(streamError({ code: "network-error", message: "kps: stream closed" }));
                return;
              }
              await this.#readWake.wait();
            }
          },
          cancel: (reason) => {
            void this.cancelRead(reasonFrom(reason) ?? { code: "cancelled" });
          }
        }, { highWaterMark: 0 });
        this.writable = new WritableStream({
          write: (chunk) => this.#writeChunk(chunk),
          close: () => this.closeWrite(),
          abort: (reason) => this.resetWrite(reasonFrom(reason) ?? { code: "reset" })
        });
      }
      // ---- inbound ----
      #onFrame(data) {
        let f;
        try {
          f = parseFrame(data);
        } catch (e) {
          this.#hooks.fatal({ code: "protocol-error", message: e.message });
          return;
        }
        switch (f.type) {
          case "data": {
            if (this.#peerFin || this.#peerReset) {
              this.#hooks.fatal({ code: "protocol-error", message: "DATA after terminal frame" });
              return;
            }
            try {
              this.#sf.onDataReceived(f.payload.length);
            } catch (e) {
              this.#hooks.fatal({ code: "protocol-error", message: e.message });
              return;
            }
            if (this.#readCancelled) {
              this.#sf.onConsumed(f.payload.length);
              return;
            }
            this.#inbuf.push(f.payload.slice());
            this.#readWake.wake();
            return;
          }
          case "fin": {
            if (this.#peerFin || this.#peerReset) {
              this.#hooks.fatal({ code: "protocol-error", message: "second terminal frame" });
              return;
            }
            this.#peerFin = true;
            this.#readWake.wake();
            this.#maybeRetire();
            return;
          }
          case "reset": {
            if (this.#peerFin || this.#peerReset) {
              this.#hooks.fatal({ code: "protocol-error", message: "second terminal frame" });
              return;
            }
            this.#peerReset = { code: numToCode(f.code) ?? "reset" };
            this.#discardInbuf();
            this.#readWake.wake();
            this.#maybeRetire();
            return;
          }
          case "stop-sending": {
            if (this.#peerStop)
              return;
            this.#peerStop = { code: numToCode(f.code) ?? "cancelled" };
            this.#sf.failSend(streamError(this.#peerStop));
            if (!this.#localTerminal) {
              this.#localTerminal = "reset";
              if (this.#ch.isOpen())
                this.#ch.send(encodeCode(FRAME_RESET, f.code));
              this.#maybeRetire();
            }
            return;
          }
          case "max-stream-data":
            this.#sf.onPeerMaxStreamData(f.value);
            return;
        }
      }
      #onChannelClose() {
        this.#channelClosed = true;
        const wireComplete = this.#localTerminal !== null && (this.#peerFin || this.#peerReset !== null);
        if (!wireComplete && !this.#hooks.isTeardown()) {
          this.#hooks.fatal({ code: "protocol-error", message: "data channel closed mid-stream" });
        }
        this.#sf.failSend(streamError({ code: "network-error", message: "kps: stream closed" }));
        this.#settleOpen(new Error("kps: stream closed before opening"));
        this.#settle({ ok: !this.#peerReset, reason: this.#peerReset ?? void 0 });
        this.#readWake.wake();
        this.#drainWake.wake();
        this.#maybeRetire();
      }
      // ---- outbound ----
      async #writeChunk(chunk) {
        let off = 0;
        while (off < chunk.length) {
          this.#checkWritable();
          const want = Math.min(chunk.length - off, MAX_FRAME_PAYLOAD);
          const granted = await this.#sf.reserve(want);
          const slice = chunk.subarray(off, off + granted);
          try {
            await this.#drainLocal();
            this.#checkWritable();
            this.#ch.send(encodeData(slice));
          } catch (e) {
            this.#sf.release(granted);
            throw e;
          }
          this.#sf.commit(granted);
          off += granted;
        }
      }
      #checkWritable() {
        if (this.#peerStop)
          throw streamError(this.#peerStop);
        if (this.#localTerminal)
          throw streamError({ code: "closed", message: "kps: write half closed" });
        if (this.#channelClosed || !this.#ch.isOpen())
          throw new Error("kps: stream is closed");
      }
      // Local send-queue bound only — flow control is the credit reservation above.
      async #drainLocal() {
        while (this.#ch.isOpen() && this.#ch.bufferedAmount() >= LOCAL_SEND_BUFFER_LOW) {
          await this.#drainWake.wait();
        }
      }
      // ---- public stream operations ----
      /** Gracefully finish the local write half; the peer observes EOF after all written bytes. */
      async closeWrite() {
        if (this.#localTerminal)
          return;
        this.#localTerminal = "fin";
        this.#sf.failSend(streamError({ code: "closed", message: "kps: write half closed" }));
        if (this.#ch.isOpen())
          this.#ch.send(encodeFin());
        this.#maybeRetire();
      }
      /** Stop wanting inbound bytes (not EOF); the peer is told to stop sending. */
      async cancelRead(reason) {
        if (this.#readCancelled)
          return;
        this.#readCancelled = true;
        this.#readError = reason ?? { code: "cancelled" };
        this.#sf.markCancelled();
        this.#discardInbuf();
        if (!this.#peerFin && !this.#peerReset && this.#ch.isOpen()) {
          this.#ch.send(encodeCode(FRAME_STOP_SENDING, codeToNum(reason?.code ?? "cancelled")));
        }
        this.#readWake.wake();
        this.#maybeRetire();
      }
      /** Abort the local write half; the peer observes a stream error rather than EOF. */
      async resetWrite(reason) {
        if (this.#localTerminal)
          return;
        this.#localTerminal = "reset";
        this.#sf.failSend(streamError(reason ?? { code: "reset" }));
        if (this.#ch.isOpen())
          this.#ch.send(encodeCode(FRAME_RESET, codeToNum(reason?.code ?? "reset")));
        this.#maybeRetire();
      }
      /**
       * Tear down both halves. The channel itself closes at retirement — once the
       * peer's terminal frame (a conforming peer answers STOP_SENDING with RESET)
       * has arrived — because closing it earlier is a §6.5 protocol violation.
       */
      async close(reason) {
        try {
          await this.closeWrite();
        } catch {
        }
        try {
          await this.cancelRead(reason ?? { code: "closed" });
        } catch {
        }
      }
      /** Connection teardown: discard state, fail waiters, no wire activity. */
      destroy(reason) {
        this.#discardInbuf();
        this.#readCancelled = true;
        this.#readError = reason ?? { code: "closed", message: "kps: connection closed" };
        this.#sf.failSend(streamError(reason ?? { code: "closed", message: "kps: connection closed" }));
        this.#settleOpen(new Error("kps: connection closed"));
        this.#settle(reason ? { ok: false, reason } : { ok: true });
        this.#readWake.wake();
        this.#drainWake.wake();
      }
      // ---- lifecycle ----
      #discardInbuf() {
        if (this.#inbuf.length === 0)
          return;
        let n = 0;
        for (const c of this.#inbuf)
          n += c.length;
        this.#inbuf = [];
        this.#sf.onConsumed(n);
      }
      #maybeRetire() {
        const wireComplete = this.#localTerminal !== null && (this.#peerFin || this.#peerReset !== null);
        if (!wireComplete)
          return;
        const drained = this.#inbuf.length === 0;
        if (!drained)
          return;
        if (!this.#channelClosed) {
          this.#ch.close();
          return;
        }
        if (!this.#retiredFired) {
          this.#retiredFired = true;
          this.#hooks.retired();
        }
      }
      #settle(info) {
        if (this.#closeSettled)
          return;
        this.#closeSettled = true;
        this.#closeResolve(info);
      }
      #settleOpen(err) {
        if (this.#openSettled)
          return;
        this.#openSettled = true;
        if (err)
          this.#openReject(err);
        else
          this.#openResolve();
      }
    };
  }
});

// ../node_modules/@kpstreams/core/dist/conn-core.js
function raceAbort(p, signal, message) {
  if (!signal)
    return p;
  if (signal.aborted)
    return Promise.reject(new Error(message));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new Error(message));
    signal.addEventListener("abort", onAbort, { once: true });
    p.then((v) => {
      signal.removeEventListener("abort", onAbort);
      resolve(v);
    }, (e) => {
      signal.removeEventListener("abort", onAbort);
      reject(e);
    });
  });
}
var WEBRTC_MAX_DATAGRAM, CONTROL_LABEL, CONTROL_ID, DATAGRAM_LABEL, DATAGRAM_ID, DEFAULT_HELLO_TIMEOUT_MS, MAX_DATAGRAM_QUEUE, ConnCore;
var init_conn_core = __esm({
  "../node_modules/@kpstreams/core/dist/conn-core.js"() {
    init_framing();
    init_control();
    init_flow();
    init_stream_core();
    init_errors();
    WEBRTC_MAX_DATAGRAM = 1200;
    CONTROL_LABEL = "_kps_control";
    CONTROL_ID = 0;
    DATAGRAM_LABEL = "_kps_datagrams";
    DATAGRAM_ID = 1;
    DEFAULT_HELLO_TIMEOUT_MS = 15e3;
    MAX_DATAGRAM_QUEUE = 256;
    ConnCore = class {
      closed;
      /** Resolves at mutual HELLO; rejects if the connection dies first. */
      established;
      flow;
      #host;
      #state = "connecting";
      #tearingDown = false;
      #helloSent = false;
      #peerHello = null;
      #establishedDone = false;
      #establishResolve;
      #establishReject;
      #helloTimer;
      #seq = 0;
      #streams = /* @__PURE__ */ new Set();
      #staged = [];
      #incoming = [];
      #acceptWaiters = [];
      #dgQueue = [];
      #dgWaiters = [];
      #closeResolve;
      #closeFired = false;
      constructor(host) {
        this.#host = host;
        this.closed = new Promise((res) => {
          this.#closeResolve = res;
        });
        this.established = new Promise((res, rej) => {
          this.#establishResolve = res;
          this.#establishReject = rej;
        });
        this.established.catch(() => {
        });
        this.flow = new ConnFlow(resolveLimits(host.limits), {
          sendMaxData: (v) => this.#trySendControl(encodeMaxData(v)),
          sendMaxStreams: (v) => this.#trySendControl(encodeMaxStreams(v))
        });
        host.control.onOpen(() => this.#sendHello());
        host.control.onMessage((d) => this.#onControl(d));
        host.control.onClose(() => this.#reservedChannelLost("control"));
        host.control.onError(() => this.#reservedChannelLost("control"));
        if (host.control.isOpen())
          this.#sendHello();
        host.datagram.onMessage((d) => this.#onDatagram(d));
        host.datagram.onClose(() => this.#reservedChannelLost("datagram"));
        this.#helloTimer = setTimeout(() => this.fatal({ code: "timeout", message: "kps: HELLO timeout" }), host.helloTimeoutMs ?? DEFAULT_HELLO_TIMEOUT_MS);
        this.#helloTimer.unref?.();
      }
      get state() {
        return this.#state;
      }
      // ---- control channel ----
      #sendHello() {
        if (this.#helloSent || this.#closeFired)
          return;
        this.#helloSent = true;
        this.#trySendControl(encodeHello(this.flow.local));
        this.#checkEstablished();
      }
      #onControl(data) {
        let m;
        try {
          m = decodeControl(data);
        } catch (e) {
          this.fatal({ code: "protocol-error", message: e.message });
          return;
        }
        switch (m.t) {
          case "hello": {
            if (this.#peerHello) {
              this.fatal({ code: "protocol-error", message: "duplicate HELLO" });
              return;
            }
            if (m.version !== WIRE_VERSION) {
              this.#trySendControl(encodeConnClose("unsupported"));
              this.#teardown({
                ok: false,
                reason: { code: "unsupported", message: `kps: peer wire version ${m.version} (want ${WIRE_VERSION})` }
              });
              return;
            }
            this.#peerHello = m.limits;
            this.flow.onPeerHello(m.limits);
            this.#checkEstablished();
            return;
          }
          case "close": {
            const reason = m.code === 0 ? void 0 : { code: numToCode(m.code) ?? "internal-error" };
            this.#teardown({ ok: m.code === 0, reason });
            return;
          }
          case "max-data":
            if (!this.#peerHello) {
              this.fatal({ code: "protocol-error", message: "control message before HELLO" });
              return;
            }
            this.flow.onPeerMaxData(m.value);
            return;
          case "max-streams":
            if (!this.#peerHello) {
              this.fatal({ code: "protocol-error", message: "control message before HELLO" });
              return;
            }
            this.flow.onPeerMaxStreams(m.value);
            return;
        }
      }
      #checkEstablished() {
        if (this.#establishedDone || this.#closeFired)
          return;
        if (!this.#helloSent || !this.#peerHello)
          return;
        this.#establishedDone = true;
        this.#state = "open";
        clearTimeout(this.#helloTimer);
        this.#establishResolve();
        const staged = this.#staged;
        this.#staged = [];
        for (const s of staged)
          this.#enqueueIncoming(s);
      }
      #trySendControl(msg) {
        try {
          if (this.#host.control.isOpen())
            this.#host.control.send(msg);
        } catch {
        }
      }
      #reservedChannelLost(which) {
        if (this.#tearingDown || this.#closeFired)
          return;
        this.fatal({ code: "protocol-error", message: `kps: reserved ${which} channel lost` });
      }
      // ---- streams ----
      /** The wrapper calls this for every incoming (DCEP) application channel. */
      handleIncomingChannel(ch) {
        try {
          this.flow.peerStreamOpened();
        } catch (e) {
          this.fatal({ code: "protocol-error", message: e.message });
          return;
        }
        const stream = this.#makeStream(ch, true);
        if (this.#establishedDone)
          this.#enqueueIncoming(stream);
        else
          this.#staged.push(stream);
      }
      #makeStream(ch, peerInitiated) {
        const stream = new KpsStream(ch, this.flow, {
          fatal: (r) => this.fatal(r),
          retired: () => {
            this.#streams.delete(stream);
            if (peerInitiated)
              this.flow.peerStreamRetired();
          },
          isTeardown: () => this.#tearingDown
        });
        this.#streams.add(stream);
        return stream;
      }
      #enqueueIncoming(stream) {
        const w = this.#acceptWaiters.shift();
        if (w)
          w.resolve(stream);
        else
          this.#incoming.push(stream);
      }
      async openStream(opts = {}) {
        if (opts.signal?.aborted)
          throw new Error("kps: openStream aborted");
        if (this.#state !== "open")
          throw new Error(`kps: connection is ${this.#state}`);
        await this.flow.reserveStreamSlot(opts.signal);
        let ch;
        try {
          ch = this.#host.openChannel(`kps-${++this.#seq}`);
        } catch (e) {
          this.flow.releaseStreamSlot();
          throw e;
        }
        this.flow.commitStreamSlot();
        const stream = this.#makeStream(ch, false);
        try {
          await raceAbort(stream.opened, opts.signal, "kps: openStream aborted");
        } catch (e) {
          stream.opened.then(() => {
            void stream.resetWrite({ code: "cancelled" });
            void stream.cancelRead({ code: "cancelled" });
          }).catch(() => {
          });
          throw e;
        }
        return stream;
      }
      acceptStream(opts = {}) {
        const ready = this.#incoming.shift();
        if (ready)
          return Promise.resolve(ready);
        if (opts.signal?.aborted)
          return Promise.reject(new Error("kps: acceptStream aborted"));
        if (this.#state === "closed")
          return Promise.reject(new Error("kps: connection is closed"));
        const signal = opts.signal;
        return new Promise((resolve, reject) => {
          const waiter = {
            resolve: (s) => {
              signal?.removeEventListener("abort", onAbort);
              resolve(s);
            },
            reject: (e) => {
              signal?.removeEventListener("abort", onAbort);
              reject(e);
            }
          };
          const onAbort = () => {
            const i = this.#acceptWaiters.indexOf(waiter);
            if (i >= 0)
              this.#acceptWaiters.splice(i, 1);
            reject(new Error("kps: acceptStream aborted"));
          };
          this.#acceptWaiters.push(waiter);
          signal?.addEventListener("abort", onAbort, { once: true });
        });
      }
      // ---- datagrams (SPEC §7) ----
      #onDatagram(data) {
        const w = this.#dgWaiters.shift();
        if (w) {
          w.resolve(data);
          return;
        }
        this.#dgQueue.push(data);
        if (this.#dgQueue.length > MAX_DATAGRAM_QUEUE)
          this.#dgQueue.shift();
      }
      async sendDatagram(data, opts) {
        if (opts?.signal?.aborted)
          throw new Error("kps: sendDatagram aborted");
        if (data.length > WEBRTC_MAX_DATAGRAM) {
          const e = new Error(`kps: datagram exceeds limit (max ${WEBRTC_MAX_DATAGRAM} bytes)`);
          Object.assign(e, { code: "too-large", maxDatagramPayloadSize: WEBRTC_MAX_DATAGRAM });
          throw e;
        }
        if (!this.#host.datagram.isOpen())
          throw new Error("kps: datagram channel not open");
        this.#host.datagram.send(data);
      }
      receiveDatagram(opts) {
        const next = this.#dgQueue.shift();
        if (next)
          return Promise.resolve(next);
        if (this.#state === "closed")
          return Promise.reject(new Error("kps: connection closed"));
        if (opts?.signal?.aborted)
          return Promise.reject(new Error("kps: receiveDatagram aborted"));
        const signal = opts?.signal;
        return new Promise((resolve, reject) => {
          const waiter = {
            resolve: (v) => {
              signal?.removeEventListener("abort", onAbort);
              resolve(v);
            },
            reject: (e) => {
              signal?.removeEventListener("abort", onAbort);
              reject(e);
            }
          };
          const onAbort = () => {
            const i = this.#dgWaiters.indexOf(waiter);
            if (i >= 0)
              this.#dgWaiters.splice(i, 1);
            reject(new Error("kps: receiveDatagram aborted"));
          };
          this.#dgWaiters.push(waiter);
          signal?.addEventListener("abort", onAbort, { once: true });
        });
      }
      // ---- close paths ----
      /** Graceful local close: best-effort CONNECTION_CLOSE, then teardown. */
      close(reason) {
        if (this.#closeFired)
          return;
        this.#tearingDown = true;
        this.#trySendControl(encodeConnClose(reason?.code));
        this.#teardown({ ok: true, reason });
      }
      /** A peer wire violation or local fatal condition: convey a code, tear down. */
      fatal(reason) {
        if (this.#closeFired)
          return;
        this.#tearingDown = true;
        this.#trySendControl(encodeConnClose(reason.code ?? "protocol-error"));
        this.#teardown({ ok: false, reason });
      }
      /** Transport-layer state changes, forwarded by the wrapper. */
      onTransportFailed(message = "peer connection failed") {
        this.#teardown({ ok: false, reason: { code: "network-error", message } });
      }
      onTransportClosed() {
        this.#teardown({ ok: this.#state !== "connecting" });
      }
      #teardown(info) {
        if (this.#closeFired)
          return;
        this.#closeFired = true;
        this.#tearingDown = true;
        this.#state = "closed";
        clearTimeout(this.#helloTimer);
        const err = info.reason ? streamError(info.reason) : new Error("kps: connection closed");
        if (!this.#establishedDone)
          this.#establishReject(err);
        this.flow.fail(err);
        for (const s of [...this.#streams, ...this.#staged])
          s.destroy(info.reason);
        this.#streams.clear();
        this.#staged = [];
        for (const w of this.#acceptWaiters)
          w.reject(new Error("kps: connection closed"));
        this.#acceptWaiters = [];
        for (const w of this.#dgWaiters)
          w.reject(new Error("kps: connection closed"));
        this.#dgWaiters = [];
        try {
          this.#host.closeTransport();
        } catch {
        }
        this.#closeResolve(info);
      }
    };
  }
});

// ../node_modules/@kpstreams/core/dist/sdp.js
function generateUfrag() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function deriveICEPwd(certhashDigest, ufrag) {
  const key = await crypto.subtle.importKey("raw", toArrayBuffer(certhashDigest), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const msg = new TextEncoder().encode("kps-ice-pwd-v1:" + ufrag);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, toArrayBuffer(msg)));
  let bin = "";
  for (const b of sig)
    bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "");
}
function toArrayBuffer(u8) {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
function rewriteOfferUfrag(sdp, ufrag, pwd) {
  const lines = sdp.split(/\r\n|\n/).map((line) => {
    if (line.startsWith("a=ice-ufrag:"))
      return `a=ice-ufrag:${ufrag}`;
    if (line.startsWith("a=ice-pwd:"))
      return `a=ice-pwd:${pwd}`;
    return line;
  });
  return lines.join("\r\n");
}
function synthesizeAnswer(addr, ufrag, pwd) {
  const fingerprint = digestToSdpFingerprint(decodeCerthash(addr.certhash));
  const ip6 = addr.ip.includes(":");
  const fam = ip6 ? "IP6" : "IP4";
  const lines = [
    "v=0",
    `o=- 0 0 IN ${fam} ${ip6 ? "::" : "0.0.0.0"}`,
    "s=-",
    "t=0 0",
    "a=ice-lite",
    `m=application ${addr.port} UDP/DTLS/SCTP webrtc-datachannel`,
    `c=IN ${fam} ${addr.ip}`,
    "a=mid:0",
    `a=ice-ufrag:${ufrag}`,
    `a=ice-pwd:${pwd}`,
    `a=fingerprint:sha-256 ${fingerprint}`,
    "a=setup:passive",
    "a=sctp-port:5000",
    "a=max-message-size:1048576",
    `a=candidate:1 1 UDP 1 ${addr.ip} ${addr.port} typ host`
  ];
  return lines.join("\r\n") + "\r\n";
}
var init_sdp = __esm({
  "../node_modules/@kpstreams/core/dist/sdp.js"() {
    init_certhash();
  }
});

// ../node_modules/@kpstreams/core/dist/webrtc.js
var init_webrtc = __esm({
  "../node_modules/@kpstreams/core/dist/webrtc.js"() {
    init_conn_core();
    init_sdp();
  }
});

// ../browser-harness/node_modules/@kpstreams/webrtc-client/dist/connection.js
function toArrayBuffer2(u8) {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
function dialAbortError(signal) {
  const reason = signal.reason;
  return new Error(reason?.name === "TimeoutError" ? "kps: dial timed out" : "kps: dial aborted");
}
function dial(addr, opts) {
  return Connection.dial(addr, opts);
}
var DEFAULT_TIMEOUT, RTCChannelAdapter, Connection;
var init_connection = __esm({
  "../browser-harness/node_modules/@kpstreams/webrtc-client/dist/connection.js"() {
    init_dist();
    init_webrtc();
    DEFAULT_TIMEOUT = 15e3;
    RTCChannelAdapter = class {
      #dc;
      #message = null;
      #open = null;
      #close = null;
      #error = null;
      #bal = null;
      constructor(dc) {
        this.#dc = dc;
        dc.binaryType = "arraybuffer";
        dc.addEventListener("message", (e) => {
          const raw = e.data;
          const data = typeof raw === "string" ? new TextEncoder().encode(raw) : new Uint8Array(raw);
          this.#message?.(data);
        });
        dc.addEventListener("open", () => this.#open?.());
        dc.addEventListener("close", () => this.#close?.());
        dc.addEventListener("error", (e) => {
          this.#error?.(e.error?.message ?? "data channel error");
        });
        dc.addEventListener("bufferedamountlow", () => this.#bal?.());
      }
      isOpen() {
        return this.#dc.readyState === "open";
      }
      send(data) {
        this.#dc.send(toArrayBuffer2(data));
      }
      bufferedAmount() {
        return this.#dc.bufferedAmount;
      }
      setBufferedAmountLowThreshold(bytes) {
        this.#dc.bufferedAmountLowThreshold = bytes;
      }
      onBufferedAmountLow(cb) {
        this.#bal = cb;
      }
      onMessage(cb) {
        this.#message = cb;
      }
      onOpen(cb) {
        this.#open = cb;
      }
      onClose(cb) {
        this.#close = cb;
      }
      onError(cb) {
        this.#error = cb;
      }
      close() {
        try {
          this.#dc.close();
        } catch {
        }
      }
    };
    Connection = class _Connection {
      // The dialed endpoint (see the core Connection.remoteAddress doc).
      remoteAddress;
      #pc;
      #core;
      // `control` is the reserved reliable channel (ID 0) dial() created before the
      // offer (to force the SCTP m-line).
      constructor(pc, control, remote) {
        this.#pc = pc;
        this.remoteAddress = remote;
        const dg = pc.createDataChannel(DATAGRAM_LABEL, {
          negotiated: true,
          id: DATAGRAM_ID,
          ordered: false,
          maxRetransmits: 0
        });
        this.#core = new ConnCore({
          control: new RTCChannelAdapter(control),
          datagram: new RTCChannelAdapter(dg),
          openChannel: (label) => new RTCChannelAdapter(pc.createDataChannel(label)),
          closeTransport: () => {
            try {
              pc.close();
            } catch {
            }
          }
        });
        pc.addEventListener("connectionstatechange", () => {
          const s = pc.connectionState;
          if (s === "failed")
            this.#core.onTransportFailed();
          else if (s === "closed")
            this.#core.onTransportClosed();
        });
        pc.addEventListener("datachannel", (e) => {
          const channel = e.channel;
          if (channel.label === CONTROL_LABEL || channel.label === DATAGRAM_LABEL)
            return;
          this.#core.handleIncomingChannel(new RTCChannelAdapter(channel));
        });
      }
      get closed() {
        return this.#core.closed;
      }
      static async dial(addrStr, opts = {}) {
        const signal = opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT);
        if (signal.aborted)
          throw dialAbortError(signal);
        const addr = parseAddress(addrStr);
        const digest = decodeCerthash(addr.certhash);
        const pc = new RTCPeerConnection({});
        const control = pc.createDataChannel(CONTROL_LABEL, { negotiated: true, id: CONTROL_ID });
        const offer = await pc.createOffer();
        const ufrag = generateUfrag();
        const pwd = await deriveICEPwd(digest, ufrag);
        await pc.setLocalDescription({ type: offer.type, sdp: rewriteOfferUfrag(offer.sdp ?? "", ufrag, pwd) });
        await pc.setRemoteDescription({ type: "answer", sdp: synthesizeAnswer(addr, ufrag, pwd) });
        const conn = new _Connection(pc, control, { ip: addr.ip, port: addr.port });
        await conn.#waitEstablished(signal);
        return conn;
      }
      #waitEstablished(signal) {
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            try {
              this.#pc.close();
            } catch {
            }
            reject(dialAbortError(signal));
          };
          signal.addEventListener("abort", onAbort, { once: true });
          this.#core.established.then(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          }, (e) => {
            signal.removeEventListener("abort", onAbort);
            reject(e);
          });
        });
      }
      openStream(opts = {}) {
        return this.#core.openStream(opts);
      }
      acceptStream(opts = {}) {
        return this.#core.acceptStream(opts);
      }
      async close(reason) {
        this.#core.close(reason);
      }
      // Datagrams (SPEC §7) — unreliable, unordered, best-effort.
      sendDatagram(data, opts) {
        return this.#core.sendDatagram(data, opts);
      }
      receiveDatagram(opts) {
        return this.#core.receiveDatagram(opts);
      }
    };
  }
});

// ../browser-harness/node_modules/@kpstreams/webrtc-client/dist/open-stream.js
async function openStream(addr, opts) {
  const conn = await dial(addr, opts);
  try {
    const stream = await conn.openStream({ signal: opts?.signal });
    void stream.closed.finally(() => {
      void conn.close();
    });
    return stream;
  } catch (err) {
    await conn.close();
    throw err;
  }
}
var init_open_stream = __esm({
  "../browser-harness/node_modules/@kpstreams/webrtc-client/dist/open-stream.js"() {
    init_connection();
  }
});

// ../browser-harness/node_modules/@kpstreams/webrtc-client/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  dial: () => dial,
  formatAddress: () => formatAddress,
  openStream: () => openStream,
  parseAddress: () => parseAddress
});
var init_dist2 = __esm({
  "../browser-harness/node_modules/@kpstreams/webrtc-client/dist/index.js"() {
    init_connection();
    init_open_stream();
    init_dist();
  }
});

// ../node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;

// ../node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word2) {
  return word2 << 24 & 4278190080 | word2 << 8 & 16711680 | word2 >>> 8 & 65280 | word2 >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
var Hash = class {
};
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}

// ../node_modules/@noble/hashes/esm/sha3.js
var _0n = BigInt(0);
var _1n = BigInt(1);
var _2n = BigInt(2);
var _7n = BigInt(7);
var _256n = BigInt(256);
var _0x71n = BigInt(113);
var SHA3_PI = [];
var SHA3_ROTL = [];
var _SHA3_IOTA = [];
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
  [x, y] = [y, (2 * x + 3 * y) % 5];
  SHA3_PI.push(2 * (5 * y + x));
  SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
  let t = _0n;
  for (let j = 0; j < 7; j++) {
    R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
    if (R & _2n)
      t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
  }
  _SHA3_IOTA.push(t);
}
var IOTAS = split(_SHA3_IOTA, true);
var SHA3_IOTA_H = IOTAS[0];
var SHA3_IOTA_L = IOTAS[1];
var rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
var rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var Keccak = class _Keccak extends Hash {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
    super();
    this.pos = 0;
    this.posOut = 0;
    this.finished = false;
    this.destroyed = false;
    this.enableXOF = false;
    this.blockLen = blockLen;
    this.suffix = suffix;
    this.outputLen = outputLen;
    this.enableXOF = enableXOF;
    this.rounds = rounds;
    anumber(outputLen);
    if (!(0 < blockLen && blockLen < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200);
    this.state32 = u32(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    swap32IfBE(this.state32);
    keccakP(this.state32, this.rounds);
    swap32IfBE(this.state32);
    this.posOut = 0;
    this.pos = 0;
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { blockLen, state } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      for (let i = 0; i < take; i++)
        state[this.pos++] ^= data[pos++];
      if (this.pos === blockLen)
        this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = true;
    const { state, suffix, pos, blockLen } = this;
    state[pos] ^= suffix;
    if ((suffix & 128) !== 0 && pos === blockLen - 1)
      this.keccak();
    state[blockLen - 1] ^= 128;
    this.keccak();
  }
  writeInto(out) {
    aexists(this, false);
    abytes(out);
    this.finish();
    const bufferOut = this.state;
    const { blockLen } = this;
    for (let pos = 0, len = out.length; pos < len; ) {
      if (this.posOut >= blockLen)
        this.keccak();
      const take = Math.min(blockLen - this.posOut, len - pos);
      out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
      this.posOut += take;
      pos += take;
    }
    return out;
  }
  xofInto(out) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(out);
  }
  xof(bytes) {
    anumber(bytes);
    return this.xofInto(new Uint8Array(bytes));
  }
  digestInto(out) {
    aoutput(out, this);
    if (this.finished)
      throw new Error("digest() was already called");
    this.writeInto(out);
    this.destroy();
    return out;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true;
    clean(this.state);
  }
  _cloneInto(to) {
    const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
    to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
    to.state32.set(this.state32);
    to.pos = this.pos;
    to.posOut = this.posOut;
    to.finished = this.finished;
    to.rounds = rounds;
    to.suffix = suffix;
    to.outputLen = outputLen;
    to.enableXOF = enableXOF;
    to.destroyed = this.destroyed;
    return to;
  }
};
var gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
var keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();

// ../browser-harness/dist/host.js
init_dist2();
var RpcError = class extends Error {
  code;
  constructor(e) {
    super(e.message);
    this.name = e.name;
    this.code = e.code;
  }
};
function serializeError(err) {
  if (err instanceof Error) {
    const code = err.code;
    return {
      name: err.name,
      message: err.message,
      ...typeof code === "string" ? { code } : {}
    };
  }
  return { name: "Error", message: String(err) };
}
var PortRpc = class {
  #port;
  #nextId = 1;
  #pending = /* @__PURE__ */ new Map();
  #handlers = /* @__PURE__ */ new Map();
  #events = /* @__PURE__ */ new Map();
  // AbortControllers for in-flight inbound requests, keyed by caller-side id.
  #inbound = /* @__PURE__ */ new Map();
  constructor(port) {
    this.#port = port;
    port.onmessage = (ev) => this.#onMessage(ev.data);
    port.start?.();
  }
  /** Register a handler for an inbound method. */
  on(method, handler) {
    this.#handlers.set(method, handler);
  }
  /** Register a handler for an inbound fire-and-forget event. */
  onEvent(topic, handler) {
    this.#events.set(topic, handler);
  }
  /** Fire-and-forget event to the peer. */
  emit(topic, data, transfer) {
    this.#post({ t: "evt", topic, data }, transfer);
  }
  /** Call a remote method and await its result. */
  call(method, args, opts) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      let cleanup;
      if (opts?.signal) {
        const signal = opts.signal;
        if (signal.aborted) {
          reject(abortError());
          return;
        }
        const onAbort = () => {
          if (!this.#pending.delete(id)) return;
          this.#post({ t: "abort", id });
          reject(abortError());
        };
        signal.addEventListener("abort", onAbort);
        cleanup = () => signal.removeEventListener("abort", onAbort);
      }
      this.#pending.set(id, {
        resolve,
        reject,
        cleanup
      });
      this.#post({ t: "req", id, method, args }, opts?.transfer);
    });
  }
  #post(msg, transfer) {
    this.#port.postMessage(msg, transfer ?? []);
  }
  async #onMessage(msg) {
    switch (msg.t) {
      case "evt": {
        this.#events.get(msg.topic)?.(msg.data);
        return;
      }
      case "abort": {
        this.#inbound.get(msg.id)?.abort(abortError());
        return;
      }
      case "res": {
        const p = this.#pending.get(msg.id);
        if (!p) return;
        this.#pending.delete(msg.id);
        p.cleanup?.();
        if (msg.ok) p.resolve(msg.value);
        else p.reject(new RpcError(msg.error));
        return;
      }
      case "req": {
        const handler = this.#handlers.get(msg.method);
        if (!handler) {
          this.#post({
            t: "res",
            id: msg.id,
            ok: false,
            error: { name: "Error", message: `no handler: ${msg.method}` }
          });
          return;
        }
        const ac = new AbortController();
        this.#inbound.set(msg.id, ac);
        try {
          const result = await handler(msg.args, { signal: ac.signal });
          this.#post(
            { t: "res", id: msg.id, ok: true, value: result.value },
            result.transfer
          );
        } catch (err) {
          this.#post({
            t: "res",
            id: msg.id,
            ok: false,
            error: serializeError(err)
          });
        } finally {
          this.#inbound.delete(msg.id);
        }
        return;
      }
    }
  }
};
function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}
var enc = new TextEncoder();
var CRLF = "\r\n";
function parseKpsResolver(entry) {
  if (!entry.startsWith("kps:")) return void 0;
  const rest = entry.slice("kps:".length);
  const slash = rest.indexOf("/");
  if (slash <= 0) throw new Error("malformed kps resolver: missing /path");
  const addr = rest.slice(0, slash);
  const path = rest.slice(slash);
  if (addr.split(":").length < 3) throw new Error("malformed kps resolver: bad address");
  return { addr, path };
}
function buildKpsHttpRequest(path, certhash, acceptEncodings = []) {
  const accept = acceptEncodings.length ? `Accept-Encoding: ${acceptEncodings.join(", ")}${CRLF}` : "";
  return enc.encode(`GET ${path} HTTP/1.1${CRLF}Host: ${certhash}${CRLF}${accept}${CRLF}`);
}
var CODING_FORMATS = [
  ["zstd", ["zstd"]],
  ["br", ["br", "brotli"]],
  ["gzip", ["gzip"]],
  ["deflate", ["deflate"]]
  // HTTP "deflate" is the zlib format, as is the API's
];
function decompressionCtor() {
  return globalThis.DecompressionStream;
}
function decompressionFormatFor(coding) {
  const DS = decompressionCtor();
  if (!DS) return void 0;
  for (const format of CODING_FORMATS.find(([c]) => c === coding)?.[1] ?? []) {
    try {
      new DS(format);
      return format;
    } catch {
    }
  }
  return void 0;
}
function ambientCodings() {
  return CODING_FORMATS.map(([c]) => c).filter((c) => decompressionFormatFor(c) !== void 0);
}
async function decodeBody(coding, body, maxBytes) {
  const DS = decompressionCtor();
  const format = decompressionFormatFor(coding);
  if (!DS || format === void 0) throw new Error(`undecodable Content-Encoding: ${coding}`);
  const decoded = new Blob([body]).stream().pipeThrough(new DS(format));
  const reader = decoded.getReader();
  const chunks = [];
  let total = 0;
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {
      });
      throw new Error(`decoded body exceeds the ${maxBytes}-byte bundle cap`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
function parseKpsHttpResponse(bytes) {
  const sep = findHeaderEnd(bytes);
  if (sep < 0) throw new Error("no header terminator in response");
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, sep));
  const lines = head.split(CRLF);
  const m = /^HTTP\/1\.1 (\d{3})(?: |$)/.exec(lines[0]);
  if (!m) throw new Error(`malformed status line: ${JSON.stringify(lines[0].slice(0, 80))}`);
  const status = Number(m[1]);
  const headers = [];
  for (const line of lines.slice(1)) {
    if (line === "") continue;
    const colon = line.indexOf(":");
    if (colon <= 0) throw new Error(`malformed header line: ${JSON.stringify(line.slice(0, 80))}`);
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (name === "transfer-encoding") throw new Error("forbidden Transfer-Encoding in response");
    headers.push([name, value]);
  }
  return { status, headers, body: bytes.subarray(sep + 4) };
}
function findHeaderEnd(b) {
  for (let i = 0; i + 3 < b.length; i++) {
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) return i;
  }
  return -1;
}
async function fetchBundleOverKps(addr, path, maxBytes) {
  const { openStream: openStream2 } = await Promise.resolve().then(() => (init_dist2(), dist_exports));
  const stream = await openStream2(addr);
  try {
    const certhash = addr.slice(addr.lastIndexOf(":") + 1);
    const advertised = ambientCodings();
    const writer = stream.writable.getWriter();
    await writer.write(buildKpsHttpRequest(path, certhash, advertised));
    await writer.close();
    const reader = stream.readable.getReader();
    const chunks = [];
    let total = 0;
    const headroom = 64 * 1024;
    for (; ; ) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes + headroom) {
        await reader.cancel().catch(() => {
        });
        throw new Error(`response exceeds the ${maxBytes}-byte bundle cap`);
      }
      chunks.push(value);
    }
    const all = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      all.set(c, off);
      off += c.byteLength;
    }
    const resp = parseKpsHttpResponse(all);
    if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`);
    const coding = resp.headers.find(([n]) => n === "content-encoding")?.[1].toLowerCase();
    if (coding && coding !== "identity") {
      if (!advertised.includes(coding)) {
        throw new Error(`unadvertised Content-Encoding: ${coding}`);
      }
      return decodeBody(coding, resp.body, maxBytes);
    }
    if (resp.body.byteLength > maxBytes) {
      throw new Error(`body exceeds the ${maxBytes}-byte bundle cap`);
    }
    return resp.body;
  } finally {
    await stream.close().catch(() => {
    });
  }
}
var SEL_WORKER_HASH = selector("workerHash()");
var SEL_WORKER_RESOLVERS = selector("workerResolvers()");
function selector(sig) {
  return "0x" + toHex(keccak_256(new TextEncoder().encode(sig))).slice(0, 8);
}
function toHex(bytes) {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}
function hexToBytes(hex) {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
async function readSpecifier(provider, address) {
  const hashRet = await ethCall(provider, address, SEL_WORKER_HASH);
  const resolversRet = await ethCall(provider, address, SEL_WORKER_RESOLVERS);
  return {
    workerHash: "0x" + decodeBytes32(hashRet),
    resolvers: decodeStringArray(resolversRet)
  };
}
async function ethCall(provider, to, data) {
  const res = await provider.request({
    method: "eth_call",
    params: [{ to, data }, "latest"]
  });
  if (typeof res !== "string") throw new Error("eth_call did not return data");
  return hexToBytes(res);
}
var MAX_BUNDLE_BYTES = 64 * 1024 * 1024;
async function readBodyCapped(resp, cap) {
  const overflow = () => new Error(`body exceeds the ${cap}-byte bundle cap`);
  if (!resp.body) {
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength > cap) throw overflow();
    return buf;
  }
  const reader = resp.body.getReader();
  const chunks = [];
  let total = 0;
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel().catch(() => {
      });
      throw overflow();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
async function fetchAndVerifyBundle(spec, maxBytes = MAX_BUNDLE_BYTES) {
  const errors = [];
  for (const url of spec.resolvers) {
    let bytes;
    try {
      if (/^(https?|blob):/.test(url)) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        bytes = await readBodyCapped(resp, maxBytes);
      } else if (url.startsWith("kps:")) {
        const { addr, path } = parseKpsResolver(url);
        bytes = await fetchBundleOverKps(addr, path, maxBytes);
      } else {
        errors.push(`${url}: unrecognized resolver kind (ignored)`);
        continue;
      }
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
      continue;
    }
    const got = "0x" + toHex(keccak_256(bytes));
    if (got !== spec.workerHash) {
      errors.push(`${url}: hash mismatch (got ${got}, want ${spec.workerHash})`);
      continue;
    }
    return bytes;
  }
  throw new Error(`no resolver yielded bytes matching workerHash: ${errors.join("; ")}`);
}
function decodeBytes32(ret) {
  if (ret.length < 32) throw new Error("short bytes32 return");
  return toHex(ret.slice(0, 32));
}
function word(ret, at) {
  if (at < 0 || at + 32 > ret.length) throw new Error("ABI decode: word out of bounds");
  let n = 0;
  for (let i = at; i < at + 32; i++) {
    n = n * 256 + ret[i];
    if (n > Number.MAX_SAFE_INTEGER) throw new Error("ABI decode: word too large");
  }
  return n;
}
function decodeStringArray(ret) {
  const base = word(ret, 0);
  const len = word(ret, base);
  if (base + 32 + len * 32 > ret.length) throw new Error("ABI decode: array length out of bounds");
  const out = [];
  const dec = new TextDecoder();
  for (let i = 0; i < len; i++) {
    const elemOff = base + 32 + word(ret, base + 32 + i * 32);
    const strLen = word(ret, elemOff);
    if (elemOff + 32 + strLen > ret.length) throw new Error("ABI decode: string out of bounds");
    out.push(dec.decode(ret.slice(elemOff + 32, elemOff + 32 + strLen)));
  }
  return out;
}
function registerKpsBridge(rpc) {
  const conns = /* @__PURE__ */ new Map();
  const streams = /* @__PURE__ */ new Map();
  let nextId = 1;
  const addStream = (s) => {
    const streamId = nextId++;
    streams.set(streamId, s);
    void s.closed.then((info) => {
      streams.delete(streamId);
      rpc.emit("stream.closed", { streamId, info });
    });
    return {
      value: { streamId, readable: s.readable, writable: s.writable },
      transfer: [s.readable, s.writable]
    };
  };
  const conn = (id) => {
    const c = conns.get(id);
    if (!c) throw new Error(`unknown connId ${id}`);
    return c;
  };
  const stream = (id) => {
    const s = streams.get(id);
    if (!s) throw new Error(`unknown streamId ${id}`);
    return s;
  };
  rpc.on("kps.dial", async ({ addr }, { signal }) => {
    const c = await dial(addr, { signal });
    const connId = nextId++;
    conns.set(connId, c);
    void c.closed.then((info) => {
      conns.delete(connId);
      rpc.emit("conn.closed", { connId, info });
    });
    return { value: { connId, remoteAddress: c.remoteAddress } };
  });
  rpc.on("kps.openStream", async ({ addr }, { signal }) => {
    const s = await openStream(addr, { signal });
    return addStream(s);
  });
  rpc.on("conn.openStream", async ({ connId }, { signal }) => {
    return addStream(await conn(connId).openStream({ signal }));
  });
  rpc.on("conn.acceptStream", async ({ connId }, { signal }) => {
    return addStream(await conn(connId).acceptStream({ signal }));
  });
  rpc.on("conn.close", async ({ connId, reason }) => {
    await conn(connId).close(reason);
    conns.delete(connId);
    return { value: void 0 };
  });
  rpc.on("conn.sendDatagram", async ({ connId, data }, { signal }) => {
    await conn(connId).sendDatagram(data, { signal });
    return { value: void 0 };
  });
  rpc.on("conn.receiveDatagram", async ({ connId }, { signal }) => {
    return { value: await conn(connId).receiveDatagram({ signal }) };
  });
  rpc.on("stream.closeWrite", async ({ streamId }) => {
    await stream(streamId).closeWrite();
    return { value: void 0 };
  });
  rpc.on("stream.cancelRead", async ({ streamId, reason }) => {
    await stream(streamId).cancelRead(reason);
    return { value: void 0 };
  });
  rpc.on("stream.resetWrite", async ({ streamId, reason }) => {
    await stream(streamId).resetWrite(reason);
    return { value: void 0 };
  });
  rpc.on("stream.close", async ({ streamId, reason }) => {
    await stream(streamId).close(reason);
    streams.delete(streamId);
    return { value: void 0 };
  });
  return () => {
    for (const s of streams.values()) void s.close({ code: "closed" }).catch(() => {
    });
    for (const c of conns.values()) void c.close({ code: "closed" });
    streams.clear();
    conns.clear();
  };
}
var CallQueue = class {
  #items = [];
  #waiters = [];
  /** Resolve with the next item; an abort withdraws this taker (§8: it must not consume an item). */
  take(signal) {
    const next = this.#items.shift();
    if (next !== void 0) return Promise.resolve(next);
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve: (item) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(item);
        },
        reject: (e) => {
          signal?.removeEventListener("abort", onAbort);
          reject(e);
        }
      };
      const onAbort = () => {
        const i = this.#waiters.indexOf(waiter);
        if (i >= 0) this.#waiters.splice(i, 1);
        reject(signal?.reason ?? new DOMException("aborted", "AbortError"));
      };
      if (signal?.aborted) return onAbort();
      signal?.addEventListener("abort", onAbort, { once: true });
      this.#waiters.push(waiter);
    });
  }
  /** Deliver to the oldest pending take(), else queue in arrival order. */
  push(item) {
    const waiter = this.#waiters.shift();
    if (waiter) waiter.resolve(item);
    else this.#items.push(item);
  }
  /** Return an item to the FRONT of the queue (it was taken but not delivered). */
  pushFront(item) {
    const waiter = this.#waiters.shift();
    if (waiter) waiter.resolve(item);
    else this.#items.unshift(item);
  }
  /** Withdraw a not-yet-delivered item. Returns false if it was already taken (or never queued). */
  remove(item) {
    const i = this.#items.indexOf(item);
    if (i < 0) return false;
    this.#items.splice(i, 1);
    return true;
  }
  /** Drop all queued items and reject every pending take(). */
  rejectAll(err) {
    this.#items.length = 0;
    for (const w of this.#waiters.splice(0)) w.reject(err);
  }
};
var LogQueue = class {
  #items = [];
  #waiters = [];
  #closed;
  #max;
  constructor(max) {
    this.#max = max;
  }
  /** How many entries have been dropped for want of room. */
  dropped = 0;
  /**
   * Resolve with the next entry, waiting if there is none.
   *
   * §13.1: an abort withdraws the caller without consuming an entry, and a
   * closed queue still yields whatever it retained before rejecting — the
   * entries explaining a failure are the ones most worth reading.
   */
  take(signal) {
    const next = this.#items.shift();
    if (next !== void 0) return Promise.resolve(next);
    if (this.#closed) return Promise.reject(this.#closed.err);
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve: (item) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(item);
        },
        reject: (e) => {
          signal?.removeEventListener("abort", onAbort);
          reject(e);
        }
      };
      const onAbort = () => {
        const i = this.#waiters.indexOf(waiter);
        if (i >= 0) this.#waiters.splice(i, 1);
        reject(signal?.reason ?? new DOMException("aborted", "AbortError"));
      };
      if (signal?.aborted) return onAbort();
      signal?.addEventListener("abort", onAbort, { once: true });
      this.#waiters.push(waiter);
    });
  }
  /** Deliver to the oldest waiter, else retain — dropping the oldest if full. */
  push(item) {
    if (this.#closed) return;
    const waiter = this.#waiters.shift();
    if (waiter) return waiter.resolve(item);
    this.#items.push(item);
    while (this.#items.length > this.#max) {
      this.#items.shift();
      this.dropped++;
    }
  }
  /**
   * Stop accepting entries; retained ones stay readable, and `take()` rejects
   * once they run out.
   *
   * Pending waiters reject immediately: there is nothing left to wait for, and
   * a host looping on `acceptLog()` would otherwise hang on a dead worker.
   */
  close(err) {
    if (this.#closed) return;
    this.#closed = { err };
    for (const w of this.#waiters.splice(0)) w.reject(err);
  }
  /** Retained, undelivered entries. */
  get size() {
    return this.#items.length;
  }
};
async function normalizeRequest(input, init) {
  if (input instanceof Request) {
    const needsDuplex = init?.body instanceof ReadableStream;
    const req2 = init ? new Request(input, { ...needsDuplex ? { duplex: "half" } : {}, ...init }) : input;
    const headers2 = [];
    req2.headers.forEach((v, k) => headers2.push([k, v]));
    const requestInit2 = {
      method: req2.method,
      headers: headers2,
      redirect: req2.redirect,
      hasSignal: true
      // a Request always has a signal
    };
    const transfer2 = [];
    if (req2.body) {
      requestInit2.body = req2.body;
      transfer2.push(req2.body);
    }
    return { url: req2.url, requestInit: requestInit2, transfer: transfer2, signal: req2.signal };
  }
  const url = typeof input === "string" ? input : input.href;
  if (!init) return { url };
  const src = init;
  const transfer = [];
  let body;
  let autoContentType;
  if (src.body != null) {
    if (src.body instanceof ReadableStream) {
      body = src.body;
      transfer.push(src.body);
    } else if (typeof src.body === "string") {
      body = new TextEncoder().encode(src.body);
      transfer.push(body.buffer);
    } else if (src.body instanceof Uint8Array || src.body instanceof ArrayBuffer) {
      body = src.body instanceof Uint8Array ? src.body : new Uint8Array(src.body);
    } else {
      const tmp = new Response(src.body);
      body = new Uint8Array(await tmp.arrayBuffer());
      autoContentType = tmp.headers.get("content-type") ?? void 0;
      transfer.push(body.buffer);
    }
  }
  const requestInit = {};
  if (src.method) requestInit.method = src.method;
  const headers = headersToList(src.headers) ?? [];
  if (autoContentType && !headers.some(([k]) => k.toLowerCase() === "content-type")) {
    headers.push(["content-type", autoContentType]);
  }
  if (headers.length) requestInit.headers = headers;
  if (body !== void 0) requestInit.body = body;
  if (src.redirect) requestInit.redirect = src.redirect;
  if (src.signal) requestInit.hasSignal = true;
  return { url, requestInit, transfer, signal: src.signal ?? void 0 };
}
function headersToList(h) {
  if (!h) return void 0;
  const out = [];
  if (h instanceof Headers) h.forEach((v, k) => out.push([k, v]));
  else if (Array.isArray(h)) for (const [k, v] of h) out.push([k, v]);
  else for (const [k, v] of Object.entries(h)) out.push([k, String(v)]);
  return out;
}
var DB_NAME = "anon-rpc-harness";
var STORE_NAME = "kv";
function openStorageBackend() {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(new MemoryBackend());
  }
  return IdbBackend.open();
}
function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
var IdbBackend = class _IdbBackend {
  #db;
  constructor(db) {
    this.#db = db;
  }
  static async open() {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE_NAME);
    };
    return new _IdbBackend(await req(open));
  }
  #store(mode) {
    return this.#db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }
  async get(address, key) {
    return await req(this.#store("readonly").get([address, key]));
  }
  async set(address, key, value) {
    await req(this.#store("readwrite").put(value, [address, key]));
  }
  async delete(address, key) {
    await req(this.#store("readwrite").delete([address, key]));
  }
  async has(address, key) {
    return await req(this.#store("readonly").getKey([address, key])) !== void 0;
  }
  async listKeys(address, prefix = "") {
    const keys = [];
    await this.#iterate("readonly", address, prefix, (cursor) => {
      keys.push(cursor.key[1]);
    });
    return keys;
  }
  async clear(address, prefix = "") {
    await this.#iterate("readwrite", address, prefix, (cursor) => {
      cursor.delete();
    });
  }
  // Walk the [address, prefix…] key range. The walk starts at the range's
  // lower bound and stops manually at the first key past the namespace or
  // prefix — exact for any key string, unlike the `prefix + "￿"` upper-
  // bound trick.
  #iterate(mode, address, prefix, visit) {
    return new Promise((resolve, reject) => {
      const store = this.#store(mode);
      const range = IDBKeyRange.lowerBound([address, prefix]);
      const r = mode === "readwrite" ? store.openCursor(range) : store.openKeyCursor(range);
      r.onsuccess = () => {
        const cursor = r.result;
        if (!cursor) return resolve();
        const [addr, key] = cursor.key;
        if (addr !== address || !key.startsWith(prefix)) return resolve();
        visit(cursor);
        cursor.continue();
      };
      r.onerror = () => reject(r.error);
    });
  }
};
var MemoryBackend = class {
  #spaces = /* @__PURE__ */ new Map();
  #space(address) {
    let m = this.#spaces.get(address);
    if (!m) this.#spaces.set(address, m = /* @__PURE__ */ new Map());
    return m;
  }
  async get(address, key) {
    return this.#space(address).get(key);
  }
  async set(address, key, value) {
    this.#space(address).set(key, value);
  }
  async delete(address, key) {
    this.#space(address).delete(key);
  }
  async has(address, key) {
    return this.#space(address).has(key);
  }
  async listKeys(address, prefix = "") {
    return [...this.#space(address).keys()].filter((k) => k.startsWith(prefix));
  }
  async clear(address, prefix = "") {
    const space = this.#space(address);
    if (!prefix) return space.clear();
    for (const k of [...space.keys()]) if (k.startsWith(prefix)) space.delete(k);
  }
};
var LOG_RETENTION = 1e3;
var AnonRpcWorker = class {
  ready;
  fetch;
  #init;
  #rpc;
  #iframe;
  #disposeKps;
  #onWindowMessage;
  // Calls awaiting acceptCall (§8: ordered, no drop, backpressured).
  #queue = new CallQueue();
  // Log entries awaiting acceptLog (§13.1: ordered, bounded, lossy).
  #logs = new LogQueue(LOG_RETENTION);
  // Set once the host has shown it is collecting logs, which is what stops
  // them also going to the console. Not a setting: a host that reads its
  // worker's logs does not want them duplicated into a console it is not
  // looking at, and one that never reads still gets the old behaviour.
  #logsClaimed = false;
  #calls = /* @__PURE__ */ new Map();
  #nextCallId = 1;
  #readyResolve;
  #readyReject;
  // Set on fatal failure (boot failure, worker crash, close): everything
  // pending is rejected with it and future fetches fail fast.
  #failure;
  // §11 storage backend (IndexedDB; memory fallback), opened on first use.
  #storage;
  constructor(init) {
    this.#init = init;
    this.ready = new Promise((res, rej) => {
      this.#readyResolve = res;
      this.#readyReject = rej;
    });
    this.ready.catch(() => {
    });
    this.fetch = this.#fetch.bind(this);
    this.#boot().catch((e) => this.#fail(e));
  }
  // A dead worker fails everything, not just `ready`: in-flight and queued
  // fetches would otherwise hang with no error surfaced.
  #fail(err) {
    if (this.#failure !== void 0) return;
    this.#failure = err;
    this.#readyReject(err);
    for (const rec of this.#calls.values()) {
      rec.cleanup?.();
      rec.reject(err);
    }
    this.#calls.clear();
    this.#queue.rejectAll(err);
    this.#logs.close(err);
  }
  async #boot() {
    const provider = this.#init.preExisting?.rpcProvider;
    if (!provider) throw new Error("preExisting.rpcProvider is required to read the specifier");
    const spec = await readSpecifier(provider, this.#init.address);
    const bundleBytes = await fetchAndVerifyBundle(spec);
    const channel = new MessageChannel();
    const rpc = new PortRpc(channel.port1);
    this.#rpc = rpc;
    this.#registerHandlers(rpc);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    if (this.#init.iframeUrl) iframe.src = sameOriginIframeUrl(this.#init.iframeUrl);
    else iframe.srcdoc = `<!doctype html><meta charset="utf-8"><script>${'"use strict";\n(() => {\n  // src/iframe/iframe-boot.ts\n  (() => {\n    parent.postMessage({ kind: "iframe-ready" }, "*");\n    const onInit = (ev) => {\n      if (ev.source !== parent || ev.data?.kind !== "init") return;\n      removeEventListener("message", onInit);\n      const port = ev.ports[0];\n      const runtimeSource = ev.data.runtimeSource;\n      const bundleBytes = ev.data.bundleBytes;\n      const blob = new Blob([runtimeSource], { type: "text/javascript" });\n      const worker = new Worker(URL.createObjectURL(blob));\n      worker.postMessage({ kind: "init", port, bundleBytes, config: ev.data.config }, [port]);\n      worker.addEventListener("error", (e) => {\n        parent.postMessage({ kind: "worker-error", message: e.message }, "*");\n      });\n    };\n    addEventListener("message", onInit);\n  })();\n})();\n'}<\/script>`;
    this.#iframe = iframe;
    const ready = new Promise((resolve) => {
      const onMessage = (ev) => {
        if (ev.source !== iframe.contentWindow) return;
        if (ev.data?.kind === "iframe-ready") resolve();
        if (ev.data?.kind === "worker-error") {
          this.#fail(new Error(`worker error: ${ev.data.message}`));
        }
      };
      this.#onWindowMessage = onMessage;
      window.addEventListener("message", onMessage);
    });
    document.body.appendChild(iframe);
    await ready;
    iframe.contentWindow.postMessage(
      { kind: "init", runtimeSource: '"use strict";\n(() => {\n  // src/protocol.ts\n  var RpcError = class extends Error {\n    code;\n    constructor(e) {\n      super(e.message);\n      this.name = e.name;\n      this.code = e.code;\n    }\n  };\n  function serializeError(err) {\n    if (err instanceof Error) {\n      const code = err.code;\n      return {\n        name: err.name,\n        message: err.message,\n        ...typeof code === "string" ? { code } : {}\n      };\n    }\n    return { name: "Error", message: String(err) };\n  }\n  var PortRpc = class {\n    #port;\n    #nextId = 1;\n    #pending = /* @__PURE__ */ new Map();\n    #handlers = /* @__PURE__ */ new Map();\n    #events = /* @__PURE__ */ new Map();\n    // AbortControllers for in-flight inbound requests, keyed by caller-side id.\n    #inbound = /* @__PURE__ */ new Map();\n    constructor(port) {\n      this.#port = port;\n      port.onmessage = (ev) => this.#onMessage(ev.data);\n      port.start?.();\n    }\n    /** Register a handler for an inbound method. */\n    on(method, handler) {\n      this.#handlers.set(method, handler);\n    }\n    /** Register a handler for an inbound fire-and-forget event. */\n    onEvent(topic, handler) {\n      this.#events.set(topic, handler);\n    }\n    /** Fire-and-forget event to the peer. */\n    emit(topic, data, transfer) {\n      this.#post({ t: "evt", topic, data }, transfer);\n    }\n    /** Call a remote method and await its result. */\n    call(method, args, opts) {\n      const id = this.#nextId++;\n      return new Promise((resolve, reject) => {\n        let cleanup;\n        if (opts?.signal) {\n          const signal = opts.signal;\n          if (signal.aborted) {\n            reject(abortError());\n            return;\n          }\n          const onAbort = () => {\n            if (!this.#pending.delete(id)) return;\n            this.#post({ t: "abort", id });\n            reject(abortError());\n          };\n          signal.addEventListener("abort", onAbort);\n          cleanup = () => signal.removeEventListener("abort", onAbort);\n        }\n        this.#pending.set(id, {\n          resolve,\n          reject,\n          cleanup\n        });\n        this.#post({ t: "req", id, method, args }, opts?.transfer);\n      });\n    }\n    #post(msg, transfer) {\n      this.#port.postMessage(msg, transfer ?? []);\n    }\n    async #onMessage(msg) {\n      switch (msg.t) {\n        case "evt": {\n          this.#events.get(msg.topic)?.(msg.data);\n          return;\n        }\n        case "abort": {\n          this.#inbound.get(msg.id)?.abort(abortError());\n          return;\n        }\n        case "res": {\n          const p = this.#pending.get(msg.id);\n          if (!p) return;\n          this.#pending.delete(msg.id);\n          p.cleanup?.();\n          if (msg.ok) p.resolve(msg.value);\n          else p.reject(new RpcError(msg.error));\n          return;\n        }\n        case "req": {\n          const handler = this.#handlers.get(msg.method);\n          if (!handler) {\n            this.#post({\n              t: "res",\n              id: msg.id,\n              ok: false,\n              error: { name: "Error", message: `no handler: ${msg.method}` }\n            });\n            return;\n          }\n          const ac = new AbortController();\n          this.#inbound.set(msg.id, ac);\n          try {\n            const result = await handler(msg.args, { signal: ac.signal });\n            this.#post(\n              { t: "res", id: msg.id, ok: true, value: result.value },\n              result.transfer\n            );\n          } catch (err) {\n            this.#post({\n              t: "res",\n              id: msg.id,\n              ok: false,\n              error: serializeError(err)\n            });\n          } finally {\n            this.#inbound.delete(msg.id);\n          }\n          return;\n        }\n      }\n    }\n  };\n  function abortError() {\n    return new DOMException("The operation was aborted.", "AbortError");\n  }\n\n  // src/worker/anon-rpc-worker-api.ts\n  function makeWorkerApi(rpc, config) {\n    const callAborts = /* @__PURE__ */ new Map();\n    const preAborted = /* @__PURE__ */ new Set();\n    rpc.onEvent("call-abort", ({ callId }) => {\n      const ac = callAborts.get(callId);\n      if (ac) ac.abort(new DOMException("aborted", "AbortError"));\n      else preAborted.add(callId);\n    });\n    const streamClosed = /* @__PURE__ */ new Map();\n    const connClosed = /* @__PURE__ */ new Map();\n    rpc.onEvent("stream.closed", ({ streamId, info }) => {\n      streamClosed.get(streamId)?.(info);\n      streamClosed.delete(streamId);\n    });\n    rpc.onEvent("conn.closed", ({ connId, info }) => {\n      connClosed.get(connId)?.(info);\n      connClosed.delete(connId);\n    });\n    function makeStream(p) {\n      const closed = new Promise((resolve) => streamClosed.set(p.streamId, resolve));\n      return {\n        readable: p.readable,\n        writable: p.writable,\n        closeWrite: () => rpc.call("stream.closeWrite", { streamId: p.streamId }),\n        cancelRead: (reason) => rpc.call("stream.cancelRead", { streamId: p.streamId, reason }),\n        resetWrite: (reason) => rpc.call("stream.resetWrite", { streamId: p.streamId, reason }),\n        close: (reason) => rpc.call("stream.close", { streamId: p.streamId, reason }),\n        closed\n      };\n    }\n    function makeConn(connId, remoteAddress) {\n      const closed = new Promise((resolve) => connClosed.set(connId, resolve));\n      return {\n        remoteAddress,\n        openStream: async (opts) => makeStream(await rpc.call("conn.openStream", { connId }, sigOpt(opts))),\n        acceptStream: async (opts) => makeStream(await rpc.call("conn.acceptStream", { connId }, sigOpt(opts))),\n        close: (reason) => rpc.call("conn.close", { connId, reason }),\n        sendDatagram: (data, opts) => rpc.call("conn.sendDatagram", { connId, data }, sigOpt(opts)),\n        receiveDatagram: (opts) => rpc.call("conn.receiveDatagram", { connId }, sigOpt(opts)),\n        closed\n      };\n    }\n    const kps = {\n      dial: async (addr, opts) => {\n        const { connId, remoteAddress } = await rpc.call("kps.dial", { addr }, sigOpt(opts));\n        return makeConn(connId, remoteAddress);\n      },\n      openStream: async (addr, opts) => makeStream(await rpc.call("kps.openStream", { addr }, sigOpt(opts)))\n    };\n    const storage = {\n      get: (key, opts) => rpc.call("storage.get", { key }, sigOpt(opts)),\n      set: (key, value, opts) => rpc.call("storage.set", { key, value }, sigOpt(opts)),\n      delete: (key, opts) => rpc.call("storage.delete", { key }, sigOpt(opts)),\n      has: (key, opts) => rpc.call("storage.has", { key }, sigOpt(opts)),\n      clear: (opts) => rpc.call("storage.clear", { prefix: opts?.prefix }, sigOpt(opts)),\n      list: (opts) => listKeys(rpc, opts?.prefix, opts?.signal)\n    };\n    const log = {\n      debug: (...args) => rpc.emit("log", { level: "debug", args }),\n      info: (...args) => rpc.emit("log", { level: "info", args }),\n      warn: (...args) => rpc.emit("log", { level: "warn", args }),\n      error: (...args) => rpc.emit("log", { level: "error", args })\n    };\n    function acceptCall(opts) {\n      const abortErr = () => new DOMException("aborted", "AbortError");\n      const signal = opts?.signal;\n      const toCall = (r) => makeFetchCall(rpc, callAborts, preAborted, r.callId, r.url, r.requestInit);\n      if (signal?.aborted) return Promise.reject(signal.reason ?? abortErr());\n      const pending = rpc.call("acceptCall", {});\n      if (!signal) return pending.then(toCall);\n      return new Promise((resolve, reject) => {\n        let settled = false;\n        const onAbort = () => {\n          if (settled) return;\n          settled = true;\n          pending.then((r) => rpc.emit("requeue-call", { callId: r.callId }), () => {\n          });\n          reject(signal.reason ?? abortErr());\n        };\n        signal.addEventListener("abort", onAbort, { once: true });\n        pending.then(\n          (r) => {\n            if (settled) return;\n            settled = true;\n            signal.removeEventListener("abort", onAbort);\n            resolve(toCall(r));\n          },\n          (e) => {\n            if (settled) return;\n            settled = true;\n            signal.removeEventListener("abort", onAbort);\n            reject(e);\n          }\n        );\n      });\n    }\n    return {\n      signalReady: () => rpc.emit("ready", {}),\n      // Failure finality (\xA77: later signals ignored) is enforced host-side \u2014\n      // #fail is one-shot and resolving an already-rejected ready is a no-op.\n      signalFailed: (reason) => rpc.emit("failed", { reason }),\n      acceptCall,\n      config,\n      kps,\n      storage,\n      log\n    };\n  }\n  function makeFetchCall(rpc, callAborts, preAborted, callId, url, wireInit) {\n    let requestInit;\n    if (wireInit) {\n      const { hasSignal, ...rest } = wireInit;\n      requestInit = rest;\n      if (hasSignal) {\n        const ac = new AbortController();\n        callAborts.set(callId, ac);\n        requestInit = { ...rest, signal: ac.signal };\n        if (preAborted.delete(callId)) ac.abort(new DOMException("aborted", "AbortError"));\n      }\n    }\n    let responded = false;\n    return {\n      kind: "fetch",\n      url,\n      ...requestInit ? { requestInit } : {},\n      respond(response) {\n        if (responded) throw new Error("respond() called more than once");\n        responded = true;\n        Promise.resolve(response).then((r) => {\n          const transfer = r.body instanceof ReadableStream ? [r.body] : r.body instanceof Uint8Array ? [r.body.buffer] : [];\n          return rpc.call("respond", { callId, ok: true, response: r }, { transfer });\n        }).catch(\n          (e) => (\n            // Carry name/code across the boundary (\xA712): host logic may branch\n            // on code, never on message text.\n            rpc.call("respond", { callId, ok: false, error: serializeError(e) })\n          )\n        ).catch(() => {\n        }).finally(() => callAborts.delete(callId));\n      }\n    };\n  }\n  async function* listKeys(rpc, prefix, signal) {\n    const keys = await rpc.call("storage.list", { prefix }, signal ? { signal } : void 0);\n    for (const k of keys) yield k;\n  }\n  function sigOpt(opts) {\n    return opts?.signal ? { signal: opts.signal } : void 0;\n  }\n\n  // src/worker/worker-runtime.ts\n  var importScripts = (url) => (\n    // eslint-disable-next-line no-restricted-globals\n    self.importScripts(url)\n  );\n  function bundleScriptUrl(bundle) {\n    const probeUrl = URL.createObjectURL(new Blob([";"], { type: "text/javascript" }));\n    try {\n      importScripts(probeUrl);\n      return URL.createObjectURL(bundle);\n    } catch {\n      return new FileReaderSync().readAsDataURL(bundle);\n    } finally {\n      URL.revokeObjectURL(probeUrl);\n    }\n  }\n  addEventListener("message", function onInit(ev) {\n    if (ev.data?.kind !== "init") return;\n    removeEventListener("message", onInit);\n    const port = ev.data.port;\n    const bundleBytes = ev.data.bundleBytes;\n    const config = ev.data.config;\n    const rpc = new PortRpc(port);\n    const api = makeWorkerApi(rpc, config);\n    globalThis.anonRpcWorker = api;\n    try {\n      const blob = new Blob([bundleBytes], { type: "text/javascript" });\n      importScripts(bundleScriptUrl(blob));\n    } catch (err) {\n      const message = err?.message ?? String(err);\n      api.log.error("worker bundle failed to load:", message);\n      rpc.emit("boot-error", { message });\n    }\n  });\n})();\n', bundleBytes, config: this.#init.config },
      "*",
      [channel.port2]
    );
  }
  #registerHandlers(rpc) {
    this.#disposeKps = registerKpsBridge(rpc);
    rpc.onEvent("ready", () => this.#readyResolve());
    rpc.onEvent("boot-error", ({ message }) => {
      this.#fail(new Error(`worker bundle failed to load: ${message}`));
    });
    rpc.onEvent("failed", ({ reason }) => {
      this.#fail(
        new RpcError({
          name: "WorkerFailedError",
          message: reason?.message ?? "worker signalled failure",
          code: reason?.code
        })
      );
    });
    rpc.onEvent("requeue-call", ({ callId }) => {
      const rec = this.#calls.get(callId);
      if (rec) this.#queue.pushFront(rec);
    });
    rpc.onEvent("log", ({ level, args }) => {
      this.#logs.push({ level, args });
      if (this.#logsClaimed) return;
      const fn = console[level] ?? console.log;
      fn.call(console, "[worker]", ...args.map(renderLogArg));
    });
    rpc.on("acceptCall", async (_args, { signal }) => {
      const rec = await this.#queue.take(signal);
      const value = {
        callId: rec.callId,
        url: rec.url,
        requestInit: rec.requestInit
      };
      return { value, transfer: rec.bodyTransfer ?? [] };
    });
    rpc.on("respond", async (msg) => {
      const rec = this.#calls.get(msg.callId);
      if (!rec) return { value: void 0 };
      this.#calls.delete(msg.callId);
      rec.cleanup?.();
      if (msg.ok && msg.response) {
        try {
          rec.resolve(toResponse(msg.response));
        } catch (e) {
          rec.reject(e);
        }
      } else {
        rec.reject(new RpcError(msg.error ?? { name: "Error", message: "worker failed the call" }));
      }
      return { value: void 0 };
    });
    const addr = this.#init.address.toLowerCase();
    const store = () => this.#storage ??= openStorageBackend();
    rpc.on("storage.get", async ({ key }) => ({ value: await (await store()).get(addr, key) }));
    rpc.on("storage.set", async ({ key, value }) => {
      await (await store()).set(addr, key, value);
      return { value: void 0 };
    });
    rpc.on("storage.delete", async ({ key }) => {
      await (await store()).delete(addr, key);
      return { value: void 0 };
    });
    rpc.on("storage.has", async ({ key }) => ({ value: await (await store()).has(addr, key) }));
    rpc.on("storage.list", async ({ prefix }) => ({
      value: await (await store()).listKeys(addr, prefix)
    }));
    rpc.on("storage.clear", async ({ prefix }) => {
      await (await store()).clear(addr, prefix);
      return { value: void 0 };
    });
  }
  async #fetch(input, init) {
    if (this.#failure !== void 0) throw this.#failure;
    const { url, requestInit, transfer, signal: hostSignal } = await normalizeRequest(input, init);
    const callId = this.#nextCallId++;
    return new Promise((resolve, reject) => {
      const rec = {
        callId,
        url,
        requestInit,
        bodyTransfer: transfer,
        resolve,
        reject
      };
      this.#calls.set(callId, rec);
      if (hostSignal) {
        const onAbort = () => {
          if (!this.#queue.remove(rec)) this.#rpc?.emit("call-abort", { callId });
          if (this.#calls.delete(callId)) {
            reject(hostSignal.reason ?? new DOMException("aborted", "AbortError"));
          }
        };
        if (hostSignal.aborted) {
          this.#calls.delete(callId);
          reject(hostSignal.reason ?? new DOMException("aborted", "AbortError"));
          return;
        }
        hostSignal.addEventListener("abort", onAbort, { once: true });
        rec.cleanup = () => hostSignal.removeEventListener("abort", onAbort);
      }
      this.#queue.push(rec);
    });
  }
  /**
   * §5/§13.1: the next log entry the worker produced, waiting for one if the
   * buffer is empty.
   *
   * Calling it at all is what claims the worker's logs: from the first call,
   * entries stop being echoed to the console, because a host that collects
   * them is not served by seeing them twice.
   */
  acceptLog(opts) {
    this.#logsClaimed = true;
    return this.#logs.take(opts?.signal);
  }
  close() {
    this.#disposeKps?.();
    if (this.#onWindowMessage) window.removeEventListener("message", this.#onWindowMessage);
    this.#iframe?.remove();
    this.#fail(new Error("worker closed"));
  }
};
function sameOriginIframeUrl(raw) {
  let url;
  try {
    url = new URL(raw, location.href);
  } catch {
    throw new Error(`iframeUrl is not a valid URL: ${raw}`);
  }
  if (url.origin !== location.origin) {
    throw new Error(
      `iframeUrl must be same-origin with the host (${location.origin}), got ${url.origin} \u2014 a cross-origin bootstrap would control the isolation boundary (\xA76)`
    );
  }
  return url.href;
}
function renderLogArg(a) {
  if (a instanceof Uint8Array) return `<${a.byteLength} bytes>`;
  return a;
}
function toResponse(r) {
  const headers = new Headers();
  for (const [k, v] of r.headers) headers.append(k, v);
  const status = r.status;
  const body = status === 204 || status === 205 || status === 304 ? null : r.body;
  const resp = new Response(body, { status, headers });
  if (r.url) Object.defineProperty(resp, "url", { value: r.url });
  return resp;
}

// src/wire.ts
function toB64(bytes) {
  if (!bytes || bytes.byteLength === 0) return void 0;
  let s = "";
  const CHUNK = 32768;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}
function fromB64(b64) {
  if (b64 === void 0) return void 0;
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
var PORT_NAME = "anon-rpc.worker";
function toWireError(err) {
  if (err instanceof Error) {
    const code = err.code;
    return { name: err.name, message: err.message, ...typeof code === "string" ? { code } : {} };
  }
  return { name: "Error", message: String(err) };
}

// src/chrome-types.ts
function chromeApi() {
  const c = globalThis.chrome;
  if (!c?.runtime) {
    throw new Error(
      "@anon-rpc/browser-extension-harness must run in an extension context (chrome.runtime is missing)"
    );
  }
  return c;
}

// src/offscreen/mount.ts
var DEFAULT_IDLE_MS = 10 * 60 * 1e3;
function mountOffscreenHost(opts = {}) {
  const runtime = chromeApi().runtime;
  if (!runtime.onConnect) {
    throw new Error("mountOffscreenHost must run in an extension page with chrome.runtime.onConnect");
  }
  const idleMs = opts.idleMs ?? DEFAULT_IDLE_MS;
  const cache = /* @__PURE__ */ new Map();
  runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME) return;
    serve(port, cache, idleMs);
  });
}
function serve(port, cache, idleMs) {
  const send = (msg) => {
    try {
      port.postMessage(msg);
    } catch {
    }
  };
  let nextProviderId = 1;
  const providerCalls = /* @__PURE__ */ new Map();
  const provider = {
    request: ({ method, params }) => new Promise((resolve, reject) => {
      const id = nextProviderId++;
      providerCalls.set(id, { resolve, reject });
      send({ t: "provider.request", id, method, params });
    })
  };
  let entry;
  let key;
  let closed = false;
  const inFlight = /* @__PURE__ */ new Map();
  const detach = () => {
    if (closed) return;
    closed = true;
    for (const ac of inFlight.values()) ac.abort();
    inFlight.clear();
    for (const p of providerCalls.values()) p.reject(new Error("service worker disconnected"));
    providerCalls.clear();
    if (!entry || !key) return;
    if (--entry.refs > 0) return;
    const e = entry;
    const k = key;
    if (idleMs === Infinity) return;
    e.reaper = setTimeout(() => {
      if (e.refs === 0 && cache.get(k) === e) {
        cache.delete(k);
        e.worker.close();
      }
    }, idleMs);
    e.reaper.unref?.();
  };
  port.onDisconnect.addListener(detach);
  port.onMessage.addListener((raw) => {
    const msg = raw;
    switch (msg?.t) {
      case "boot": {
        const cacheKey = `${msg.address.toLowerCase()}::${msg.iframeUrl}::${stableStringify(msg.config)}`;
        key = cacheKey;
        const hit = msg.reuse ? cache.get(cacheKey) : void 0;
        if (hit) {
          clearTimeout(hit.reaper);
          hit.reaper = void 0;
          hit.refs++;
          entry = hit;
        } else {
          cache.get(cacheKey)?.worker.close();
          const worker = new AnonRpcWorker({
            address: msg.address,
            config: msg.config,
            preExisting: { rpcProvider: provider },
            iframeUrl: msg.iframeUrl
          });
          entry = { worker, refs: 1, ready: worker.ready };
          cache.set(cacheKey, entry);
          const failed = entry;
          void failed.ready.catch(() => {
            if (cache.get(cacheKey) === failed) cache.delete(cacheKey);
            failed.worker.close();
          });
        }
        entry.ready.then(
          () => send({ t: "ready" }),
          (e) => send({ t: "failed", error: toWireError(e) })
        );
        pumpLogs(entry.worker, send, () => closed);
        return;
      }
      case "fetch": {
        if (!entry) {
          send({ t: "response", callId: msg.callId, ok: false, error: { name: "Error", message: "not booted" } });
          return;
        }
        const ac = new AbortController();
        inFlight.set(msg.callId, ac);
        const body = fromB64(msg.body);
        void entry.worker.fetch(msg.url, {
          method: msg.request.method,
          headers: msg.request.headers,
          ...body ? { body } : {},
          ...msg.request.redirect ? { redirect: msg.request.redirect } : {},
          signal: ac.signal
        }).then(
          async (res) => {
            const bytes = new Uint8Array(await res.arrayBuffer());
            const headers = [];
            res.headers.forEach((v, k2) => headers.push([k2, v]));
            inFlight.delete(msg.callId);
            send({
              t: "response",
              callId: msg.callId,
              ok: true,
              status: res.status,
              headers,
              url: res.url || void 0,
              body: toB64(bytes)
            });
          },
          (e) => {
            inFlight.delete(msg.callId);
            send({ t: "response", callId: msg.callId, ok: false, error: toWireError(e) });
          }
        );
        return;
      }
      case "abort":
        inFlight.get(msg.callId)?.abort();
        inFlight.delete(msg.callId);
        return;
      case "provider.result": {
        const call = providerCalls.get(msg.id);
        if (!call) return;
        providerCalls.delete(msg.id);
        if (msg.ok) call.resolve(msg.value);
        else {
          const e = new Error(msg.error.message);
          e.name = msg.error.name;
          if (msg.error.code) e.code = msg.error.code;
          call.reject(e);
        }
        return;
      }
      case "close": {
        if (entry && key) {
          entry.refs--;
          if (entry.refs <= 0 && cache.get(key) === entry) {
            cache.delete(key);
            entry.worker.close();
          }
          entry = void 0;
        }
        detach();
        return;
      }
    }
  });
}
function pumpLogs(worker, send, closed) {
  void (async () => {
    while (!closed()) {
      let entry;
      try {
        entry = await worker.acceptLog();
      } catch {
        return;
      }
      if (closed()) return;
      send({ t: "log", level: entry.level, args: entry.args.map(renderLogArg2) });
    }
  })();
}
function renderLogArg2(a) {
  if (typeof a === "string") return a;
  if (a instanceof Uint8Array) return `<${a.byteLength} bytes>`;
  if (a === void 0) return "undefined";
  try {
    return JSON.stringify(a) ?? String(a);
  } catch {
    return String(a);
  }
}
function stableStringify(v) {
  if (v === void 0) return "\0undefined";
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(Object.entries(val).sort(([a], [b]) => a < b ? -1 : 1));
    }
    return val;
  });
}

// src/offscreen/document.ts
mountOffscreenHost();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
