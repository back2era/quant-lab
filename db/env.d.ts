declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    QUANT_OWNER_EMAIL?: string;
    QUANT_SERVICE_TOKEN_SHA256?: string;
  }
}
