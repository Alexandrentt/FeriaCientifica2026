#pragma once
#include <Arduino.h>

// Página de monitorización servida por la propia placa.
// Almacenada como const → vive en flash (.rodata), no consume RAM.
// Se sirve en trozos de 256 bytes desde web_server.cpp.
static const char PAGE_HTML[] = R"HTML(<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UNO-R4 · Panel de sensores</title>
<style>
:root{
  --bg:#070b0f;--panel:#0e151d;--panel2:#121c26;--line:#1d2a36;
  --txt:#dbe7f0;--mut:#7b8f9f;--acc:#57e389;--acc2:#6cb6ff;
  --warn:#ffb86b;--bad:#ff6b6b;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  background:
    radial-gradient(1000px 500px at 80% -10%,#0d2033 0%,transparent 60%),
    radial-gradient(700px 400px at -10% 110%,#0c2a1e 0%,transparent 55%),
    var(--bg);
  color:var(--txt);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  min-height:100vh;padding-bottom:40px;
}
.wrap{max-width:1060px;margin:0 auto;padding:0 18px}
header.top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:22px 0 14px}
.dot{width:11px;height:11px;border-radius:50%;background:var(--mut);box-shadow:0 0 0 rgba(123,143,159,.25);transition:.3s}
.dot.on{background:var(--acc);box-shadow:0 0 12px rgba(87,227,137,.8);animation:pulse 2.2s infinite}
.dot.off{background:var(--bad);box-shadow:0 0 12px rgba(255,107,107,.7);animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.brand{font-size:20px;font-weight:700;letter-spacing:.3px}
.brand small{display:block;font-size:11px;font-weight:500;color:var(--mut);letter-spacing:.14em;text-transform:uppercase}
.spacer{flex:1}
.chip{
  display:inline-flex;align-items:center;gap:7px;background:var(--panel);
  border:1px solid var(--line);border-radius:999px;padding:6px 13px;
  font:600 12px/1 var(--mono);color:var(--mut);white-space:nowrap;
}
.chip b{color:var(--txt);font-weight:700}
.banner{
  display:none;margin:6px 0 18px;padding:12px 16px;border-radius:12px;
  border:1px solid rgba(255,184,107,.4);background:rgba(255,184,107,.08);
  color:var(--warn);font-size:14px;
}
.banner.show{display:block}
.banner.ap{border-color:rgba(108,182,255,.45);background:rgba(108,182,255,.08);color:var(--acc2)}
h2.sec{
  font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);
  margin:26px 0 12px;display:flex;align-items:center;gap:10px;
}
h2.sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{
  background:linear-gradient(180deg,var(--panel2),var(--panel));
  border:1px solid var(--line);border-radius:16px;padding:16px 16px 12px;
  transition:border-color .25s,transform .25s,box-shadow .25s;overflow:hidden;
}
.card:hover{border-color:#2c4256;transform:translateY(-3px);box-shadow:0 12px 30px -18px #000}
.card .head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
.card h3{font-size:13.5px;font-weight:600;color:#b9cbda;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pin{font:700 10px/1 var(--mono);color:var(--acc2);background:rgba(108,182,255,.12);border:1px solid rgba(108,182,255,.3);border-radius:6px;padding:3px 6px;flex:none}
.val{display:flex;align-items:baseline;gap:6px;min-height:44px}
.num{font:700 34px/1.1 var(--mono);letter-spacing:-1px;color:#eaf6ff;transition:color .3s}
.num.bump{color:var(--acc);text-shadow:0 0 18px rgba(87,227,137,.35)}
.num.na{color:#4a5b69;font-size:26px}
.unit{font:600 13px/1 var(--mono);color:var(--mut)}
canvas.spark{width:100%;height:48px;display:block;margin-top:8px;opacity:.95}
.card .foot{display:flex;justify-content:space-between;margin-top:8px;font:600 10.5px/1 var(--mono);color:var(--mut);text-transform:uppercase;letter-spacing:.08em}
.card.invalid .num{color:#4a5b69}
details.cfg{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}
details.cfg summary{cursor:pointer;padding:15px 18px;font-weight:600;font-size:14px;list-style:none;display:flex;justify-content:space-between;align-items:center}
details.cfg summary::-webkit-details-marker{display:none}
details.cfg summary::after{content:"▾";color:var(--mut);transition:.25s}
details.cfg[open] summary::after{transform:rotate(180deg)}
details.cfg .body{padding:4px 18px 18px;border-top:1px solid var(--line)}
.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:14px}
label{display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:6px;letter-spacing:.04em}
input{
  width:100%;background:#0a1119;border:1px solid var(--line);border-radius:10px;
  color:var(--txt);font:14px/1 var(--mono);padding:11px 12px;outline:none;transition:.2s;
}
input:focus{border-color:var(--acc2);box-shadow:0 0 0 3px rgba(108,182,255,.15)}
.hint{font-size:12.5px;color:var(--mut);margin-top:12px}
.hint b{color:var(--warn)}
button{
  margin-top:16px;background:linear-gradient(180deg,#1f8f57,#17734a);color:#eafff3;
  border:0;border-radius:11px;padding:12px 22px;font:700 14px/1 system-ui;cursor:pointer;
  transition:.2s;letter-spacing:.02em;
}
button:hover{filter:brightness(1.12);transform:translateY(-1px)}
button:active{transform:translateY(0)}
#toast{
  position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);opacity:0;
  background:#123526;border:1px solid rgba(87,227,137,.5);color:#c9ffe0;
  padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;
  transition:.3s;pointer-events:none;max-width:90vw;text-align:center;z-index:9;
}
#toast.show{opacity:1;transform:translate(-50%,0)}
footer.bot{margin-top:34px;text-align:center;color:#53646f;font:12px/1.7 var(--mono)}
footer.bot b{color:var(--mut)}
@media(max-width:560px){.num{font-size:28px}.brand{font-size:17px}}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <span class="dot" id="dot"></span>
    <div class="brand">UNO-R4 · Sensores<small id="subtitle">cargando…</small></div>
    <div class="spacer"></div>
    <span class="chip">IP <b id="cIp">—</b></span>
    <span class="chip">RED <b id="cSsid">—</b></span>
    <span class="chip">SEÑAL <b id="cRssi">—</b></span>
    <span class="chip">TIEMPO <b id="cUp">—</b></span>
  </header>

  <div class="banner" id="banner"></div>

  <h2 class="sec">Sensores</h2>
  <div class="grid" id="grid">
    <div class="card"><div class="head"><h3>Esperando datos…</h3></div><div class="val"><span class="num na">—</span></div></div>
  </div>

  <h2 class="sec">Configuración</h2>
  <details class="cfg" id="cfgBox">
    <summary>Ajustes de la placa y envío de datos</summary>
    <div class="body">
      <form id="cfgForm">
        <div class="fields">
          <div><label for="fName">Nombre del dispositivo</label><input id="fName" name="name" maxlength="23" placeholder="UNO-R4 Sensores"></div>
          <div><label for="fSsid">WiFi (SSID)</label><input id="fSsid" name="ssid" maxlength="32" placeholder="sin cambios"></div>
          <div><label for="fPass">WiFi (contraseña)</label><input id="fPass" name="pass" maxlength="64" type="password" placeholder="sin cambios"></div>
          <div><label for="fPush">Endpoint de envío (http://host:puerto/ruta)</label><input id="fPush" name="push" maxlength="95" placeholder="http://192.168.1.10:8080/datos"></div>
          <div><label for="fPeriod">Periodo de envío (segundos)</label><input id="fPeriod" name="period" maxlength="7" inputmode="numeric" placeholder="10"></div>
        </div>
        <button type="submit">Guardar ajustes</button>
        <p class="hint">Si cambias el WiFi, la placa se reiniciará al guardar (también se guarda en EEPROM, así que no hace falta re-flashear). El endpoint acepta <b>HTTP</b> (sin TLS) y recibe un JSON con todos los valores.</p>
      </form>
    </div>
  </details>

  <footer class="bot">
    Servido por tu <b>Arduino UNO R4 WiFi</b> · firmware <b id="fw">—</b><br>
    PlatformIO · estado cada 2 s · <span id="stamp">—</span>
  </footer>
</div>
<div id="toast"></div>

<script>
var hist={},sig='',boot=0,cfgFilled=false,okCount=0,lastOk=0;
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function hms(s){s=Math.max(0,Math.floor(s));var h=Math.floor(s/3600),m=Math.floor(s/60)%60,x=s%60;
  return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(x<10?'0':'')+x}
function fmt(v,dec,type){
  if(v==null) return '—';
  if(type==='digital') return v>=1?'ALTO':'BAJO';
  return dec>0?v.toFixed(dec):String(Math.round(v));
}
function bars(r){
  if(!r) return '····';
  var n=r>=-50?4:r>=-60?3:r>=-70?2:1;
  return '█'.repeat(n)+'░'.repeat(4-n);
}
function typeName(t){
  return {analog:'Analógico',digital:'Digital',ultrasonic:'Ultrasonido',rssi:'Interno',uptime:'Interno'}[t]||t;
}
function toast(msg){
  var t=$('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('show')},4200);
}
function drawSpark(cv,arr){
  var ctx=cv.getContext('2d'),W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  if(arr.length<2)return;
  var mn=Math.min.apply(null,arr),mx=Math.max.apply(null,arr);
  if(mx-mn<1e-9){mn-=1;mx+=1}
  var X=function(i){return 1+i*(W-2)/(arr.length-1)},
      Y=function(v){return H-2-((v-mn)/(mx-mn))*(H-4)};
  var g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(87,227,137,.35)');g.addColorStop(1,'rgba(87,227,137,0)');
  ctx.beginPath();ctx.moveTo(X(0),H);
  for(var i=0;i<arr.length;i++)ctx.lineTo(X(i),Y(arr[i]));
  ctx.lineTo(X(arr.length-1),H);ctx.closePath();ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();
  for(var j=0;j<arr.length;j++){j?ctx.lineTo(X(j),Y(arr[j])):ctx.moveTo(X(j),Y(arr[j]))}
  ctx.strokeStyle='#57e389';ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.stroke();
  ctx.beginPath();ctx.arc(X(arr.length-1),Y(arr[arr.length-1]),2.4,0,7);ctx.fillStyle='#eafff3';ctx.fill();
}
function buildCards(list){
  var html='';
  for(var i=0;i<list.length;i++){
    var c=list[i];
    html+='<article class="card" id="cd-'+esc(c.id)+'">'+
      '<div class="head"><h3 title="'+esc(c.name)+'">'+esc(c.name)+'</h3><span class="pin">'+esc(c.pin)+'</span></div>'+
      '<div class="val"><span class="num na" id="nv-'+esc(c.id)+'">—</span><span class="unit">'+esc(c.unit)+'</span></div>'+
      '<canvas class="spark" id="sp-'+esc(c.id)+'" width="240" height="48"></canvas>'+
      '<div class="foot"><span>'+typeName(c.type)+'</span><span id="ag-'+esc(c.id)+'">—</span></div>'+
    '</article>';
  }
  $('grid').innerHTML=html;
}
function render(d){
  $('dot').className='dot on';
  $('subtitle').textContent=d.device+' · '+(d.mode==='ap'?'modo punto de acceso':'conectado');
  $('fw').textContent='v'+d.fw;
  $('cIp').textContent=d.ip||'—';
  $('cSsid').textContent=d.ssid||(d.mode==='ap'?'(AP)':'—');
  $('cRssi').textContent=d.mode==='ap'?'AP':(d.rssi?d.rssi+' dBm '+bars(d.rssi):'—');
  if(!boot)boot=Date.now()-d.uptime*1000;
  $('cUp').textContent=hms(d.uptime);

  var b=$('banner');
  if(d.mode==='ap'){b.className='banner ap show';
    b.textContent='Modo punto de acceso: conéctate a la red “UNO-R4-Setup” (clave 12345678) y abre esta misma página en '+d.ip+' para configurar tu WiFi.';}
  else if(b.classList.contains('ap')){b.className='banner'}
  if(d.mode!=='ap'&&b.classList.contains('ap'))b.className='banner';

  var s='';
  for(var i=0;i<d.channels.length;i++)s+=d.channels[i].id+',';
  if(s!==sig){
    sig=s;hist={};buildCards(d.channels);
    for(var k=0;k<d.channels.length;k++)hist[d.channels[k].id]=[];
  }
  var now=Date.now();
  for(var j=0;j<d.channels.length;j++){
    var c=d.channels[j],num=$('nv-'+c.id),card=$('cd-'+c.id);
    if(!num)continue;
    var txt=fmt(c.value,c.dec,c.type);
    if(num.textContent!==txt){
      num.textContent=txt;
      num.className='num'+(c.valid?' bump':' na');
      (function(el){setTimeout(function(){el.classList.remove('bump')},650)})(num);
    }
    if(card)card.classList.toggle('invalid',!c.valid);
    if(c.valid){
      var h=hist[c.id]||(hist[c.id]=[]);
      h.push(c.value);if(h.length>48)h.shift();
      c._t=now;
      var ag=$('ag-'+c.id);
      if(ag)ag.textContent='en vivo';
    }
    var cv=$('sp-'+c.id);
    if(cv&&hist[c.id]&&hist[c.id].length>1)drawSpark(cv,hist[c.id]);
  }
  if(!cfgFilled&&d.cfg){
    cfgFilled=true;
    $('fName').value=d.cfg.name||'';
    $('fSsid').value=d.ssid||'';
    $('fPush').value=d.cfg.push||'';
    $('fPeriod').value=Math.round((d.cfg.period||10000)/1000);
    document.querySelector('#fName').placeholder=d.cfg.name||'UNO-R4 Sensores';
  }
  lastOk=now;
  $('stamp').textContent=new Date().toLocaleString('es-ES');
}
function offline(){
  if(Date.now()-lastOk<5000)return;
  $('dot').className='dot off';
  $('subtitle').textContent='sin conexión con la placa';
}
function poll(){
  fetch('/api/state',{cache:'no-store'})
    .then(function(r){if(!r.ok)throw 0;return r.json()})
    .then(render)
    .catch(offline);
}
$('cfgForm').addEventListener('submit',function(e){
  e.preventDefault();
  var f=e.target,body=new URLSearchParams();
  ['name','ssid','pass','period'].forEach(function(k){
    if(f.elements[k]&&f.elements[k].value!=='')body.set(k,f.elements[k].value);
  });
  // push se envía siempre (vacío = desactivar el envío)
  body.set('push',f.elements['push']?f.elements['push'].value:'');
  fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()})
    .then(function(r){return r.json()})
    .then(function(j){
      if(j.ok){
        toast(j.reboot?'Guardado ✓ Reiniciando la placa…':'Guardado ✓');
        if(j.reboot){setTimeout(function(){toast('Si cambiaste el WiFi, reconéctate a la nueva red y vuelve a abrir la página.')},4500);}
        f.elements['pass'].value='';
      }else toast('Error al guardar: '+(j.err||'desconocido'));
    })
    .catch(function(){toast('No se pudo contactar con la placa')});
});
poll();setInterval(poll,2000);
setInterval(function(){if(lastOk)$('cUp').textContent=hms((Date.now()-boot)/1000)},1000);
</script>
</body>
</html>)HTML";
