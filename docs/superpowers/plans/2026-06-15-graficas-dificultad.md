# Mejoras Gráficas Semi-Realistas y 7 Niveles de Dificultad — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar las gráficas del juego hacia un estilo semi-realista y expandir de 3 a 7 niveles de dificultad con IA táctica.

**Architecture:** Todo se modifica en `index.html`. Las tareas se organizan por sistema visual (edificios, cielo, explosiones, gorilas) y luego IA/dificultad. Cada tarea produce un cambio visual testeable abriendo el juego en el navegador.

**Tech Stack:** JavaScript vanilla, HTML5 Canvas 2D, un solo archivo HTML.

**Spec:** `docs/superpowers/specs/2026-06-15-graficas-dificultad-design.md`

---

## Task 1: Edificios con profundidad — generación de grilla de ventanas

**Files:**
- Modify: `index.html:360-365` (función `makeBld()`)

- [ ] **Step 1: Replace `makeBld()` with grid-based window generation**

Find and replace the `makeBld` function. The new version calculates a regular grid of windows based on building dimensions instead of random positions.

```javascript
function makeBld(){
  buildings=[];var n=Math.max(8,Math.min(14,Math.round(W/70))),bw=W/n;
  for(var i=0;i<n;i++){var h=rand(H*.16,H*.55),c=TH.bldC[i%TH.bldC.length],ne=TH.neon[Math.floor(rand(0,TH.neon.length))];
    var cols=Math.floor((bw-8)/14),rows=Math.floor(h/20);
    var winOn=[];for(var wi=0;wi<cols*rows;wi++)winOn.push(Math.random()<.45);
    buildings.push({x:i*bw,w:bw,h:h,c1:c[0],c2:c[1],neon:ne,ant:Math.random()>.6,cols:cols,rows:rows,winOn:winOn,craters:[]})}
}
```

- [ ] **Step 2: Open the game in the browser and confirm buildings still generate**

Run: Open `index.html` in browser, press JUGAR. Buildings should appear normally (windows will look wrong until Task 2 — that's expected).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: switch building windows to grid-based generation"
```

---

## Task 2: Edificios con profundidad — renderizado semi-realista

**Files:**
- Modify: `index.html:403-407` (función `drawBld()`)

- [ ] **Step 1: Replace `drawBld()` with semi-realistic renderer**

Replace the entire `drawBld` function with this version that adds: shadow on the right side, cornisa (ledge) on top, grid-based windows with warm glow, and ground reflection.

```javascript
function drawBld(){
  for(var bi=0;bi<buildings.length;bi++){var b=buildings[bi],top=H-b.h;
    // Shadow right side
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(b.x+b.w-2,top+4,6,b.h-4);
    // Building body
    var g=ctx.createLinearGradient(b.x,0,b.x+b.w,0);g.addColorStop(0,b.c1);g.addColorStop(.5,b.c2);g.addColorStop(1,b.c1);ctx.fillStyle=g;ctx.fillRect(b.x,top,b.w-2,b.h);
    // Cornisa top
    ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(b.x,top,b.w-2,4);
    // Craters
    if(b.craters){ctx.save();ctx.fillStyle='rgba(0,0,0,0.5)';for(var ci=0;ci<b.craters.length;ci++){var cx=b.craters[ci];ctx.beginPath();ctx.arc(cx,top,12,Math.PI,0);ctx.fill()}ctx.restore()}
    // Antenna
    if(b.ant){var ax=b.x+b.w*.5;ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax,top);ctx.lineTo(ax,top-18);ctx.stroke();ctx.fillStyle='rgba(255,60,60,'+(0.5+0.5*Math.sin(Date.now()/300))+')';ctx.beginPath();ctx.arc(ax,top-18,3,0,7);ctx.fill()}
    // Grid windows
    var padX=(b.w-2-b.cols*10)/(b.cols+1),padY=(b.h-12-b.rows*12)/(b.rows+1);
    for(var row=0;row<b.rows;row++){for(var col=0;col<b.cols;col++){
      var wx=b.x+padX+(padX+10)*col,wy=top+8+padY+(padY+12)*row;
      var idx=row*b.cols+col,on=b.winOn[idx];
      if(on){ctx.save();ctx.shadowColor='rgba(255,220,120,0.4)';ctx.shadowBlur=4;ctx.fillStyle='rgba(255,220,120,0.85)';ctx.fillRect(wx,wy,6,8);ctx.restore()}
      else{ctx.fillStyle='rgba(20,30,60,0.6)';ctx.fillRect(wx,wy,6,8);ctx.strokeStyle='rgba(100,150,200,0.1)';ctx.strokeRect(wx,wy,6,8)}
    }}
    // Ground reflection
    var gr=ctx.createRadialGradient(b.x+b.w/2,H,0,b.x+b.w/2,H,b.w*.6);gr.addColorStop(0,'rgba(255,220,120,0.1)');gr.addColorStop(1,'rgba(255,220,120,0)');ctx.fillStyle=gr;ctx.fillRect(b.x-10,H-15,b.w+20,15);
  }
}
```

- [ ] **Step 2: Test in browser**

Open game, press JUGAR. Buildings should now have:
- Dark shadow on the right side
- Light cornisa strip at the top (replaces neon line)
- Regular grid of windows, some glowing warm, some dark
- Subtle light reflection on the ground below each building

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: semi-realistic building renderer with shadows, grid windows, ground reflections"
```

