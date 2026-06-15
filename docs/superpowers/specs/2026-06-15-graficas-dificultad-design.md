# Mejoras gráficas semi-realistas y 7 niveles de dificultad

**Fecha:** 2026-06-15
**Estado:** Aprobado para implementación

## Contexto

Batalla de Gorilas es un juego de artillería por turnos en HTML5 Canvas (JavaScript vanilla, un solo archivo `index.html`). El usuario quiere:
1. Mejorar las gráficas hacia un estilo **semi-realista** (sombras, profundidad, iluminación).
2. Expandir de 3 a **7 niveles de dificultad** con diferencias en precisión, selección de armas y comportamiento táctico de la CPU.

## Restricciones

- Todo vive en `index.html` — no se crean archivos JS/CSS externos.
- Sin imágenes ni assets externos — todo es Canvas procedural.
- Debe mantener rendimiento fluido en móviles (60fps target).
- No romper: física del proyectil, power-ups, sistema de clima, sonido, PWA, páginas del blog/legales.

---

## 1. Gráficas: edificios con profundidad

### Objetivo
Reemplazar los edificios planos con bloques que tengan sensación de volumen y luz.

### Cambios en `drawBld()`

**Sombra lateral:**
- Dibujar un rectángulo oscuro (rgba(0,0,0,0.3)) desplazado 4-6px a la derecha del edificio, simulando una fuente de luz desde la izquierda (la luna).

**Cornisa superior:**
- Rectángulo de 4px de alto en el tope del edificio, color ligeramente más claro que el cuerpo (+15% luminosidad). Reemplaza la línea neón actual.

**Ventanas en grilla regular:**
- Reemplazar el sistema actual de ventanas posicionadas aleatoriamente.
- Calcular una grilla regular: columnas = `floor(building.w / 14)`, filas = `floor(building.h / 20)`.
- Cada ventana: 6x8px, con padding uniforme.
- Ventana encendida: fill color cálido (`rgba(255,220,120,0.85)`) + `shadowBlur: 4` del mismo color para efecto glow.
- Ventana apagada: fill oscuro (`rgba(20,30,60,0.6)`) con borde sutil de reflejo (`rgba(100,150,200,0.1)`).
- Probabilidad de encendida: 45%.

**Reflejo en el suelo:**
- Debajo de cada edificio, dibujar un `createRadialGradient` elíptico (ancho del edificio × 15px alto), color del neón del tema con opacidad 0.08-0.12. Simula luz reflejada.

### Cambios en `makeBld()`

- Reemplazar la propiedad `lit` (array aleatorio) por `cols` y `rows` calculados del tamaño del edificio.
- Agregar array `winOn` (boolean[]) generado una vez por ronda con la grilla de encendidas/apagadas.

---

## 2. Gráficas: explosiones mejoradas

### Objetivo
Explosiones con más capas visuales: onda de choque, humo persistente, escombros con física.

### Onda de choque
- Al crear una explosión, agregar un anillo (strokeStyle, no fill) que se expande al doble de velocidad que la bola de fuego.
- Opacidad decrece de 0.6 a 0 conforme se expande.
- lineWidth decrece de 4 a 1.
- Se elimina cuando opacidad llega a 0.

### Humo persistente
- Nuevo array global `smoke[]`.
- Al explotar, generar 8-12 partículas de humo: círculos grises (rgba(80,80,80,alpha)) de radio 6-14px.
- Comportamiento por frame: suben lentamente (`vy -= 0.15`), se expanden (`r += 0.08`), opacidad decrece (`life -= 0.008`).
- Duración: ~3 segundos (125 frames a 60fps).
- Límite: máximo 50 partículas de humo simultáneas. Si se excede, eliminar las más antiguas.

### Escombros con gravedad
- Reemplazar los `spawnDeb()` actuales (partículas simples) con escombros que:
  - Tienen rotación aleatoria (`rot += rv` por frame).
  - Caen con gravedad (`vy += 0.25`).
  - Son rectángulos del color del edificio impactado.
  - Se eliminan al salir de pantalla o cuando `life <= 0`.

### Cráteres en edificios
- En `hitBld()`, además de reducir `b.h`, guardar la posición X del impacto en un array `b.craters[]`.
- En `drawBld()`, por cada cráter, dibujar un arco semicircular oscuro (bite) en el borde superior del edificio en esa posición X relativa.

### Nuevas funciones
- `drawSmoke()`: renderiza partículas de humo.
- `stepSmoke()`: actualiza posición/opacidad, elimina las muertas.

