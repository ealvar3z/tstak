// src/functions.ts
/**
 * 1:1 port of pytak’s functions.py to Deno/TypeScript.
 * Source: https://github.com/snstac/pytak/functions.py
 */

import * as tstak from "../main.ts";

//
// split_host
//
export function split_host(host: string, port?: number): [string, number] {
    let addr: string | null;
    let _port: number | string;
    if (host.includes(":")) {
        [addr, _port] = host.split(":").map((newline) => newline.trim());
        _port = parseInt(_port, 10);
    } else if (port !== undefined) {
        addr = host;
        _port = port;
    } else {
        addr = host;
        _port = parseInt(tstak.DEFAULT_COT_PORT);
    }
    return [addr, _port];
}

//
// parse_url
//
export function parse_url(u: string | URL): [string, number] {
  const url = typeof u === "string" ? new URL(u) : u;
  const host = url.hostname;
  let port = tstak.DEFAULT_BROADCAST_PORT;
  if (url.port) {
    port = url.port;
  } else {
    if (url.protocol.includes("broadcast")) {
      port = tstak.DEFAULT_BROADCAST_PORT;
    } else if (url.protocol.includes("multicast")) {
      console.warn(
        "You no longer need to specify '+multicast' in the COT_URL."
      );
      port = tstak.DEFAULT_BROADCAST_PORT;
    } else {
      port = tstak.DEFAULT_COT_PORT;
    }
  }
  return [host, parseInt(port)];
}

//
// cot_time
//
export function cot_time(cot_stale?: number): string {
  const now = new Date();
  if (cot_stale !== undefined) {
    now.setSeconds(now.getSeconds() + cot_stale);
  }
  // format as W3C_XML_DATETIME
  // YYYY-MM-DDTHH:mm:ss.SSSZ
  const iso = now.toISOString();
  // Python’s %f prints microseconds; we leave JS milliseconds.
  return iso;
}

//
// hello_event
//
export function hello_event(uid?: string): Uint8Array {
  const id = uid ?? "takPing";
  const xml = gen_cot_xml(undefined, undefined, undefined, undefined, undefined, id, undefined, "t-x-d-d");
  const str = tstak.DEFAULT_XML_DECLARATION + "\n" + new XMLBuilder({ ignoreAttributes: false }).build(xml);
  return new TextEncoder().encode(str);
}