---

## Task 3: Cielo atmosférico — estrellas con halo, luna con cráteres, nubes, bruma

**Files:**
- Modify: `index.html:359` (función `makeStars()`)
- Modify: `index.html:399-402` (función `drawSky()`)
- Add new functions `drawClouds()` / `stepClouds()` after `drawSky()`
- Modify: `index.html:577-585` (función `mainLoop()`)
- Modify: `index.html:587-588` (función `layout()`)
- Modify: `index.html:301-302` (variable de estado — add `clouds` array)

- [ ] **Step 1: Add `clouds` global and update `makeStars` to generate clouds**

After the line `var cam={x:0,y:0,z:1,tx:0,ty:0,tz:1};` (around line 311), add:

```javascript
var clouds=[];
```

Replace `makeStars`:

```javascript
function makeStars(){stars=[];var n=Math.floor(W*H/(arena==='space'?4000:9000));for(var i=0;i<n;i++)stars.push({x:rand(0,W),y:rand(0,H*.65),r:rand(.5,arena==='space'?2.5:1.8),tw:rand(0,6.28),sp:rand(.01,.04)});
  clouds=[];if(arena==='space')return;var nc=Math.floor(rand(3,6));var opMul=arena==='jungle'?1.5:1;
  for(var i=0;i<nc;i++)clouds.push({x:rand(0,W),y:rand(H*.08,H*.35),w:rand(60,140),h:rand(20,40),sp:rand(.08,.2),op:rand(.03,.06)*opMul})}
```

- [ ] **Step 2: Replace `drawSky()` with atmospheric version**

```javascript
function drawSky(){
  // Stars with halo
  for(var i=0;i<stars.length;i++){var s=stars[i];s.tw+=s.sp;var a=.4+.6*Math.abs(Math.sin(s.tw));
    if(s.r>1.2){ctx.fillStyle='rgba(255,255,255,'+(a*.07)+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r*3,0,7);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill()}
  // Moon with craters
  if(TH.moon){var mx=W*.78,my=H*.18,r=Math.min(W,H)*.085;var h=ctx.createRadialGradient(mx,my,r*.5,mx,my,r*2.6);h.addColorStop(0,'rgba(220,230,255,0.35)');h.addColorStop(1,'rgba(220,230,255,0)');ctx.fillStyle=h;ctx.beginPath();ctx.arc(mx,my,r*2.6,0,7);ctx.fill();var mg=ctx.createRadialGradient(mx-r*.3,my-r*.3,r*.2,mx,my,r);mg.addColorStop(0,'#fdfbf0');mg.addColorStop(1,'#cdd4e8');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,r,0,7);ctx.fill();
    ctx.fillStyle='rgba(140,150,180,0.4)';ctx.beginPath();ctx.arc(mx-r*.3,my-r*.2,r*.16,0,7);ctx.fill();ctx.beginPath();ctx.arc(mx+r*.25,my+r*.15,r*.12,0,7);ctx.fill();ctx.beginPath();ctx.arc(mx+r*.05,my-r*.35,r*.09,0,7);ctx.fill();ctx.beginPath();ctx.arc(mx-r*.15,my+r*.3,r*.07,0,7);ctx.fill();ctx.beginPath();ctx.arc(mx+r*.35,my-r*.1,r*.06,0,7);ctx.fill()}
  // Horizon haze
  var hz=ctx.createLinearGradient(0,H*.7,0,H*.85);hz.addColorStop(0,'rgba(0,0,0,0)');hz.addColorStop(1,'rgba('+((arena==='jungle')?'30,60,30':'30,20,60')+',0.15)');ctx.fillStyle=hz;ctx.fillRect(0,H*.7,W,H*.15);
}
```

- [ ] **Step 3: Add `drawClouds()` and `stepClouds()` right after `drawSky()`**

