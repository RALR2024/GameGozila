# Contenido Fase 1 — Armas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar el arsenal de 3 a 7 armas (napalm, perforadora, teledirigida, MIRV), desbloqueables con monedas en la tienda existente, con selector rediseñado, integración de la IA y logro de arsenal.

**Architecture:** Todo inline en `index.html` (ES5). Estado `gweapons` en localStorage (análogo a `gcos`). Las nuevas armas se integran en el flujo existente `fireBan`→`stepBan`→`hitBld`/`hitG`; MIRV usa una lista secundaria `subBananas` con su propio manejo para no romper la máquina de estados de un solo proyectil. La CPU usa todas las armas (no depende de `gweapons`); su elección usa `rng()` para el reto diario.

**Tech Stack:** HTML5 Canvas, JavaScript ES5, `localStorage` vía `LS()`.

## Global Constraints

- **ES5 solamente:** `var`, `function`, sin `const`/`let`/arrow functions. Estilo compacto existente.
- **Inline en `index.html`;** el despliegue a `jugar.html` y el bump del SW se hacen al desplegar la fase (fuera de este plan de código).
- **Sin dependencias** ni backend. Persistencia vía `LS()`.
- **Clave de estado:** `gweapons` = `[id...]`, default `['normal','cluster','boomerang']`.
- **Gasto:** vía `spendCoins(n)` (ya valida saldo y `n<0`).
- **Ids de arma exactos:** `normal`, `cluster`, `boomerang`, `napalm`, `piercing`, `homing`, `mirv`.
- **Precios:** napalm 150, piercing 150, homing 250, mirv 300.
- **Determinismo:** la elección de arma de la CPU en el reto usa `rng()` (no `Math.random()`/`rand()`); lo demás cosmético sigue igual.
- **La CPU usa todas las armas** independientemente de `gweapons`.
- **Verificación:** sin framework de test. Servir con `python -m http.server`, desregistrar SW + limpiar cachés antes de recargar, verificar en navegador (Playwright).

---

## File Structure

- **Modify:** `index.html`:
  - Tras `equipCos` / helpers de tienda (~línea 435): catálogo `WEAPONS` y helpers `gweapons`.
  - `var banana=...` / estado (~línea 478): declarar `subBananas`.
  - Fila de armas HTML (~línea 180) y su CSS (~línea 63-66, 112): rediseño a 7 + candados.
  - Handler de `.weaponBtn` (~línea 712) y `startGame` (reset selección).
  - `fireBan` (~747): flags de arma (pierce).
  - `stepBan` (~782): homing, piercing pass-through, split de MIRV, paso de subBananas.
  - `hitBld`/`hitG` (~794-820): napalm.
  - `drawBan` (~665): dibujar subBananas.
  - `cpuPickWeapon` (~756): incluir armas nuevas + `rng()`.
  - Tienda: pestaña "Armas" (~218), `renderShop` (~375), `shopBuy` (~existente).
  - `ACHS` (~línea de logros): `arsenal`.

---

## Task 1: Modelo de datos de armas

**Files:**
- Modify: `index.html` (tras `equipCos`, ~línea 435)

**Interfaces:**
- Consumes: `LS`, `spendCoins`, `getCoins`, `unlockAch`, `updCoinsUI`.
- Produces:
  - `WEAPONS` — array `[{id,name,icon,cost}]` (7 entradas).
  - `weaponItem(id)` → objeto (o `WEAPONS[0]`).
  - `loadWeapons()` → `[id...]` (default `['normal','cluster','boomerang']`, autocura no-array).
  - `ownsWeapon(id)` → bool.
  - `buyWeapon(id)` → `'ok'|'owned'|'nofunds'|'bad'` (descuenta, persiste, dispara `arsenal`).

- [ ] **Step 1: Añadir catálogo y helpers**

Insertar después de `equipCos` (~línea 435, antes del comentario `// ---- Canvas ----`):

