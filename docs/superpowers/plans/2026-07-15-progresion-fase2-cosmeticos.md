# Progresión Fase 2 — Cosméticos y Tienda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir cosméticos personalizables (colores de pelaje, accesorios del gorila, estelas de banana, estilos de explosión) con una tienda para comprarlos y equiparlos gastando las monedas de la Fase 1.

**Architecture:** Todo inline en `index.html`, ES5. Un catálogo `COSMETICS` y helpers de estado (`gcos` en localStorage). Los cosméticos equipados se inyectan en las rutinas de render existentes (`drawG`, `drawBan`, `drawExps`) mediante puntos de inyección mínimos, aplicándose solo al gorila/banana del jugador humano y nunca en modo 2P. Una tienda modal reutiliza la clase `.overlay` existente. Sin backend, sin dependencias.

**Tech Stack:** HTML5 Canvas, JavaScript ES5, `localStorage` vía `LS()`.

## Global Constraints

- **ES5 solamente:** `var`, `function`, sin `const`/`let`/arrow functions. Coincidir con el estilo compacto existente.
- **Inline en `index.html`:** no crear archivos JS nuevos.
- **Al modificar assets cacheados hay que subir la caché del SW:** tras completar la fase, bump `CACHE` en `sw.js` (actualmente `gorilas-v10` → `gorilas-v11`) para que los usuarios reciban los cambios. Esto se hace en la última tarea.
- **Sin dependencias externas** ni backend. Persistencia solo vía `LS()`.
- **Clave de estado:** `gcos` = `{owned:[id...], equip:{fur,acc,trail,boom}}`.
- **Condición de aplicación:** los cosméticos se aplican SOLO cuando `g.who===0` (gorila humano) / `banana.from===0` (banana humana) Y `gameMode!=='2p'`. En 2P todo va default.
- **Precios (monedas):** fur: default 0, gold 50, blue 75, pink 100, white 100, camo 150. acc: none 0, cap 100, glasses 100, band 150, crown 250. trail: none 0, fire 75, rainbow 150, stars 150, ice 200. boom: default 0, gold 75, rainbow 150, plasma 200.
- **Gasto:** usar `spendCoins(n)` de la Fase 1 (ya valida saldo y `n<0`).
- **Verificación:** sin framework de test. Servir con `python -m http.server` y verificar en navegador (Playwright/Chrome). Como el Service Worker cachea, desregistrarlo y limpiar cachés antes de recargar: `navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))` y `caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)))`, luego recargar con un query string nuevo.

---

## File Structure

- **Modify:** `index.html` — único archivo de código. Zonas:
  - Tras los helpers de economía (~línea 313): catálogo `COSMETICS` y helpers de `gcos`.
  - `drawG` (~línea 459-505): inyección de pelaje + accesorio.
  - `drawBan` (~línea 506-514): inyección de estela.
  - `startExp` (~línea 655) y `drawExps` (~línea 515-519): inyección de estilo de explosión.
  - HTML: botón "Tienda" en `#startScreen` (~línea 174) y un overlay `#shopScreen` nuevo.
  - CSS en `<head>`: estilos de la tienda (pestañas, rejilla, ítems).
  - Array `ACHS` (~línea 286): logro `collector`.
- **Modify (última tarea):** `sw.js` — bump de `CACHE`.

---

## Task 1: Modelo de datos de cosméticos

**Files:**
- Modify: `index.html` (tras la línea 313, después de `spendCoins`)

**Interfaces:**
- Consumes: `LS(k,v)`, `spendCoins(n)`, `getCoins()` (Fase 1).
- Produces:
  - `COSMETICS` — objeto `{fur:[...],acc:[...],trail:[...],boom:[...]}`, cada ítem `{id,name,cost,...params}`.
  - `loadCos()` → `{owned:[...],equip:{fur,acc,trail,boom}}` (con defaults si no existe o corrupto).
  - `cosItem(cat,id)` → el objeto de ítem, o el ítem por defecto de esa categoría si no se encuentra.
  - `equipped(cat)` → el objeto de ítem equipado en esa categoría (default si el equipado no se posee).
  - `ownsCos(id)` → `boolean`.
  - `buyCos(id)` → `'ok'|'owned'|'nofunds'|'bad'`. Si compra, descuenta con `spendCoins`, añade a `owned`, persiste, dispara `collector` si `owned.length>=5` cosméticos de pago... (ver nota) y llama `updCoinsUI`.
  - `equipCos(cat,id)` → `boolean` (equipa si se posee; persiste).

