/**
 * The framework sign-in page, dressed in Lapse's brand: a headline and a looping
 * mini statement beside the form, plus a "Try the demo" button. The demo creates
 * a throwaway account through the framework's own register/login endpoints.
 */
const AUTH_CSS = `
@font-face{font-family:"LX Display";src:url(__BASE__/fonts/bricolage-grotesque-latin-wght-normal.woff2) format("woff2");font-weight:200 800;font-display:swap}
@font-face{font-family:"LX Sans";src:url(__BASE__/fonts/geist-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"LX Mono";src:url(__BASE__/fonts/geist-mono-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
:root{--lx-bg:#0f0d17;--lx-card:#17141f;--lx-line:#2a2636;--lx-text:#f7f6fa;--lx-soft:#a7a3b3;--lx-mute:#6f6b7b;--lx-butter:#ffd23f;--lx-coral:#ff4d6d;--lx-lime:#c6f36b;--lx-violet:#8b7bff;--lx-milk:#fbf8ff;
--lx-display:"LX Display","Geist",system-ui,sans-serif;--lx-sans:"LX Sans",system-ui,sans-serif;--lx-mono:"LX Mono",ui-monospace,monospace}
html,body{background:var(--lx-bg)!important}
body{font-family:var(--lx-sans)!important;color:var(--lx-text)!important;padding:0!important;overflow-x:hidden}
body::before,body::after{content:"";position:fixed;z-index:0;pointer-events:none;border-radius:50%;filter:blur(70px)}
body::before{width:560px;height:560px;left:-180px;top:-200px;background:radial-gradient(circle,rgba(139,123,255,.38),transparent 65%);animation:lx-drift 14s ease-in-out infinite alternate}
body::after{width:480px;height:480px;right:-160px;bottom:-200px;background:radial-gradient(circle,rgba(255,210,63,.16),transparent 65%);animation:lx-drift 18s ease-in-out infinite alternate-reverse}
@keyframes lx-drift{to{transform:translate(70px,50px) scale(1.12)}}
.auth-wave-background{display:none!important}
.auth-root .auth-page{min-height:100vh!important;display:flex;align-items:center}
.auth-root .auth-page-content{position:relative;z-index:1}
.auth-root .auth-centered{display:grid!important;grid-template-columns:minmax(0,1fr);justify-items:center;gap:22px;max-width:1080px;margin:0 auto;padding:68px 18px 40px!important}
.lx-top{position:fixed;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;padding:16px 20px}
.lx-logo{display:inline-flex;align-items:center;gap:8px;color:var(--lx-text);text-decoration:none;font:700 19px/1 var(--lx-display);letter-spacing:-.03em}
.locale-picker{z-index:40!important}
.lx-brand{width:100%;min-width:0;max-width:420px;text-align:center}
.lx-title{margin:0;font:800 34px/1.02 var(--lx-display);letter-spacing:-.04em;color:var(--lx-text)}
.lx-title s{position:relative;color:var(--lx-butter);text-decoration:none;white-space:nowrap}
.lx-title s::after{content:"";position:absolute;left:-3%;right:-3%;top:55%;height:5px;border-radius:3px;background:var(--lx-coral);transform:scaleX(0);transform-origin:left;animation:lx-strike .6s .5s cubic-bezier(.7,0,.2,1) forwards}
@keyframes lx-strike{to{transform:scaleX(1)}}
.lx-st{position:relative;display:none;margin:30px 0 0;padding:18px 18px 10px;border-radius:20px;background:var(--lx-milk);color:#1a1530;text-align:left;transform:rotate(-2deg);box-shadow:0 30px 60px rgba(0,0,0,.45)}
.lx-st__h{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;margin-bottom:6px;border-bottom:2px dashed #e3def0;font:800 18px/1 var(--lx-display);letter-spacing:-.03em}
.lx-st__h span{padding:5px 10px;border-radius:99px;background:#ece8fb;color:#5b4bd6;font:600 11.5px/1 var(--lx-sans);letter-spacing:0}
.lx-row{position:relative;display:grid;grid-template-columns:50px 1fr auto;gap:10px;padding:9px 8px;margin:0 -8px;border-radius:10px;font:500 12.5px/1.3 var(--lx-mono);color:#6e6889}
.lx-row b{font-weight:500;color:#1a1530}
.lx-row.is-hit{animation:lx-hit 6s infinite}
.lx-row.is-hit i{position:absolute;right:6px;top:50%;padding:2px 8px;border:2.5px solid var(--lx-coral);border-radius:7px;color:var(--lx-coral);font:800 13px/1 var(--lx-display);font-style:normal;letter-spacing:.06em;background:var(--lx-milk);opacity:0;transform:translateY(-50%) rotate(-8deg) scale(1.8);animation:lx-stamp 6s infinite}
.lx-row.is-hit b{background:linear-gradient(var(--lx-coral),var(--lx-coral)) 0 55%/0 2px no-repeat;animation:lx-line 6s infinite}
.lx-row.is-keep i{position:absolute;right:6px;top:50%;padding:2px 8px;border:2.5px solid #5f9a1a;border-radius:7px;color:#5f9a1a;font:800 13px/1 var(--lx-display);font-style:normal;letter-spacing:.06em;background:var(--lx-milk);transform:translateY(-50%) rotate(-6deg)}
@keyframes lx-hit{0%,15%{background:transparent}25%,100%{background:rgba(255,210,63,.35)}}
@keyframes lx-stamp{0%,40%{opacity:0;transform:translateY(-50%) rotate(-8deg) scale(1.8)}48%,92%{opacity:1;transform:translateY(-50%) rotate(-8deg) scale(1)}100%{opacity:0}}
@keyframes lx-line{0%,45%{background-size:0 2px}55%,100%{background-size:100% 2px}}
.lx-saved{position:absolute;right:-14px;bottom:-18px;padding:8px 12px;border-radius:12px;background:var(--lx-lime);color:#1a2a05;font:800 14px/1 var(--lx-display);transform:rotate(5deg);box-shadow:0 12px 24px rgba(0,0,0,.35);animation:lx-pop 6s infinite}
@keyframes lx-pop{0%,50%{opacity:0;transform:rotate(5deg) scale(.6)}58%,92%{opacity:1;transform:rotate(5deg) scale(1)}100%{opacity:0}}
.lx-tick{margin:18px -18px 0;overflow:hidden;max-width:100vw;-webkit-mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.lx-tick div{display:flex;gap:8px;width:max-content;animation:lx-marq 22s linear infinite}
.lx-tick span{padding:7px 11px;border-radius:99px;border:1px solid var(--lx-line);background:rgba(255,255,255,.03);color:var(--lx-soft);font:500 12px/1 var(--lx-mono);white-space:nowrap}
.lx-tick span.hit{border-color:rgba(255,77,109,.45);background:rgba(255,77,109,.1);color:#ffb3c0;text-decoration:line-through;text-decoration-color:var(--lx-coral)}
@keyframes lx-marq{to{transform:translateX(-50%)}}
.lx-demo{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;height:52px;margin-top:20px;border:0;border-radius:14px;background:var(--lx-butter);color:#1a1530;font:700 16px/1 var(--lx-sans);cursor:pointer;box-shadow:0 10px 30px rgba(255,210,63,.28);transition:transform .15s,box-shadow .15s}
.lx-demo:hover{transform:translateY(-1px);box-shadow:0 14px 36px rgba(255,210,63,.38)}.lx-demo:disabled{opacity:.65;cursor:wait}
.lx-note{display:block;margin-top:10px;color:var(--lx-mute);font:400 12.5px/1.4 var(--lx-sans)}.lx-note.err{color:#ffb3c0}
.lx-or{display:flex;align-items:center;gap:12px;margin-top:22px;color:var(--lx-mute);font:500 12px/1 var(--lx-sans);text-transform:uppercase;letter-spacing:.08em}
.lx-or::before,.lx-or::after{content:"";flex:1;height:1px;background:var(--lx-line)}
.auth-root .card{position:relative;max-width:420px;padding:26px 24px 22px;background:rgba(23,20,31,.86);border:1px solid var(--lx-line);border-radius:22px;box-shadow:0 30px 70px rgba(0,0,0,.4);backdrop-filter:blur(16px)}
.auth-root .card h1{margin:0 0 4px;font:800 26px/1.1 var(--lx-display);letter-spacing:-.035em;color:var(--lx-text);text-align:left}
.auth-root .card .subtitle{margin-bottom:18px;color:var(--lx-soft);font:400 14px/1.4 var(--lx-sans)}
.auth-root .tabs{padding:4px;margin-bottom:18px;background:var(--lx-bg);border:1px solid var(--lx-line);border-radius:12px}
.auth-root .tab{padding:9px 10px;border-radius:9px;color:var(--lx-soft);font:500 13.5px/1 var(--lx-sans)}
.auth-root .tab.active{background:#2a2636;color:var(--lx-text);box-shadow:none}
.auth-root label{margin-bottom:6px;color:var(--lx-soft);font:500 13px/1.2 var(--lx-sans)}
.auth-root input{height:46px;padding:0 14px;margin-bottom:14px;background:var(--lx-bg);border:1px solid var(--lx-line);border-radius:12px;color:var(--lx-text);font:400 15px/1 var(--lx-sans);transition:border-color .15s,box-shadow .15s}
.auth-root input::placeholder{color:var(--lx-mute)}
.auth-root input:focus{border-color:var(--lx-butter);box-shadow:0 0 0 3px rgba(255,210,63,.16)}
.auth-root button[type="submit"],.auth-root .btn-primary{height:48px;margin-top:4px;background:var(--lx-text);color:#15131c;border-radius:12px;font:700 15px/1 var(--lx-sans);transition:background .15s,transform .15s}
.auth-root button[type="submit"]:hover,.auth-root .btn-primary:hover{background:#fff;transform:translateY(-1px)}
.auth-root .link-button{color:var(--lx-soft);font-family:var(--lx-sans)}
.auth-root .msg{font-family:var(--lx-sans)}.auth-root .msg.error{color:#ffb3c0}
.auth-root .verification-panel{border-radius:14px}
@media (min-width:960px){
.auth-root .auth-centered{grid-template-columns:minmax(0,1fr) 420px;align-items:center;gap:72px;padding:90px 40px 60px!important}
.lx-top{padding:22px 40px}
.lx-brand{max-width:500px;text-align:left;justify-self:start}
.lx-title{font-size:58px}
.lx-st{display:block;max-width:420px;margin-top:36px}
.lx-tick{display:none}
.lx-demo{width:auto;padding:0 26px;margin-top:34px}
.lx-or{display:none}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.lx-title s::after{transform:scaleX(1)}}
`;