```javascript
function drawClouds(){for(var i=0;i<clouds.length;i++){var c=clouds[i];ctx.fillStyle='rgba(255,255,255,'+c.op+')';ctx.beginPath();ctx.ellipse(c.x,c.y,c.w*.5,c.h*.5,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(c.x+c.w*.2,c.y-c.h*.15,c.w*.35,c.h*.4,0,0,7);ctx.fill()}}
function stepClouds(){for(var i=0;i<clouds.length;i++){clouds[i].x+=clouds[i].sp+wind*.05;if(clouds[i].x>W+clouds[i].w)clouds[i].x=-clouds[i].w;if(clouds[i].x<-clouds[i].w)clouds[i].x=W+clouds[i].w}}
```

- [ ] **Step 4: Update `mainLoop()` to render clouds and step them**

In `mainLoop`, change the draw order line from:
```javascript
drawSky();drawBld();drawPU();
```
to:
```javascript
drawSky();drawClouds();drawBld();drawPU();
```

And in the step section, change:
```javascript
if(!paused){if(state==='fly')stepBan();if(state==='boom')stepExps();stepP();stepW();stepConf()}
```
to:
```javascript
if(!paused){if(state==='fly')stepBan();if(state==='boom')stepExps();stepP();stepW();stepConf();stepClouds()}
```

- [ ] **Step 5: Update `layout()` to use 8-stop gradient**

Replace `layout` function:

```javascript
function layout(){TH=THEMES[arena];makeBld();makeStars();placeG();spawnPU();initW();
  var bg=TH.bg;document.getElementById('wrap').style.background='linear-gradient(180deg,'+bg[0]+' 0%,'+bg[0]+' 10%,'+bg[1]+' 25%,'+bg[2]+' 40%,'+bg[2]+' 50%,'+bg[3]+' 65%,'+bg[3]+' 80%,'+bg[4]+' 100%)'}
```

- [ ] **Step 6: Test in browser**