- [ ] **Step 1: Añadir el catálogo y los helpers**

Insertar después de `spendCoins` (línea 313):

```javascript
// ---- Cosmetics ----
var COSMETICS={
  fur:[
    {id:'fur_default',name:'Clasico',cost:0,body:'#5a4636',dk:'#3d2f22',ch:'#7d6650',gl:'#7fffd4'},
    {id:'fur_gold',name:'Dorado',cost:50,body:'#c8960a',dk:'#8a6508',ch:'#e0b020',gl:'#ffe95b'},
    {id:'fur_blue',name:'Azul',cost:75,body:'#3f5f9a',dk:'#2a3f6a',ch:'#5f7fc0',gl:'#7fd4ff'},
    {id:'fur_pink',name:'Rosa Neon',cost:100,body:'#d84f9a',dk:'#a03570',ch:'#ff7ac0',gl:'#ff9eec'},
    {id:'fur_white',name:'Blanco',cost:100,body:'#d8d8e0',dk:'#9a9aac',ch:'#f0f0f8',gl:'#ffffff'},
    {id:'fur_camo',name:'Camuflaje',cost:150,body:'#5a6b3a',dk:'#3d4a25',ch:'#7a8b50',gl:'#b0ff7f'}
  ],
  acc:[
    {id:'acc_none',name:'Ninguno',cost:0,draw:null},
    {id:'acc_cap',name:'Gorra',cost:100,draw:'cap'},
    {id:'acc_glasses',name:'Gafas',cost:100,draw:'glasses'},
    {id:'acc_band',name:'Diadema',cost:150,draw:'band'},
    {id:'acc_crown',name:'Corona',cost:250,draw:'crown'}
  ],
  trail:[
    {id:'trail_none',name:'Ninguna',cost:0,style:'default'},
    {id:'trail_fire',name:'Fuego',cost:75,style:'fire'},
    {id:'trail_rainbow',name:'Arcoiris',cost:150,style:'rainbow'},
    {id:'trail_stars',name:'Estrellas',cost:150,style:'stars'},
    {id:'trail_ice',name:'Hielo',cost:200,style:'ice'}
  ],
  boom:[
    {id:'boom_default',name:'Clasica',cost:0,style:'default'},
    {id:'boom_gold',name:'Dorada',cost:75,style:'gold'},
    {id:'boom_rainbow',name:'Arcoiris',cost:150,style:'rainbow'},
    {id:'boom_plasma',name:'Plasma',cost:200,style:'plasma'}
  ]
};
function cosDefaults(){return {owned:['fur_default','acc_none','trail_none','boom_default'],equip:{fur:'fur_default',acc:'acc_none',trail:'trail_none',boom:'boom_default'}}}
function loadCos(){var c=LS('gcos');if(!c||!c.owned||!c.equip)return cosDefaults();var d=cosDefaults();for(var i=0;i<d.owned.length;i++)if(c.owned.indexOf(d.owned[i])<0)c.owned.push(d.owned[i]);var cats=['fur','acc','trail','boom'];for(var j=0;j<cats.length;j++){if(!c.equip[cats[j]]||c.owned.indexOf(c.equip[cats[j]])<0)c.equip[cats[j]]=d.equip[cats[j]]}return c}
function cosItem(cat,id){var arr=COSMETICS[cat]||[];for(var i=0;i<arr.length;i++)if(arr[i].id===id)return arr[i];return arr[0]}
function equipped(cat){return cosItem(cat,loadCos().equip[cat])}
function ownsCos(id){return loadCos().owned.indexOf(id)>=0}
function cosCatOf(id){var cats=['fur','acc','trail','boom'];for(var i=0;i<cats.length;i++){var arr=COSMETICS[cats[i]];for(var j=0;j<arr.length;j++)if(arr[j].id===id)return cats[i]}return null}
function buyCos(id){var cat=cosCatOf(id);if(!cat)return 'bad';if(ownsCos(id))return 'owned';var it=cosItem(cat,id);if(!spendCoins(it.cost))return 'nofunds';var c=loadCos();c.owned.push(id);LS('gcos',c);var paid=0;for(var i=0;i<c.owned.length;i++)if((cosItem(cosCatOf(c.owned[i]),c.owned[i])||{}).cost>0)paid++;if(paid>=5)unlockAch('collector');if(typeof updCoinsUI==='function')updCoinsUI();return 'ok'}
function equipCos(cat,id){if(!ownsCos(id))return false;if(cosCatOf(id)!==cat)return false;var c=loadCos();c.equip[cat]=id;LS('gcos',c);return true}
```

