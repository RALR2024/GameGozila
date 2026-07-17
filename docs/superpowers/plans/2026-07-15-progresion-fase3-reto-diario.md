# Progresión Fase 3 — Reto Diario y Racha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un reto diario (una partida vs-CPU determinista por fecha con un objetivo rotativo) y una racha diaria, cerrando el sistema de progresión.

**Architecture:** Un PRNG sembrado (`mulberry32` + hash de fecha) alimenta un `rng()` que sustituye a `Math.random()` SOLO en la generación del escenario relevante al juego y SOLO cuando el reto diario está activo; el resto del tiempo `rng()` devuelve `Math.random()` y el juego normal no cambia. El reto es una partida vs-CPU con arena y dificultad sembradas por la fecha, y un objetivo del día evaluado al terminar. Todo inline en `index.html` (ES5), estado en localStorage. Bump del SW al final.

**Tech Stack:** HTML5 Canvas, JavaScript ES5, `localStorage` vía `LS()`.

## Global Constraints

- **ES5 solamente:** `var`, `function`, sin `const`/`let`/arrow functions. Estilo compacto existente.
- **Inline en `index.html`;** solo `sw.js` línea 1 cambia además (cache v11→v12) en la última tarea.
- **Refinamiento del spec (decidido en brainstorming):** el reto es UNA partida vs-CPU sembrada (no modo infinito); la dificultad se siembra por fecha entre `normal`/`hard`/`expert`; los 7 objetivos son evaluables en esa partida (se sustituye el objetivo de infinito por `only_normal`).
- **`rng()` seguro:** `rng()` devuelve el PRNG sembrado solo si `dailyRng` no es null; si es null devuelve `Math.random()`. La generación cosmética (estrellas, nubes, partículas, luces de ventana, antenas) SIGUE usando `Math.random()`/`rand()` — no debe volverse determinista.
- **Determinismo:** el número de edificios depende del ancho de pantalla (`Math.round(W/70)`), así que el reto es idéntico para todos en arena/viento/dificultad/objetivo/turno, pero el terreno exacto puede variar entre tamaños de pantalla. Aceptado y documentado.
- **Claves de estado:** `gdaily`={date,done,obj,tries}; `gstreak`={last,count}.
- **Fecha:** `new Date()` está disponible en el navegador (la restricción de `Date` es solo para scripts de Workflow, no aquí).
- **Verificación:** sin framework de test. Servir con `python -m http.server` y verificar en navegador; desregistrar el Service Worker y limpiar cachés antes de recargar (`navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))`, `caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)))`), recargar con query string nuevo.

---

## File Structure

- **Modify:** `index.html`:
  - Tras los helpers de cosméticos (~línea 405): PRNG, helpers de fecha/daily/streak.
  - `makeBld`/`placeG`/`spawnPU` (~474-490) y `newRound` (~492-503): enrutar aleatoriedad de juego por `rng()`/`rrand()`.
  - Globals de estado (~línea 424 zona `var gameMode=...`): trackers de objetivo + `dailyMode`.
  - `startGame` (~806-819): reset de trackers.
  - `fireBan` (~686), `hitG` (~streak), `stepBan` (~colección PU): hooks de trackers.
  - `endGame` (~827-851): evaluación del objetivo diario.
  - `goHome`: reset de `dailyMode`/`dailyRng`.
  - HTML: botón "Reto diario" en `#startScreen`; overlay `#dailyScreen`.
  - `ACHS` (~línea 300): `daily_first`, `devotee`.
- **Modify (última tarea):** `sw.js` — bump `CACHE` a `gorilas-v12`.

---

## Task 1: PRNG sembrado y helpers de fecha/daily/racha

**Files:**
- Modify: `index.html` (tras `equipCos`, ~línea 405)

