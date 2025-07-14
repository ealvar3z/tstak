import * as tstak from "../main.ts";
import * as random from "@std/random";
import * as log from "@std/log";

log.setup({
    handlers: {
        console: new log.ConsoleHandler(tstak.LOG_LEVEL, {
            formatter: tstak.LOG_FORMAT,
        } as log.BaseHandlerOptions),
    },
    loggers: {
        default: {
            level: tstak.LOG_LEVEL,
            handlers: ["console"],
        },
        asyncio: {
            level: tstak.LOG_LEVEL,
            handlers: ["console"],
        },
    },
});

const _logger: Logger = getLogger();
let takproto: unknown = null;
try {
    takproto = await import("https://github.com/ealvar3z/takproto-ts"); // TODO: port over to TS
} catch {
    // leave it as null
}

export interface Async
// Meta class for all other Worker class
export abstract class Worker {
    protected queue: AsyncQueue<Uint8Array>;
    protected config: Record<string, string>;
    protected useProtobuf: boolean;

    constructor(
        queue: AsyncQueue<Uint8Array>,
        config: Record<string, string> = {}
    ) {
        this.queue = queue;
        this.config = config;

        const ver: number = parseInt(
            this.config.TAK_PROTO ?? tstak.DEFAULT_TAK_PROTO,
            10
        );
        if (ver > 0 && typeof tstak.xml2proto !== "function") {
            tstak.LOGGER?.warn(
                `TAK_PROTO=${ver} but takproto module not present`
            );
        }
        this.useProtobuf = ver > 0;
    }

    // FTS compat sleep hook
    // see snstac/pytak
    async fts_compat(): Promise<void> {
        const sleep: number = parseInt(
            this.config.TSTAK_SLEEP ?? "0",
            10
        );
        const fts: boolean = !!this.config.FTS_COMPAT;

        if (fts || sleep > 0) {
            const delay = fts
                        ? Math.random() * sleep
                        : sleep;
            await new Promise((r) =>
                setTimeout(r, delay * 1000)
            );
        }
    }
    // can be overriden in subclasses
    abstract handle_data(data: Uint8Array): Promise<void>;

    // single item queue processor
    async run_once(): Promise<void> {
        const data = await this.queue.pop();
        await this.handle_data(data);
        await this.fts_compat();
    }

    async run(): Promise<void> {
        tstak.LOGGER?.info(`Running: ${this.constructor.name}`);
        while (true) {
            await this.run_once();
            await new Promise((r) => setTimeout(r, 0));
        }
    }
}

export class TXWorker extends Worker {
    constructor(
        queue: unknown, 
        config: unknown,
        private writer: Deno.Conn 
    ) {
        super(
            queue as AsyncQueue<Uint8Array>,
            config as Record<string, string>,
        );
    }

    async handle_data(data: Uint8Array): Promise<void> {
        let out = data;
        if (this.useProtobuf) {
            const [host] = tstak.parse_url(new URL(
                this.config.COT_URL ?? tstak.DEFAULT_COT_URL
            ));
            const is_multicast = host.split(".")[0] >= "224";
            const ver          = is_multicast
                                ? tstak.TakProtoVersion.MESH
                                : tstak.TakProtoVersion.STREAM;
            try {
                out = tstak.xml2proto(new TextDecoder().decode(data), ver);
            } catch {
                tstak.LOGGER?.warn("xml2proto failed") ;
            }
        }
        if (typeof this.writer.send === "function") {
            await this.writer.send(out);
        } else {
            this.writer.write?.(out);
            await this.writer.drain?.();
            this.writer.flush?.();
        }
    }
}

export class RXWorker extends Worker {
    constructor(
        queue: unknown,
        config: unknown,
        private reader: Deno.Conn
    ) {
        super(
            queue as AsyncQueue<Uint8Array>,
            config as Record<string, string>
        );
    }

    async handle_data(_data: Uint8Array): Promise<void> { /* no-op */ }

