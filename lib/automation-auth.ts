import { env } from "cloudflare:workers";

async function digest(value:string){return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))}
export async function automationAuthorized(request:Request){
  const configured=env.CRON_SECRET,supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(!configured||!supplied)return false;
  const [a,b]=await Promise.all([digest(configured),digest(supplied)]);
  if(a.length!==b.length)return false;
  let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
export async function requireAutomation(request:Request){if(!await automationAuthorized(request))throw new Response("Unauthorized",{status:401})}