**Interfaces:**
- Consumes: `LS(k,v)`.
- Produces:
  - `mulberry32(seed)` → función `()->[0,1)`.
  - `hashStr(s)` → uint32.
  - `dailyRng` (var global, `null` por defecto).
  - `rng()` → número [0,1) (sembrado si `dailyRng`, si no `Math.random()`).
  - `rrand(a,b)` → `a+rng()*(b-a)`.
  - `todayStr()` / `yesterdayStr()` → `'YYYY-MM-DD'`.
  - `dayOfYear()` → entero.
  - `loadDaily()` → `{date,done,obj,tries}` o `null`.
  - `saveDaily(o)`.
  - `loadStreak()` → `{last,count}` (defaults `{last:'',count:0}`).

- [ ] **Step 1: Añadir el PRNG y los helpers**

Insertar después de `equipCos` (línea 405):

```javascript
// ---- Seeded RNG + Daily ----
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
var dailyRng=null;
function rng(){return dailyRng?dailyRng():Math.random()}
function rrand(a,b){return a+rng()*(b-a)}
function pad2(n){return(n<10?'0':'')+n}
function fmtDate(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function todayStr(){return fmtDate(new Date())}
function yesterdayStr(){var d=new Date();d.setDate(d.getDate()-1);return fmtDate(d)}
function dayOfYear(){var d=new Date();var start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/86400000)}
function loadDaily(){return LS('gdaily')}
function saveDaily(o){LS('gdaily',o)}
function loadStreak(){var s=LS('gstreak');return(s&&typeof s.count==='number')?s:{last:'',count:0}}
```

- [ ] **Step 2: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola:

```javascript
var r1=mulberry32(hashStr('2026-07-20')), r2=mulberry32(hashStr('2026-07-20'));
console.log(r1()===r2(), r1()===r2(), r1()===r2()); // true true true (misma semilla, misma secuencia)
var r3=mulberry32(hashStr('2026-07-21'));
console.log(mulberry32(hashStr('2026-07-20'))()===r3()); // false (semillas distintas)
console.log(/^\d{4}-\d{2}-\d{2}$/.test(todayStr()));     // true
console.log(dailyRng===null, rng()>=0&&rng()<1);         // true true (rng usa Math.random sin semilla)
console.log(loadStreak());                                // {last:'',count:0}
```