const MARK = `<svg viewBox="0 0 64 64" width="24" height="24" fill="none" aria-hidden="true"><path d="M47.41 39.18A17 17 0 1 1 40.5 17.28" stroke="#f7f6fa" stroke-width="6" stroke-linecap="round"/><path d="M46.13 20.53L37.75 22.04L43.25 12.52Z" fill="#f7f6fa" stroke="#f7f6fa" stroke-width="2" stroke-linejoin="round"/><path d="M40.9 30.75L56.75 28.52" stroke="#ff5a6e" stroke-width="6" stroke-linecap="round"/></svg>`;

const TICK = ["GROCERY MART #214", "NETFLIX.COM", "TRANSFER FROM ADA", "FOCUSFLOW* TRIAL", "UBER *TRIP", "CANVA* 104-2219", "CAFE NERO", "APPLE.COM/BILL"];
const TICK_HIT = new Set(["FOCUSFLOW* TRIAL", "CANVA* 104-2219", "APPLE.COM/BILL"]);

function brandHtml(base: string): string {
  const chips = TICK.map((t) => `<span${TICK_HIT.has(t) ? ' class="hit"' : ""}>${t}</span>`).join("");
  return (
    `<div class="lx-top"><a class="lx-logo" href="${base}/">${MARK}Lapse</a></div>` +
    `<aside class="lx-brand">` +
    `<h1 class="lx-title">Never pay for something you <s>forgot</s> you had.</h1>` +
    `<div class="lx-st" aria-hidden="true"><div class="lx-st__h">Statement<span>3 repeat charges</span></div>` +
    `<div class="lx-row"><span>02 Oct</span><b>GROCERY MART #214</b><span>-$23.40</span></div>` +
    `<div class="lx-row is-keep"><span>03 Oct</span><b>NETFLIX.COM</b><i>KEEP</i></div>` +
    `<div class="lx-row"><span>04 Oct</span><b>TRANSFER FROM ADA</b><span>+$200.00</span></div>` +
    `<div class="lx-row is-hit"><span>06 Oct</span><b>FOCUSFLOW* TRIAL</b><i>CANCEL</i></div>` +
    `<div class="lx-row"><span>08 Oct</span><b>UBER *TRIP</b><span>-$6.20</span></div>` +
    `<div class="lx-saved">Saved $39.99/yr</div></div>` +
    `<div class="lx-tick" aria-hidden="true"><div>${chips}${chips}</div></div>` +
    `<button type="button" class="lx-demo">Try the demo <span aria-hidden="true">→</span></button>` +
    `<small class="lx-note">No sign-up. Sample data, private to you.</small>` +
    `<div class="lx-or">or use your account</div>` +
    `</aside>`
  );
}