Nota sobre `collector`: cuenta cosméticos de PAGO poseídos (cost>0); a las 5 compras se desbloquea. El logro `collector` se añade a `ACHS` en la Task 6 (junto al resto de la UI de tienda); hasta entonces `unlockAch('collector')` es un no-op seguro.

- [ ] **Step 2: Verificar en navegador**

Servir `index.html`, desregistrar SW y limpiar cachés, recargar. En consola:

```javascript
localStorage.removeItem('gcos'); localStorage.setItem('gcoins','1000');
console.log(loadCos().equip.fur);              // "fur_default"
console.log(ownsCos('fur_gold'));              // false
console.log(buyCos('fur_gold'));               // "ok"
console.log(ownsCos('fur_gold'));              // true
console.log(getCoins());                       // 950  (1000-50)
console.log(buyCos('fur_gold'));               // "owned"
console.log(equipCos('fur','fur_gold'));       // true
console.log(equipped('fur').id);               // "fur_gold"
console.log(equipCos('trail','trail_fire'));   // false (no comprada)
console.log(buyCos('boom_bogus'));             // "bad"
```

Esperado: los valores coinciden con los comentarios.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: modelo de datos y helpers de cosmeticos"
```

---

## Task 2: Aplicar pelaje y accesorio en drawG

**Files:**
- Modify: `index.html` — `drawG` (~línea 459-505)

**Interfaces:**
- Consumes: `equipped(cat)`, `gameMode` global.
- Produces: efecto visual; sin nueva API.

- [ ] **Step 1: Inyectar el pelaje del jugador**

En `drawG`, localizar la línea (≈463):

```javascript
  var body=g.who===0?'#5a4636':'#4a3548',dk=g.who===0?'#3d2f22':'#332333',ch=g.who===0?'#7d6650':'#6a4d63',gl=g.who===0?'#7fffd4':'#ff9eb5';
```

Añadir JUSTO DESPUÉS:

```javascript
  if(g.who===0&&gameMode!=='2p'){var fc=equipped('fur');body=fc.body;dk=fc.dk;ch=fc.ch;gl=fc.gl;}
```

- [ ] **Step 2: Inyectar el accesorio del jugador**

En `drawG`, localizar el final del dibujo de la cara, la línea `ctx.stroke();` que precede a `ctx.globalAlpha=1;ctx.restore();g._s=s;` (≈503-504). Insertar el bloque de accesorio ENTRE `ctx.stroke();` y `ctx.globalAlpha=1;ctx.restore();`:

```javascript
  if(g.who===0&&gameMode!=='2p'){var ac=equipped('acc');if(ac&&ac.draw){ctx.save();
    if(ac.draw==='cap'){ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(0,-s*1.02,s*.5,Math.PI,0);ctx.fill();ctx.fillStyle='#922b21';ctx.fillRect(-s*.05,-s*1.5,s*.1,s*.5);ctx.beginPath();ctx.ellipse(s*.2,-s*1.0,s*.4,s*.14,0,0,Math.PI);ctx.fill();}
    else if(ac.draw==='glasses'){ctx.fillStyle='rgba(20,20,30,0.9)';ctx.beginPath();ctx.arc(-s*.15,-s*.88,s*.16,0,7);ctx.fill();ctx.beginPath();ctx.arc(s*.17,-s*.88,s*.16,0,7);ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=s*.04;ctx.beginPath();ctx.moveTo(-s*.02,-s*.9);ctx.lineTo(s*.04,-s*.9);ctx.stroke();}
    else if(ac.draw==='band'){ctx.fillStyle='#2980b9';ctx.fillRect(-s*.5,-s*1.02,s*1.0,s*.14);ctx.fillStyle='#e74c3c';ctx.beginPath();ctx.arc(-s*.35,-s*.95,s*.06,0,7);ctx.fill();}
    else if(ac.draw==='crown'){ctx.fillStyle='#f1c40f';ctx.beginPath();ctx.moveTo(-s*.4,-s*1.05);ctx.lineTo(-s*.4,-s*1.35);ctx.lineTo(-s*.2,-s*1.15);ctx.lineTo(0,-s*1.45);ctx.lineTo(s*.2,-s*1.15);ctx.lineTo(s*.4,-s*1.35);ctx.lineTo(s*.4,-s*1.05);ctx.closePath();ctx.fill();ctx.fillStyle='#e74c3c';ctx.beginPath();ctx.arc(0,-s*1.2,s*.05,0,7);ctx.fill();}
    ctx.restore();}}
