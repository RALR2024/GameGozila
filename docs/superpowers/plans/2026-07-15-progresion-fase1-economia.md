# Progresión Fase 1 — Economía Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir la economía de monedas (ganar, guardar, gastar) y los logros de monedas al juego, dejando saldo visible en el menú, como primera fase entregable del sistema de progresión.

**Architecture:** Todo inline en `index.html`, en ES5, junto a los helpers de `localStorage` existentes. Se añaden funciones puras de economía (`getCoins`/`addCoins`/`spendCoins`/`diffMult`), un elemento de saldo en la pantalla de inicio, y la concesión de monedas en `endGame()`. Se amplía el array `ACHS` con logros disparados desde `addCoins`/`endGame`. Sin backend, sin dependencias, sin build.

**Tech Stack:** HTML5 Canvas, JavaScript ES5, Web Audio API (existente), `localStorage` vía helper `LS()`.

## Global Constraints

- **ES5 solamente:** usar `var`, funciones con `function`, sin `const`/`let`/arrow functions. Coincidir con el estilo compacto existente del archivo.
- **Inline en `index.html`:** no crear archivos JS nuevos ni tocar `sw.js`.
- **Sin dependencias externas** ni backend. Persistencia únicamente vía `LS(k, v)`.
- **Clave de saldo:** `gcoins` (número). Leer/escribir siempre con `LS()`.
- **Multiplicador de dificultad (`diffMult`):** beginner `1`, easy `1`, normal `1.5`, hard `2`, expert `2.5`, master `3`, impossible `3`.
- **Verificación:** el juego no tiene framework de test; cada tarea se verifica abriendo `index.html` en el navegador y ejecutando comandos en la consola de DevTools contra las funciones reales y `localStorage`.

---

## File Structure

- **Modify:** `index.html` — único archivo tocado. Zonas:
  - Helpers de storage (~línea 293-302): añadir funciones de economía.
  - HTML de `#startScreen` (~línea 174-175): añadir elemento de saldo.
  - `ACHS` array (~línea 280-289): añadir logros.
  - `endGame()` (~línea 711-730): conceder monedas y disparar logros.
  - Arranque final (~línea 732): pintar saldo al cargar.

---

## Task 1: Funciones core de economía

**Files:**
- Modify: `index.html` (tras la línea 302, después de `unlockAch`)

**Interfaces:**
- Consumes: `LS(k, v)` existente.
- Produces:
  - `getCoins()` → `number` (0 si no hay dato).
  - `diffMult(diff)` → `number` (multiplicador de dificultad).
  - `addCoins(n)` → `number` (nuevo saldo; persiste `gcoins`, llama `updCoinsUI()` si existe, dispara logros de monedas).
  - `spendCoins(n)` → `boolean` (`true` si había saldo y se descontó; `false` si no).

- [ ] **Step 1: Añadir las funciones de economía**

Insertar después de la línea 302 (fin de `unlockAch`), antes del comentario `// ---- Canvas ----`:

```javascript
// ---- Economy ----
function getCoins(){var c=LS('gcoins');return typeof c==='number'?c:0}
function diffMult(diff){return {beginner:1,easy:1,normal:1.5,hard:2,expert:2.5,master:3,impossible:3}[diff]||1}
function addCoins(n){var c=getCoins()+Math.round(n);LS('gcoins',c);if(typeof updCoinsUI==='function')updCoinsUI();if(c>=100)unlockAch('coin_100');if(c>=500)unlockAch('rich');return c}
function spendCoins(n){var c=getCoins();if(c<n)return false;LS('gcoins',c-n);if(typeof updCoinsUI==='function')updCoinsUI();return true}
```

- [ ] **Step 2: Verificar en consola que funcionan**

Abrir `index.html` en el navegador. En la consola de DevTools ejecutar:

```javascript
localStorage.removeItem('gcoins');
console.log(getCoins());        // esperado: 0
console.log(addCoins(15));      // esperado: 15
console.log(getCoins());        // esperado: 15
console.log(spendCoins(20));    // esperado: false (saldo insuficiente)
console.log(spendCoins(10));    // esperado: true
console.log(getCoins());        // esperado: 5
console.log(diffMult('hard'));  // esperado: 2
```

Esperado: los valores coinciden con los comentarios. `unlockAch('coin_100')` aún no existirá como logro definido (se añade en Task 4) pero `unlockAch` ignora ids desconocidos sin error.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: funciones core de economia de monedas"
```

---

## Task 2: Saldo de monedas visible en el menú

**Files:**
- Modify: `index.html` (HTML de `#startScreen` ~línea 174-175; función nueva junto a `showStats` ~línea 300; arranque ~línea 732)

**Interfaces:**
- Consumes: `getCoins()` de Task 1.
- Produces: `updCoinsUI()` → actualiza el texto del elemento `#coinBal`.

- [ ] **Step 1: Añadir el elemento de saldo en el menú**

En `#startScreen`, justo después de `<button class="btn" id="startBtn" ...>JUGAR</button>` (línea 174) y antes de `<div class="stats" id="statsLine"></div>`:

```html
  <div class="stats" id="coinBal" style="font-weight:700">&#x1FA99; 0</div>
```

- [ ] **Step 2: Añadir la función `updCoinsUI`**

Insertar después de `showStats` (línea 300):

```javascript
function updCoinsUI(){var el=document.getElementById('coinBal');if(el)el.textContent='🪙 '+getCoins()}
```

- [ ] **Step 3: Pintar el saldo al cargar**

En la última línea del script (línea 732), añadir `updCoinsUI();` al final:

```javascript
updDiffUI();layout();showStats('statsLine');updCoinsUI();mainLoop();
```

- [ ] **Step 4: Verificar en el navegador**