Esperado: los valores coinciden con los comentarios.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: PRNG sembrado y helpers de fecha/reto/racha"
```

---

## Task 2: Enrutar la generación del escenario por rng()

**Files:**
- Modify: `index.html` — `makeBld` (~474-480), `placeG` (~481-485), `spawnPU` (~486-490), `newRound` (~494 y ~497)

**Interfaces:**
- Consumes: `rng()`, `rrand()` de Task 1.
- Produces: generación determinista cuando `dailyRng` está activo; idéntica al comportamiento actual cuando es null.

- [ ] **Step 1: makeBld — alturas y neón por rrand/rng**

Localizar en `makeBld` la línea (≈476):

```javascript
  for(var i=0;i<n;i++){var h=rand(H*.16,H*.55),c=TH.bldC[i%TH.bldC.length],ne=TH.neon[Math.floor(rand(0,TH.neon.length))];
```

Reemplazar por (solo cambian `rand`→`rrand`; las ventanas/antena cosméticas siguen con Math.random):

```javascript
  for(var i=0;i<n;i++){var h=rrand(H*.16,H*.55),c=TH.bldC[i%TH.bldC.length],ne=TH.neon[Math.floor(rrand(0,TH.neon.length))];
```

- [ ] **Step 2: placeG — posiciones por rrand**

Localizar `placeG` (≈482):

```javascript
  var li=Math.floor(rand(0,Math.min(3,buildings.length))),ri=Math.floor(rand(Math.max(buildings.length-3,0),buildings.length));
```

Reemplazar por:

```javascript
  var li=Math.floor(rrand(0,Math.min(3,buildings.length))),ri=Math.floor(rrand(Math.max(buildings.length-3,0),buildings.length));
```

- [ ] **Step 3: spawnPU — cantidad y posiciones por rng/rrand**

Localizar `spawnPU` (≈487-489):

```javascript
  powerUps=[];var cnt=Math.random()>.4?2:1,mid=Math.floor(buildings.length/2);
  for(var i=0;i<cnt;i++){var bi=Math.floor(rand(Math.max(2,mid-3),Math.min(buildings.length-2,mid+3))),b=buildings[bi];
    powerUps.push({x:b.x+b.w/2,y:H-b.h-25,type:PU_TYPES[Math.floor(rand(0,3))].id,collected:false})}
```

Reemplazar por:

```javascript
  powerUps=[];var cnt=rng()>.4?2:1,mid=Math.floor(buildings.length/2);
  for(var i=0;i<cnt;i++){var bi=Math.floor(rrand(Math.max(2,mid-3),Math.min(buildings.length-2,mid+3))),b=buildings[bi];
    powerUps.push({x:b.x+b.w/2,y:H-b.h-25,type:PU_TYPES[Math.floor(rrand(0,3))].id,collected:false})}
```

- [ ] **Step 4: newRound — viento y turno por rrand/rng**

Localizar en `newRound` la línea (≈494):

```javascript
  wind=Math.round(rand(-TH.wMax,TH.wMax));
```

Reemplazar por:

```javascript
  wind=Math.round(rrand(-TH.wMax,TH.wMax));
```

Y la línea (≈497):

```javascript
  turn=Math.random()>.5?0:1;updWind();elRnd.textContent=''+round;
```

Reemplazar por:

```javascript
  turn=rng()>.5?0:1;updWind();elRnd.textContent=''+round;
```

- [ ] **Step 5: Verificar en navegador (determinismo + no-regresión)**

Servir, desregistrar SW/limpiar cachés, recargar. En consola:

```javascript
// Determinismo con semilla fija
function snap(){return {b:buildings.map(function(x){return Math.round(x.h)}),g:gorillas.map(function(x){return x.bx}),w:wind,t:turn}}
dailyRng=mulberry32(12345); arena='neon'; TH=THEMES['neon']; makeBld(); placeG(); spawnPU(); wind=Math.round(rrand(-TH.wMax,TH.wMax)); turn=rng()>.5?0:1; var A=snap();
dailyRng=mulberry32(12345); TH=THEMES['neon']; makeBld(); placeG(); spawnPU(); wind=Math.round(rrand(-TH.wMax,TH.wMax)); turn=rng()>.5?0:1; var B=snap();
console.log('determinista:', JSON.stringify(A)===JSON.stringify(B)); // true
// No-regresión: sin semilla el juego varía
dailyRng=null; makeBld(); var h1=buildings.map(function(x){return Math.round(x.h)}); makeBld(); var h2=buildings.map(function(x){return Math.round(x.h)});
console.log('normal varia:', JSON.stringify(h1)!==JSON.stringify(h2)); // true (casi siempre)
```

Esperado: `determinista: true` y `normal varia: true`. Recargar la página y jugar una partida normal vs CPU para confirmar visualmente que el escenario sigue siendo aleatorio y jugable.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: generacion del escenario determinista bajo semilla (rng)"
```

---

## Task 3: Trackers de objetivo

**Files:**
- Modify: `index.html` — globals de estado (~línea 424), `startGame` (~810), `fireBan` (~688), `hitG` (racha del jugador), `stepBan` (colección de PU por el jugador)

**Interfaces:**
- Consumes: `weapon`, `banana.from`, `streak` globales.
- Produces: globals `pShots` (int), `dWeapons` (obj), `dPUCollected` (bool), `streakMax` (int), `dailyMode` (bool), reseteados en `startGame` y actualizados en los puntos de juego.

- [ ] **Step 1: Declarar los globals**

Localizar la línea de estado (≈424):

```javascript
var gameMode='cpu',arena='neon',difficulty='normal',lives=3;
```

Añadir JUSTO DESPUÉS:

```javascript
var pShots=0,dWeapons={},dPUCollected=false,streakMax=0,dailyMode=false;
```

- [ ] **Step 2: Reset en startGame**

Localizar en `startGame` (≈810):

```javascript
  paused=false;pScore=0;cScore=0;round=0;streak=0;pDmgTaken=0;lives=3;
```

Añadir JUSTO DESPUÉS:

```javascript
  pShots=0;dWeapons={};dPUCollected=false;streakMax=0;
```

- [ ] **Step 3: Contar tiros y armas del jugador en fireBan**

Localizar el inicio de `fireBan` (≈686-688):

```javascript
function fireBan(x,y,vx,vy,from){
  var pu=from===0?playerPU:cpuPU;
  banana={x:x,y:y,vx:vx,vy:vy,rot:0,age:0,from:from,mega:pu==='mega',noW:pu==='calm',wt:weapon};
```

Añadir, JUSTO DESPUÉS de la línea `banana={...};`:

```javascript
  if(from===0){pShots++;dWeapons[weapon]=true}
```

- [ ] **Step 4: Racha máxima del jugador en hitG**

Localizar en `hitG` la línea del acierto del jugador (idx===1), que contiene `streak++`:

```javascript
  if(idx===1){pScore++;elPS.textContent=pScore;streak++;if(streak>=2){showStr(streak);SFX.streak()}if(streak>=3)unlockAch('streak3')}
```

Reemplazar por (añade la actualización de `streakMax`):

```javascript
  if(idx===1){pScore++;elPS.textContent=pScore;streak++;if(streak>streakMax)streakMax=streak;if(streak>=2){showStr(streak);SFX.streak()}if(streak>=3)unlockAch('streak3')}
```

- [ ] **Step 5: Marcar power-up recogido por el jugador en stepBan**

Localizar en `stepBan` la línea de colección de power-up:

```javascript
  for(var pi=0;pi<powerUps.length;pi++){var pu=powerUps[pi];if(pu.collected)continue;if(Math.hypot(banana.x-pu.x,banana.y-pu.y)<35){pu.collected=true;if(banana.from===0)playerPU=pu.type;else cpuPU=pu.type;spawnP(pu.x,pu.y,15,false);SFX.collect();updPU()}}
```

Reemplazar la subcadena `if(banana.from===0)playerPU=pu.type;else cpuPU=pu.type;` por:

```javascript
if(banana.from===0){playerPU=pu.type;dPUCollected=true}else cpuPU=pu.type;
```

- [ ] **Step 6: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola:

```javascript
console.log(typeof pShots, typeof dWeapons, typeof dPUCollected, typeof streakMax, typeof dailyMode); // number object boolean number boolean
gameMode='cpu'; startGame();
console.log(pShots, JSON.stringify(dWeapons), dPUCollected, streakMax); // 0 {} false 0
weapon='boomerang'; fireBan(gorillas[0].x, gorillas[0].y-30, 5, -8, 0);
console.log(pShots, dWeapons.boomerang); // 1 true
```

Esperado: coincide con los comentarios. (Tras `fireBan` hay una banana en vuelo; recargar para más pruebas.)

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: trackers de objetivo del reto (tiros, armas, PU, racha)"
```

---

## Task 4: Flujo del reto diario, objetivos y evaluación

**Files:**
- Modify: `index.html` — tras los helpers de daily (Task 1, ~línea 420): `DAILY_OBJS`, `dailyObj`, `startDaily`; `endGame` (~850, antes del cierre); `goHome` (reset)

**Interfaces:**
- Consumes: `dailyRng`, `mulberry32`, `hashStr`, `todayStr`, `dayOfYear`, `loadDaily`, `saveDaily`, `loadStreak`, trackers de Task 3, `startGame`, `addCoins`, `unlockAch`.
- Produces: `DAILY_OBJS` (array), `dailyObj()` (objetivo de hoy), `startDaily()`, `bumpStreak()`, evaluación en `endGame`.

- [ ] **Step 1: Definir objetivos, selección, arranque y racha**

Insertar después de `loadStreak` (Task 1):

```javascript
var DAILY_OBJS=[
  {id:'only_boomerang',desc:'Gana usando solo boomerang',test:function(){return !!dWeapons.boomerang&&!dWeapons.normal&&!dWeapons.cluster}},
  {id:'no_damage',desc:'Gana sin recibir ningun golpe',test:function(){return pDmgTaken===0}},
  {id:'three_shots',desc:'Gana en 3 tiros o menos',test:function(){return pShots<=3}},
  {id:'only_cluster',desc:'Gana usando solo racimo',test:function(){return !!dWeapons.cluster&&!dWeapons.normal&&!dWeapons.boomerang}},
  {id:'only_normal',desc:'Gana usando solo banana normal',test:function(){return !!dWeapons.normal&&!dWeapons.cluster&&!dWeapons.boomerang}},
  {id:'streak3',desc:'Gana con una racha de 3 aciertos',test:function(){return streakMax>=3}},
  {id:'collect_pu',desc:'Gana recogiendo un power-up',test:function(){return dPUCollected}}
];
function dailyObj(){return DAILY_OBJS[dayOfYear()%DAILY_OBJS.length]}
function bumpStreak(){var s=loadStreak(),today=todayStr();if(s.last===today)return;s.count=(s.last===yesterdayStr())?s.count+1:1;s.last=today;LS('gstreak',s);if(s.count>=7)unlockAch('devotee')}
function startDaily(){dailyRng=mulberry32(hashStr(todayStr()));dailyMode=true;arena=['neon','jungle','space'][Math.floor(rng()*3)];difficulty=['normal','hard','expert'][Math.floor(rng()*3)];gameMode='cpu';if(typeof closeDaily==='function')closeDaily();startGame()}
```

- [ ] **Step 2: Evaluar el objetivo en endGame**

Localizar el final de `endGame` (≈847-850):

```javascript
  var earned=0;
  if(gameMode==='infinite'){earned=Math.floor(round/5)*5;}
  else if(won){earned=Math.round(10*diffMult(difficulty));}
  if(earned>0)addCoins(earned);
```

Añadir JUSTO DESPUÉS (antes del cierre `}` de `endGame`):

```javascript
  if(dailyMode){var dd=loadDaily(),obj=dailyObj(),already=!!(dd&&dd.done&&dd.date===todayStr());
    var passed=won&&obj.test();
    saveDaily({date:todayStr(),done:already||passed,obj:obj.id,tries:((dd&&dd.date===todayStr()&&dd.tries)||0)+1});
    if(passed&&!already){addCoins(50);bumpStreak();unlockAch('daily_first');
      document.getElementById('endText').textContent='Reto diario completado! +50 🪙';}
    dailyMode=false;dailyRng=null;}
```

- [ ] **Step 3: Reset de dailyMode/dailyRng en goHome**

Localizar el inicio de `function goHome(` y añadir al principio de su cuerpo:

```javascript
  dailyMode=false;dailyRng=null;
```

(Insertar justo después de `function goHome(){`.)

- [ ] **Step 4: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. En consola:

```javascript
localStorage.removeItem('gdaily'); localStorage.removeItem('gstreak'); localStorage.setItem('gcoins','0');
console.log(dailyObj().id, dailyObj().desc); // objetivo del dia (id + desc)
// Simular reto ganado cumpliendo el objetivo del dia:
startDaily();
console.log('modo:', dailyMode, 'arena sembrada:', arena, 'dif sembrada:', difficulty); // dailyMode true; arena/dif deterministas
// Forzar victoria cumpliendo el objetivo actual (segun dailyObj().id, ajustar trackers):
// ejemplo generico: marcar como ganado con no_damage y racha y PU y 1 tiro con cada arma probable
pScore=3; cScore=0; pDmgTaken=0; pShots=1; streakMax=3; dPUCollected=true; dWeapons={};dWeapons[['boomerang','','cluster','','normal'][0]]=true;
// mejor: setear el tracker que el objetivo de hoy requiere. Para forzar exito universalmente:
var o=dailyObj(); if(o.id==='only_boomerang'){dWeapons={boomerang:true}} else if(o.id==='only_cluster'){dWeapons={cluster:true}} else if(o.id==='only_normal'){dWeapons={normal:true}}
endGame();
console.log('done:', loadDaily().done, 'coins:', getCoins(), 'streak:', loadStreak().count, 'daily_first:', loadAch().daily_first);
// Esperado: done true, coins 50 + monedas de victoria por dificultad, streak 1, daily_first 1
console.log('rng reset:', dailyRng===null, 'mode reset:', dailyMode===false); // true true
```

Esperado: el reto se marca completado, otorga el bonus de 50 (más las monedas de victoria por dificultad), la racha sube a 1, se desbloquea `daily_first`, y `dailyRng`/`dailyMode` quedan reseteados. Repetir `endGame()` no vuelve a otorgar el bonus (already=true).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: flujo del reto diario, objetivos rotativos y evaluacion"
```

---

## Task 5: UI del reto, logros y bump del SW

**Files:**
- Modify: `index.html` — CSS (`<head>`); botón en `#startScreen`; overlay `#dailyScreen`; funciones `openDaily`/`closeDaily` tras `updCoinsUI`; wiring; `ACHS` (~línea 300). Modify: `sw.js` línea 1.

**Interfaces:**
- Consumes: `dailyObj`, `loadDaily`, `loadStreak`, `todayStr`, `startDaily`.
- Produces: `openDaily()`, `closeDaily()`, botón y panel del reto; logros `daily_first`, `devotee`.

- [ ] **Step 1: CSS del panel**

En el `<style>` del `<head>`, antes de `</style>`:

```css
#dailyScreen .dailyObj{background:#1c1c30;border:1px solid #7a4dff;border-radius:12px;padding:16px;max-width:420px;margin:10px auto;color:#eef}
#dailyScreen .dailyObj .lbl{color:#a98cff;font-size:12px;text-transform:uppercase;letter-spacing:1px}
#dailyScreen .dailyObj .txt{font-size:18px;font-weight:700;margin:6px 0}
#dailyScreen .dailyState{margin:8px 0;font-weight:700}
#dailyScreen .dailyState.done{color:#2ecc71}
#dailyScreen .streakLine{color:#ffd83b;font-weight:700;margin:8px 0}
```

- [ ] **Step 2: Botón "Reto diario" en el menú**

En `#startScreen`, tras el botón `#shopBtn` (Fase 2) y antes de `#statsLine`:

```html
  <button class="btn" id="dailyBtn" style="background:#e67e22;margin-top:8px">&#x1F4C5; RETO DIARIO</button>
```

- [ ] **Step 3: Overlay del reto**

Tras el cierre del overlay `#shopScreen` (Fase 2), insertar:

```html
<div class="overlay hidden" id="dailyScreen">
  <div class="emoji">&#x1F4C5;</div>
  <h1>RETO DIARIO</h1>
  <div class="dailyObj">
    <div class="lbl">Objetivo de hoy</div>
    <div class="txt" id="dailyObjTxt">—</div>
  </div>
  <div class="dailyState" id="dailyState">—</div>
  <div class="streakLine" id="dailyStreak">&#x1F525; Racha: 0</div>
  <button class="btn" id="dailyPlayBtn" style="margin-top:10px">JUGAR RETO</button>
  <button class="btn" id="dailyBackBtn" style="margin-top:8px;background:#444">VOLVER</button>
</div>
```

- [ ] **Step 4: Funciones y wiring**

Tras `updCoinsUI` (Fase 1), insertar:

```javascript
function renderDaily(){var o=dailyObj(),dd=loadDaily(),st=loadStreak();
  document.getElementById('dailyObjTxt').textContent=o.desc;
  var done=!!(dd&&dd.done&&dd.date===todayStr());
  var se=document.getElementById('dailyState');se.textContent=done?'✅ Completado hoy':'Pendiente';se.className='dailyState'+(done?' done':'');
  document.getElementById('dailyStreak').textContent='🔥 Racha: '+(st.count||0);
  var pb=document.getElementById('dailyPlayBtn');pb.textContent=done?'JUGAR DE NUEVO':'JUGAR RETO';}
function openDaily(){document.getElementById('startScreen').classList.add('hidden');document.getElementById('dailyScreen').classList.remove('hidden');renderDaily();}
function closeDaily(){document.getElementById('dailyScreen').classList.add('hidden');document.getElementById('startScreen').classList.remove('hidden');}
document.getElementById('dailyBtn').addEventListener('click',openDaily);
document.getElementById('dailyBackBtn').addEventListener('click',closeDaily);
document.getElementById('dailyPlayBtn').addEventListener('click',startDaily);
```

- [ ] **Step 5: Logros `daily_first` y `devotee`**

En el array `ACHS`, tras la entrada `{id:'collector',...}` (Fase 2), poner coma y añadir:

```javascript
  {id:'daily_first',name:'Primer Reto',icon:'📅',desc:'Completa tu primer reto diario'},
  {id:'devotee',name:'Devoto',icon:'🔥',desc:'Racha diaria de 7 dias'}
```

- [ ] **Step 6: Bump del Service Worker**

En `sw.js` línea 1, cambiar `var CACHE='gorilas-v11';` por `var CACHE='gorilas-v12';`.

- [ ] **Step 7: Verificar en navegador**

Servir, desregistrar SW/limpiar cachés, recargar. `localStorage.removeItem('gdaily'); localStorage.removeItem('gstreak');` y recargar. Click "📅 RETO DIARIO":
1. El panel muestra el objetivo de hoy (texto), estado "Pendiente" y "🔥 Racha: 0".
2. Click "JUGAR RETO" → arranca una partida vs-CPU (dailyMode activo). Recargar la página y volver a abrir el reto: el objetivo/arena serán los mismos (deterministas por fecha).
3. Simular completar por consola (como en Task 4) y reabrir el panel → estado "✅ Completado hoy", racha 1, botón "JUGAR DE NUEVO".
Confirmar `head -1 sw.js` → `gorilas-v12`. Describir lo observado.

- [ ] **Step 8: Commit**

```bash
git add index.html sw.js
git commit -m "feat: UI del reto diario, logros daily_first/devotee y bump SW v12"
```

---

## Notas de alcance (Fase 3)

- El reto es una partida vs-CPU sembrada; no hay objetivo de modo infinito (refinamiento acordado sobre el spec).
- Solo la generación relevante al juego (alturas, posiciones, PU, viento, turno) es determinista; lo cosmético permanece aleatorio a propósito.
- El terreno exacto puede variar entre tamaños de pantalla (nº de edificios depende del ancho); arena/viento/dificultad/objetivo/turno sí son idénticos para todos ese día.
- Re-jugar el reto ya completado no vuelve a dar el bonus de 50 ni sube la racha (gate `already`), pero sí da las monedas normales de victoria.

## Self-Review

- **Cobertura del spec (secciones 2, 3):** PRNG sembrado por fecha (Task 1 ✓), generación determinista (Task 2 ✓), objetivo rotativo por día (Task 4 ✓), evaluación + bonus +50 (Task 4 ✓), racha diaria (Task 4 `bumpStreak` ✓), UI del reto y racha (Task 5 ✓), logros `daily_first`/`devotee` (Task 5 ✓). Refinamiento (vs-CPU + dificultad sembrada, sin infinito) documentado.
- **Placeholders:** ninguno; todo el código está completo.
- **Consistencia de nombres/tipos:** `rng()`/`rrand()` usados en Task 2 tras definirse en Task 1; `dailyRng`/`dailyMode` declarados (Task 1 var / Task 3 var) y usados consistentemente; trackers `pShots`/`dWeapons`/`dPUCollected`/`streakMax` declarados en Task 3 y consumidos por `DAILY_OBJS` en Task 4; `closeDaily` se referencia en `startDaily` (Task 4) con guard `typeof ...==='function'` porque se define en Task 5; ids de logro `daily_first`/`devotee` coinciden entre `unlockAch` (Task 4/`bumpStreak`) y `ACHS` (Task 5); claves `gdaily`/`gstreak` coherentes.
- **SW cache:** bump a v12 en la última tarea (Task 5, Step 6).
- **Riesgo principal (Task 2):** la verificación incluye una prueba de no-regresión explícita (juego normal sigue variando) además del determinismo bajo semilla.