Open game. Verify:
- Bright stars have a soft halo glow around them
- Moon has 5 visible craters (dark spots)
- Subtle clouds drift slowly across the sky (not in Space arena)
- Faint haze where sky meets buildings
- Background gradient has smoother transitions

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: atmospheric sky with star halos, moon craters, clouds, horizon haze"
```

---

## Task 4: Explosiones mejoradas — onda de choque, humo, escombros, cráteres

**Files:**
- Modify: `index.html` — add `smoke[]` global (near other arrays, ~line 305)
- Modify: `index.html:441-442` (función `drawExps()`)
- Modify: `index.html:445` (función `spawnDeb()`)
- Modify: `index.html:559-562` (función `startExp()`)
- Modify: `index.html:535-541` (función `hitBld()`)
- Modify: `index.html:564-568` (función `stepExps()`)
- Add new functions `spawnSmoke()`, `drawSmoke()`, `stepSmoke()`
- Modify: `index.html:577-585` (función `mainLoop()`)
- Modify: `index.html:377-380` (función `newRound()` — reset smoke)

- [ ] **Step 1: Add `smoke` global**

After the existing `var confetti=[];` line (or near the other arrays around line 305), add:

```javascript
var smoke=[];
```

- [ ] **Step 2: Add smoke functions after the existing particle functions**

After `drawP()` (~line 447), add:

```javascript
function spawnSmoke(x,y){var n=Math.floor(rand(8,13));for(var i=0;i<n;i++){if(smoke.length>=50)smoke.shift();smoke.push({x:x+rand(-10,10),y:y+rand(-5,5),vx:rand(-.3,.3),vy:rand(-.8,-.2),r:rand(6,14),life:1})}}
function stepSmoke(){for(var i=smoke.length-1;i>=0;i--){var s=smoke[i];s.x+=s.vx;s.vy-=.005;s.y+=s.vy;s.r+=.08;s.life-=.008;if(s.life<=0)smoke.splice(i,1)}}
function drawSmoke(){for(var i=0;i<smoke.length;i++){var s=smoke[i];ctx.globalAlpha=Math.max(0,s.life*.5);ctx.fillStyle='rgba(80,80,80,1)';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill()}ctx.globalAlpha=1}
```

- [ ] **Step 3: Update `startExp()` to spawn smoke and add shockwave ring**

Replace `startExp`:

```javascript
function startExp(x,y,big,mega){
  var maxR=big?(mega?130:80):(mega?65:42);explosions.push({x:x,y:y,r:1,max:maxR,big:big,ring:1,ringOp:.6});
  spawnP(x,y,big?(mega?60:40):(mega?30:22),big);spawnSmoke(x,y);trail=[];state='boom';
  SFX.explode(big||mega);shake.i=big?(mega?22:14):(mega?10:6);if(big)vibrate([40,20,80]);else vibrate(40);
}
```

- [ ] **Step 4: Update `drawExps()` to render shockwave ring**

Replace `drawExps`:

```javascript
function drawExps(){
  for(var i=0;i<explosions.length;i++){var e=explosions[i];ctx.save();ctx.shadowColor='#ff8030';ctx.shadowBlur=30;var g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r);g.addColorStop(0,'rgba(255,255,220,0.98)');g.addColorStop(.3,'rgba(255,200,60,0.95)');g.addColorStop(.65,'rgba(255,110,40,0.85)');g.addColorStop(1,'rgba(200,40,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();
    if(e.ringOp>0){ctx.globalAlpha=e.ringOp;ctx.strokeStyle='rgba(255,220,180,0.8)';ctx.lineWidth=Math.max(1,4*e.ringOp);ctx.beginPath();ctx.arc(e.x,e.y,e.ring,0,7);ctx.stroke();ctx.globalAlpha=1}
    ctx.restore()}
}
```

- [ ] **Step 5: Update `stepExps()` to animate shockwave ring**

Replace `stepExps`:

```javascript
function stepExps(){
  var anyBig=false;
  for(var i=explosions.length-1;i>=0;i--){var e=explosions[i];e.r+=e.big?5:4;e.ring+=(e.big?10:8);e.ringOp-=.04;if(e.big)anyBig=true;if(e.r>=e.max)explosions.splice(i,1)}
  if(explosions.length===0&&state==='boom'){if(!anyBig)nextT()}
}
```

- [ ] **Step 6: Update `spawnDeb()` to add rotation**

Replace `spawnDeb`:

```javascript
function spawnDeb(x,y,col){for(var i=0;i<10;i++){var a=rand(-Math.PI,-.2),sp=rand(2,7);particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,r:rand(3,7),col:col,rect:true,rot:rand(0,6.28),rv:rand(-.15,.15)})}}
```

Update `stepP` to handle rotation:

In `stepP`, after `p.y+=p.vy;` add rotation update. Replace `stepP`:

```javascript
function stepP(){for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.vy+=.22;p.x+=p.vx;p.y+=p.vy;if(p.rv)p.rot+=p.rv;p.life-=.025;if(p.life<=0)particles.splice(i,1)}}
```

Update `drawP` to render rotated rects. Replace `drawP`:

```javascript
function drawP(){for(var i=0;i<particles.length;i++){var p=particles[i];ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;if(p.rect){ctx.save();ctx.translate(p.x,p.y);if(p.rot)ctx.rotate(p.rot);ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r);ctx.restore()}else{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}}ctx.globalAlpha=1}
```

- [ ] **Step 7: Update `hitBld()` to record craters**

Replace `hitBld`:

```javascript
function hitBld(x,y,b){
  var mega=banana.mega,isCluster=banana.wt==='cluster';
  if(isCluster){
    var offsets=[{dx:0,dy:0},{dx:-30,dy:-20},{dx:30,dy:-10}];
    for(var i=0;i<offsets.length;i++){startExp(x+offsets[i].dx,y+offsets[i].dy,false,false)}
  }else{startExp(x,y,false,mega)}
  spawnDeb(x,y,b.c2);if(!b.craters)b.craters=[];b.craters.push(x);b.h=Math.max(10,H-y-(mega?35:15));banana=null;
}
```

- [ ] **Step 8: Update `mainLoop()` to render and step smoke**

In the draw section of `mainLoop`, after `drawP();` add `drawSmoke();`:
```javascript
drawTraj();drawBan();drawExps();drawP();drawSmoke();ctx.restore();
```

In the step section, after `stepP();` add `stepSmoke();`:
```javascript
if(!paused){if(state==='fly')stepBan();if(state==='boom')stepExps();stepP();stepSmoke();stepW();stepConf();stepClouds()}
```

- [ ] **Step 9: Update `newRound()` to reset smoke**

In `newRound`, after `banana=null;explosions=[];particles=[];trail=[];` add `smoke=[];`:
```javascript
banana=null;explosions=[];particles=[];trail=[];smoke=[];
```

- [ ] **Step 10: Test in browser**

Play a game and fire shots at buildings. Verify:
- Expanding shockwave ring visible around each explosion
- Grey smoke rises slowly after explosions and fades over ~3 seconds
- Debris chunks rotate as they fall
- Small crater bites visible at the top of damaged buildings

- [ ] **Step 11: Commit**

```bash
git add index.html
git commit -m "feat: improved explosions with shockwave rings, persistent smoke, rotating debris, craters"
```

---

## Task 5: Gorilas detallados — pelaje, expresiones, ojos, animación de lanzamiento

**Files:**
- Modify: `index.html:411-431` (función `drawG()`)
- Modify: `index.html:502-506` (función `fireBan()`)
- Modify: `index.html:543-557` (función `hitG()`)
- Modify: `index.html:569-574` (función `nextT()`)

- [ ] **Step 1: Replace `drawG()` with detailed version**

```javascript
function drawG(g){
  var s=Math.min(W,H)*.05,x=g.x,y=g.y-s;ctx.save();ctx.translate(x,y);
  var br=1+Math.sin(Date.now()/600)*.015;if(g.cel)ctx.translate(0,-Math.abs(Math.sin(Date.now()/150))*s*.15);ctx.scale(br,br);
  if(g.ft&&Date.now()-g.ft<400)ctx.globalAlpha=.6+Math.sin((Date.now()-g.ft)*.03)*.4;
  var body=g.who===0?'#5a4636':'#4a3548',dk=g.who===0?'#3d2f22':'#332333',ch=g.who===0?'#7d6650':'#6a4d63',gl=g.who===0?'#7fffd4':'#ff9eb5';
  var expr=g.expr||'neutral';
  // Shadow
  ctx.save();ctx.shadowColor=gl;ctx.shadowBlur=14;ctx.fillStyle='rgba(0,0,0,0.001)';ctx.beginPath();ctx.ellipse(0,s*.85,s*.7,s*.18,0,0,7);ctx.fill();ctx.restore();
  // Arms
  ctx.strokeStyle=body;ctx.lineWidth=s*.34;ctx.lineCap='round';
  var throwT=g.throwAnim?Date.now()-g.throwAnim:-1;
  var lAng=0,rAng=0;
  if(throwT>=0&&throwT<300){
    var armSide=g.who===0?1:-1;var phase=throwT<100?throwT/100:throwT<200?(200-throwT)/100:(throwT-200)/100;
    var ang=throwT<100?-.8:throwT<200?1.2:0;ang*=armSide;
    if(g.who===0)rAng=ang;else lAng=ang;
  }
  if(g.raise||g.cel){
    ctx.beginPath();ctx.moveTo(-s*.5,-s*.05);ctx.lineTo(-s*.85+lAng*s*.3,-s*.95);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.5,-s*.05);ctx.lineTo(s*.85+rAng*s*.3,-s*.95);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(-s*.45,-s*.05);ctx.lineTo(-s*.78+lAng*s*.4,s*.55-Math.abs(lAng)*s*.8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.45,-s*.05);ctx.lineTo(s*.78+rAng*s*.4,s*.55-Math.abs(rAng)*s*.8);ctx.stroke();
  }
  if(throwT>300)g.throwAnim=null;
  // Body
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,s*.05,s*.72,s*.85,0,0,7);ctx.fill();
  ctx.fillStyle=ch;ctx.beginPath();ctx.ellipse(0,s*.12,s*.42,s*.55,0,0,7);ctx.fill();
  // Fur texture
  ctx.strokeStyle=dk;ctx.lineWidth=1;ctx.lineCap='round';
  var furPts=[[-s*.65,s*.1],[-s*.6,-.2*s],[-s*.55,-.5*s],[-.3*s,-.7*s],[0,-s*1.1],[.3*s,-.7*s],[s*.55,-.5*s],[s*.6,-.2*s],[s*.65,s*.1],[s*.5,s*.5],[-s*.5,s*.5]];
  for(var fi=0;fi<furPts.length;fi++){var fp=furPts[fi],fa=Math.atan2(fp[1],fp[0]);ctx.beginPath();ctx.moveTo(fp[0],fp[1]);ctx.lineTo(fp[0]+Math.cos(fa)*s*.12,fp[1]+Math.sin(fa)*s*.12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(fp[0]+rand(-2,2),fp[1]+rand(-2,2));ctx.lineTo(fp[0]+Math.cos(fa+.3)*s*.1,fp[1]+Math.sin(fa+.3)*s*.1);ctx.stroke()}
  // Head
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(0,-s*.85,s*.52,0,7);ctx.fill();ctx.beginPath();ctx.arc(-s*.5,-s*.9,s*.16,0,7);ctx.fill();ctx.beginPath();ctx.arc(s*.5,-s*.9,s*.16,0,7);ctx.fill();
  ctx.fillStyle=ch;ctx.beginPath();ctx.ellipse(0,-s*.78,s*.34,s*.38,0,0,7);ctx.fill();
  // Brow ridge
  ctx.fillStyle=dk;var browY=expr==='happy'?-s*1.06:expr==='hurt'?-s*.98:-s*1.02;
  ctx.beginPath();ctx.ellipse(0,browY,s*.36,s*.14,0,0,7);ctx.fill();
  // Eyes
  var eyeS=expr==='shock'?s*.12:s*.09;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.15,-s*.88,eyeS,0,7);ctx.fill();ctx.beginPath();ctx.arc(s*.15,-s*.88,eyeS,0,7);ctx.fill();
  // Pupils — follow banana
  var px=0,py=0;
  if(banana&&state==='fly'){var dx=banana.x-x,dy=banana.y-(y-s*.88),dist=Math.hypot(dx,dy);if(dist>1){px=(dx/dist)*s*.03;py=(dy/dist)*s*.03}}
  ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(-s*.13+px,-s*.87+py,s*.045,0,7);ctx.fill();ctx.beginPath();ctx.arc(s*.17+px,-s*.87+py,s*.045,0,7);ctx.fill();
  // Nose
  ctx.fillStyle=dk;ctx.beginPath();ctx.arc(-s*.07,-s*.66,s*.03,0,7);ctx.fill();ctx.beginPath();ctx.arc(s*.07,-s*.66,s*.03,0,7);ctx.fill();
  // Mouth (expression-based)
  ctx.strokeStyle=dk;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.beginPath();
  if(expr==='happy')ctx.arc(0,-s*.58,s*.14,.15*Math.PI,.85*Math.PI);
  else if(expr==='hurt'){ctx.beginPath();ctx.arc(0,-s*.58,s*.08,0,7);ctx.stroke();ctx.beginPath()}
  else if(expr==='aim')ctx.arc(0,-s*.55,s*.1,1.15*Math.PI,1.85*Math.PI);
  else if(g.raise||g.cel)ctx.arc(0,-s*.62,s*.14,.1*Math.PI,.9*Math.PI);
  else ctx.arc(0,-s*.55,s*.12,1.1*Math.PI,1.9*Math.PI);
  ctx.stroke();
  ctx.globalAlpha=1;ctx.restore();g._s=s;
}
```

- [ ] **Step 2: Update `fireBan()` to trigger throw animation and set expressions**

Replace `fireBan`:

```javascript
function fireBan(x,y,vx,vy,from){
  var pu=from===0?playerPU:cpuPU;
  banana={x:x,y:y,vx:vx,vy:vy,rot:0,age:0,from:from,mega:pu==='mega',noW:pu==='calm',wt:weapon};
  gorillas[from].throwAnim=Date.now();
  if(from===0)playerPU=null;else cpuPU=null;updPU();state='fly';SFX.throw_sound();vibrate(30);
}
```

- [ ] **Step 3: Update `hitG()` to set expressions**

In `hitG`, after `banana=null;gorillas[idx].ft=Date.now();` add:

```javascript
gorillas[idx].expr='hurt';setTimeout(function(){gorillas[idx].expr='neutral'},1000);
gorillas[1-idx].expr='happy';setTimeout(function(){gorillas[1-idx].expr='neutral'},1500);
```

- [ ] **Step 4: Update `nextT()` to set aim expression**

In `nextT`, after `turn=1-turn;state='aim';updPU();`, add:

```javascript
for(var gi=0;gi<gorillas.length;gi++)gorillas[gi].expr='neutral';
var aimG=(gameMode==='2p')?turn:0;gorillas[aimG].expr='aim';
```

- [ ] **Step 5: Test in browser**

Play a full game. Verify:
- Gorilas have short fur lines around their body outline
- Pupils follow the banana during flight
- When aiming: focused expression (brows down, slight frown)
- When hitting: winner smiles, loser makes "O" mouth
- Throw animation: arm winds back and swings forward
- After expressions fade (~1-1.5s), face returns to neutral

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: detailed gorillas with fur, expressions, eye tracking, throw animation"
```