    private async readcot(): Promise<Uint8Array | null> {
        try {
            let pkt: Uint8Array | null = null;
            if (typeof this.reader.readuntil === "function") {
                pkt = await this.reader.readuntil(
                    new TextEncoder().encode("</event>")
                );
            } else {
                const [data] = await this.reader.recv();
                pkt = data;
            }
            if (pkt && this.useProtobuf) {
                const { cot } = tstak.parse_proto(pkt);
                return new TextEncoder().encode(cot.toXML());
            }
            return pkt;
        } catch {
           return null; 
        }
    }

    async run_once(): Promise<void> {
        const data = await this.readcot();
        if (data) {
            this.queue.push(data);
            await this.fts_compat();
        }
    }

    async run(): Promise<void> {
        tstak.LOGGER?.info(`Running: ${this.constructor.name}`);
        while (true) {
            await this.run_once();
            await new Promise((r) => setTimeout(r, 0));
        }
    }
}

export abstract class QueueWorker<T> extends Worker {
    constructor(queue: unknown, config: unknown) {
        super(
            queue as AsyncQueue<Uint8Array>, 
            config as Record<string, string>
        );
        tstak.LOGGER?.info(`Using COT_URL='${this.config.COT_URL}'`);
    }
    abstract handle_data(data: Uint8Array): Promise<void>;

    async put_queue(ev: tstak.COTEvent): Promise<void> {
        const xml = ev.toXML();
        let buf = new TextEncoder().encode(xml);
        if (this.useProtobuf) {
            buf = tstak.xml2proto(clearTimeout, parseInt(this.config.TAK_PROTO, 10));
        }
        if (this.queue.length > parseInt(this.config.MAX_OUT_QUEUE)) {
            await this.queue.pop();
        }
        await this.queue.push(buf);
    }
}

export class CLITool {
    private tasks = new Set<Worker>();
    private running = new Set<Promise<unknown>>();
    private tx_q: AsyncQueue<Uint8Array>;
    private rx_q: AsyncQueue<Uint8Array>;
    private config: Record<string, string>;
    constructor(private config: Record<string, string>) {
        this.config = config;
        const max_out = parseInt(config.MAX_OUT_QUEUE ?? 0, 10);
        const max_in = parseInt(config.MAX_IN_QUEUE ?? 0, 10);
        this.tx_q = new AsyncQueue<Uint8Array>(max_out);
        this.rx_q = new AsyncQueue<Uint8Array>(max_in);
    }

    add_task(w: Worker): void { this.tasks.add(w); }
    add_tasks(ws: Worker[]): void { ws.forEach((w) => this.add_task(w)); }
    run_task(w: Worker): void { this.running.add(w.run()); }
    run(): void {
        tstak.LOGGER?.info(`Execute CLITool`);
        if (!this.config.TSTAK_NO_HELLO) {
            const ev = new tstak.COTEvent();
            this.tx_q.push(new TextEncoder().encode(ev.toXML()));
        }
        this.tasks.forEach((w) => this.run_task(w));
        Promise.race(this.running).catch((e) => {
            console.error("Task failed:", e);
        });
    }
}

export class SimpleCOTEvent {
    lat?: number;
    lon?: number;
    uid?: number;
    stale?: number;
    cot_type?: string;

    constructor(params: Partial<SimpleCOTEvent> = {}) {
        Object.assign(this, params);
    }

    toXML(): string {
        const ev = new COTEvent({
            lat: this.lat,
            lon: this.lon,
            uid: this.uid,
            stale: this.stale,
            cot_type: this.cot_type,
            le: parseInt(tstak.DEFAULT_COT_VAL, 10),
            ce: parseInt(tstak.DEFAULT_COT_VAL, 10),
            hae: parseInt(tstak.DEFAULT_COT_VAL, 10),
        });
        return ev.toXML();
    }
}
export class COTEvent extends SimpleCOTEvent {
    ce?: number;
    hae?: number;
    le?: number;

    constructor(params: Partial<COTEvent> = {}) {
        super(params);
        Object.assign(this, params);
    }

    override toXML(): string {
        const ev = new COTEvent({
            lat: this.lat,
            lon: this.lon,
            uid: this.uid,
            stale: this.stale,
            cot_type: this.cot_type,
            le: this.le,
            ce: this.ce,
            hae: this.hae,
        });
        return ev.toXML();
    }
}

