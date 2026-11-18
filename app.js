(function(){
"use strict";
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = {space:"#F8F9F5",ink:"#17191F",ink2:"#EEF0EA",line:"#D3D8CF",text:"#17191F",muted:"#5B636D",ice:"#3D3B8E",signal:"#C2306A",green:"#2E8B57",red:"#C2306A",blue:"#2F8FA8",cyan:"#2F8FA8",stage:"#F8F9F5"};
const MONO = '400 13px "IBM Plex Mono", monospace';
const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = id => document.getElementById(id);
const labs = [];
function press(btn, on){ btn.setAttribute("aria-pressed", on ? "true" : "false"); }
function segGroup(el, attr, cb){
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    el.querySelectorAll("button").forEach(x => press(x, x === b));
    cb(b.dataset[attr]);
  });
}
function bindRange(id, fmt, cb){
  const r = $(id), o = $(id + "O");
  const f = () => { o.textContent = fmt(+r.value); cb(+r.value); };
  r.addEventListener("input", f); f();
}
function watch(canvas, lab){
  lab.visible = false;
  if(!("IntersectionObserver" in window)){ lab.visible = true; return; }
  new IntersectionObserver(es => es.forEach(e => lab.visible = e.isIntersecting), {rootMargin:"100px"}).observe(canvas);
}
function canvasPoint(cv, e){
  const r = cv.getBoundingClientRect();
  return {x:(e.clientX - r.left) * cv.width / r.width, y:(e.clientY - r.top) * cv.height / r.height};
}
function sparkline(svg, series, opts){
  const W = 300, H = 90, P = 6;
  let max = opts.max || 1;
  series.forEach(s => s.data.forEach(v => { if(v > max) max = v; }));
  let h = '';
  for(let i=1;i<4;i++) h += `<line x1="0" x2="${W}" y1="${H*i/4}" y2="${H*i/4}" stroke="${C.line}" stroke-width="1"/>`;
  series.forEach(s => {
    if(s.data.length < 2) return;
    const n = s.data.length;
    const pts = s.data.map((v,i) => `${(P + (W-2*P)*i/(n-1)).toFixed(1)},${(H-P - (H-2*P)*v/max).toFixed(1)}`).join(" ");
    h += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.6"/>`;
  });
  h += `<text x="${W-4}" y="12" text-anchor="end" fill="${C.muted}" font-family="IBM Plex Mono" font-size="9">${opts.label ? opts.label(max) : max.toFixed(1)}</text>`;
  svg.innerHTML = h;
}

/* ================= GAME OF LIFE ================= */
(function(){
  const cv = $("lifeCanvas"), ctx = cv.getContext("2d");
  const W = 120, H = 70, M = 8, GW = W + 2*M, GH = H + 2*M, CS = cv.width / W;
  let a = new Uint8Array(GW*GH), b = new Uint8Array(GW*GH), age = new Uint16Array(GW*GH);
  let gen = 0, playing = !reduce, rate = 20, acc = 0;
  const lab = {}; watch(cv, lab);
  const RLE = {
    gun: "24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!",
    glider: "bo$2bo$3o!",
    r: "b2o$2ob$bo!"
  };
  function place(str, ox, oy){
    let x = 0, y = 0, n = "";
    for(const ch of str){
      if(ch >= "0" && ch <= "9"){ n += ch; continue; }
      const k = n ? +n : 1; n = "";
      if(ch === "b"){ x += k; }
      else if(ch === "o"){ for(let i=0;i<k;i++){ set(ox+x, oy+y, 1); x++; } }
      else if(ch === "$"){ y += k; x = 0; }
      else if(ch === "!") break;
    }
  }
  function set(x, y, v){ x += M; y += M; if(x<0||y<0||x>=GW||y>=GH) return; a[y*GW+x] = v; age[y*GW+x] = 0; }
  function load(p){
    a.fill(0); age.fill(0); gen = 0;
    const tags = {gun:"Gosper glider gun", glider:"Gliders", r:"R-pentomino", soup:"Random soup", clear:"Empty grid"};
    $("lifeTag").textContent = tags[p];
    if(p === "gun") place(RLE.gun, 6, 6);
    if(p === "glider"){ for(let i=0;i<5;i++) place(RLE.glider, 6 + i*12, 6 + i*7); }
    if(p === "r") place(RLE.r, 58, 33);
    if(p === "soup"){ for(let y=15;y<55;y++) for(let x=30;x<90;x++) if(Math.random()<.32) set(x,y,1); }
    draw(); stats();
  }
  function step(){
    for(let y=1;y<GH-1;y++){
      for(let x=1;x<GW-1;x++){
        const i = y*GW+x;
        const n = a[i-GW-1]+a[i-GW]+a[i-GW+1]+a[i-1]+a[i+1]+a[i+GW-1]+a[i+GW]+a[i+GW+1];
        const v = a[i] ? (n===2||n===3 ? 1 : 0) : (n===3 ? 1 : 0);
        b[i] = v; age[i] = v ? (a[i] ? Math.min(age[i]+1, 999) : 0) : 0;
      }
    }
    for(let y=0;y<GH;y++) for(let x=0;x<GW;x++) if(x<2||y<2||x>=GW-2||y>=GH-2) b[y*GW+x] = 0;
    const t = a; a = b; b = t; gen++;
  }
  function stats(){
    let p = 0; for(let y=M;y<M+H;y++) for(let x=M;x<M+W;x++) p += a[y*GW+x];
    $("lifeGen").textContent = gen; $("lifePop").textContent = p;
  }
  function draw(){
    ctx.fillStyle = C.stage; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.strokeStyle = "rgba(23,25,31,.07)"; ctx.lineWidth = 1; ctx.beginPath();
    for(let x=0;x<=W;x+=10){ ctx.moveTo(x*CS+.5,0); ctx.lineTo(x*CS+.5,cv.height); }
    for(let y=0;y<=H;y+=10){ ctx.moveTo(0,y*CS+.5); ctx.lineTo(cv.width,y*CS+.5); }
    ctx.stroke();
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const i = (y+M)*GW + x + M;
      if(!a[i]) continue;
      ctx.fillStyle = age[i] < 2 ? C.signal : C.ice;
      ctx.fillRect(x*CS+1, y*CS+1, CS-2, CS-2);
    }
  }
  lab.tick = dt => {
    if(!playing) return;
    acc += dt * rate;
    let n = 0;
    while(acc >= 1 && n < 4){ step(); acc -= 1; n++; }
    if(acc > 4) acc = 0;
    if(n){ draw(); stats(); }
  };
  labs.push(lab);
  segGroup($("lifePresets"), "p", load);
  $("lifePlay").onclick = () => { playing = !playing; press($("lifePlay"), playing); $("lifePlay").textContent = playing ? "Pause" : "Play"; };
  $("lifeStep").onclick = () => { step(); draw(); stats(); };
  bindRange("lifeSpeed", v => v, v => rate = v);
  let drawing = false, paint = 1, brush = "glider";
  segGroup($("lifeBrush"), "b", v => brush = v);
  cv.addEventListener("pointerdown", e => {
    const p = canvasPoint(cv, e), x = Math.floor(p.x/CS), y = Math.floor(p.y/CS);
    if(brush === "cell"){
      paint = a[(y+M)*GW+x+M] ? 0 : 1; drawing = true; set(x,y,paint);
      try{ cv.setPointerCapture(e.pointerId); }catch(err){}
    } else {
      place(RLE[brush], x - 1, y - 1);
    }
    draw(); stats();
  });
  cv.addEventListener("pointermove", e => {
    if(!drawing) return;
    const p = canvasPoint(cv, e); set(Math.floor(p.x/CS), Math.floor(p.y/CS), paint); draw();
  });
  cv.addEventListener("pointerup", () => { drawing = false; stats(); });
  if(reduce){ press($("lifePlay"), false); $("lifePlay").textContent = "Play"; }
  load("gun");
})();