export function brandScript(appBasePath: string): string {
  const base = appBasePath.replace(/\/$/, "");
  const css = AUTH_CSS.split("__BASE__").join(base);
  return `<script>(function(){
var CSS=${JSON.stringify(css)},HTML=${JSON.stringify(brandHtml(base))},BASE=${JSON.stringify(base)};
function mount(){
  if(document.querySelector(".lx-brand"))return;
  var host=document.querySelector(".auth-centered");if(!host)return;
  var st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
  var tmp=document.createElement("div");tmp.innerHTML=HTML;
  document.body.appendChild(tmp.querySelector(".lx-top"));
  var brand=tmp.querySelector(".lx-brand");host.insertBefore(brand,host.firstChild);
  var btn=brand.querySelector(".lx-demo"),note=brand.querySelector(".lx-note"),label=btn.innerHTML;
  btn.addEventListener("click",function(){
    btn.disabled=true;btn.textContent="Opening your demo…";
    var id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()).replace(/[^a-z0-9]/gi,"").slice(0,12).toLowerCase();
    var cred={email:"demo-"+id+"@demo.lapse.app",password:"Lapse-demo-"+(crypto.randomUUID?crypto.randomUUID():id+id)};
    function post(p){return fetch(BASE+p,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(cred)})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j;});});}
    post("/_agent-native/auth/register").then(function(){return post("/_agent-native/auth/login");})
      .then(function(){location.assign(BASE+"/ledger?demo=1");})
      .catch(function(e){btn.disabled=false;btn.innerHTML=label;note.className="lx-note err";note.textContent="Couldn't open the demo ("+e.message+"). Try again, or use your account below.";});
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();</script>`;
}
