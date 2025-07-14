// src/constants.ts
/**
 * Port of tstak’s constants.py to Deno/TypeScript.
 * https://github.com/snstac/tstak/constants.py
 */

const INVOCATION_ID = Deno.env.get("INVOCATION_ID");
const DEBUG = Boolean(Deno.env.get("DEBUG"));

// LOG_LEVEL and LOG_FORMAT
export let LOG_LEVEL: number = 20; // INFO
export let LOG_FORMAT: string = "%(asctime)s tstak %(levelname)s - %(message)s";

if (INVOCATION_ID) {
  LOG_LEVEL = 20; // INFO
  LOG_FORMAT = "[%(levelname)s] %(message)s";
}

if (DEBUG) {
  LOG_LEVEL = 10; // DEBUG
  LOG_FORMAT = "%(asctime)s tstak %(levelname)s %(name)s.%(funcName)s:%(lineno)d - %(message)s";
}

// Default constants
export const DEFAULT_COT_URL = "udp+wo://239.2.3.1:6969";
export const DEFAULT_COT_STALE = "120";
const HOST = Deno.env.get("HOSTNAME") || Deno.env.get("COMPUTERNAME") || "localhost";
export const DEFAULT_HOST_ID = `tstak@${HOST}`;
export const DEFAULT_COT_PORT = "8087";
export const DEFAULT_ATAK_PORT = "4242";
export const DEFAULT_BROADCAST_PORT = "6969";

export const DEFAULT_BACKOFF = "120";
export const DEFAULT_SLEEP = "5";
export const DEFAULT_FIPS_CIPHERS = "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384";

export const W3C_XML_DATETIME = "%Y-%m-%dT%H:%M:%S.%fZ";
export const ISO_8601_UTC = W3C_XML_DATETIME;

export const TC_TOKEN_URL = "https://app-api.parteamconnect.com/api/v1/auth/token";
export const DEFAULT_TC_TOKEN_URL = Deno.env.get("TC_TOKEN_URL") ?? TC_TOKEN_URL;

export const DEFAULT_TLS_PARAMS_REQ = ["TSTAK_TLS_CLIENT_CERT"];
export const DEFAULT_TLS_PARAMS_OPT = [
  "TSTAK_TLS_CLIENT_KEY",
  "TSTAK_TLS_CLIENT_CAFILE",
  "TSTAK_TLS_CLIENT_CIPHERS",
  "TSTAK_TLS_DONT_CHECK_HOSTNAME",
  "TSTAK_TLS_DONT_VERIFY",
  "TSTAK_TLS_CLIENT_PASSWORD",
  "TSTAK_TLS_SERVER_EXPECTED_HOSTNAME",
];

export const DEFAULT_IMPORT_OTHER_CONFIGS = "0";
export const BOOLEAN_TRUTH = ["true", "yes", "y", "on", "1"];
export const DEFAULT_COT_VAL = "9999999.0";
export const DEFAULT_TAK_PROTO = "0";
export const DEFAULT_XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>';

export const DEFAULT_TSTAK_MULTICAST_LOCAL_ADDR = "0.0.0.0";

export const DEFAULT_COT_ACCESS = Deno.env.get("COT_ACCESS") ?? "UNCLASSIFIED";
export const DEFAULT_COT_CAVEAT = Deno.env.get("COT_CAVEAT") ?? "";
export const DEFAULT_COT_RELTO = Deno.env.get("COT_RELTO") ?? "";
export const DEFAULT_COT_QOS = Deno.env.get("COT_QOS") ?? "";
export const DEFAULT_COT_OPEX = Deno.env.get("COT_OPEX") ?? "";

export const DEFAULT_MAX_OUT_QUEUE = 100;
export const DEFAULT_MAX_IN_QUEUE = 500;