/* ================= BOIDS ================= */
(function(){
  const cv = $("boidsCanvas"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
  const N = 170, maxV = 2.6, maxF = .06;
  let B = [], wSep = 1.5, wAli = 1, wCoh = .8, R = 60, umwelt = true, mouse = null;
  const lab = {}; watch(cv, lab);
  function scatter(){
    B = [];
    for(let i=0;i<N;i++){ const a = Math.random()*6.283; B.push({x:Math.random()*W, y:Math.random()*H, vx:Math.cos(a)*maxV, vy:Math.sin(a)*maxV}); }
  }
  function limit(x, y, m){ const l = Math.hypot(x,y); return l > m ? [x/l*m, y/l*m] : [x,y]; }
  function steer(dx, dy, b){ const l = Math.hypot(dx,dy) || 1; let [sx, sy] = [dx/l*maxV - b.vx, dy/l*maxV - b.vy]; return limit(sx, sy, maxF); }
  let seen0 = [];
  function update(k){
    let px = 0, py = 0;
    for(let i=0;i<N;i++){
      const b = B[i];
      let sx=0, sy=0, ax=0, ay=0, cx=0, cy=0, n=0, ns=0;
      const seen = i === 0 ? [] : null;
      for(let j=0;j<N;j++){
        if(i===j) continue;
        const o = B[j];
        let dx = o.x - b.x, dy = o.y - b.y;
        if(dx > W/2) dx -= W; if(dx < -W/2) dx += W;
        if(dy > H/2) dy -= H; if(dy < -H/2) dy += H;
        const d = Math.hypot(dx, dy);
        if(d < R){
          n++; ax += o.vx; ay += o.vy; cx += dx; cy += dy;
          if(seen) seen.push(j);
          if(d < R*.45 && d > 0){ sx -= dx/(d*d); sy -= dy/(d*d); ns++; }
        }
      }
      let fx = 0, fy = 0;
      if(n){
        if(ns){ const s = steer(sx, sy, b); fx += s[0]*wSep; fy += s[1]*wSep; }
        const a = steer(ax/n, ay/n, b); fx += a[0]*wAli; fy += a[1]*wAli;
        const c = steer(cx/n, cy/n, b); fx += c[0]*wCoh; fy += c[1]*wCoh;
      }
      if(mouse){
        const dx = b.x - mouse.x, dy = b.y - mouse.y, d = Math.hypot(dx,dy);
        if(d < 80 && d > 0){ const s = steer(dx, dy, b); fx += s[0]*4; fy += s[1]*4; }
      }
      b.nvx = b.vx + fx*k; b.nvy = b.vy + fy*k;
      if(seen) seen0 = seen;
    }
    for(const b of B){
      [b.vx, b.vy] = limit(b.nvx, b.nvy, maxV);
      const sp = Math.hypot(b.vx, b.vy); if(sp < maxV*.5){ b.vx *= maxV*.5/(sp||1); b.vy *= maxV*.5/(sp||1); }
      b.x = (b.x + b.vx*k + W) % W; b.y = (b.y + b.vy*k + H) % H;
      const sp2 = Math.hypot(b.vx,b.vy)||1; px += b.vx/sp2; py += b.vy/sp2;
    }
    $("bPol").textContent = (Math.hypot(px,py)/N).toFixed(2);
    $("bNei").textContent = seen0.length;
  }
  function tri(b, col){
    const a = Math.atan2(b.vy, b.vx), s = 6;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(b.x + Math.cos(a)*s*1.6, b.y + Math.sin(a)*s*1.6);
    ctx.lineTo(b.x + Math.cos(a+2.5)*s, b.y + Math.sin(a+2.5)*s);
    ctx.lineTo(b.x + Math.cos(a-2.5)*s, b.y + Math.sin(a-2.5)*s);
    ctx.closePath(); ctx.fill();
  }
  function draw(){
    ctx.fillStyle = C.stage; ctx.fillRect(0,0,W,H);
    if(umwelt){
      const b = B[0];
      ctx.strokeStyle = "rgba(194,48,106,.28)"; ctx.lineWidth = 1;
      for(const j of seen0){ const o = B[j]; if(Math.abs(o.x-b.x) < W/2 && Math.abs(o.y-b.y) < H/2){ ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(o.x,o.y); ctx.stroke(); } }
      ctx.strokeStyle = "rgba(194,48,106,.8)"; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.arc(b.x,b.y,R,0,6.283); ctx.stroke(); ctx.setLineDash([]);
    }
    for(let i=1;i<N;i++) tri(B[i], umwelt && seen0.includes(i) ? C.signal : "rgba(61,59,142,.8)");
    tri(B[0], umwelt ? C.ink : C.ice);
    if(mouse){ ctx.strokeStyle = "rgba(23,25,31,.3)"; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 80, 0, 6.283); ctx.stroke(); }
  }
  lab.tick = dt => { if(reduce && !lab.started) { draw(); return; } update(Math.min(dt*60, 2.5)); draw(); };
  labs.push(lab);
  bindRange("bSep", v => v.toFixed(1), v => wSep = v);
  bindRange("bAli", v => v.toFixed(1), v => wAli = v);
  bindRange("bCoh", v => v.toFixed(1), v => wCoh = v);
  bindRange("bRad", v => v + " px", v => R = v);
  $("bUmwelt").onclick = () => { umwelt = !umwelt; press($("bUmwelt"), umwelt); };
  $("bReset").onclick = () => { scatter(); lab.started = true; };
  cv.addEventListener("pointermove", e => { mouse = canvasPoint(cv, e); lab.started = true; });
  cv.addEventListener("pointerleave", () => mouse = null);
  scatter(); update(1); draw();
})();