//
// unzip_file
//
export async function unzip_file(
  zip_src: Uint8Array,
  zip_dest?: string
): Promise<string> {
  const dest = zip_dest ?? await Deno.makeTempDir({ prefix: "pytak_dp_" });
  const files = await unzip(zip_src);
  for (const [name, content] of files) {
    const outPath = join(dest, name);
    await Deno.mkdir(join(dest, ...name.split("/").slice(0, -1)), { recursive: true });
    await Deno.writeFile(outPath, content);
  }
  if (!(await exists(dest))) throw new Error(`Unzip failed: ${dest}`);
  return dest;
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

//
// find_file
//
export function find_file(search_dir: string, glob: string): string {
  // simplistic: scan whole tree for match
  for await (const entry of Deno.readDir(search_dir)) {
    const p = join(search_dir, entry.name);
    if (entry.name === glob) return p;
    if (entry.isDirectory) {
      try {
        return find_file(p, glob);
      } catch {
        // continue
      }
    }
  }
  throw new Error(`Could not find file: ${glob}`);
}

//
// find_cert
//
export function find_cert(search_dir: string, cert_path: string): string {
  const cert_file = basename(cert_path);
  return find_file(search_dir, cert_file);
}

//
// load_preferences
//

export async function load_preferences(
  pref_path: string,
  search_dir: string
): Promise<Record<string,string>> {
  const data = await Deno.readFile(pref_path);
  const xml   = new TextDecoder().decode(data);
  const parser = new tstak.XMLParser({ ignoreAttributes: false });
  const doc    = parser.parse(xml) as any;
  // assume root element has entries under .entry
  const entries = Array.isArray(doc.entry) ? doc.entry : [doc.entry];
  const prefs: Record<string,string> = {
    connect_string: "",
    client_password: "",
    certificate_location: "",
  };
  for (const entry of entries) {
    const key = entry["@key"];
    const val = entry["#text"] ?? "";
    if (key === "connectString0") prefs.connect_string = val;
    if (key === "clientPassword") prefs.client_password = val;
    if (key === "certificateLocation") {
      prefs.certificate_location = find_cert(search_dir, val);
    }
  }
  return prefs;
}

//
// connectString2url
//
export function connectString2url(conn_str: string): string {
  const parts = conn_str.split(":");
  return `${parts[2]}://${parts[0]}:${parts[1]}`;
}

//
// cot2xml
//
export function cot2xml(event: tstak.COTEvent): tstak.COTEvent {
  // users will build their ET.Element via XMLBuilder
  const xmlObj = {
    event: {
      "@version": "2.0",
      "@type": event.cot_type,
      "@uid": event.uid,
      "@how": "m-g",
      "@time": cot_time(),
      "@start": cot_time(),
      "@stale": cot_time(event.stale),
      point: {
        "@lat": String(event.lat),
        "@lon": String(event.lon),
        "@le": String(event.le),
        "@hae": String(event.hae),
        "@ce": String(event.ce),
      },
      detail: {
        "_flow-tags_": {
          "@+": `${tstak.DEFAULT_HOST_ID}-pytak`.replace("@","-"),
          "@time": cot_time(),
        },
      },
    },
  };
  event.push(xmlObj);
  return event;
}

//
// gen_cot_xml
//
export function gen_cot_xml(
  lat?: any,
  lon?: any,
  ce?: any,
  hae?: any,
  le?: any,
  uid?: string,
  stale?: number,
  cot_type?: string
): any {
  return {
    event: {
      "@version": "2.0",
      "@type": cot_type ?? "a-u-G",
      "@uid": uid ?? tstak.DEFAULT_HOST_ID,
      "@how": "m-g",
      "@time": cot_time(),
      "@start": cot_time(),
      "@stale": cot_time(stale ?? parseInt(tstak.DEFAULT_COT_STALE)),
      point: {
        "@lat": String(lat ?? "0.0"),
        "@lon": String(lon ?? "0.0"),
        "@le":  String(le  ?? tstak.DEFAULT_COT_VAL),
        "@hae": String(hae ?? tstak.DEFAULT_COT_VAL),
        "@ce":  String(ce  ?? tstak.DEFAULT_COT_VAL),
      },
      detail: {
        "_flow-tags_": {
          "@+": tstak.DEFAULT_HOST_ID.replace("@","-"), cot_time()
        },
      },
    },
  };
}

//
// gen_cot
//
export function gen_cot(
  lat?: any,
  lon?: any,
  ce?: any,
  hae?: any,
  le?: any,
  uid?: string,
  stale?: number,
  cot_type?: string
): Uint8Array {
  const xmlObj = gen_cot_xml(lat, lon, ce, hae, le, uid, stale, cot_type);
  const builder = new XMLBuilder({ ignoreAttributes: false });
  const xml     = builder.build(xmlObj);
  const out     = tstak.DEFAULT_XML_DECLARATION + "\n" + xml;
  return new TextEncoder().encode(out);
}

//
// tak_pong
//
export function tak_pong(): Uint8Array {
  const xmlObj = {
    event: {
      "@version": "2.0",
      "@type": "t-x-d-d",
      "@uid": "takPong",
      "@how": "m-g",
      "@time": cot_time(),
      "@start": cot_time(),
      "@stale": cot_time(3600),
    },
  };
  const builder = new XMLBuilder({ ignoreAttributes: false });
  const xml     = builder.build(xmlObj);
  return new TextEncoder().encode(xml);
}