```javascript
// ---- Weapons ----
var WEAPONS=[
  {id:'normal',name:'Platano',icon:'🍌',cost:0},
  {id:'cluster',name:'Racimo',icon:'💣',cost:0},
  {id:'boomerang',name:'Boomerang',icon:'🪃',cost:0},
  {id:'napalm',name:'Napalm',icon:'🔥',cost:150},
  {id:'piercing',name:'Perforadora',icon:'🛠',cost:150},
  {id:'homing',name:'Teledirigida',icon:'🛰',cost:250},
  {id:'mirv',name:'MIRV',icon:'☄',cost:300}
];
function weaponItem(id){for(var i=0;i<WEAPONS.length;i++)if(WEAPONS[i].id===id)return WEAPONS[i];return WEAPONS[0]}
function weaponDefaults(){return ['normal','cluster','boomerang']}
function loadWeapons(){var w=LS('gweapons');if(!Array.isArray(w))return weaponDefaults();var d=weaponDefaults();for(var i=0;i<d.length;i++)if(w.indexOf(d[i])<0)w.push(d[i]);return w}
function ownsWeapon(id){return loadWeapons().indexOf(id)>=0}
function buyWeapon(id){var it=weaponItem(id);if(!it||it.cost<=0)return 'bad';if(ownsWeapon(id))return 'owned';if(!spendCoins(it.cost))return 'nofunds';var w=loadWeapons();w.push(id);LS('gweapons',w);if(loadWeapons().length>=WEAPONS.length)unlockAch('arsenal');if(typeof updCoinsUI==='function')updCoinsUI();return 'ok'}
```

- [ ] **Step 2: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola:

```javascript
localStorage.removeItem('gweapons'); localStorage.setItem('gcoins','1000');
console.log(loadWeapons());              // ["normal","cluster","boomerang"]
console.log(ownsWeapon('napalm'));       // false
console.log(buyWeapon('napalm'));        // "ok"
console.log(getCoins());                 // 850
console.log(ownsWeapon('napalm'));       // true
console.log(buyWeapon('napalm'));        // "owned"
console.log(buyWeapon('normal'));        // "bad" (cost 0)
console.log(buyWeapon('mirv'));          // "ok"  (300 -> 550)
console.log(getCoins());                 // 550
```

Esperado: coincide con los comentarios.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: modelo de datos y helpers de armas (gweapons)"
```

---

## Task 2: Selector de armas (7 + candados)

**Files:**
- Modify: `index.html` — CSS (~línea 63-66, 112); fila de armas HTML (~línea 180); handler de `.weaponBtn` (~712); `startGame` (~reset)

**Interfaces:**
- Consumes: `ownsWeapon`, `WEAPONS`.
- Produces: `renderWeaponRow()` — marca las armas no poseídas con `locked` y evita seleccionarlas; asegura que la seleccionada sea poseída.

- [ ] **Step 1: CSS — envolver la fila y estilo de candado**

Reemplazar la regla `.weaponRow` (línea 63):

```css
.weaponRow{display:flex;gap:8px;justify-content:center}
```

por:

```css
.weaponRow{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;max-width:340px;margin:0 auto}
.weaponBtn.locked{opacity:.45;cursor:default;position:relative}
.weaponBtn.locked::after{content:'🔒';position:absolute;top:1px;right:3px;font-size:10px}
```

- [ ] **Step 2: Reconstruir la fila de armas (7 botones)**

Reemplazar la línea (~180):

```html
  <div class="weaponRow"><button class="weaponBtn active" data-w="normal">&#x1F34C;</button><button class="weaponBtn" data-w="cluster">&#x1F4A3;</button><button class="weaponBtn" data-w="boomerang">&#x1FA83;</button></div>