/* ================= EVOLVED CREATURES ================= */
(function(){
  const cv = $("evoCanvas"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
  const POP = 30, STEPS = 360, SETTLE = 60, DT = 1/60, G = -9.8, ITER = 8, SC = 70, GROUND = H - 70;
  const XMAX = 1.6, YMAX = 3.2, MAXN = 7;
  let mode = "dist", pop = [], gen = 0, idx = 0, hist = [], running = !reduce, champ = null, replay = null;
  const lab = {}; watch(cv, lab);
  const texts = {
    dist: "Distance traveled by the center of mass in six seconds, measured after the body settles.",
    peak: "Peak height of the center of mass at any moment, the measure used in the experiment Lehman and colleagues record.",
    gain: "Peak height of the center of mass above the height at which the body comes to rest."
  };
  const R = (a, b) => a + Math.random()*(b-a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function connected(g){
    const n = g.nodes.length, seen = new Set([0]), st = [0];
    while(st.length){ const k = st.pop(); for(const e of g.edges){ const o = e.a===k ? e.b : e.b===k ? e.a : -1; if(o>=0 && !seen.has(o)){ seen.add(o); st.push(o); } } }
    return seen.size === n;
  }
  function hasEdge(g, a, b){ return g.edges.some(e => (e.a===a&&e.b===b)||(e.a===b&&e.b===a)); }
  function randEdge(a, b){ return {a, b, m: Math.random() < .6, amp: R(.05,.3), ph: R(0, 6.283)}; }
  function randomGenome(){
    const n = 3 + Math.floor(Math.random()*3);
    const g = {freq: R(.6, 2.4), nodes: [], edges: []};
    for(let i=0;i<n;i++) g.nodes.push({x: R(0,1), y: R(0,.9), f: R(.1,.95)});
    for(let i=1;i<n;i++) g.edges.push(randEdge(i, Math.floor(Math.random()*i)));
    for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) if(!hasEdge(g,i,j) && Math.random()<.5) g.edges.push(randEdge(i,j));
    return g;
  }
  const clone = g => JSON.parse(JSON.stringify(g));
  function mutate(p){
    for(let tries=0; tries<8; tries++){
      const g = clone(p);
      g.freq = clamp(g.freq + R(-.2,.2), .3, 3);
      for(const nd of g.nodes){
        if(Math.random()<.5){ nd.x = clamp(nd.x + R(-.15,.15), 0, XMAX); nd.y = clamp(nd.y + R(-.15,.2), 0, YMAX); }
        if(Math.random()<.3) nd.f = clamp(nd.f + R(-.2,.2), .05, .98);
      }
      for(const e of g.edges){
        if(Math.random()<.4){ e.amp = clamp(e.amp + R(-.08,.08), 0, .35); e.ph += R(-.8,.8); }
        if(Math.random()<.04) e.m = !e.m;
      }
      const n = g.nodes.length;
      if(Math.random()<.12){ const a = Math.floor(Math.random()*n), b = Math.floor(Math.random()*n); if(a!==b && !hasEdge(g,a,b)) g.edges.push(randEdge(a,b)); }
      if(Math.random()<.08 && g.edges.length > n-1) g.edges.splice(Math.floor(Math.random()*g.edges.length), 1);
      if(Math.random()<.06 && n < MAXN){
        const src = g.nodes[Math.floor(Math.random()*n)];
        g.nodes.push({x: clamp(src.x + R(-.4,.4),0,XMAX), y: clamp(src.y + R(-.2,.5),0,YMAX), f: R(.1,.95)});
        const a = Math.floor(Math.random()*n); g.edges.push(randEdge(n, a));
        let b2 = Math.floor(Math.random()*n); if(b2!==a) g.edges.push(randEdge(n, b2));
      }
      if(Math.random()<.04 && n > 3){
        const k = Math.floor(Math.random()*n);
        g.nodes.splice(k,1);
        g.edges = g.edges.filter(e => e.a!==k && e.b!==k).map(e => ({...e, a: e.a>k?e.a-1:e.a, b: e.b>k?e.b-1:e.b}));
      }
      if(g.nodes.length >= 2 && connected(g)) return g;
    }
    return clone(p);
  }
  function makeSim(g){
    const n = g.nodes.length;
    const minY = Math.min(...g.nodes.map(p => p.y));
    const P = g.nodes.map(p => ({x: p.x, y: p.y - minY + .02, px: p.x, py: p.y - minY + .02, f: p.f}));
    const E = g.edges.map(e => ({a: e.a, b: e.b, m: e.m, amp: e.amp, ph: e.ph, L: Math.max(.05, Math.hypot(P[e.a].x-P[e.b].x, P[e.a].y-P[e.b].y))}));
    return {P, E, t: 0, k: 0, freq: g.freq};
  }
  function stepSim(s){
    const ramp = Math.min(1, Math.max(0, (s.k - SETTLE)/30));
    const VCAP = .07;
    for(const p of s.P){
      let vx = (p.x - p.px)*.99, vy = (p.y - p.py)*.99;
      const v = Math.hypot(vx, vy); if(v > VCAP){ vx *= VCAP/v; vy *= VCAP/v; }
      if(p.y <= .001){ vx *= (1 - p.f); }
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + G*DT*DT;
    }
    for(let it=0; it<ITER; it++){
      for(const e of s.E){
        const A = s.P[e.a], B = s.P[e.b];
        const target = e.L * (1 + (e.m ? e.amp*ramp*Math.sin(6.283*s.freq*s.t + e.ph) : 0));
        let dx = B.x - A.x, dy = B.y - A.y; const d = Math.hypot(dx, dy) || 1e-6;
        const c = (d - target)/d * .5 * (e.m ? .8 : 1);
        A.x += dx*c; A.y += dy*c; B.x -= dx*c; B.y -= dy*c;
      }
      for(const p of s.P){
        if(p.y < 0){ p.y = 0; if(p.py < 0) p.py = 0; }
      }
    }
    s.t += DT; s.k++;
  }
  const centroid = s => { let x=0,y=0; for(const p of s.P){ x+=p.x; y+=p.y; } return [x/s.P.length, y/s.P.length]; };
  function evaluate(g){
    const s = makeSim(g);
    let startX = 0, restY = 0, peak = -1e9, gain = -1e9;
    for(let i=0;i<STEPS;i++){
      stepSim(s);
      const [cx, cy] = centroid(s);
      if(!isFinite(cx) || !isFinite(cy) || Math.abs(cx) > 100 || cy > 50) return 0;
      if(i === SETTLE){ startX = cx; restY = cy; }
      if(i > 20) peak = Math.max(peak, cy);
      if(i > SETTLE) gain = Math.max(gain, cy - restY);
    }
    const [ex] = centroid(s);
    if(mode === "dist") return Math.abs(ex - startX);
    if(mode === "peak") return peak;
    return Math.max(0, gain);
  }
  function reset(){
    pop = []; for(let i=0;i<POP;i++) pop.push({g: randomGenome(), fit: null});
    gen = 0; idx = 0; hist = []; champ = pop[0].g; replay = makeSim(champ); stats(0);
  }
  function nextGen(){
    pop.sort((a,b) => b.fit - a.fit);
    champ = pop[0].g; pendingSwap = true;
    hist.push(pop[0].fit); if(hist.length > 80) hist.shift();
    stats(pop[0].fit);
    const next = pop.slice(0, 3).map(p => ({g: p.g, fit: null}));
    while(next.length < POP){
      let best = null; for(let k=0;k<3;k++){ const c = pop[Math.floor(Math.random()*POP*.6)]; if(!best || c.fit > best.fit) best = c; }
      next.push({g: mutate(best.g), fit: null});
    }
    pop = next; gen++; idx = 0;
  }
  function stats(best){
    $("evoGen").textContent = gen;
    $("evoBest").textContent = (best||0).toFixed(2) + " m";
    const minY = Math.min(...champ.nodes.map(p=>p.y));
    $("evoH").textContent = (Math.max(...champ.nodes.map(p=>p.y)) - minY).toFixed(2) + " m";
    $("evoM").textContent = champ.edges.filter(e => e.m).length;
    sparkline($("evoPlot"), [{data: hist, color: C.signal}], {label: m => "max " + m.toFixed(2) + " m"});
  }
  function draw(){
    ctx.fillStyle = C.stage; ctx.fillRect(0,0,W,H);
    const [cx] = centroid(replay);
    const ox = W/2 - cx*SC;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = MONO; ctx.fillStyle = C.muted;
    const first = Math.floor((-ox)/SC) - 1;
    for(let m = first; m < first + W/SC + 3; m++){
      const x = ox + m*SC; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, GROUND + 8); ctx.stroke();
      if(m % 2 === 0) ctx.fillText(m + " m", x + 3, GROUND + 22);
    }
    for(let h=1; h<=4; h++){ const y = GROUND - h*SC; ctx.strokeStyle = "rgba(23,25,31,.12)"; ctx.setLineDash([2,6]); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); ctx.setLineDash([]); ctx.fillText(h + " m", 8, y - 4); }
    ctx.fillStyle = "#E9ECE6"; ctx.fillRect(0, GROUND, W, H-GROUND); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke(); ctx.fillStyle = C.muted;
    const X = p => ox + p.x*SC, Y = p => GROUND - p.y*SC;
    for(const e of replay.E){
      const A = replay.P[e.a], B = replay.P[e.b];
      const phase = e.m ? Math.sin(6.283*replay.freq*replay.t + e.ph) : 0;
      ctx.strokeStyle = e.m ? `rgba(194,48,106,${.5 + .5*Math.abs(phase)})` : C.ice;
      ctx.lineWidth = e.m ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(X(A), Y(A)); ctx.lineTo(X(B), Y(B)); ctx.stroke();
    }
    for(const p of replay.P){
      ctx.fillStyle = C.space; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X(p), Y(p), 4 + p.f*5, 0, 6.283); ctx.fill(); ctx.stroke();
    }
    const [, cy] = centroid(replay);
    ctx.fillStyle = C.signal; ctx.beginPath(); ctx.arc(W/2, GROUND - cy*SC, 3, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.muted; ctx.fillText("center of mass", W/2 + 8, GROUND - cy*SC + 4);
    ctx.fillText("t = " + replay.t.toFixed(1) + " s", W - 120, 24);
  }
  let budget = 0, pendingSwap = false, shown = null;
  lab.tick = dt => {
    if(running){
      const t0 = performance.now();
      while(performance.now() - t0 < 5){
        pop[idx].fit = evaluate(pop[idx].g); idx++;
        if(idx >= POP){ nextGen(); break; }
      }
    }
    budget += dt;
    while(budget > DT){ stepSim(replay); budget -= DT; if(replay.k >= STEPS){ replay = makeSim(champ); shown = champ; pendingSwap = false; $("evoTag").textContent = "Best of generation " + Math.max(0, gen-1); } }
    if(budget > .2) budget = 0;
    draw();
  };
  labs.push(lab);
  segGroup($("evoFit"), "f", f => { mode = f; $("evoFitText").textContent = texts[f]; hist = []; pop.forEach(p => p.fit = null); idx = 0; });
  $("evoRun").onclick = () => { running = !running; press($("evoRun"), running); $("evoRun").textContent = running ? "Pause" : "Evolve"; };
  $("evoReset").onclick = reset;
  if(!running){ press($("evoRun"), false); $("evoRun").textContent = "Evolve"; }
  reset(); draw();
})();