---

## 3. Gráficas: cielo atmosférico

### Objetivo
Cielo con más capas y detalles atmosféricos.

### Degradado del cielo
- Aumentar las paradas del gradiente de fondo de 5 a 7-8, agregando tonos intermedios para transiciones más suaves. Se aplica en `layout()` al setear `#wrap` background.

### Nubes
- Nuevo array global `clouds[]`, generado en `makeStars()`.
- 3-5 nubes por ronda, cada una compuesta de 2-3 elipses superpuestas.
- Propiedades: `{x, y, w, h, speed, opacity}`.
- `speed`: proporcional al viento (`wind * 0.05`), más un drift base lento.
- Renderizado: `ctx.ellipse()` con fill `rgba(255,255,255, 0.03-0.06)`. Muy sutiles.
- En arena Espacio: sin nubes. En Selva: nubes más densas (opacity × 1.5).

### Estrellas con halo
- En `drawSky()`, para cada estrella, dibujar primero un círculo más grande (radio × 3) con opacidad muy baja (0.05-0.08) como halo, luego la estrella normal encima.
- Solo aplicar halo a estrellas con radio > 1.2 (las más brillantes).

### Luna con cráteres
- En la sección de luna de `drawSky()`, después de dibujar la luna, agregar 4-5 círculos oscuros pequeños (radio 3-6px) en posiciones fijas como cráteres.
- Color: `rgba(140,150,180,0.4)`.

### Bruma del horizonte
- Después de dibujar el cielo y antes de los edificios, dibujar un rectángulo de ancho completo en la zona inferior del cielo (últimos 15% de altura).
- Fill: gradiente vertical de transparente a `rgba(color_tema, 0.15)`.
- Simula neblina/contaminación urbana.

### Nueva función
- `drawClouds()` / `stepClouds()`: renderizar y mover nubes.

---

## 4. Gráficas: gorilas detallados

### Objetivo
Gorilas con más personalidad visual y expresividad.

### Textura de pelaje
- Después de dibujar las formas base del gorila, agregar 20-30 trazos cortos (líneas de 3-5px) alrededor del contorno del cuerpo y la cabeza.
- Color: versión ligeramente más oscura del color body.
- `ctx.lineWidth = 1`, `ctx.lineCap = 'round'`.
- Posiciones pre-calculadas en coords relativas al centro del gorila.

### Expresiones faciales dinámicas
- Nuevo campo `gorilla.expr` con valores: `'neutral'`, `'aim'`, `'happy'`, `'hurt'`, `'shock'`.
- Transiciones:
  - `'aim'` → cuando es tu turno y estás apuntando. Cejas bajan ligeramente (concentración).
  - `'happy'` → cuando aciertas un tiro. Boca se curva hacia arriba, cejas suben. Duración: 1.5s.
  - `'hurt'` → cuando recibes un golpe. Boca "O", cejas juntas. Duración: 1s.
  - `'shock'` → cuando un tiro cae muy cerca pero falla. Ojos más grandes. Duración: 0.8s.
- Implementación en `drawG()`: switch sobre `g.expr` para modificar los arcos de cejas, boca y tamaño de ojos.

### Ojos que siguen el proyectil
- Durante `state === 'fly'`, calcular la dirección desde el gorila hacia `banana.{x,y}`.
- Desplazar las pupilas (los círculos negros pequeños) 1-2px en esa dirección.
- Cuando no hay proyectil, pupilas al centro.

### Animación de lanzamiento
- Al llamar `fireBan()`, setear `gorilla.throwAnim = Date.now()`.
- En `drawG()`, si `throwAnim` está activo y han pasado < 300ms:
  - Fase 1 (0-100ms): brazo hacia atrás (ángulo negativo).
  - Fase 2 (100-200ms): brazo hacia adelante (ángulo positivo alto).
  - Fase 3 (200-300ms): brazo vuelve a posición neutral.
- Solo aplicar al brazo del lado de lanzamiento (izquierdo para gorila 0, derecho para gorila 1).

---

## 5. Sistema de 7 niveles de dificultad

### Configuración

