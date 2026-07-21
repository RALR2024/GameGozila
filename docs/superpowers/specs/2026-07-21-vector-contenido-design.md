# Diseño: Vector de Contenido (armas, clima, arenas, mecánicas)

**Fecha:** 2026-07-21
**Estado:** Aprobado (pendiente revisión de spec por el usuario)
**Vector:** Contenido — segundo gran vector tras el sistema de progresión (ya desplegado).

## Objetivo

Ampliar la variedad y rejugabilidad de Gozillas añadiendo contenido nuevo en cuatro
áreas, implementadas en fases entregables independientes:
1. **Armas** (3 → 7), desbloqueables con la economía existente.
2. **Clima que afecta la jugabilidad** (el clima visual ya existe).
3. **Arenas** (3 → 7).
4. **Mecánicas de arena** interactivas.

## Restricciones y principios

- **ES5 inline** en el juego, sin dependencias ni backend, persistencia en `localStorage`.
- **Despliegue de DOS archivos:** el juego vive en `GameGozila/index.html` (app TWA) y
  en `ralr2024.github.io/jugar.html` (web canónico). Se desarrolla y verifica en
  `index.html`; al desplegar cada fase se porta a `jugar.html` (idéntico salvo 16
  líneas de head/nav) y se sube la caché del SW en **ambos** repos. Ver
  `docs/superpowers/specs/2026-07-15-sistema-progresion-design.md` y la memoria de
  arquitectura de despliegue.
- **Determinismo del reto diario:** todo consumo de aleatoriedad nuevo que afecte la
  reproducibilidad del escenario (elección de clima, arma de la CPU, arena, colocación
  de mecánicas) debe usar el `rng()` sembrado ya existente (Fase 3 de progresión), no
  `Math.random()`. Lo puramente cosmético sigue con `Math.random()`.
- **Reutilizar sistemas existentes:** `THEMES` (arenas), `WEATHER`/`initW`/`stepW`/
  `drawW` (clima), `fireBan`/`stepBan`/`hitBld`/`hitG`/`cpuPickWeapon` (armas),
  `COSMETICS`/tienda (para desbloquear armas).
- **La CPU no está limitada por las compras del jugador:** elige entre todas las armas
  según dificultad; el jugador solo puede usar las que posee.
- **YAGNI / balance:** los valores numéricos (precios, magnitudes de efecto) son
  iniciales y ajustables tras playtesting.

## Modelo de datos (nuevas claves `localStorage`)

| Clave       | Estructura                        | Notas |
|-------------|-----------------------------------|-------|
| `gweapons`  | `[id...]`                         | Armas poseídas por el jugador. Default: `['normal','cluster','boomerang']`. |

Las mecánicas de arena y el clima no requieren estado persistente (son por-ronda).

## Fase 1 — Armas (3 → 7), desbloqueables

**Arsenal actual:** `normal`, `cluster`, `boomerang`.

**Nuevas armas:**
- **`homing` (Teledirigida):** en vuelo se curva suavemente hacia el gorila enemigo
  (ajuste de `banana.vx/vy` en `stepBan`, con un factor de giro limitado para que sea
  esquivable). No perfecta: corrige dirección, no teletransporta.
- **`napalm` (Napalm):** al impactar (`hitBld`/`hitG`) esparce llamas en un área que
  arden un breve tiempo, con partículas de fuego; radio de daño mayor que lo normal,
  control de zona. Reutiliza `startExp`/`spawnP`.
- **`piercing` (Perforadora):** atraviesa hasta N (1–2) edificios antes de explotar
  (`hitBld` cuenta perforaciones en `banana` y solo explota al agotarlas o impactar un
  gorila). Permite tiros a través del terreno.
- **`mirv` (MIRV):** al alcanzar el ápice (vy pasa de negativo a positivo) se divide en
  3–4 sub-proyectiles en abanico. Nueva lógica de split en `stepBan` que sustituye la
  banana por varias (o gestiona una lista de sub-bananas).

**Desbloqueo (tienda):**
- Nueva categoría/pestaña **"Armas"** en la tienda existente, análoga a los cosméticos.
- Estado `gweapons`; las 3 actuales vienen desbloqueadas. Precios iniciales:
  `napalm` 150, `piercing` 150, `homing` 250, `mirv` 300 (ajustables).
- La **fila de selección de armas** se rediseña para 7 (envolvente/desplazable); las
  armas no poseídas muestran candado y no son seleccionables.

**Integración de la CPU:**
- `cpuPickWeapon` se extiende para elegir entre las 7 (o un subconjunto por dificultad);
  la CPU usa todas independientemente de `gweapons`. En el reto diario, la elección usa
  `rng()`.

**Logro:** `arsenal` — poseer todas las armas.