Recargar `index.html`. En consola:

```javascript
localStorage.setItem('gcoins','42');
updCoinsUI();
console.log(document.getElementById('coinBal').textContent);  // esperado: "🪙 42"
```

Esperado: el menú muestra "🪙 42" bajo el botón JUGAR.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: saldo de monedas visible en el menu"
```

---

## Task 3: Conceder monedas al terminar la partida

**Files:**
- Modify: `index.html` — `endGame()` (~línea 711-730)

**Interfaces:**
- Consumes: `addCoins(n)`, `diffMult(diff)` de Task 1; variables globales `won`, `gameMode`, `difficulty`, `round`.
- Produces: efecto secundario (monedas concedidas). Sin nueva API.

- [ ] **Step 1: Añadir la concesión de monedas en `endGame`**

En `endGame()`, justo después de la línea `if(won&&gameMode!=='2p')tryUnlock(difficulty);` (línea 729) y antes del cierre `}`:

```javascript
  var earned=0;
  if(gameMode==='infinite'){earned=Math.floor(round/5)*5;}
  else if(won){earned=Math.round(10*diffMult(difficulty));}
  if(earned>0)addCoins(earned);
```

- [ ] **Step 2: Verificar en el navegador**

Recargar. En consola, simular fin de partida vs CPU ganada en normal:

```javascript
localStorage.setItem('gcoins','0');
gameMode='cpu'; difficulty='normal'; pScore=3; cScore=1; pDmgTaken=1;
endGame();
console.log(getCoins());  // esperado: 15  (10 × 1.5)
```

Luego infinito ronda 12:

```javascript
localStorage.setItem('gcoins','0');
gameMode='infinite'; round=12; lives=0; pScore=5;
endGame();
console.log(getCoins());  // esperado: 10  (floor(12/5)=2 → 2×5)
```

Esperado: los saldos coinciden. (Tras `endGame` se abre la pantalla de fin; recargar entre pruebas si hace falta.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: conceder monedas al ganar y por rondas de infinito"
```

---

## Task 4: Logros de economía y maestría

**Files:**
- Modify: `index.html` — array `ACHS` (~línea 280-289); `endGame()` (~línea 720, bloque de logros)

**Interfaces:**
- Consumes: `unlockAch(id)` existente; disparadores desde `addCoins` (Task 1, ya referencia `coin_100`/`rich`) y `endGame`.
- Produces: nuevas entradas de logro visibles en el popup existente.

- [ ] **Step 1: Añadir las nuevas entradas a `ACHS`**

En el array `ACHS` (línea 280-289), añadir tras la última entrada `{id:'friendly',...}` (poner coma en la línea anterior):

```javascript
  {id:'coin_100',name:'Alcancía',icon:'🪙',desc:'Acumula 100 monedas'},
  {id:'rich',name:'Ricachón',icon:'💰',desc:'Acumula 500 monedas'},
  {id:'beat_impossible',name:'Leyenda',icon:'👑',desc:'Vence en Imposible'}
```

- [ ] **Step 2: Disparar `beat_impossible` en `endGame`**

En `endGame()`, en la línea de logros `if(won&&gameMode!=='2p')tryUnlock(difficulty);` (línea 729), añadir justo después:

```javascript
  if(won&&gameMode==='cpu'&&difficulty==='impossible')unlockAch('beat_impossible');
```

(Colocar antes del bloque `var earned=0;` de la Task 3.)

- [ ] **Step 3: Verificar en el navegador**

Recargar. En consola:

```javascript
localStorage.removeItem('gach'); localStorage.setItem('gcoins','0');
addCoins(100);
console.log(loadAch().coin_100);  // esperado: 1
addCoins(400);
console.log(loadAch().rich);      // esperado: 1
localStorage.removeItem('gach');
gameMode='cpu'; difficulty='impossible'; pScore=3; cScore=0;
endGame();
console.log(loadAch().beat_impossible);  // esperado: 1
```

Esperado: cada logro se registra en `gach` y aparece el popup de logro al dispararse por primera vez.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: logros de monedas y maestria (coin_100, rich, beat_impossible)"
```

---

## Notas de alcance (Fase 1)

- Los logros `collector`, `devotee` y `daily_first` **no** se añaden aquí: dependen de la tienda (Fase 2) y del reto/racha diaria (Fase 3). Se añadirán en sus respectivos planes.
- El logro `sharpshooter` (ganar en ≤3 tiros) requiere un contador de tiros del jugador que aún no existe; se difiere hasta la fase que introduzca ese contador para no tocar la lógica de disparo en esta fase.
- El gasto de monedas (`spendCoins`) queda implementado pero sin consumidor hasta la tienda (Fase 2); se prueba de forma aislada en Task 1.

## Self-Review

- **Cobertura del spec (sección Economía):** ganar vs CPU (Task 3 ✓), infinito por rondas (Task 3 ✓), logro de monedas (Task 4 ✓). Bonus de reto diario y racha → fases 2/3 (fuera de esta fase, declarado). API `addCoins/getCoins/spendCoins` (Task 1 ✓). Saldo en UI (Task 2 ✓).
- **Placeholders:** ninguno; todo el código está completo e inline.
- **Consistencia de tipos:** `getCoins()→number`, `addCoins(n)→number`, `spendCoins(n)→boolean`, `diffMult(diff)→number`, `updCoinsUI()` referenciada por `addCoins`/`spendCoins` de forma defensiva (`typeof ... === 'function'`) porque se define en Task 2 (después de Task 1) — el guard evita error si Tasks se ejecutan en orden. Nombres de clave (`gcoins`) y de logro (`coin_100`, `rich`, `beat_impossible`) coinciden entre Task 1 y Task 4.