```javascript
var DIFF = {
  beginner:  { cpuBase: .40, smartWeapon: false, seekPU: false, windAware: false, adaptive: false, correction: 0 },
  easy:      { cpuBase: .28, smartWeapon: false, seekPU: false, windAware: false, adaptive: false, correction: 0 },
  normal:    { cpuBase: .16, smartWeapon: false, seekPU: false, windAware: false, adaptive: false, correction: 0 },
  hard:      { cpuBase: .08, smartWeapon: true,  seekPU: true,  windAware: false, adaptive: false, correction: 0 },
  expert:    { cpuBase: .05, smartWeapon: true,  seekPU: true,  windAware: true,  adaptive: false, correction: 0 },
  master:    { cpuBase: .03, smartWeapon: true,  seekPU: true,  windAware: true,  adaptive: true,  correction: .70 },
  impossible:{ cpuBase: .01, smartWeapon: true,  seekPU: true,  windAware: true,  adaptive: true,  correction: .90 }
};
```

### Selección inteligente de arma (`cpuPickWeapon`)

Cuando `smartWeapon: true`, nueva función que evalúa:
- **Distancia al objetivo:** si < 30% del ancho de pantalla → bomba racimo (mayor área de efecto a corta distancia). Si > 70% → plátano clásico (más predecible). Intermedio → boomerang si viento a favor, plátano si no.
- **Viento:** si `windAware` y viento > 8 y tiene power-up Calma → lo usa.

### Búsqueda de power-ups (`seekPU`)

Cuando `seekPU: true`, la CPU ajusta ligeramente su trayectoria (±5% en velocidad) para pasar cerca de power-ups no recolectados en su camino al objetivo. Solo intenta si el desvío es menor al 10% de la distancia total.

### Comportamiento adaptativo (`adaptive`)

Cuando `adaptive: true`:
- La CPU guarda `cpuLastShot = {vx, vy, hitX, hitY, targetX, targetY}`.
- En el siguiente turno, calcula el error del tiro anterior y aplica corrección:
  - `newVx = calculatedVx + (targetX - hitX) * correction_factor / T`
  - `newVy = calculatedVy + (targetY - hitY) * correction_factor / T`
- Factor de corrección: 0.70 para Maestro, 0.90 para Imposible.
- Se resetea `cpuLastShot` al cambiar de ronda.

### Progresión de desbloqueo

- Niveles 1-5 (Principiante → Experto): desbloqueados desde el inicio.
- Nivel 6 (Maestro): se desbloquea al ganar una partida en Experto.
- Nivel 7 (Imposible): se desbloquea al ganar una partida en Maestro.
- Estado guardado en `localStorage` key `'gunlocked'`: array de IDs desbloqueados.
- En la UI, niveles bloqueados muestran un icono de candado y no son clickeables.

### Cambios en la UI de pantalla de inicio

- Reemplazar los 3 botones de dificultad por 7 botones más compactos.
- Botones en dos filas: fila 1 = Principiante, Fácil, Normal, Difícil; fila 2 = Experto, Maestro, Imposible.
- Botones bloqueados: opacidad 0.4, cursor default, icono de candado (🔒) en vez del nombre.
- Al intentar clickear un botón bloqueado, mostrar un tooltip breve: "Gana en [nivel anterior] para desbloquear".

---

## 6. Impacto en rendimiento

| Feature | Costo estimado | Mitigación |
|---------|---------------|------------|
| Sombras de edificios | Bajo (1 rect extra por edificio) | Ninguna necesaria |
| Ventanas en grilla | Medio (más rects pero regulares) | Pre-calcular grilla una vez por ronda |
| Onda de choque | Bajo (1 arco extra por explosión) | Se auto-elimina rápido |
| Humo persistente | Medio (hasta 50 círculos) | Cap de 50 partículas, eliminar las antiguas |
| Nubes | Bajo (3-5 elipses) | Muy pocas, solo movimiento lento |
| Pelaje gorila | Bajo (20-30 líneas cortas) | Posiciones pre-calculadas |
| Expresiones | Negligible (modifica arcos existentes) | Ninguna |
| IA avanzada | Negligible (lógica JS, no gráfico) | Ninguna |

**Total:** No debería haber impacto perceptible. El bottleneck en Canvas 2D es el fill de áreas grandes, no la cantidad de primitivas pequeñas.

---

## 7. Lo que NO cambia

- Física del proyectil (gravedad, viento, colisiones)
- Sistema de power-ups (tipos, recolección, efectos)
- Sistema de clima (lluvia, nieve, tormentas)
- Sonido (Web Audio API procedural)
- PWA (Service Worker, manifest, offline)
- Páginas legales y blog (privacidad, términos, contacto, acerca, artículos)
- Sistema de logros
- Modos de juego (vs CPU, vs Amigo, Infinito)
- Las 3 arenas y sus valores de gravedad/viento
