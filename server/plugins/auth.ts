import type { AuthPageProps } from "@agent-native/core/shared/auth-page-types";
import { createToolkitAuthPlugin, renderAuthPage } from "@agent-native/toolkit/app/auth/server";

/**
 * Sign-in page plus a "Try the demo" strip. The button creates a throwaway
 * account through the framework's own register/login endpoints, so every
 * visitor gets a private demo without typing a password.
 */
const DEMO_CSS = `.lapse-demo{position:relative;z-index:5;max-width:420px;margin:24px auto 0;padding:24px 22px 20px;background:#15102a;color:#fbf8ff;
font-family:"Bricolage Grotesque Variable","Bricolage Grotesque",system-ui,sans-serif;border-radius:28px;box-shadow:0 24px 48px rgba(21,16,42,.35);
background-image:radial-gradient(120% 70% at 50% -20%,#2c2160 0%,transparent 60%)}
.lapse-demo h2{font:800 40px/1 "Bricolage Grotesque Variable","Bricolage Grotesque",system-ui,sans-serif;letter-spacing:-.035em;margin:0 0 6px}
.lapse-demo h2 i{display:inline-block;width:12px;height:12px;border-radius:50%;background:#ff4d6d;margin-left:4px}
.lapse-demo p{margin:0 0 14px;font:400 15px/1.5 system-ui,sans-serif;color:#c9c3e3}
.lapse-demo ol{margin:0 0 16px;padding:0;list-style:none;display:grid;gap:6px;font:600 14px system-ui,sans-serif}
.lapse-demo ol li{display:flex;gap:10px;align-items:center}
.lapse-demo ol b{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#2e2550;font-size:12px}
.lapse-demo button{width:100%;height:56px;border:0;background:#ffd23f;color:#1a1530;font:700 17px system-ui,sans-serif;cursor:pointer;border-radius:16px;box-shadow:0 4px 0 #c9a00f}
.lapse-demo button:disabled{opacity:.6;cursor:wait}
.lapse-demo small{display:block;margin-top:12px;font:400 12px system-ui,sans-serif;color:#a9a2c6;text-align:center}
.lapse-demo .err{color:#ff8fa3}
.auth-root .auth-page{min-height:0!important;align-items:flex-start!important}
.auth-root .auth-centered{padding-top:20px!important;padding-bottom:40px!important}
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
  el.innerHTML='<h2>Lapse<i></i></h2>'+
    '<p>Never pay for something you forgot you had.</p>'+
    '<ol><li><b>1</b>Paste your bank statement or emails</li><li><b>2</b>Keep or cancel each subscription</li><li><b>3</b>Send the cancel messages Lapse writes</li></ol>'+
    '<button type="button">Try the demo, no sign-up</button>'+
    '<small>Opens a private demo with sample data. Or sign in below.</small>';
  document.body.insertBefore(el,document.body.firstChild);
  var btn=el.querySelector("button"),note=el.querySelector("small");
  btn.addEventListener("click",function(){
    btn.disabled=true;btn.textContent="Setting up your demo…";
    var id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()).replace(/[^a-z0-9]/gi,"").slice(0,12).toLowerCase();
    var cred={email:"demo-"+id+"@demo.lapse.app",password:"Lapse-demo-"+(crypto.randomUUID?crypto.randomUUID():id+id)};
    function post(p){return fetch(BASE+p,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(cred)})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j;});});}
    post("/_agent-native/auth/register").then(function(){return post("/_agent-native/auth/login");})
      .then(function(){location.assign(BASE+"/ledger?demo=1");})
      .catch(function(e){btn.disabled=false;btn.textContent="Try the demo, no sign-up";note.className="err";note.textContent="Couldn't open the demo ("+e.message+"). Try again in a minute, or create an account below.";});
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
