import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "atlas_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;
const SESSION_VERSION = 2;

function hasShareToken(request: NextRequest) {
  return request.nextUrl.searchParams.has("token");
}

function hasAssetShareToken(request: NextRequest) {
  return request.nextUrl.searchParams.has("assetShareToken");
}

function isPublicPath(request: NextRequest) {
  const p = request.nextUrl.pathname;
  if (p.startsWith("/_next/")) return true;
  if (["/favicon.ico","/manifest.json","/robots.txt","/site.webmanifest","/sw.js","/atlas-icon-192.png","/atlas-icon-512.png","/apple-touch-icon.png","/login","/invite","/api/atlas-login","/api/atlas-logout","/api/atlas-invite"].includes(p)) return true;
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|json)$/i.test(p)) return true;
  if (p === "/landscape-help" && hasShareToken(request)) return true;
  if (p === "/api/landscape-help" && hasShareToken(request)) return true;
  if (p === "/request") return true;
  if (p === "/api/atlas-requests" && hasShareToken(request)) return true;
  if (p === "/reset-password" && hasShareToken(request)) return true;
  if (p === "/api/atlas-password-reset") return true;
  if (p === "/asset-share" && hasShareToken(request)) return true;
  if (p === "/api/atlas" && hasAssetShareToken(request)) return true;
  return false;
}

function b64bytes(bytes: Uint8Array) { let s=""; for (const b of bytes) s+=String.fromCharCode(b); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function decode(v:string){ const p=v.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((v.length+3)%4); const bin=atob(p); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
async function sign(payload:string, secret:string){ const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]); return b64bytes(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload)))); }

type Session={v?:number;username?:string;email?:string;role?:string;expiresAt?:number};
async function readSession(
  value:string|undefined,
  secrets:string[],
  expectedUsername:string,
):Promise<Session|null>{
  if(!value) return null; const [payload,sig]=value.split("."); if(!payload||!sig) return null;
  let signatureMatches=false;
  for(const secret of secrets){
    if(secret && await sign(payload,secret)===sig){ signatureMatches=true; break; }
  }
  if(!signatureMatches) return null;
  try {
    const data=JSON.parse(decode(payload)) as Session;
    if(!data.expiresAt||Date.now()>data.expiresAt) return null;
    // Accept the current v2 session and the immediately previous signed session
    // shape so a deploy cannot strand an already-authenticated Atlas browser.
    if(data.email && (data.v===SESSION_VERSION || data.v===undefined)) return data;
    if(data.v===undefined&&data.username===expectedUsername) return data;
    return null;
  } catch { return null; }
}
function basic(username:string,password:string){ return `Basic ${btoa(`${username}:${password}`)}`; }
function toLogin(request:NextRequest){ const u=request.nextUrl.clone(); u.pathname="/login"; u.search=""; u.searchParams.set("next",`${request.nextUrl.pathname}${request.nextUrl.search}`); return NextResponse.redirect(u); }

export async function middleware(request:NextRequest){
  if(isPublicPath(request)) return NextResponse.next();
  const adminUser=process.env.ATLAS_ACCESS_USERNAME||"";
  const adminPass=process.env.ATLAS_ACCESS_PASSWORD||"";
  const configuredSecret=process.env.ATLAS_SESSION_SECRET||"";
  if(!adminUser||!adminPass) return new NextResponse("Atlas access is not configured.",{status:500});

  const session=await readSession(
    request.cookies.get(SESSION_COOKIE)?.value,
    [adminPass,configuredSecret].filter((value,index,all)=>Boolean(value)&&all.indexOf(value)===index),
    adminUser,
  );
  if(!session){
    if(request.nextUrl.pathname.startsWith("/api/")) return new NextResponse("Atlas login required.",{status:401});
    return toLogin(request);
  }

  const headers=new Headers(request.headers);
  headers.set("authorization",basic(adminUser,adminPass));
  if(session.email) headers.set("x-atlas-user-email",session.email);
  else headers.delete("x-atlas-user-email");
  if(session.role) headers.set("x-atlas-user-role",session.role);
  else headers.delete("x-atlas-user-role");
  return NextResponse.next({request:{headers}});
}

export const config={matcher:["/((?!_next/static|_next/image).*)"]};