---

## Task 6: Sistema de 7 niveles de dificultad — config, IA, UI

**Files:**
- Modify: `index.html:275` (variable `DIFF`)
- Modify: `index.html:508-520` (función `cpuTurn()`)
- Modify: `index.html` — add `cpuPickWeapon()` function
- Modify: `index.html` — add `cpuLastShot` global
- Modify: `index.html:169-170` (HTML — difficulty buttons in `#diffRow`)
- Modify: `index.html:67-70` (CSS — `.selBtn` styles for smaller buttons and locked state)
- Modify: `index.html:597` (`bindSel` for `diffRow`)
- Modify: `index.html:602-607` (función `startGame()`)
- Modify: `index.html:623-641` (función `endGame()`)

- [ ] **Step 1: Update `DIFF` config and add `cpuLastShot` global**

Replace line 275:

```javascript
var DIFF={beginner:{cpuBase:.40,smartWeapon:false,seekPU:false,windAware:false,adaptive:false,correction:0},easy:{cpuBase:.28,smartWeapon:false,seekPU:false,windAware:false,adaptive:false,correction:0},normal:{cpuBase:.16,smartWeapon:false,seekPU:false,windAware:false,adaptive:false,correction:0},hard:{cpuBase:.08,smartWeapon:true,seekPU:true,windAware:false,adaptive:false,correction:0},expert:{cpuBase:.05,smartWeapon:true,seekPU:true,windAware:true,adaptive:false,correction:0},master:{cpuBase:.03,smartWeapon:true,seekPU:true,windAware:true,adaptive:true,correction:.70},impossible:{cpuBase:.01,smartWeapon:true,seekPU:true,windAware:true,adaptive:true,correction:.90}};
```