```

- [ ] **Step 2b: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola preparar el estado y arrancar una partida:

```javascript
localStorage.setItem('gcoins','2000');
localStorage.setItem('gcos', JSON.stringify({owned:['fur_default','acc_none','trail_none','boom_default','fur_gold','acc_crown'],equip:{fur:'fur_gold',acc:'acc_crown',trail:'trail_none',boom:'boom_default'}}));
```

Luego click en JUGAR (modo vs CPU). Esperado: el gorila del jugador (izquierda) se dibuja con pelaje dorado y una corona; el gorila CPU sigue con su color por defecto y sin accesorio. Cambiar `gameMode` a 2P y confirmar que ambos van default (sin corona). Adjuntar captura o describir lo observado.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: aplicar pelaje y accesorio del jugador en drawG"
```

---

## Task 3: Aplicar estela de banana en drawBan

**Files:**
- Modify: `index.html` — `drawBan` (~línea 506-507)

**Interfaces:**
- Consumes: `equipped('trail')`, `banana.from`, `gameMode`.
- Produces: efecto visual.

- [ ] **Step 1: Reemplazar el render de la estela**

En `drawBan`, localizar la línea (≈507):

```javascript
  if(!banana)return;for(var i=0;i<trail.length;i++){var t=trail[i],a=i/trail.length;ctx.fillStyle='rgba(255,230,90,'+a*.4+')';ctx.beginPath();ctx.arc(t.x,t.y,a*5,0,7);ctx.fill()}
```

Reemplazarla por:

```javascript
  if(!banana)return;var tst=(banana.from===0&&gameMode!=='2p')?equipped('trail').style:'default';for(var i=0;i<trail.length;i++){var t=trail[i],a=i/trail.length;ctx.save();
    if(tst==='fire'){ctx.fillStyle='rgba('+Math.floor(255)+','+Math.floor(80+a*120)+',30,'+a*.55+')';ctx.beginPath();ctx.arc(t.x,t.y,a*6,0,7);ctx.fill();}
    else if(tst==='rainbow'){ctx.fillStyle='hsla('+((i*30)%360)+',90%,60%,'+a*.6+')';ctx.beginPath();ctx.arc(t.x,t.y,a*5,0,7);ctx.fill();}
    else if(tst==='ice'){ctx.fillStyle='rgba('+Math.floor(150+a*105)+','+Math.floor(220)+',255,'+a*.55+')';ctx.beginPath();ctx.arc(t.x,t.y,a*5,0,7);ctx.fill();}
    else if(tst==='stars'){ctx.fillStyle='rgba(255,240,140,'+a*.7+')';var ss=a*4;ctx.beginPath();ctx.moveTo(t.x,t.y-ss);ctx.lineTo(t.x+ss*.3,t.y-ss*.3);ctx.lineTo(t.x+ss,t.y);ctx.lineTo(t.x+ss*.3,t.y+ss*.3);ctx.lineTo(t.x,t.y+ss);ctx.lineTo(t.x-ss*.3,t.y+ss*.3);ctx.lineTo(t.x-ss,t.y);ctx.lineTo(t.x-ss*.3,t.y-ss*.3);ctx.closePath();ctx.fill();}
    else{ctx.fillStyle='rgba(255,230,90,'+a*.4+')';ctx.beginPath();ctx.arc(t.x,t.y,a*5,0,7);ctx.fill();}
    ctx.restore();}
```

- [ ] **Step 2: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Preparar estado con estela de fuego equipada y comprada:

