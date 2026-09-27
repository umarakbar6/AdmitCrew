declare namespace Cloudflare {
  interface Env {
    SUPABASE_URL?: string;
    SUPABASE_SECRET_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    OPENAI_API_KEY: string;
    OPENAI_MODEL?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    META_VERIFY_TOKEN?: string;
    META_APP_SECRET?: string;
    CRON_SECRET?: string;
    N8N_TOKEN_SHA256?: string;
    OPENAI_STATUS?: string;
  }
}
