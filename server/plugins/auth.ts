import type { AuthPageProps } from "@agent-native/core/shared/auth-page-types";
import { createToolkitAuthPlugin, renderAuthPage } from "@agent-native/toolkit/app/auth/server";

/**
 * Sign-in page plus a "Try the demo" strip. The button creates a throwaway
 * account through the framework's own register/login endpoints, so every
 * visitor gets a private demo without typing a password.
 */
const DEMO_CSS = `.lapse-demo{position:relative;z-index:5;max-width:400px;margin:24px auto 0;padding:20px;background:#17141f;color:#f7f6fa;
font-family:"Geist Variable",Geist,Inter,system-ui,sans-serif;border:1px solid #2a2636;border-radius:14px}
.lapse-demo h2{display:flex;align-items:center;gap:8px;font:600 17px/1 "Geist Variable",Geist,Inter,system-ui,sans-serif;letter-spacing:-.02em;margin:0 0 8px}
.lapse-demo p{margin:0 0 16px;font:400 14px/1.5 "Geist Variable",Geist,Inter,system-ui,sans-serif;color:#a7a3b3}
.lapse-demo button{width:100%;height:44px;border:0;background:#f7f6fa;color:#15131c;font:500 15px "Geist Variable",Geist,Inter,system-ui,sans-serif;cursor:pointer;border-radius:10px}
.lapse-demo button:hover{background:#fff}.lapse-demo button:disabled{opacity:.6;cursor:wait}
.lapse-demo small{display:block;margin-top:10px;font:400 12px "Geist Variable",Geist,Inter,system-ui,sans-serif;color:#6f6b7b;text-align:center}
.lapse-demo .err{color:#f3b8c1}
.auth-root .auth-page{min-height:0!important;align-items:flex-start!important}
.auth-root .auth-centered{padding-top:16px!important;padding-bottom:40px!important}
@media (max-width:480px){.lapse-demo{margin:14px 12px 0}}
`;

function demoStrip(appBasePath: string): string {
  const base = JSON.stringify(appBasePath.replace(/\/$/, ""));
  return `<script>(function(){
var CSS=${JSON.stringify(DEMO_CSS)};
var BASE=${base};
function mount(){
  if(document.getElementById("lapse-demo"))return;
  var st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
  var el=document.createElement("section");el.id="lapse-demo";el.className="lapse-demo";
  el.innerHTML='<h2><svg viewBox="0 0 64 64" width="22" height="22" fill="none" aria-hidden="true"><path d="M47.41 39.18A17 17 0 1 1 40.5 17.28" stroke="#f7f6fa" stroke-width="6" stroke-linecap="round"/><path d="M46.13 20.53L37.75 22.04L43.25 12.52Z" fill="#f7f6fa" stroke="#f7f6fa" stroke-width="2" stroke-linejoin="round"/><path d="M40.9 30.75L56.75 28.52" stroke="#ff5a6e" stroke-width="6" stroke-linecap="round"/></svg>Lapse</h2>'+
    '<p>Find the subscriptions about to charge you, and cancel them.</p>'+
    '<button type="button">Try the demo</button>'+
    '<small>No sign-up. Or sign in below.</small>';
  document.body.insertBefore(el,document.body.firstChild);
  var btn=el.querySelector("button"),note=el.querySelector("small");
  btn.addEventListener("click",function(){
    btn.disabled=true;btn.textContent="Opening…";
    var id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()).replace(/[^a-z0-9]/gi,"").slice(0,12).toLowerCase();
    var cred={email:"demo-"+id+"@demo.lapse.app",password:"Lapse-demo-"+(crypto.randomUUID?crypto.randomUUID():id+id)};
    function post(p){return fetch(BASE+p,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(cred)})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j;});});}
    post("/_agent-native/auth/register").then(function(){return post("/_agent-native/auth/login");})
      .then(function(){location.assign(BASE+"/ledger?demo=1");})
      .catch(function(e){btn.disabled=false;btn.textContent="Try the demo";note.className="err";note.textContent="Couldn't open the demo ("+e.message+"). Try again in a minute, or create an account below.";});
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();</script>`;
}

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  rootAuth: false,
  marketing: false,
  renderSignInPage: (props: AuthPageProps) => renderAuthPage(props) + demoStrip(props.appBasePath ?? ""),
});