```javascript
localStorage.setItem('gcos', JSON.stringify({owned:['fur_default','acc_none','trail_none','boom_default','trail_fire'],equip:{fur:'fur_default',acc:'acc_none',trail:'trail_fire',boom:'boom_default'}}));
```

Jugar vs CPU y lanzar una banana como jugador. Esperado: la estela del proyectil del jugador es rojo-naranja (fuego), no amarilla. El tiro de la CPU mantiene la estela amarilla por defecto. Describir lo observado.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: aplicar estela de banana del jugador segun cosmetico"
```

---

## Task 4: Aplicar estilo de explosión

**Files:**
- Modify: `index.html` — `startExp` (~línea 655-656) y `drawExps` (~línea 516)

**Interfaces:**
- Consumes: `equipped('boom')`, `banana.from`, `gameMode`.
- Produces: cada objeto de explosión lleva `boom` (string de estilo); `drawExps` lo usa.

- [ ] **Step 1: Guardar el estilo en la explosión**

En `startExp`, localizar (≈656):

```javascript
  var maxR=big?(mega?130:80):(mega?65:42);explosions.push({x:x,y:y,r:1,max:maxR,big:big,ring:1,ringOp:.6});
```

Reemplazar por:

```javascript
  var maxR=big?(mega?130:80):(mega?65:42);var bst=(banana&&banana.from===0&&gameMode!=='2p')?equipped('boom').style:'default';explosions.push({x:x,y:y,r:1,max:maxR,big:big,ring:1,ringOp:.6,boom:bst});
