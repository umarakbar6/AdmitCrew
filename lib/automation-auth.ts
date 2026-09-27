import { env } from "cloudflare:workers";

async function digest(value:string){return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))}
function toHex(bytes:Uint8Array){return Array.from(bytes,byte=>byte.toString(16).padStart(2,"0")).join("")}
function equalText(a:string,b:string){
  if(a.length!==b.length)return false;
  let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;
}
export async function automationAuthorized(request:Request){
  const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(!supplied)return false;
  const suppliedDigest=await digest(supplied);
  if(env.N8N_TOKEN_SHA256&&equalText(env.N8N_TOKEN_SHA256.toLowerCase(),toHex(suppliedDigest)))return true;
  if(!env.CRON_SECRET)return false;
  const configuredDigest=await digest(env.CRON_SECRET);
  if(configuredDigest.length!==suppliedDigest.length)return false;
  let difference=0;for(let i=0;i<configuredDigest.length;i++)difference|=configuredDigest[i]^suppliedDigest[i];return difference===0;
}
export async function requireAutomation(request:Request){if(!await automationAuthorized(request))throw new Response("Unauthorized",{status:401})}