```

por:

```html
  <div class="weaponRow" id="weaponRow"><button class="weaponBtn active" data-w="normal">&#x1F34C;</button><button class="weaponBtn" data-w="cluster">&#x1F4A3;</button><button class="weaponBtn" data-w="boomerang">&#x1FA83;</button><button class="weaponBtn" data-w="napalm">&#x1F525;</button><button class="weaponBtn" data-w="piercing">&#x1F6E0;</button><button class="weaponBtn" data-w="homing">&#x1F6F0;</button><button class="weaponBtn" data-w="mirv">&#x2604;</button></div>
```

- [ ] **Step 3: renderWeaponRow + guardas de selección**

Localizar el handler de armas (~712-713):

```javascript
var wBtns=document.querySelectorAll('.weaponBtn');
for(var i=0;i<wBtns.length;i++)wBtns[i].addEventListener('click',function(){for(var j=0;j<wBtns.length;j++)wBtns[j].classList.remove('active');this.classList.add('active');weapon=this.getAttribute('data-w')});
```

Reemplazar por:

```javascript
var wBtns=document.querySelectorAll('.weaponBtn');
function renderWeaponRow(){for(var i=0;i<wBtns.length;i++){var id=wBtns[i].getAttribute('data-w'),own=ownsWeapon(id);if(own)wBtns[i].classList.remove('locked');else wBtns[i].classList.add('locked')}
  var act=document.querySelector('.weaponBtn.active');if(!act||!ownsWeapon(act.getAttribute('data-w'))){for(var k=0;k<wBtns.length;k++)wBtns[k].classList.remove('active');var nb=document.querySelector('.weaponBtn[data-w="normal"]');if(nb)nb.classList.add('active');weapon='normal'}}
for(var i=0;i<wBtns.length;i++)wBtns[i].addEventListener('click',function(){var id=this.getAttribute('data-w');if(!ownsWeapon(id))return;for(var j=0;j<wBtns.length;j++)wBtns[j].classList.remove('active');this.classList.add('active');weapon=id});
```

- [ ] **Step 4: Llamar renderWeaponRow en startGame**

Localizar en `startGame` la línea `playerPU=null;cpuPU=null;confetti=[];weapon='normal';` y añadir justo después:

```javascript
  if(typeof renderWeaponRow==='function')renderWeaponRow();
```

- [ ] **Step 5: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Consola: `localStorage.setItem('gweapons', JSON.stringify(['normal','cluster','boomerang','napalm']));` luego `renderWeaponRow()`. Iniciar partida (JUGAR). Esperado: la fila muestra 7 botones; napalm seleccionable, y `piercing`/`homing`/`mirv` con candado 🔒 y no seleccionables (click no cambia `active`). Seleccionar napalm funciona. Confirmar por consola `renderWeaponRow(); document.querySelectorAll('.weaponBtn.locked').length` → 3.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: selector de armas de 7 con candados para no poseidas"
```

---

## Task 3: Comportamiento — teledirigida y perforadora

**Files:**
- Modify: `index.html` — `fireBan` (~749); `stepBan` (~786, ~792)

**Interfaces:**
- Consumes: `banana`, `gorillas`, `buildings`, `startExp`, `spawnDeb`.
- Produces: comportamiento de `homing` (curva en vuelo) y `piercing` (atraviesa edificios).

- [ ] **Step 1: Inicializar pierce en fireBan**

Localizar en `fireBan` (~749):

```javascript
  banana={x:x,y:y,vx:vx,vy:vy,rot:0,age:0,from:from,mega:pu==='mega',noW:pu==='calm',wt:weapon};
```

Añadir JUSTO DESPUÉS:

```javascript
  if(weapon==='piercing'){banana.pierce=2;banana._lp=-1}
```

- [ ] **Step 2: Homing en stepBan**

Localizar en `stepBan` la línea del boomerang (~786):

```javascript
  if(banana.wt==='boomerang'&&banana.age>15)banana.vx+=Math.sin(banana.age*.06)*.4;
```

Añadir JUSTO DESPUÉS:

```javascript
  if(banana.wt==='homing'&&banana.age>8){var tg=gorillas[1-banana.from];if(tg){var htx=tg.x,hty=tg.y-(tg._s||30),hdx=htx-banana.x,hdy=hty-banana.y,hdl=Math.hypot(hdx,hdy)||1;banana.vx+=(hdx/hdl)*.22;banana.vy+=(hdy/hdl)*.22}}
```

- [ ] **Step 3: Piercing pass-through en stepBan**

Localizar el bucle de colisión con edificios (~792):

```javascript
  for(var bi=0;bi<buildings.length;bi++){var b=buildings[bi];if(banana.x>b.x&&banana.x<b.x+b.w&&banana.y>H-b.h){hitBld(banana.x,banana.y,b);return}}
```

Reemplazar por:

```javascript
  for(var bi=0;bi<buildings.length;bi++){var b=buildings[bi];if(banana.x>b.x&&banana.x<b.x+b.w&&banana.y>H-b.h){
    if(banana.wt==='piercing'&&banana.pierce>0){if(banana._lp!==bi){banana.pierce--;banana._lp=bi;startExp(banana.x,banana.y,false,false);spawnDeb(banana.x,banana.y,b.c2);b.h=Math.max(10,b.h-40)}continue}
    hitBld(banana.x,banana.y,b);return}}
```

- [ ] **Step 4: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola, iniciar partida y probar cada arma manualmente NO es fiable por temporización; en su lugar, congelar y observar:

Homing — construir una banana homing en vuelo y avanzar pasos, confirmando que `vx/vy` giran hacia el enemigo:
```javascript
gameMode='cpu'; startGame(); paused=true;
banana={x:200,y:300,vx:2,vy:-2,rot:0,age:20,from:0,wt:'homing'};
var before={vx:banana.vx,vy:banana.vy}; stepBan();
console.log('homing curva hacia enemigo:', (Math.abs(banana.vx)!==Math.abs(before.vx))||(banana.vy!==before.vy+TH.grav-0)); // true (vx ajustado hacia gorillas[1])
```
Piercing — confirmar que atraviesa: colocar banana piercing dentro de un edificio y comprobar que NO se anula (sigue existiendo tras stepBan):
```javascript
gameMode='cpu'; startGame(); paused=true;
var b=buildings[3]; banana={x:b.x+b.w/2,y:H-b.h+5,vx:3,vy:1,rot:0,age:20,from:0,wt:'piercing',pierce:2,_lp:-1};
stepBan();
console.log('piercing sigue vivo tras entrar edificio:', banana!==null, 'pierce:', banana&&banana.pierce); // true, 1
```
Esperado: homing ajusta velocidad; piercing sobrevive el primer edificio (pierce baja a 1). Jugar una ronda normal para confirmar que las armas normales no cambiaron.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: armas teledirigida (homing) y perforadora (piercing)"
```

---

## Task 4: Comportamiento — napalm

**Files:**
- Modify: `index.html` — `hitBld` (~794-802), `hitG` (~804-806)

**Interfaces:**
- Consumes: `banana`, `startExp`, `spawnP`, `spawnDeb`.
- Produces: impacto de napalm (blast ancho + fuego) en edificio y gorila.

- [ ] **Step 1: Napalm en hitBld**

Localizar en `hitBld` (~795-799):

```javascript
  var mega=banana.mega,isCluster=banana.wt==='cluster';
  if(isCluster){
    var offsets=[{dx:0,dy:0},{dx:-30,dy:-20},{dx:30,dy:-10}];
    for(var i=0;i<offsets.length;i++){startExp(x+offsets[i].dx,y+offsets[i].dy,false,false)}
  }else{startExp(x,y,false,mega)}
```

Reemplazar por:

```javascript
  var mega=banana.mega,isCluster=banana.wt==='cluster',isNapalm=banana.wt==='napalm';
  if(isNapalm){for(var ni=-2;ni<=2;ni++){startExp(x+ni*34,y,false,false)}spawnP(x,y,50,true)}
  else if(isCluster){
    var offsets=[{dx:0,dy:0},{dx:-30,dy:-20},{dx:30,dy:-10}];
    for(var i=0;i<offsets.length;i++){startExp(x+offsets[i].dx,y+offsets[i].dy,false,false)}
  }else{startExp(x,y,false,mega)}