## Fase 2 — Clima que afecta la jugabilidad

El clima visual ya existe (`WEATHER=['clear','clear','rain','snow','storm']`, con
lluvia/nieve/tormenta + rayos). Se añade efecto jugable:
- **Tormenta → viento racheado:** el `wind` varía durante la ronda (ráfagas periódicas),
  actualizando el indicador; obliga a reajustar.
- **Lluvia → arrastre:** leve resistencia horizontal/vertical en `stepBan` que acorta los
  tiros (exige más fuerza).
- **Nieve → calma:** viento reducido a ~0 en la ronda.
- **Niebla (nuevo tipo) → visibilidad reducida:** oscurece parte de la pantalla o de la
  trayectoria, premiando el cálculo. Se añade `'fog'` a `WEATHER` con su render.
- Determinismo: la elección de clima en `initW` pasa a `rng()` para el reto.

## Fase 3 — Arenas (3 → 7)

Nuevas entradas en `THEMES` (bg, grav, wMax, bldC, neon, moon), cada una con su botón en
la fila de arenas (rediseñada para 7):
- **Desierto:** dunas doradas, día, gravedad normal, viento fuerte.
- **Volcán:** cielo rojizo, roca oscura, ceniza; encaja con tormenta y napalm.
- **Submarino:** azul, burbujas, **gravedad baja** (flota) y "viento" = corrientes.
- **Ciudad de día:** rascacielos diurnos, cielo azul con nubes; valores normales.

El pick de arena sembrado del reto ya soporta arenas nuevas (índice sobre la lista).

## Fase 4 — Mecánicas de arena (la más ambiciosa)

- **Vida variable de edificios:** los edificios resisten distinto (p.ej. según altura o
  material); unos caen de un tiro, otros aguantan varios impactos.
- **Obstáculos destructibles:** elementos entre los gorilas (barriles/cristales/muros)
  que bloquean tiros hasta destruirse, cambiando la línea de tiro.
- **Peligros de arena:** peligros temáticos ligados a cada arena (lava en volcán, cactus
  en desierto, corrientes bajo el agua) que dañan o desvían.
- **Plataformas móviles (riesgo alto):** una plataforma flotante que se mueve; un gorila
  puede situarse encima, creando un blanco móvil. Requiere lógica de colisión/movimiento
  cuidadosa; se aborda al final y puede recortarse si el riesgo/beneficio no cuadra.

Determinismo: la colocación de mecánicas (vida de edificios, obstáculos, peligros,
trayectoria de plataformas) usa `rng()` para el reto.

## Flujo de datos (Fase 1)

```
Tienda (pestaña Armas) ──► buyWeapon(id) ──► spendCoins + gweapons
Fila de selección ──► solo armas en gweapons seleccionables (resto con candado)
fireFromUI/cpuTurn ──► weapon global ──► fireBan(...,wt) ──► stepBan/hitBld/hitG por wt
CPU ──► cpuPickWeapon() (todas las armas; rng en reto)
```

## Manejo de errores / casos borde

- `gweapons` corrupto/ausente: cargador devuelve el default `['normal','cluster','boomerang']`
  (patrón `Array.isArray`).
- Arma equipada/seleccionada no poseída (estado corrupto o tras cambios): la selección
  revierte a `normal`.
- MIRV/napalm y modos: funcionan igual en vs-CPU, 2P e infinito; en el reto diario, toda
  aleatoriedad de arma/split usa `rng()`.
- Nuevas arenas/climas deben coexistir con el `rng()` sembrado sin romper el determinismo
  (verificación de no-regresión en cada fase).

## Estrategia de pruebas

Sin framework de test (juego canvas de un archivo). Verificación manual/visual en
navegador (Playwright) por fase:
- Armas: cada arma vuela/impacta como se espera; compra/candado en tienda; CPU las usa;
  determinismo de la elección en reto.
- Clima: cada efecto altera la física esperada; niebla se dibuja; determinismo del pick.
- Arenas: cada tema carga y es jugable; gravedad/viento propios; selección; determinismo.
- Mecánicas: cada mecánica funciona y no rompe el juego normal ni el reto.

## Fases de implementación

1. **Armas** (arsenal + tienda + selector + IA + logro).
2. **Clima jugable** (efectos + niebla).
3. **Arenas** (4 temas + selector).
4. **Mecánicas** (vida de edificios, obstáculos, peligros, plataformas móviles).

Cada fase: diseño detallado en su plan, implementación subagent-driven con verificación
en navegador, y despliegue a los dos archivos con bump de SW.

## Fuera de alcance (explícito)

- Multijugador online, monetización (AdMob), onboarding/tutorial (vector aparte).
- Rebalanceo profundo de la IA más allá de integrar las armas nuevas.
- Editor de niveles o arenas definidas por el usuario.
