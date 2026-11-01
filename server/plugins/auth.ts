import type { AuthPageProps } from "@agent-native/core/shared/auth-page-types";
import { createToolkitAuthPlugin, renderAuthPage } from "@agent-native/toolkit/app/auth/server";

/**
 * Sign-in page plus a "Try the demo" strip. The button creates a throwaway
 * account through the framework's own register/login endpoints, so every
 * visitor gets a private ledger without typing a password.
 */
const DEMO_CSS = `.lapse-demo{position:relative;z-index:5;max-width:420px;margin:24px auto 0;padding:22px 22px 20px;background:#f4efe6;color:#1d1a16;
font-family:"JetBrains Mono",ui-monospace,monospace;border-radius:2px;box-shadow:0 18px 30px rgba(0,0,0,.45);
-webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/18px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/18px 51% repeat-x;
mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/18px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/18px 51% repeat-x}
.lapse-demo h2{font:400 40px/1 "Instrument Serif",Georgia,serif;margin:6px 0 4px}
.lapse-demo p{margin:0 0 10px;font-size:13px;line-height:1.5}
.lapse-demo em{font:italic 19px/1.2 "Instrument Serif",Georgia,serif;display:block;margin-bottom:10px;color:#4a443c}
.lapse-demo button{width:100%;height:46px;border:0;background:#ff6a1a;color:#1a0d05;font:700 13px "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;border-radius:2px}
.lapse-demo button:disabled{opacity:.6;cursor:wait}
.lapse-demo small{display:block;margin-top:10px;font-size:11px;color:#6b6458;text-align:center}
.lapse-demo .err{color:#c8312b}
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
  el.innerHTML='<h2>Lapse</h2><em>Never pay for something you forgot you had.</em>'+
    '<p>Paste a bank statement. Lapse finds the subscriptions and free trials about to charge you. You and the AI decide what to keep, and it writes the cancellation message for you to send.</p>'+
    '<button type="button">Try the demo, no sign-up</button>'+
    '<small>Opens a private demo ledger with sample data. Or sign in below.</small>';
  document.body.insertBefore(el,document.body.firstChild);
  var btn=el.querySelector("button"),note=el.querySelector("small");
  btn.addEventListener("click",function(){
    btn.disabled=true;btn.textContent="Printing your receipt…";
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
  rootAuth: true,
  marketing: false,
  renderSignInPage: (props: AuthPageProps) => renderAuthPage(props) + demoStrip(props.appBasePath ?? ""),
});