```

- [ ] **Step 2: Usar el estilo en drawExps**

En `drawExps`, localizar la línea que crea el gradiente (≈516):

```javascript
  for(var i=0;i<explosions.length;i++){var e=explosions[i];ctx.save();ctx.shadowColor='#ff8030';ctx.shadowBlur=30;var g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r);g.addColorStop(0,'rgba(255,255,220,0.98)');g.addColorStop(.3,'rgba(255,200,60,0.95)');g.addColorStop(.65,'rgba(255,110,40,0.85)');g.addColorStop(1,'rgba(200,40,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();
```

Reemplazar el fragmento desde `ctx.shadowColor='#ff8030';` hasta `...ctx.fill();` por (mantener el resto del bucle igual):

```javascript
  for(var i=0;i<explosions.length;i++){var e=explosions[i];ctx.save();var bs=e.boom||'default';var sc='#ff8030',cs;
    if(bs==='gold'){sc='#ffcf40';cs=['rgba(255,255,230,0.98)','rgba(255,215,90,0.95)','rgba(230,160,30,0.85)','rgba(150,90,10,0)'];}
    else if(bs==='rainbow'){sc='#ff5edb';cs=['rgba(255,255,255,0.98)','rgba(120,220,255,0.95)','rgba(200,100,255,0.85)','rgba(255,80,160,0)'];}
    else if(bs==='plasma'){sc='#40e0ff';cs=['rgba(240,255,255,0.98)','rgba(90,220,255,0.95)','rgba(140,90,255,0.85)','rgba(60,20,120,0)'];}
    else{cs=['rgba(255,255,220,0.98)','rgba(255,200,60,0.95)','rgba(255,110,40,0.85)','rgba(200,40,30,0)'];}
    ctx.shadowColor=sc;ctx.shadowBlur=30;var g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r);g.addColorStop(0,cs[0]);g.addColorStop(.3,cs[1]);g.addColorStop(.65,cs[2]);g.addColorStop(1,cs[3]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();
```

(El resto del cuerpo del bucle —`if(e.ringOp>0){...}` y `ctx.restore()}`— queda sin cambios.)

- [ ] **Step 3: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Estado con explosión plasma:

```javascript
localStorage.setItem('gcos', JSON.stringify({owned:['fur_default','acc_none','trail_none','boom_default','boom_plasma'],equip:{fur:'fur_default',acc:'acc_none',trail:'trail_none',boom:'boom_plasma'}}));
```

Jugar vs CPU e impactar con un tiro del jugador. Esperado: la explosión del jugador es cian/púrpura (plasma) en vez de naranja; la explosión de un impacto de la CPU sigue naranja por defecto. Describir lo observado.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: aplicar estilo de explosion del jugador"
```

---

## Task 5: UI de la tienda (estructura y render)

**Files:**
- Modify: `index.html` — CSS en `<head>`; botón en `#startScreen` (~línea 174); nuevo overlay `#shopScreen` tras `#endScreen` (~línea 190); funciones de render tras `updCoinsUI`.

**Interfaces:**
- Consumes: `COSMETICS`, `loadCos`, `equipped`, `ownsCos`, `getCoins`, `updCoinsUI`.
- Produces:
  - `openShop()` / `closeShop()` — muestran/ocultan `#shopScreen`.
  - `shopTab` (var global, categoría activa) y `renderShop()` — pinta la rejilla de la pestaña activa.
  - Los botones de ítem invocan `shopBuy(id)` / `shopEquip(cat,id)` — DEFINIDOS en Task 6 (en esta tarea `renderShop` los referencia por `onclick`; hasta Task 6 el click no hará nada útil pero no debe romper: definir stubs `function shopBuy(id){}` y `function shopEquip(cat,id){}` que se completan en Task 6). 

- [ ] **Step 1: Añadir CSS de la tienda**

En el `<style>` del `<head>`, añadir al final (antes de `</style>`):

```css
#shopScreen .shopTabs{display:flex;gap:6px;margin:10px 0;flex-wrap:wrap;justify-content:center}
#shopScreen .shopTab{padding:6px 12px;border-radius:14px;border:1px solid #4a4a6a;background:#22223a;color:#ccd;font-size:13px;cursor:pointer}
#shopScreen .shopTab.active{background:#7a4dff;color:#fff;border-color:#7a4dff}
#shopGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;width:100%;max-width:520px;margin:0 auto;max-height:52vh;overflow-y:auto;padding:4px}
.shopItem{background:#1c1c30;border:1px solid #3a3a5a;border-radius:12px;padding:10px;text-align:center;font-size:12px}
.shopItem .swatch{width:100%;height:44px;border-radius:8px;margin-bottom:6px}
.shopItem .nm{font-weight:700;color:#eef}
.shopItem .pr{color:#ffd83b;margin:4px 0}
.shopItem button{width:100%;padding:6px;border-radius:8px;border:none;font-weight:700;cursor:pointer;margin-top:4px}
.shopItem .buyBtn{background:#2ecc71;color:#04240f}
.shopItem .buyBtn:disabled{background:#444;color:#888;cursor:default}
.shopItem .eqBtn{background:#7a4dff;color:#fff}
.shopItem .eqBtn.on{background:#333;color:#9f9;cursor:default}
```

- [ ] **Step 2: Añadir el botón "Tienda" en el menú**

En `#startScreen`, tras el elemento `#coinBal` (añadido en Fase 1) y antes de `#statsLine`, insertar:

```html
  <button class="btn" id="shopBtn" style="background:#7a4dff;margin-top:8px">&#x1F6D2; TIENDA</button>
```

- [ ] **Step 3: Añadir el overlay de la tienda**

Tras el cierre de `#endScreen` (`</div>` de la línea ≈190), insertar:

```html
<div class="overlay hidden" id="shopScreen">
  <div class="emoji">&#x1F6D2;</div>
  <h1>TIENDA</h1>
  <div class="stats" id="shopCoins" style="font-weight:700">&#x1FA99; 0</div>
  <div class="shopTabs" id="shopTabs">
    <button class="shopTab active" data-cat="fur">Pelaje</button>
    <button class="shopTab" data-cat="acc">Accesorios</button>
    <button class="shopTab" data-cat="trail">Estelas</button>
    <button class="shopTab" data-cat="boom">Explosiones</button>
  </div>
  <div id="shopGrid"></div>
  <button class="btn" id="shopBackBtn" style="margin-top:14px">VOLVER</button>
</div>
```

- [ ] **Step 4: Añadir las funciones de render y wiring**

Tras `updCoinsUI` (Fase 1), insertar:

```javascript
var shopTab='fur';
function shopSwatch(cat,it){
  if(cat==='fur')return '<div class="swatch" style="background:'+it.body+'"></div>';
  if(cat==='trail'){var m={default:'#ffe65a',fire:'#ff5a1e',rainbow:'linear-gradient(90deg,#f00,#ff0,#0f0,#09f,#a0f)',ice:'#9be0ff',stars:'#fff08c'};return '<div class="swatch" style="background:'+(m[it.style]||'#ffe65a')+'"></div>';}
  if(cat==='boom'){var b={default:'#ff8030',gold:'#ffcf40',rainbow:'linear-gradient(90deg,#7cf,#c6f,#f5a)',plasma:'#40e0ff'};return '<div class="swatch" style="background:'+(b[it.style]||'#ff8030')+'"></div>';}
  var ic={acc_none:'&#x1F6AB;',acc_cap:'&#x1F9E2;',acc_glasses:'&#x1F576;',acc_band:'&#x1F3BD;',acc_crown:'&#x1F451;'};
  return '<div class="swatch" style="display:flex;align-items:center;justify-content:center;font-size:28px;background:#101020">'+(ic[it.id]||'')+'</div>';
}
function renderShop(){
  var el=document.getElementById('shopGrid');if(!el)return;var cos=loadCos();var eqId=cos.equip[shopTab];var arr=COSMETICS[shopTab];var html='';
  for(var i=0;i<arr.length;i++){var it=arr[i];var owned=cos.owned.indexOf(it.id)>=0;var isEq=eqId===it.id;
    html+='<div class="shopItem">'+shopSwatch(shopTab,it)+'<div class="nm">'+it.name+'</div>';
    if(owned){html+='<button class="eqBtn'+(isEq?' on':'')+'" '+(isEq?'disabled':'onclick="shopEquip(\''+shopTab+'\',\''+it.id+'\')"')+'>'+(isEq?'EQUIPADO':'EQUIPAR')+'</button>';}
    else{var canBuy=getCoins()>=it.cost;html+='<div class="pr">&#x1FA99; '+it.cost+'</div><button class="buyBtn" '+(canBuy?'onclick="shopBuy(\''+it.id+'\')"':'disabled')+'>COMPRAR</button>';}
    html+='</div>';}
  el.innerHTML=html;var sc=document.getElementById('shopCoins');if(sc)sc.textContent='🪙 '+getCoins();
}
function openShop(){document.getElementById('startScreen').classList.add('hidden');document.getElementById('shopScreen').classList.remove('hidden');renderShop();}
function closeShop(){document.getElementById('shopScreen').classList.add('hidden');document.getElementById('startScreen').classList.remove('hidden');updCoinsUI();}
function shopBuy(id){}   /* completado en Task 6 */
function shopEquip(cat,id){}  /* completado en Task 6 */
document.getElementById('shopBtn').addEventListener('click',openShop);
document.getElementById('shopBackBtn').addEventListener('click',closeShop);
(function(){var tabs=document.querySelectorAll('#shopTabs .shopTab');for(var i=0;i<tabs.length;i++)tabs[i].addEventListener('click',function(){var all=document.querySelectorAll('#shopTabs .shopTab');for(var j=0;j<all.length;j++)all[j].classList.remove('active');this.classList.add('active');shopTab=this.getAttribute('data-cat');renderShop();});})();
```

- [ ] **Step 5: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola: `localStorage.setItem('gcoins','300'); localStorage.removeItem('gcos');`. Recargar. Click en "🛒 TIENDA". Esperado: se abre la tienda mostrando el saldo (🪙 300), 4 pestañas, y la rejilla de "Pelaje" con 6 ítems: "Clasico" con botón EQUIPADO (deshabilitado), y los demás con precio y botón COMPRAR (habilitado si 300≥precio). Cambiar de pestaña actualiza la rejilla. "VOLVER" regresa al menú. Los clicks de comprar/equipar aún no hacen nada (Task 6). Describir lo observado.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: UI de tienda (estructura, pestanas y render de catalogo)"
```

---

## Task 6: Comprar/equipar + logro collector

**Files:**
- Modify: `index.html` — completar `shopBuy`/`shopEquip` (stubs de Task 5); array `ACHS` (~línea 286)

**Interfaces:**
- Consumes: `buyCos(id)`, `equipCos(cat,id)`, `renderShop`, `SFX`, `unlockAch`.
- Produces: interacción funcional de la tienda; logro `collector` visible.

- [ ] **Step 1: Añadir el logro `collector` a ACHS**

En el array `ACHS`, tras la entrada `{id:'beat_impossible',...}` (añadida en Fase 1), poner coma y añadir:

```javascript
  {id:'collector',name:'Coleccionista',icon:'🎩',desc:'Compra 5 cosmeticos'}
```

- [ ] **Step 2: Completar `shopBuy` y `shopEquip`**

Reemplazar los stubs `function shopBuy(id){}` y `function shopEquip(cat,id){}` (de Task 5) por:

```javascript
function shopBuy(id){var r=buyCos(id);if(r==='ok'){if(SFX&&SFX.collect)SFX.collect();renderShop();}else if(r==='nofunds'){var b=document.getElementById('shopCoins');if(b){b.textContent='🪙 '+getCoins()+' — sin saldo';setTimeout(function(){b.textContent='🪙 '+getCoins()},1200);}}}
function shopEquip(cat,id){if(equipCos(cat,id)){if(SFX&&SFX.ach)SFX.ach();renderShop();}}
```

- [ ] **Step 3: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Consola: `localStorage.setItem('gcoins','1000'); localStorage.removeItem('gcos');`. Recargar. Abrir tienda:
1. Comprar "Dorado" (fur_gold, 50) → el ítem pasa a mostrar botón EQUIPAR y el saldo baja a 950.
2. Click EQUIPAR en Dorado → botón pasa a "EQUIPADO" (deshabilitado); "Clasico" vuelve a mostrar EQUIPAR.
3. Comprar 5 cosméticos de pago en total → aparece el popup del logro "Coleccionista".
4. Comprobar por consola: `loadCos().equip.fur` → "fur_gold"; `loadAch().collector` → 1.
5. Intentar comprar algo con saldo insuficiente → el saldo muestra "sin saldo" brevemente y no descuenta.
Describir lo observado y pegar la salida de consola.

- [ ] **Step 4: Bump de la caché del Service Worker**

En `sw.js`, línea 1, cambiar `var CACHE='gorilas-v10';` por `var CACHE='gorilas-v11';` para que los usuarios existentes reciban los cosméticos.

- [ ] **Step 5: Commit**

```bash
git add index.html sw.js
git commit -m "feat: comprar/equipar cosmeticos, logro collector y bump SW v11"
```

---

## Notas de alcance (Fase 2)

- Los accesorios/estelas/explosiones se dibujan por código con formas simples pero reconocibles; el pulido visual fino puede iterarse durante la verificación de cada tarea.
- Las partículas de chispa (`spawnP`) mantienen sus colores por defecto; el cosmético de explosión afecta el gradiente de la bola de fuego (`drawExps`), que es el elemento visual dominante.
- El reto diario y la racha (Fase 3) quedan fuera; `equipped`/`loadCos` que aquí se crean serán reutilizados si alguna recompensa futura otorga cosméticos.

## Self-Review

- **Cobertura del spec (sección 5):** pelaje 6 (Task 1 catálogo + Task 2 render ✓), accesorios 5 (✓), estelas 5 (Task 1 + Task 3 ✓), explosiones 4 (Task 1 + Task 4 ✓), tienda con pestañas/comprar/equipar (Task 5+6 ✓), aplicación al gorila del jugador y banana, default en 2P (constraint en Tasks 2/3/4 ✓), logro `collector` (Task 6 ✓), gasto vía `spendCoins` (✓).
- **Placeholders:** los stubs `shopBuy`/`shopEquip` en Task 5 son intencionales y se completan en Task 6; declarado explícitamente en ambas tareas. No hay TBD/TODO reales.
- **Consistencia de tipos/nombres:** `equipped(cat)→item`, `loadCos()→{owned,equip}`, `buyCos(id)→string`, `equipCos(cat,id)→bool`, `cosItem`/`cosCatOf`/`ownsCos` usados consistentemente entre Task 1 y Tasks 2-6. Los ids de estilo (`fire/rainbow/ice/stars/default` para trail; `gold/rainbow/plasma/default` para boom) coinciden entre el catálogo (Task 1), el render de estela (Task 3), el render de explosión (Task 4) y los swatches de la tienda (Task 5). Claves de estado `gcos` coherentes. El id de logro `collector` coincide entre `buyCos` (Task 1) y `ACHS` (Task 6).
- **SW cache:** el bump a v11 está en la última tarea (Task 6, Step 4), cumpliendo el Global Constraint.