/* ================= TIERRA-STYLE SOUP ================= */
(function(){
  const cv = $("soupCanvas"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
  const MEM = 6000, COLS = 100, ROWS = MEM/COLS, CW = W/COLS, RH = H/ROWS;
  const SLICE = 12, REACH = 250, MINHOST = 50;
  let owner, orgs, nextId, tick, births, view = "map", mut = 1, running = !reduce, hist = {h:[], p:[], i:[]};
  const lab = {}; watch(cv, lab);
  function reset(){
    owner = new Int32Array(MEM).fill(-1); orgs = new Map(); nextId = 1; tick = 0; births = 0; hist = {h:[], p:[], i:[]};
    alloc(80, "H", 2900, null);
  }
  function freeRun(start, len){ for(let k=0;k<len;k++){ if(owner[(start+k)%MEM] !== -1) return false; } return true; }
  function alloc(len, type, near, parent){
    for(let off=0; off<MEM; off+=7){
      const s = (near + off) % MEM;
      if(freeRun(s, len)){
        const o = {id: nextId++, start: s, len, type, born: tick, err: 0, prog: 0, host: -1};
        for(let k=0;k<len;k++) owner[(s+k)%MEM] = o.id;
        orgs.set(o.id, o); return o;
      }
    }
    return null;
  }
  function kill(o){ for(let k=0;k<o.len;k++) if(owner[(o.start+k)%MEM] === o.id) owner[(o.start+k)%MEM] = -1; orgs.delete(o.id); }
  function used(){ let u = 0; for(const o of orgs.values()) u += o.len; return u; }
  function reap(){
    if(used() < MEM*.82) return;
    const list = [...orgs.values()].sort((a,b) => (a.born - a.err*40) - (b.born - b.err*40));
    let k = 0; while(used() > MEM*.7 && k < list.length){ kill(list[k]); k++; }
  }
  function findHost(o){
    let best = null, bd = 1e9;
    for(const h of orgs.values()){
      if(h.type === "P" || h.use >= 2) continue;
      let d = Math.abs(h.start - o.start); d = Math.min(d, MEM - d);
      if(d < REACH && d < bd){ best = h; bd = d; }
    }
    return best;
  }
  function daughter(o){
    let len = o.len, type = o.type;
    const pm = .2*mut;
    if(Math.random() < pm) len += (Math.random()<.6 ? -1 : 1) * (1 + Math.floor(Math.random()*3));
    if(type === "H" && Math.random() < .004*mut) type = "I";
    else if(type === "I" && Math.random() < .03*mut) type = "H";
    if(type !== "P" && Math.random() < .01*mut){ type = "P"; len = 42 + Math.floor(Math.random()*7); }
    if(type !== "P" && len < MINHOST) return;
    if(type === "P") len = Math.max(28, Math.min(48, len));
    len = Math.min(len, 100);
    reap();
    const d = alloc(len, type, (o.start + o.len + 3) % MEM, o);
    if(d) births++;
  }
  function step(){
    tick++;
    const list = [...orgs.values()];
    for(const o of list) o.use = 0;
    for(let i=list.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [list[i], list[j]] = [list[j], list[i]]; }
    for(const o of list){
      if(!orgs.has(o.id)) continue;
      const need = o.type === "I" ? o.len*1.18 + 10 : o.len + 10;
      if(o.type === "P"){
        const h = findHost(o);
        if(!h || h.type === "I"){ o.err++; o.host = h ? h.id : -1; if(o.err > 6) kill(o); continue; }
        o.host = h.id; h.use++;
      }
      o.prog += SLICE;
      if(Math.random() < .002*mut) o.err++;
      if(o.prog >= need){ o.prog = 0; daughter(o); }
    }
    if(!orgs.size) alloc(80, "H", Math.floor(Math.random()*MEM), null);
    if(tick % 2 === 0){
      let h=0,p=0,i=0; for(const o of orgs.values()){ if(o.type==="H") h++; else if(o.type==="P") p++; else i++; }
      hist.h.push(h); hist.p.push(p); hist.i.push(i);
      for(const k in hist) if(hist[k].length > 220) hist[k].shift();
    }
  }
  function hostColor(len){
    const t = Math.max(0, Math.min(1, (80 - len)/30));
    return `hsl(${242 - t*50},${42 + t*10}%,${39 + t*8}%)`;
  }
  function color(o){ return o.type === "P" ? C.signal : o.type === "I" ? C.green : hostColor(o.len); }
  function drawMap(){
    ctx.fillStyle = C.stage; ctx.fillRect(0,0,W,H);
    for(let r=0;r<ROWS;r++){
      let k = r*COLS;
      while(k < (r+1)*COLS){
        const id = owner[k];
        let e = k; while(e < (r+1)*COLS && owner[e] === id) e++;
        const x = (k - r*COLS)*CW, w = (e-k)*CW;
        if(id === -1){ ctx.fillStyle = "#E6E9E2"; ctx.fillRect(x, r*RH+1, w, RH-2); }
        else { const o = orgs.get(id); ctx.fillStyle = o ? color(o) : C.line; ctx.fillRect(x+.5, r*RH+1, w-1, RH-2); }
        k = e;
      }
    }
  }
  const phase = new Map();
  function drawBodies(){
    ctx.fillStyle = C.stage; ctx.fillRect(0,0,W,H);
    const cx = W/2, cy = H/2, t = performance.now()/1000;
    const pos = new Map();
    for(const o of orgs.values()){
      if(!phase.has(o.id)) phase.set(o.id, Math.random()*6.283);
      const u = o.start/MEM, a = u*6.283*3, rad = 40 + u*220;
      const ph = phase.get(o.id);
      pos.set(o.id, [cx + Math.cos(a)*rad*1.55 + Math.cos(t*.7+ph)*4, cy + Math.sin(a)*rad*.92 + Math.sin(t*.9+ph)*4]);
    }
    ctx.lineWidth = 1;
    for(const o of orgs.values()){
      if(o.type === "P" && o.host > 0 && pos.has(o.host)){
        const [x1,y1] = pos.get(o.id), [x2,y2] = pos.get(o.host);
        ctx.strokeStyle = "rgba(194,48,106,.4)"; ctx.setLineDash([2,3]); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    for(const o of orgs.values()){
      const [x,y] = pos.get(o.id), r = Math.sqrt(o.len)*1.6, col = color(o);
      if(o.type === "P"){
        ctx.fillStyle = col; ctx.beginPath();
        for(let k=0;k<12;k++){ const a = k/12*6.283 + t; const rr = k%2 ? r*.55 : r; ctx.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = col; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = o.type === "I" ? C.ink : C.stage; ctx.lineWidth = o.type === "I" ? 2 : 1.5;
        ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.stroke();
        ctx.fillStyle = "rgba(23,25,31,.38)"; ctx.beginPath(); ctx.arc(x - r*.25, y - r*.2, r*.28, 0, 6.283); ctx.fill();
      }
    }
  }
  function stats(){
    let h=0,p=0,mn=999; for(const o of orgs.values()){ if(o.type==="P") p++; else { h++; mn = Math.min(mn, o.len); } }
    $("soupH").textContent = h; $("soupP").textContent = p; $("soupMin").textContent = mn === 999 ? "–" : mn; $("soupB").textContent = births;
    sparkline($("soupPlot"), [{data: hist.h, color: C.ice}, {data: hist.i, color: C.green}, {data: hist.p, color: C.signal}], {label: m => "max " + Math.round(m)});
  }
  let acc = 0, statT = 0;
  lab.tick = dt => {
    if(running){ acc += dt*14; let n = 0; while(acc >= 1 && n < 4){ step(); acc--; n++; } if(acc > 4) acc = 0; }
    view === "map" ? drawMap() : drawBodies();
    statT += dt; if(statT > .25){ stats(); statT = 0; }
  };
  labs.push(lab);
  segGroup($("soupView"), "v", v => { view = v; $("soupTag").textContent = v === "map" ? "Memory map · 6,000 instructions" : "The same soup drawn as bodies"; });
  bindRange("soupMut", v => v.toFixed(1) + "×", v => mut = v);
  $("soupRun").onclick = () => { running = !running; press($("soupRun"), running); $("soupRun").textContent = running ? "Pause" : "Run"; };
  $("soupReset").onclick = () => { reset(); stats(); };
  if(!running){ press($("soupRun"), false); $("soupRun").textContent = "Run"; }
  reset(); drawMap(); stats();
})();

/* ================= DAISYWORLD ================= */
(function(){
  const cv = $("daisyCanvas"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
  const S = 917, SIG = 5.67e-8, Q = 2.06e9, AG = .5, AW = .75, AB = .25, GAM = .3, LMIN = .5, LMAX = 1.7;
  let L = 1, useW = true, useB = true, st = {w: .2, b: .2}, curve = [], sweeping = false;
  const lab = {}; watch(cv, lab);
  const beta = T => (T > 5 && T < 40) ? Math.max(0, 1 - .003265*(22.5 - T)**2) : 0;
  function evalState(L, w, b){
    const x = 1 - w - b, A = x*AG + w*AW + b*AB, Te4 = S*L*(1-A)/SIG;
    const Te = Math.pow(Te4, .25) - 273.15;
    const Tw = Math.pow(Math.max(0, Q*(A-AW) + Te4), .25) - 273.15;
    const Tb = Math.pow(Math.max(0, Q*(A-AB) + Te4), .25) - 273.15;
    return {x, Te, Tw, Tb};
  }
  function settle(L, s, n){
    let w = useW ? Math.max(s.w, .01) : 0, b = useB ? Math.max(s.b, .01) : 0;
    for(let k=0;k<n;k++){
      const e = evalState(L, w, b);
      if(useW) w = Math.max(.01, w + .05*w*(e.x*beta(e.Tw) - GAM));
      if(useB) b = Math.max(.01, b + .05*b*(e.x*beta(e.Tb) - GAM));
    }
    return {w, b};
  }
  function lifeless(L){ return Math.pow(S*L*(1-AG)/SIG, .25) - 273.15; }
  function buildCurve(){
    curve = []; let s = {w:.01, b:.01};
    for(let i=0;i<=240;i++){
      const l = LMIN + (LMAX-LMIN)*i/240;
      s = settle(l, s, 1500);
      const e = evalState(l, s.w, s.b);
      const alive = s.w > .015 || s.b > .015;
      curve.push({l, T: e.Te, w: alive ? s.w : 0, b: alive ? s.b : 0});
    }
  }
  const pts = []; for(let i=0;i<1400;i++){ const r = Math.sqrt(Math.random()), a = Math.random()*6.283; pts.push({r, a, u: Math.random()}); }
  pts.sort((p,q) => p.u - q.u);
  function draw(){
    ctx.fillStyle = C.stage; ctx.fillRect(0,0,W,H);
    const e = evalState(L, st.w, st.b), alive = st.w > .015 || st.b > .015;
    const w = alive ? st.w : 0, b = alive ? st.b : 0;
    const px = 210, py = 300, PR = 170;
    const sr = 18 + (L - LMIN)*26;
    const g = ctx.createRadialGradient(70, 70, 2, 70, 70, sr*2.6);
    g.addColorStop(0, "#FFF4D6"); g.addColorStop(.35, "#E9A93A"); g.addColorStop(1, "rgba(233,169,58,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(70, 70, sr*2.6, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#7a6a48"; ctx.beginPath(); ctx.arc(px, py, PR, 0, 6.283); ctx.fill();
    const n = pts.length, nw = Math.round(w*n), nb = Math.round(b*n);
    pts.forEach((p, i) => {
      if(i >= nw + nb) return;
      ctx.fillStyle = i < nw ? "#FFFFFF" : "#17191F";
      const x = px + Math.cos(p.a)*p.r*(PR-5), y = py + Math.sin(p.a)*p.r*(PR-5);
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.283); ctx.fill();
      if(i >= nw){ ctx.strokeStyle = "#9aa6b8"; ctx.lineWidth = .7; ctx.stroke(); }
    });
    ctx.strokeStyle = C.ice; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px, py, PR, 0, 6.283); ctx.stroke();
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.fillText("luminosity " + L.toFixed(2), 40, 520);
    ctx.fillText("white " + Math.round(w*100) + "%  black " + Math.round(b*100) + "%", 40, 540);
    // plot
    const X0 = 470, X1 = 920, Y0 = 70, Y1 = 400, TMIN = -40, TMAX = 80;
    const fx = l => X0 + (l - LMIN)/(LMAX-LMIN)*(X1-X0), fy = T => Y1 - (T - TMIN)/(TMAX-TMIN)*(Y1-Y0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for(let T = -40; T <= 80; T += 20){ ctx.beginPath(); ctx.moveTo(X0, fy(T)); ctx.lineTo(X1, fy(T)); ctx.stroke(); ctx.fillStyle = C.muted; ctx.fillText(T + "°", X0 - 40, fy(T) + 4); }
    for(let l = .6; l <= 1.7; l += .2){ ctx.fillText(l.toFixed(1), fx(l) - 10, Y1 + 20); }
    ctx.fillText("solar luminosity", X1 - 130, Y1 + 38); ctx.fillText("planet temperature, °C", X0, Y0 - 16);
    ctx.fillStyle = "rgba(46,139,87,.09)"; ctx.fillRect(X0, fy(40), X1-X0, fy(5)-fy(40));
    ctx.fillStyle = C.green; ctx.fillText("daisies can grow 5–40 °C", X0 + 8, fy(40) + 16);
    ctx.setLineDash([4,5]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.4; ctx.beginPath();
    for(let i=0;i<=120;i++){ const l = LMIN + (LMAX-LMIN)*i/120, T = lifeless(l); if(T < TMIN || T > TMAX){ continue; } ctx.lineTo(fx(l), fy(T)); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.signal; ctx.lineWidth = 2.4; ctx.beginPath();
    curve.forEach((c,i) => { const T = Math.max(TMIN, Math.min(TMAX, c.T)); i ? ctx.lineTo(fx(c.l), fy(T)) : ctx.moveTo(fx(c.l), fy(T)); });
    ctx.stroke();
    const AH = 50, AY = Y1 + 68;
    curve.forEach(c => {
      const x = fx(c.l), wd = (X1-X0)/240 + .5;
      ctx.fillStyle = "#B7BEC6"; ctx.fillRect(x, AY + AH - c.w*AH, wd, c.w*AH);
      ctx.fillStyle = "#17191F"; ctx.fillRect(x, AY + AH - (c.w+c.b)*AH, wd, c.b*AH);
    });
    ctx.fillStyle = C.muted; ctx.fillText("daisy cover: white (grey) above, black below", X0, AY - 6);
    const mx = fx(L);
    ctx.strokeStyle = C.ice; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(mx, Y0); ctx.lineTo(mx, AY + AH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.signal; ctx.beginPath(); ctx.arc(mx, fy(Math.max(TMIN, Math.min(TMAX, e.Te))), 5, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.signal; ctx.fillText("with daisies", fx(1.12), fy(17) + 18);
    ctx.fillStyle = C.muted; ctx.fillText("bare planet", fx(.62), fy(lifeless(.62)) + 22);
    $("dT").textContent = e.Te.toFixed(1) + " °C"; $("dT0").textContent = lifeless(L).toFixed(1) + " °C";
    $("dW").textContent = Math.round(w*100) + "%"; $("dB").textContent = Math.round(b*100) + "%";
  }
  function setL(v){ L = v; st = settle(L, st, 800); $("dL").value = v; $("dLO").textContent = v.toFixed(2); draw(); }
  lab.tick = dt => {
    if(sweeping){ let v = L + dt*.13; if(v >= LMAX){ v = LMAX; sweeping = false; press($("dSweep"), false); } setL(v); }
  };
  labs.push(lab);
  $("dL").addEventListener("input", e => { sweeping = false; press($("dSweep"), false); setL(+e.target.value); });
  $("dSweep").onclick = () => { sweeping = !sweeping; press($("dSweep"), sweeping); if(sweeping && L > LMAX - .02){ st = {w:.01, b:.01}; setL(LMIN); } };
  $("dWhite").onclick = () => { useW = !useW; press($("dWhite"), useW); buildCurve(); st = {w:.01,b:.01}; setL(L); };
  $("dBlack").onclick = () => { useB = !useB; press($("dBlack"), useB); buildCurve(); st = {w:.01,b:.01}; setL(L); };
  buildCurve(); setL(1);
})();


/* ================= PARTICLE LIFE DISH (hero) ================= */
(function(){
  const cv = $("dishCanvas"); if(!cv) return;
  const ctx = cv.getContext("2d"), W = cv.width, R0 = W/2;
  const K = 4, N = 560, RMAX = 64, FR = .8, BETA = .3;
  const cols = ["#3D3B8E", "#C2306A", "#2E8B57", "#C98A1B"];
  let M = [], P = [];
  function table(){ M = []; for(let i=0;i<K;i++){ M.push([]); for(let j=0;j<K;j++) M[i].push(i===j ? .4 + Math.random()*.6 : Math.random()*2 - 1); } }
  function seed(){ P = []; for(let i=0;i<N;i++){ const a = Math.random()*6.283, r = Math.sqrt(Math.random())*(R0-20); P.push({x:R0+Math.cos(a)*r, y:R0+Math.sin(a)*r, vx:0, vy:0, k:i%K}); } }
  function force(r, a){ if(r < BETA) return r/BETA - 1; if(r < 1) return a*(1 - Math.abs(2*r - 1 - BETA)/(1 - BETA)); return 0; }
  const lab = {}; watch(cv, lab);
  function step(){
    for(const p of P){
      let fx = 0, fy = 0;
      for(const q of P){
        if(p === q) continue;
        const dx = q.x - p.x, dy = q.y - p.y; if(dx > RMAX || dx < -RMAX || dy > RMAX || dy < -RMAX) continue;
        const d = Math.hypot(dx, dy);
        if(d > 0 && d < RMAX){ const f = force(d/RMAX, M[p.k][q.k]); fx += dx/d*f; fy += dy/d*f; }
      }
      p.vx = p.vx*FR + fx*.9; p.vy = p.vy*FR + fy*.9;
    }
    for(const p of P){
      p.x += p.vx; p.y += p.vy;
      const dx = p.x - R0, dy = p.y - R0, d = Math.hypot(dx, dy), lim = R0 - 8;
      if(d > lim){ p.x = R0 + dx/d*lim; p.y = R0 + dy/d*lim; p.vx *= -.4; p.vy *= -.4; }
    }
  }
  function draw(){
    ctx.clearRect(0,0,W,W);
    ctx.fillStyle = "#F8F9F5"; ctx.beginPath(); ctx.arc(R0,R0,R0,0,6.283); ctx.fill();
    for(const p of P){ ctx.fillStyle = cols[p.k]; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  lab.tick = () => { if(reduce && lab.drawn) return; step(); draw(); lab.drawn = true; };
  labs.push(lab);
  cv.addEventListener("click", () => { table(); seed(); });
  table(); seed(); for(let i=0;i<120;i++) step(); draw();
})();

/* ================= CLAIMS TABLE ================= */
(function(){
  const rows = ["Game of Life", "Boids", "Sims's creatures", "Tierra", "Daisyworld"];
  const M = [
    [["y","Gliders read as creatures crossing the grid."],["y","Viewers recognize a flock at once."],["y","Swimming and crawling read as animal motion."],["p","Barely: colored bars widening and narrowing."],["n","Daisy cover and temperature, as charts."]],
    [["p","Persistence and interaction; reproduction with heredity arrives with von Neumann's and Langton's machines."],["n","Collective motion only, with no reproduction, resources or death."],["y","Heredity, variation and selection against a task the maker sets."],["y","Self-replication, mutation, selection, parasitism, immunity and an ecology."],["y","Growth, death and competition for ground, coupled to the climate they regulate."]],
    [["n","Conway made no such claim."],["p","Langton counted flocking boids and flocking birds as two instances of one phenomenon."],["n","Sims made no such claim."],["y","Ray held that Tierra's organisms were alive."],["n","Watson and Lovelock called it a fictional world."]]
  ];
  const tb = document.querySelector("#claimTable tbody");
  function show(c){
    tb.innerHTML = rows.map((r,i) => `<tr><th>${r}</th><td class="on"><span class="${M[c][i][0]}">${M[c][i][0]==="y"?"●":M[c][i][0]==="p"?"◐":"○"}</span> ${M[c][i][1]}</td></tr>`).join("");
  }
  segGroup($("claimBtns"), "c", c => show(+c));
  show(1);
})();

/* ================= LOOP ================= */
let last = performance.now();
function loop(now){
  const dt = Math.min(.1, (now - last)/1000); last = now;
  for(const l of labs) if(l.visible) l.tick(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