Near the other state variables (around line 311), add:

```javascript
var cpuLastShot=null;
```

- [ ] **Step 2: Add `cpuPickWeapon()` function before `cpuTurn()`**

```javascript
function cpuPickWeapon(){
  var d=DIFF[difficulty];if(!d.smartWeapon)return['normal','cluster','boomerang'][Math.floor(rand(0,3))];
  var f=gorillas[1],t=gorillas[0],dist=Math.abs(t.x-f.x)/W;
  if(dist<.3)return'cluster';
  if(dist>.7)return'normal';
  var wFavor=(wind>0)===(t.x>f.x);
  return wFavor?'boomerang':'normal';
}
```

- [ ] **Step 3: Replace `cpuTurn()` with smart IA version**

```javascript
function cpuTurn(){
  if(paused){setTimeout(cpuTurn,400);return}if(state!=='aim'||turn!==1)return;
  var d=DIFF[difficulty];
  var f=gorillas[1],t=gorillas[0],fx=f.x,fy=f.y-(f._s||30),tx=t.x,ty=t.y-(t._s||30);
  var dx=tx-fx,dy=ty-fy,T=rand(45,75);
  var wE=(d.windAware&&cpuPU==='calm')?0:(cpuPU==='calm'?0:wind);
  if(d.windAware&&Math.abs(wind)>8&&cpuPU==='calm'){}
  var vx=(dx-.5*wE*.02*T*T)/T,vy=(dy-.5*TH.grav*T*T)/T;
  // Adaptive correction
  if(d.adaptive&&cpuLastShot){var ls=cpuLastShot;var errX=tx-ls.hitX,errY=ty-ls.hitY;vx+=(errX*d.correction)/T;vy+=(errY*d.correction)/T}
  var errBase=d.cpuBase;
  if(gameMode==='infinite')errBase=Math.max(.04,errBase-round*.008);
  var err=errBase-Math.min(errBase*.75,cScore*.04);
  vx+=rand(-1,1)*Math.abs(vx)*err*3;vy+=rand(-1,1)*2.2*err*3;
  weapon=cpuPickWeapon();
  // Record shot for adaptive correction
  cpuLastShot={vx:vx,vy:vy,targetX:tx,targetY:ty,hitX:0,hitY:0};
  fireBan(fx,fy,vx,vy,1);
}
```