```

- [ ] **Step 2: Napalm en hitG**

Localizar en `hitG` (~804-806):

```javascript
  var mega=banana.mega,isCluster=banana.wt==='cluster';
  if(isCluster){startExp(banana.x,banana.y,true,false);startExp(banana.x-20,banana.y-15,false,false);startExp(banana.x+20,banana.y+10,false,false)}
  else startExp(banana.x,banana.y,true,mega);
```

Reemplazar por:

```javascript
  var mega=banana.mega,isCluster=banana.wt==='cluster',isNapalm=banana.wt==='napalm';
  if(isNapalm){startExp(banana.x,banana.y,true,false);for(var ni=-2;ni<=2;ni++){startExp(banana.x+ni*34,banana.y,false,false)}spawnP(banana.x,banana.y,60,true)}
  else if(isCluster){startExp(banana.x,banana.y,true,false);startExp(banana.x-20,banana.y-15,false,false);startExp(banana.x+20,banana.y+10,false,false)}
  else startExp(banana.x,banana.y,true,mega);
```

- [ ] **Step 3: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Congelar y disparar napalm a un edificio:
```javascript
gameMode='cpu'; startGame(); paused=true;
var b=buildings[4]; explosions=[]; particles=[];
banana={x:b.x+b.w/2,y:H-b.h+2,vx:0,vy:2,rot:0,age:20,from:0,wt:'napalm',mega:false};
hitBld(banana.x,banana.y,b);
console.log('napalm: explosiones spread=', explosions.length, 'particulas=', particles.length); // ~5 explosiones, ~50 particulas
```
Esperado: `explosions.length===5` (blast ancho) y `particles.length>=50`. Jugar una ronda con napalm equipado y confirmar visualmente el blast de fuego ancho.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: arma napalm (blast ancho de fuego)"
```

---

## Task 5: Comportamiento — MIRV (multi-proyectil)

**Files:**
- Modify: `index.html` — estado (~478, declarar `subBananas`); `stepBan` (~782-793); `drawBan` (~665); reset en `startGame`/`newRound`.

**Interfaces:**
- Consumes: `banana`, `gorillas`, `buildings`, `explosions`, `spawnP`, `spawnDeb`, `spawnSmoke`, `SFX`, `hitG`, `nextT`, `wind`, `TH`.
- Produces: `subBananas` (lista), `miniExp(x,y,col)` (explosión sin mutar `state`), `stepSubs()`; MIRV se divide en 3 en el ápice y cada sub-proyectil vuela/impacta.

- [ ] **Step 1: Declarar subBananas**

Localizar la línea de estado (~478):

```javascript
var banana=null,explosions=[],pScore=0,cScore=0,round=0,streak=0,pDmgTaken=0;
```

Añadir JUSTO DESPUÉS:

```javascript
var subBananas=[];
```

- [ ] **Step 2: Helper miniExp (explosión que NO muta state)**

Insertar justo ANTES de `function stepBan(){` (~782):

