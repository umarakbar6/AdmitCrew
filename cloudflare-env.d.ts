declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
    OPENAI_MODEL?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    META_VERIFY_TOKEN?: string;
  }
}