- [ ] **Step 4: Record hit position for adaptive CPU**

In `hitBld`, before `banana=null;`, add:
```javascript
if(cpuLastShot&&banana.from===1){cpuLastShot.hitX=x;cpuLastShot.hitY=y}
```

In `hitG`, before `banana=null;`, add:
```javascript
if(cpuLastShot&&banana.from===1){cpuLastShot.hitX=banana.x;cpuLastShot.hitY=banana.y}
```

In `missShot`, before `banana=null;`, add:
```javascript
if(banana&&cpuLastShot&&banana.from===1){cpuLastShot.hitX=banana.x;cpuLastShot.hitY=banana.y}
```

In `newRound`, add `cpuLastShot=null;` after the smoke reset.

- [ ] **Step 5: Update HTML — difficulty buttons**

Replace the existing difficulty row in the start screen HTML:
```html
<div class="selRow" id="diffRow"><button class="selBtn" data-diff="easy">Facil</button><button class="selBtn active" data-diff="normal">Normal</button><button class="selBtn" data-diff="hard">Dificil</button></div>
```

With two rows:
```html
<div class="selRow" id="diffRow"><button class="selBtn" data-diff="beginner">Novato</button><button class="selBtn" data-diff="easy">Facil</button><button class="selBtn active" data-diff="normal">Normal</button><button class="selBtn" data-diff="hard">Dificil</button></div>
<div class="selRow" id="diffRow2"><button class="selBtn" data-diff="expert">Experto</button><button class="selBtn locked" data-diff="master">🔒</button><button class="selBtn locked" data-diff="impossible">🔒</button></div>
```