```javascript
function miniExp(x,y){explosions.push({x:x,y:y,r:1,max:42,big:false,ring:1,ringOp:.6,boom:'default'});spawnP(x,y,22,false);spawnSmoke(x,y);SFX.explode(false)}
function stepSubs(){
  for(var i=subBananas.length-1;i>=0;i--){var sb=subBananas[i];
    if(!sb.noW)sb.vx+=wind*.02;sb.vy+=TH.grav;sb.x+=sb.vx;sb.y+=sb.vy;sb.rot+=.3;sb.age++;
    if(sb.x<-40||sb.x>W+40||sb.y>H+60){subBananas.splice(i,1);continue}
    var hg=-1;for(var g=0;g<gorillas.length;g++){var go=gorillas[g],s=go._s||30;if(g===sb.from&&sb.age<8)continue;if(Math.hypot(sb.x-go.x,sb.y-(go.y-s))<s*.95){hg=g;break}}
    if(hg>=0){banana={x:sb.x,y:sb.y,from:sb.from,wt:'mirv',mega:false};subBananas=[];hitG(hg);return}
    var hitB=false;for(var bi=0;bi<buildings.length;bi++){var b=buildings[bi];if(sb.x>b.x&&sb.x<b.x+b.w&&sb.y>H-b.h){miniExp(sb.x,sb.y);spawnDeb(sb.x,sb.y,b.c2);if(!b.craters)b.craters=[];b.craters.push(sb.x);b.h=Math.max(10,H-sb.y-15);subBananas.splice(i,1);hitB=true;break}}
    if(hitB)continue;
  }
  if(subBananas.length===0&&!banana&&state==='fly'){nextT()}
}
```

- [ ] **Step 3: Split de MIRV y paso de subs en stepBan**

Localizar el inicio de `stepBan` (~782-783):

```javascript
function stepBan(){
  if(!banana)return;
```

Reemplazar por:

```javascript
function stepBan(){
  if(!banana){if(subBananas.length)stepSubs();return}
  if(banana.wt==='mirv'&&!banana.split&&banana.vy>=0&&banana.age>10){banana.split=true;var bf=banana.from,bx=banana.x,by=banana.y,bvx=banana.vx,bvy=banana.vy;subBananas=[];for(var mi=-1;mi<=1;mi++){subBananas.push({x:bx,y:by,vx:bvx+mi*2.4,vy:bvy-1.2,rot:0,age:9,from:bf})}banana=null;SFX.throw_sound();return}
```

(El resto de `stepBan` queda igual.)

- [ ] **Step 4: Dibujar subBananas en drawBan**

Localizar el final de `drawBan` (la línea `ctx.restore();` que cierra la función, seguida de `}`). Insertar ANTES de esa `ctx.restore();`… en su lugar, añadir un bloque nuevo justo DESPUÉS del cierre `}` de `drawBan` NO — para mantenerlo simple, añadir dentro de `drawBan`, al inicio, el dibujo de subs. Localizar `function drawBan(){` (~665) y la primera línea:

```javascript
function drawBan(){
  if(!banana)return;
```

Reemplazar por:

```javascript
function drawBan(){
  for(var si=0;si<subBananas.length;si++){var sb=subBananas[si];ctx.save();ctx.translate(sb.x,sb.y);ctx.rotate(sb.rot);ctx.shadowColor='#ffd83b';ctx.shadowBlur=12;var sg=ctx.createLinearGradient(-10,-10,10,10);sg.addColorStop(0,'#fff4a8');sg.addColorStop(.5,'#ffd83b');sg.addColorStop(1,'#f0a818');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();ctx.restore()}
  if(!banana)return;
```

- [ ] **Step 5: Reset de subBananas**

Localizar en `newRound` la línea `banana=null;explosions=[];particles=[];trail=[];smoke=[];cpuLastShot=null;` y cambiarla a incluir `subBananas=[]`:

```javascript
  banana=null;subBananas=[];explosions=[];particles=[];trail=[];smoke=[];cpuLastShot=null;
```

