# Diseño: Sistema de Progresión "Gozillas"

**Fecha:** 2026-07-15
**Estado:** Aprobado (pendiente revisión de spec por el usuario)
**Vector:** Retención (primero de tres; contenido y onboarding vendrán después en ciclos propios)

## Objetivo

Aumentar la retención del juego de artillería Gozillas añadiendo un sistema de
progresión completo: economía de monedas, reto diario, racha diaria, catálogo de
cosméticos con tienda, y ampliación de logros. Todo offline-first, sin backend,
persistido en `localStorage`, e integrado inline en `index.html` para respetar el
patrón actual de un solo archivo y no arriesgar la arquitectura de despliegue dual
(repo raíz canónico vs `/GameGozila/` de la TWA).

## Restricciones y principios

- **Sin dependencias externas ni backend.** Todo en `localStorage`, igual que las
  claves existentes `gs4`, `gunlocked`, `gach`.
- **Sin arte externo.** Los gorilas se dibujan por código en `drawG(g)`; los
  cosméticos son variaciones de paleta y formas dibujadas, no sprites. Las estelas
  y explosiones reutilizan el sistema de partículas (`spawnP`, `particles`,
  `startExp`).
- **Inline en `index.html`.** No se extrae a archivos aparte para no tocar `sw.js`
  ni el despliegue dual.
- **Determinismo para el reto diario.** El juego usa `Math.random()` en todas
  partes; el reto diario requiere un PRNG sembrado por fecha.
- **YAGNI.** No se incluye leaderboard online, monetización ni multijugador online
  (fuera de alcance de este vector).

## Modelo de datos (nuevas claves `localStorage`)

| Clave     | Estructura                                          | Notas |
|-----------|-----------------------------------------------------|-------|
| `gcoins`  | `number`                                            | Total de monedas acumuladas. |
| `gcos`    | `{owned:[id...], equip:{fur, acc, trail, boom}}`    | Cosméticos poseídos y equipados por categoría. |
| `gdaily`  | `{date:'YYYY-MM-DD', done:bool, obj:id, tries:n}`   | Estado del reto del día. Se reinicia al cambiar la fecha. |
| `gstreak` | `{last:'YYYY-MM-DD', count:n, claimed:bool}`        | Racha de días consecutivos jugando. |
| `gach`    | *(existente)*                                       | Se amplía el array `ACHS`; el mecanismo `unlockAch` no cambia. |

Todas las lecturas/escrituras usan el helper `LS(k, v)` ya existente.

## Componentes

### 1. Economía de monedas

Valores iniciales (ajustables tras playtesting):

| Fuente                        | Recompensa |
|-------------------------------|------------|
| Ganar vs CPU                  | `10 × multDif` |
| Reto diario completado        | `+50` |
| Racha diaria (día N)          | `+5 × min(N, 7)` |
| Logro desbloqueado            | `+25` |
| Infinito                      | `+5` por cada 5 rondas sobrevividas |

Multiplicador de dificultad `multDif`: Novato `1×`, Fácil `1×`, Normal `1.5×`,
Difícil `2×`, Experto `2.5×`, Maestro `3×`, Imposible `3×`.

API interna:
- `addCoins(n)` — suma, persiste en `gcoins`, actualiza el saldo en UI, dispara
  posibles logros de monedas.
- `getCoins()` — lee el saldo.
- `spendCoins(n)` — resta si hay saldo suficiente; devuelve `true/false`.

Las monedas ganadas se otorgan en `endGame()` (partidas), `unlockAch()` (logros) y
en la transición de ronda del modo Infinito.

### 2. Reto diario (sembrado + objetivo)

**PRNG sembrado.** Se añade `mulberry32(seed)` y un hash de string simple para
convertir `'YYYY-MM-DD'` en una semilla numérica. Un flag global `dailySeed`
(o `null` fuera del reto) indica si la generación procedural debe usar el PRNG
sembrado en lugar de `Math.random()`. Los puntos que consumen aleatoriedad para la
generación reproducible del escenario (`makeBld`, viento inicial en `newRound`,
`placeG`, selección de arena) leen de una función `rng()` que devuelve el PRNG
sembrado cuando `dailySeed` está activo y `Math.random()` en caso contrario.

Nota: los efectos puramente cosméticos (partículas, nubes, estrellas) pueden seguir
usando `Math.random()` — no necesitan ser deterministas.

**Objetivo rotativo.** Lista de objetivos indexada por día del año (`díaDelAño % N`):

1. Gana usando solo boomerang
2. Gana sin recibir daño
3. Gana en ≤3 tiros
4. Sobrevive 5 rondas (Infinito)
5. Gana en dificultad Difícil o superior
6. Consigue una racha x3
7. Gana usando solo cluster

Cada objetivo es una función predicado evaluada al terminar la partida del reto.
Completar el reto: marca `gdaily.done=true`, otorga `+50`, y cuenta para la racha
diaria.

**UI del reto:** botón "Reto diario" en el menú que muestra el objetivo del día y
si ya está completado. Al jugarlo, la partida usa el escenario sembrado y evalúa el
predicado del objetivo al final.

### 3. Racha diaria

Al abrir el juego o completar el reto, se compara `gstreak.last` con la fecha de hoy:
- Mismo día: sin cambios.
- Día consecutivo: `count++`, se otorga recompensa `+5 × min(count, 7)`.
- Hueco de más de un día: `count` se reinicia a 1.