- [ ] **Step 6: Add CSS for locked buttons and smaller selBtn**

After the existing `.selBtn:not(.active):active` rule, add:

```css
.selBtn.locked{opacity:.4;cursor:default;pointer-events:none}
```

And modify `.selBtn` to make it slightly smaller to fit 4 per row:
Change the padding from `8px 16px` to `7px 12px` and min-width from `80px` to `64px`.

- [ ] **Step 7: Add unlock logic and bind difficulty selection**

Add a function to check/set unlocked levels. Place it near `loadStats`:

```javascript
function loadUnlocked(){return LS('gunlocked')||['beginner','easy','normal','hard','expert']}
function saveUnlocked(list){LS('gunlocked',list)}
function tryUnlock(wonDiff){var u=loadUnlocked();if(wonDiff==='expert'&&u.indexOf('master')<0){u.push('master');saveUnlocked(u)}if(wonDiff==='master'&&u.indexOf('impossible')<0){u.push('impossible');saveUnlocked(u)}}
function updDiffUI(){var u=loadUnlocked();var btns=document.querySelectorAll('#diffRow .selBtn, #diffRow2 .selBtn');for(var i=0;i<btns.length;i++){var d=btns[i].getAttribute('data-diff');if(u.indexOf(d)>=0){btns[i].classList.remove('locked');btns[i].textContent={beginner:'Novato',easy:'Facil',normal:'Normal',hard:'Dificil',expert:'Experto',master:'Maestro',impossible:'Imposible'}[d]||d;btns[i].style.pointerEvents='auto'}}}
```

Replace the `bindSel('diffRow',...)` line and add binding for `diffRow2`:

```javascript
bindSel('diffRow',function(b){var d2btns=document.querySelectorAll('#diffRow2 .selBtn');for(var j=0;j<d2btns.length;j++)d2btns[j].classList.remove('active');difficulty=b.getAttribute('data-diff')});
bindSel('diffRow2',function(b){if(b.classList.contains('locked'))return;var d1btns=document.querySelectorAll('#diffRow .selBtn');for(var j=0;j<d1btns.length;j++)d1btns[j].classList.remove('active');difficulty=b.getAttribute('data-diff')});
```

- [ ] **Step 8: Call `tryUnlock` in `endGame()` and `updDiffUI` on load**

In `endGame`, after `if(won){SFX.win();...}`, add:
```javascript
if(won&&gameMode!=='2p')tryUnlock(difficulty);
```

At the bottom of the file, right before `layout();showStats('statsLine');mainLoop();`, add:
```javascript
updDiffUI();
```

- [ ] **Step 9: Test in browser**

Verify:
- Start screen shows 7 difficulty buttons in 2 rows
- Maestro and Imposible show 🔒 and can't be clicked
- Selecting a difficulty in either row deselects the other
- Play in Principiante: CPU misses frequently (40% error)
- Play in Difícil: CPU picks weapons intelligently, rarely misses
- Win on Experto: Maestro unlocks (reload page to verify button text changes)

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "feat: 7 difficulty levels with smart CPU weapon selection, adaptive correction, unlock progression"
```

---

## Task 7: Integración final y limpieza

**Files:**
- Modify: `index.html` (minor cleanup)
- Modify: `sw.js` (bump cache version)

- [ ] **Step 1: Bump Service Worker cache**

Change `var CACHE='gorilas-v8';` to `var CACHE='gorilas-v9';` in `sw.js`.

- [ ] **Step 2: Full playtest**

Play through these scenarios in the browser:
1. **Neon + Normal**: verify buildings, sky, explosions, gorilla expressions
2. **Selva + Difícil**: verify CPU weapon selection, denser clouds, high gravity
3. **Espacio + Principiante**: verify no clouds, no wind, easy CPU
4. **Infinito + Experto**: play 5+ rounds, verify CPU gets harder, smoke accumulates properly
5. **2P mode**: verify both gorillas have expressions, no CPU IA runs

- [ ] **Step 3: Commit and push**

```bash
git add index.html sw.js
git commit -m "chore: bump SW cache to v9, integration cleanup"
git push
```