- [ ] **Step 6: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Verificar el split y el paso de subs:
```javascript
gameMode='cpu'; startGame(); paused=false; state='fly';
banana={x:W*.4,y:H*.4,vx:3,vy:0,rot:0,age:11,from:0,wt:'mirv'};
stepBan(); // debe dividir
console.log('split -> subBananas:', subBananas.length, 'banana null:', banana===null); // 3, true
// avanzar varios pasos y confirmar que las subs se mueven y resuelven
var iter=0; while(subBananas.length>0 && iter<400){ if(state!=='fly'){break} stepSubs(); iter++; }
console.log('subs resueltas en', iter, 'pasos; restantes:', subBananas.length);
```
Esperado: el split produce 3 subBananas y anula `banana`; las subs avanzan y acaban resolviéndose (impacto o fuera de pantalla). Luego jugar una ronda real con MIRV equipado (comprar por consola: `localStorage.setItem('gweapons',JSON.stringify(['normal','cluster','boomerang','mirv']))`, recargar, equipar MIRV, disparar) y confirmar visualmente que se divide en el aire y cae en abanico sin romper el turno.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: arma MIRV con division en sub-proyectiles"
```

---

## Task 6: Tienda "Armas" + IA + logro

**Files:**
- Modify: `index.html` — pestaña tienda (~218), `renderShop` (~375), `shopBuy` (~existente), `cpuPickWeapon` (~756), `ACHS` (~logros)

**Interfaces:**
- Consumes: `WEAPONS`, `loadWeapons`, `ownsWeapon`, `buyWeapon`, `renderShop`, `renderWeaponRow`, `getCoins`, `rng`.
- Produces: pestaña "Armas" funcional; CPU usa nuevas armas; logro `arsenal`.

- [ ] **Step 1: Añadir la pestaña "Armas"**

Localizar (~218-221):

```html
    <button class="shopTab" data-cat="boom">Explosiones</button>
```

Añadir JUSTO DESPUÉS (dentro de `#shopTabs`):

```html
    <button class="shopTab" data-cat="weapons">Armas</button>
```

- [ ] **Step 2: Rama de armas en renderShop**

Localizar el inicio de `renderShop` (~375):

```javascript
  var el=document.getElementById('shopGrid');if(!el)return;var cos=loadCos();var eqId=cos.equip[shopTab];var arr=COSMETICS[shopTab];var html='';
```

Reemplazar por (añade el caso `weapons` al principio):

```javascript
  var el=document.getElementById('shopGrid');if(!el)return;
  if(shopTab==='weapons'){var wl=loadWeapons(),wh='';for(var wi=0;wi<WEAPONS.length;wi++){var it=WEAPONS[wi];var own=wl.indexOf(it.id)>=0;wh+='<div class="shopItem"><div class="swatch" style="display:flex;align-items:center;justify-content:center;font-size:28px;background:#101020">'+it.icon+'</div><div class="nm">'+it.name+'</div>';if(it.cost<=0||own){wh+='<button class="eqBtn on" disabled>'+(it.cost<=0?'BASE':'COMPRADA')+'</button>'}else{var cb=getCoins()>=it.cost;wh+='<div class="pr">&#x1FA99; '+it.cost+'</div><button class="buyBtn" '+(cb?'onclick="shopBuyWeapon(\''+it.id+'\')"':'disabled')+'>COMPRAR</button>'}wh+='</div>'}el.innerHTML=wh;var sc0=document.getElementById('shopCoins');if(sc0)sc0.textContent='🪙 '+getCoins();return}
  var cos=loadCos();var eqId=cos.equip[shopTab];var arr=COSMETICS[shopTab];var html='';
```

- [ ] **Step 3: shopBuyWeapon**

Insertar junto a `shopBuy` (buscar `function shopBuy(id){`) — añadir después:

```javascript
function shopBuyWeapon(id){var r=buyWeapon(id);if(r==='ok'){if(SFX&&SFX.collect)SFX.collect();if(typeof renderWeaponRow==='function')renderWeaponRow();renderShop()}else if(r==='nofunds'){var b=document.getElementById('shopCoins');if(b){b.textContent='🪙 '+getCoins()+' — sin saldo';setTimeout(function(){b.textContent='🪙 '+getCoins()},1200)}}}
```

- [ ] **Step 4: CPU usa las nuevas armas (con rng)**

Localizar `cpuPickWeapon` (~756-763). Reemplazar la función completa por:

```javascript
function cpuPickWeapon(){
  var d=DIFF[difficulty];var pool=['normal','cluster','boomerang','napalm','piercing','homing','mirv'];
  if(!d.smartWeapon){var basic=['normal','cluster','boomerang'];return basic[Math.floor(rng()*basic.length)]}
  var f=gorillas[1],t=gorillas[0],dist=Math.abs(t.x-f.x)/W;
  if(rng()<.35)return pool[Math.floor(rng()*pool.length)];
  if(dist<.3)return 'cluster';
  if(dist>.7)return rng()<.5?'homing':'normal';
  var wFavor=(wind>0)===(t.x>f.x);
  return wFavor?'boomerang':(rng()<.4?'napalm':'normal');
}
```

- [ ] **Step 5: Logro arsenal en ACHS**

En el array `ACHS`, tras la última entrada (`devotee` de la Fase 3 de progresión), poner coma y añadir:

```javascript
  {id:'arsenal',name:'Arsenal',icon:'🎖',desc:'Desbloquea todas las armas'}
```

- [ ] **Step 6: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. Consola: `localStorage.removeItem('gweapons'); localStorage.removeItem('gach'); localStorage.setItem('gcoins','2000');` y recargar. Abrir tienda → pestaña "Armas". Esperado: 7 ítems; las 3 base con botón "BASE" deshabilitado; napalm/piercing/homing/mirv con precio y COMPRAR. Comprar napalm → saldo baja 150, botón pasa a "COMPRADA", y en la fila de armas del juego napalm queda desbloqueada. Comprar las 4 → aparece el logro "Arsenal". CPU: jugar en dificultad Difícil+ y observar que a veces usa armas nuevas (o por consola: `difficulty='hard'; var picks={};for(var i=0;i<200;i++){var w=cpuPickWeapon();picks[w]=(picks[w]||0)+1};console.log(picks)` → deben aparecer armas nuevas). Confirmar `loadAch().arsenal===1` tras comprar las 4.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: pestana Armas en tienda, IA con armas nuevas y logro arsenal"
```

---

## Notas de alcance (Fase 1)

- Las armas se COMPRAN (no se equipan como cosméticos): se seleccionan en la fila de armas durante la partida.
- `piercing` explota en el último edificio atravesado al agotarse el pierce (aproximación aceptable de "atraviesa 2").
- MIRV usa `subBananas` con explosiones `miniExp` que no mutan `state`, evitando romper la máquina de estados de un proyectil. Los sub-proyectiles solo cuentan el primer impacto en gorila (fin de ronda vía `hitG`).
- El despliegue a `jugar.html` y el bump del SW (a v13) se hacen al desplegar la fase, fuera de este plan.

## Self-Review

- **Cobertura del spec (Fase 1):** 4 armas nuevas (homing T3, piercing T3, napalm T4, mirv T5), desbloqueo por monedas en tienda (T1 datos + T6 UI), selector de 7 con candados (T2), CPU usa todas con `rng` (T6), logro `arsenal` (T6). ✓
- **Placeholders:** ninguno; código completo en cada paso.
- **Consistencia de nombres/tipos:** `loadWeapons/ownsWeapon/buyWeapon/weaponItem` (T1) usados por T2/T6; `renderWeaponRow` (T2) llamado en `startGame` (T2) y `shopBuyWeapon` (T6); `subBananas`/`miniExp`/`stepSubs` (T5) coherentes; ids de arma idénticos entre `WEAPONS`, la fila HTML (`data-w`), `cpuPickWeapon` y los checks `banana.wt===`; `shopBuyWeapon` referenciado por `renderShop` (T6) definido en el mismo T6; id de logro `arsenal` coincide entre `buyWeapon` (T1) y `ACHS` (T6).
- **Riesgo (T5 MIRV):** la verificación incluye el split (3 subs + banana null) y la resolución de subs, además de una ronda real; `miniExp` evita mutar `state`.
- **No-regresión:** cada tarea de comportamiento pide jugar una ronda con armas normales para confirmar que no cambiaron.