Se muestra el contador de racha en el menú.

### 4. Logros ampliados (7 → ~15)

Se añaden entradas al array `ACHS` existente (mismo formato `{id, name, icon, desc}`):

- `collector` — Poseer 5 cosméticos
- `devotee` — Racha diaria de 7 días
- `sharpshooter` — Ganar en ≤3 tiros
- `rich` — Acumular 500 monedas
- `arena_master` — Ganar en las 3 arenas
- `beat_impossible` — Vencer en dificultad Imposible
- `daily_first` — Completar tu primer reto diario
- `coin_100` — Acumular 100 monedas

Los disparadores se insertan en los puntos correspondientes (`endGame`,
`addCoins`, compra en tienda, evaluación del reto). El popup y persistencia
(`unlockAch`) no cambian.

### 5. Cosméticos y tienda

**Catálogo** (todo dibujado por código; precios en monedas):

- **Pelaje** (`fur`, 6): default (0), dorado (50), azul (75), rosa neón (100),
  blanco (100), camuflaje (150).
- **Accesorios** (`acc`, 5): ninguno (0), gorra (100), gafas de sol (100),
  diadema (150), corona (250).
- **Estelas de banana** (`trail`, 5): ninguna (0), fuego (75), arcoíris (150),
  estrellas (150), hielo (200).
- **Explosiones** (`boom`, 4): default (0), dorada (75), arcoíris (150),
  plasma (200).

**Aplicación en render:**
- `drawG(g)` recibe/consulta los cosméticos equipados para el gorila del jugador
  (turno 0 en vs CPU/Infinito; ambos jugadores usan default en 2P para no
  confundir). El color de pelaje sustituye la paleta base; el accesorio se dibuja
  encima.
- La estela se emite desde `stepBan()`/`fireBan()` con el color/forma según
  `equip.trail`.
- La explosión consulta `equip.boom` en `startExp`/`spawnP` para el color de las
  partículas.

**UI de la tienda:** nuevo botón "Tienda" en el menú → modal a pantalla completa
con: saldo de monedas arriba, pestañas por categoría (Pelaje / Accesorios /
Estelas / Explosiones), y una rejilla de ítems. Cada ítem muestra precio y estado
(bloqueado / comprado / equipado) con botón contextual Comprar o Equipar. Comprar
descuenta monedas y añade a `gcos.owned`; equipar actualiza `gcos.equip[cat]`.

## Flujo de datos

```
Jugar partida ──► endGame() ──► addCoins(win×multDif) ──► gcoins
                     │                    │
                     ├──► evalúa objetivo del reto ──► gdaily.done, +50
                     └──► dispara logros ──► unlockAch() ──► +25

Abrir juego ──► chequea racha ──► gstreak.count, +5×N

Tienda ──► Comprar ──► spendCoins() + gcos.owned
       └──► Equipar ──► gcos.equip[cat] ──► drawG / estela / explosión
```

## Manejo de errores / casos borde

- `localStorage` no disponible o corrupto: `LS()` ya envuelve en try/catch y
  devuelve `null`; los cargadores usan valores por defecto.
- Cambio de fecha del sistema hacia atrás: la racha solo avanza en días
  consecutivos hacia adelante; un salto atrás reinicia a 1 (aceptable, no se
  penaliza al jugador con pérdida de monedas ya ganadas).
- Reto ya completado hoy: se puede volver a jugar por diversión pero no vuelve a
  otorgar bonus (`gdaily.done` lo impide).
- Cosmético equipado no poseído (estado corrupto): al cargar, si `equip[cat]` no
  está en `owned`, se revierte a default.
- 2P local: los cosméticos no se aplican (ambos gorilas default) para evitar
  ventaja/confusión visual.

## Estrategia de pruebas

Al ser un juego canvas de un solo archivo sin framework de test, la verificación es
manual/visual con checklist por fase:
- Economía: ganar partida en cada dificultad y confirmar monedas correctas;
  persistencia tras recargar.
- Reto diario: misma semilla → mismo escenario en dos cargas del mismo día;
  objetivo evaluado correctamente; bonus único.
- Racha: simular días (ajustando fecha) y confirmar incremento/reinicio.
- Tienda: comprar (descuenta), equipar (se aplica en render), bloqueo por saldo.
- Logros nuevos: disparar cada condición.

## Fases de implementación

1. **Economía core:** `addCoins/getCoins/spendCoins`, otorgar monedas en
   `endGame`/Infinito, saldo visible en UI, ampliar `ACHS` con logros de monedas.
2. **Motor de cosméticos + tienda:** variaciones en `drawG`, estelas en
   `stepBan`, colores de explosión, y la UI/modal de la tienda con comprar/equipar.
3. **Reto diario + racha:** `mulberry32` + hash de fecha, integración del `rng()`
   sembrado en la generación del escenario, objetivos rotativos, chequeo de racha,
   y sus logros asociados.

Cada fase es entregable e independiente; se puede jugar y verificar antes de pasar
a la siguiente.

## Fuera de alcance (explícito)

- Leaderboard / comparación online del reto diario.
- Monetización (AdMob, rewarded ads) — vector separado.
- Multijugador online.
- Nuevo contenido de juego (armas, arenas, clima) — vector "Contenido", ciclo aparte.
- Tutorial / accesibilidad — vector "Onboarding", ciclo aparte.
