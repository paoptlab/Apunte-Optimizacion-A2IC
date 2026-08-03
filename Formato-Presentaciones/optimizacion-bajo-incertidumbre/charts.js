/* ===== Optimización bajo incertidumbre — gráficos e interactividad ===== */
(function(){
  const NB = window.NB;
  const C = {
    g1:'#2a9d8f', g2:'#e9c46a', g3:'#e76f51', solar:'#f4a261',
    ens:'#9b2226', accent:'#2a9d8f', ink:'#1B333D', soft:'#5C7D85',
    line:'#D3DEDC', good:'#2a9d8f', paper2:'#E6EEEC', res:'#e76f51', ws:'#2ecc71'
  };
  const fmt = n => Math.round(n).toLocaleString('es-CL');
  const fmt1 = n => n.toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1});
  const sum = a => a.reduce((x,y)=>x+y,0);
  const esc = value => String(value).replace(/[&<>"']/g, char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);
  const meta = key => NB.meta?.[key];
  const money = value => '$' + fmt(value);
  const moneyK = value => '$' + (value/1000).toLocaleString('es-CL',{
    minimumFractionDigits:0, maximumFractionDigits:0
  }) + 'k';
  const genColor = (id, index=0) => C[String(id).toLowerCase()] || [C.g1,C.g2,C.g3][index%3];
  function niceMax(value){
    const safe=Math.max(Number(value)||1,1), magnitude=10**Math.floor(Math.log10(safe));
    const step=magnitude/5;
    return Math.ceil((safe*1.08)/step)*step;
  }
  function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }
  function setHTML(id, value){ const el=document.getElementById(id); if(el) el.innerHTML=value; }

  /* ---------- syntax highlight (Python) ---------- */
  function highlight(){
    const KW = new Set(['def','return','for','in','if','else','None','True','False','lambda','and','or','not','import','as','range','round','sum','dict','list','print','abs','addVars','addConstr','setObjective','quicksum','optimize']);
    document.querySelectorAll('pre.code[data-lang="py"]').forEach(pre=>{
      const raw = pre.textContent;
      pre.innerHTML = raw.split('\n').map(line=>{
        const ci = line.indexOf('#');
        let code = ci>=0 ? line.slice(0,ci) : line;
        let comment = ci>=0 ? line.slice(ci) : '';
        code = code.replace(/('[^']*'|"[^"]*")/g, '\u0001$1\u0002');
        code = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        code = code.replace(/\u0001(.*?)\u0002/g, '<span class="st">$1</span>');
        code = code.replace(/\b(\d[\d.]*)\b/g, '<span class="nu">$1</span>');
        code = code.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (m)=>{
          if(KW.has(m)) return '<span class="kw">'+m+'</span>';
          if(/^[A-Z]/.test(m)) return '<span class="fn">'+m+'</span>';
          return m;
        });
        const cmt = comment ? '<span class="cm">'+comment.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>' : '';
        return code + cmt;
      }).join('\n');
    });
  }

  /* ---------- SVG line/area helpers ---------- */
  const W=920, H=420, PAD={l:64,r:24,t:24,b:46};
  const plotW = W-PAD.l-PAD.r, plotH = H-PAD.t-PAD.b;
  const xAt = (t,n=(NB.T?.length||24))=> PAD.l + (t/Math.max(1,n-1))*plotW;
  const yAt = (v,ymax)=> PAD.t + plotH - (v/ymax)*plotH;

  function axes(ymax, dark){
    const axc = dark? 'rgba(244,240,230,.6)':C.soft;
    const grc = dark? 'rgba(244,240,230,.16)':C.line;
    let s='';
    for(let i=0;i<=5;i++){
      const v = ymax*i/5, y=yAt(v,ymax);
      s+=`<line x1="${PAD.l}" y1="${y}" x2="${W-PAD.r}" y2="${y}" stroke="${grc}" stroke-width="1"/>`;
      s+=`<text x="${PAD.l-12}" y="${y+5}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="14" fill="${axc}">${fmt(v)}</text>`;
    }
    const n=NB.T?.length||24;
    [...new Set([0,.2,.4,.6,.8,1].map(f=>Math.round((n-1)*f)))].forEach(index=>{
      const label=NB.T?.[index] ?? index;
      s+=`<text x="${xAt(index,n)}" y="${H-16}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="14" fill="${axc}">${label}h</text>`;
    });
    return s;
  }
  const linePath = (arr,ymax)=> arr.map((v,t)=>`${t?'L':'M'}${xAt(t).toFixed(1)},${yAt(v,ymax).toFixed(1)}`).join(' ');
  function areaBand(lower, upper, ymax){
    let p='M'+xAt(0)+','+yAt(lower[0],ymax);
    for(let t=1;t<lower.length;t++) p+=' L'+xAt(t,lower.length).toFixed(1)+','+yAt(lower[t],ymax).toFixed(1);
    for(let t=lower.length-1;t>=0;t--) p+=' L'+xAt(t,lower.length).toFixed(1)+','+yAt(upper[t],ymax).toFixed(1);
    return p+' Z';
  }
  function stacked(series, ymax){
    let cum=Array(series[0]?.arr.length||0).fill(0); let s='';
    series.forEach(se=>{
      const lower=cum.slice();
      const upper=cum.map((v,t)=>v+se.arr[t]);
      s+=`<path d="${areaBand(lower,upper,ymax)}" fill="${se.color}" opacity="${se.color===C.ens?'0.92':'0.82'}"/>`;
      cum=upper;
    });
    return s;
  }

  /* ---------- two-stage fan · GENERIC N scenarios (slide 06) ---------- */
  function tree(){
    const el=document.getElementById('tree'); if(!el) return;
    const w=640,h=480, x0=30,x1=300,x2=560, yc=h/2;
    const ys=[70,150,yc,h-150,h-70];
    const labels=['s\u2081','s\u2082','\u22ee','s\u2099\u208B\u2081','s\u2099'];
    const ell=2;
    let paths='',nodes='';
    ys.forEach((y,i)=>{
      const dim = i===ell;
      paths+=`<path d="M${x1+150},${yc} C${x1+210},${yc} ${x2-60},${y} ${x2},${y}" fill="none" stroke="${dim?C.soft:C.accent}" stroke-width="2.5" opacity="${dim?.25:.5}"/>`;
    });
    nodes+=`<g><rect x="${x0}" y="${yc-54}" width="210" height="108" rx="14" fill="rgba(42,157,143,.16)" stroke="${C.g1}" stroke-width="2"/>`+
      `<text x="${x0+105}" y="${yc-20}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" letter-spacing="2" fill="${C.g1}">1\u00AA ETAPA</text>`+
      `<text x="${x0+105}" y="${yc+8}" text-anchor="middle" font-family="IBM Plex Serif,serif" font-size="24" fill="#EAF1EF">x : u,v,w</text>`+
      `<text x="${x0+105}" y="${yc+34}" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" fill="rgba(234,241,239,.6)">compromiso</text></g>`;
    nodes+=`<line x1="${x0+210}" y1="${yc}" x2="${x1+150}" y2="${yc}" stroke="${C.accent}" stroke-width="2.5"/>`;
    nodes+=`<circle cx="${x1+150}" cy="${yc}" r="7" fill="${C.accent}"/>`;
    nodes+=`<text x="${x1+150}" y="${yc-20}" text-anchor="middle" font-family="IBM Plex Serif,serif" font-style="italic" font-size="22" fill="${C.accent}">\u03BE</text>`;
    nodes+=`<text x="${x1+150}" y="${yc+44}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" fill="rgba(234,241,239,.55)">se revela el escenario</text>`;
    ys.forEach((y,i)=>{
      if(i===ell){ nodes+=`<text x="${x2+110}" y="${y+8}" text-anchor="middle" font-family="IBM Plex Sans" font-size="26" fill="${C.soft}">\u22ee</text>`; return; }
      nodes+=`<g><rect x="${x2}" y="${y-30}" width="220" height="60" rx="12" fill="rgba(255,255,255,.05)" stroke="${C.accent}" stroke-width="1.6"/>`+
        `<text x="${x2+16}" y="${y-3}" font-family="IBM Plex Sans" font-size="16" font-weight="600" fill="#EAF1EF">Despacho \u00B7 ${labels[i]}</text>`+
        `<text x="${x2+16}" y="${y+19}" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.accent}">Q(x,\u03BE${labels[i]}) \u00B7 \u03C0${labels[i]}</text></g>`;
    });
    el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-height:480px">${paths}${nodes}`+
      `<text x="${x2+110}" y="28" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" letter-spacing="2" fill="rgba(234,241,239,.6)">2\u00AA ETAPA \u00B7 N ESCENARIOS</text></svg>`;
  }

  /* ---------- commitment heatmap ---------- */
  function commitHM(elId, u, accent){
    const el=document.getElementById(elId); if(!el) return;
    let html='<div style="display:flex;flex-direction:column;gap:11px">';
      NB.gens.forEach((g,index)=>{
        html+=`<div style="display:flex;align-items:center;gap:14px">`+
        `<div style="width:150px;flex:none"><div style="font-family:IBM Plex Mono,monospace;font-weight:600;color:${genColor(g.id,index)};font-size:19px">${esc(g.id)}</div><div style="font-size:13px;color:${C.soft}">${esc(g.name)}</div></div>`+
        `<div class="hm" style="grid-template-columns:repeat(${u[g.id].length},1fr);flex:1">`;
      u[g.id].forEach((on,t)=>{
        const bg = on? (accent||genColor(g.id,index)) : C.paper2;
        html+=`<div class="cell" title="h${t}" style="background:${bg};border:${on?'none':'1px solid '+C.line}"></div>`;
      });
      html+='</div></div>';
    });
    const first=NB.T?.[0]??0, last=NB.T?.[NB.T.length-1]??23;
    html+='<div style="display:flex;justify-content:space-between;margin-left:164px;font-family:IBM Plex Mono,monospace;font-size:13px;color:'+C.soft+'"><span>'+first+'h</span><span>'+last+'h</span></div></div>';
    el.innerHTML=html;
  }

  /* ---------- dispatch area (stacked) ---------- */
  function dispChart(elId, d, dark, ymax){
    const el=document.getElementById(elId); if(!el) return;
    const series=NB.gens.map((g,index)=>({color:genColor(g.id,index),arr:d[g.id]})).concat([
      {color:C.solar, arr:d.solar},{color:C.ens, arr:d.ens}
    ]);
    const stackedMax=Math.max(...d.demand, ...d.demand.map((_value,t)=>sum(series.map(item=>item.arr[t]))));
    ymax = ymax || niceMax(stackedMax);
    let s=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="max-height:430px">${axes(ymax,dark)}`;
    s+=stacked(series, ymax);
    s+=`<path d="${linePath(d.demand,ymax)}" fill="none" stroke="${dark?'#fff':C.ink}" stroke-width="2.5" stroke-dasharray="4 4"/>`;
    el.innerHTML=s+'</svg>';
  }

  /* ---------- reserves trade-off bars (slide 05) ---------- */
  function reservesChart(){
    const el=document.getElementById('reserves-chart'); if(!el) return;
    const fmtk = v => (v/1000).toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1});
    const r=NB.reserves, w=820,h=380,pl=80,pb=56,pt=30;
    const ymax=niceMax(Math.max(...r.map(item=>item.cost))), yA=v=>pt+(h-pt-pb)-(v/ymax)*(h-pt-pb);
    const cols=['#94a3b8',C.g2,C.g3,C.ens];
    let s=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-height:380px">`;
    for(let i=0;i<=4;i++){ const v=ymax*i/4,y=yA(v); s+=`<line x1="${pl}" y1="${y}" x2="${w-20}" y2="${y}" stroke="${C.line}"/>`; s+=`<text x="${pl-10}" y="${y+5}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.soft}">$${fmt(v/1000)}k</text>`; }
    const available=w-pl-30, gap=available/Math.max(1,r.length), bw=Math.min(110,gap*.62);
    r.forEach((b,i)=>{ const x=pl+i*gap+(gap-bw)/2, y=yA(b.cost);
      s+=`<rect x="${x}" y="${y}" width="${bw}" height="${yA(0)-y}" rx="4" fill="${cols[i%cols.length]}"/>`;
      s+=`<text x="${x+bw/2}" y="${y-12}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="17" font-weight="600" fill="${C.ink}">$${fmtk(b.cost)}k</text>`;
      s+=`<text x="${x+bw/2}" y="${h-32}" text-anchor="middle" font-family="IBM Plex Sans" font-size="20" font-weight="700" fill="${C.ink}">R=${b.alpha}%</text>`;
      s+=`<text x="${x+bw/2}" y="${h-12}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.soft}">${b.onHours} u·h ON</text>`;
    });
    el.innerHTML=s+'</svg>';
  }

  /* ---------- SAA in-sample cost vs N (slide 12) ---------- */
  function insampleChart(){
    const el=document.getElementById('insample-chart'); if(!el) return;
    const d=NB.saaInsample, w=860,h=420,pl=80,pb=64,pt=34;
    const ymax=niceMax(Math.max(...d.map(item=>item.cost))), yA=v=>pt+(h-pt-pb)-(v/ymax)*(h-pt-pb);
    const minN=Math.min(...d.map(item=>item.N)), maxN=Math.max(...d.map(item=>item.N));
    const xmin=Math.log10(minN), xmax=Math.log10(maxN);
    const xA=N=>pl+((Math.log10(N)-xmin)/Math.max(.0001,xmax-xmin))*(w-pl-30);
    let s=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-height:420px">`;
    for(let i=0;i<=4;i++){ const v=ymax*i/4,y=yA(v); s+=`<line x1="${pl}" y1="${y}" x2="${w-20}" y2="${y}" stroke="${C.line}"/>`; s+=`<text x="${pl-10}" y="${y+5}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.soft}">$${fmt(v/1000)}k</text>`; }
    const pts=d.map(x=>`${xA(x.N).toFixed(1)},${yA(x.cost).toFixed(1)}`);
    s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
    d.forEach(x=>{ s+=`<circle cx="${xA(x.N)}" cy="${yA(x.cost)}" r="7" fill="${C.g1}"/>`;
      s+=`<text x="${xA(x.N)}" y="${yA(x.cost)-16}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.ink}">$${(x.cost/1000).toFixed(0)}k</text>`;
      s+=`<text x="${xA(x.N)}" y="${h-34}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="15" font-weight="600" fill="${C.soft}">${x.N}</text>`;
      s+=`<text x="${xA(x.N)}" y="${h-16}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" fill="${C.soft}">${x.onHours} ON</text>`;
    });
    s+=`<text x="${(pl+w)/2}" y="${pt-12}" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" fill="${C.soft}">N muestras (escala log) · costo in-sample (dentro de la muestra)</text>`;
    el.innerHTML=s+'</svg>';
  }

  /* ---------- SAA bivariate sampling cloud (slide 08) — puntos reales ---------- */
  function saaScatter(){
    const el=document.getElementById('saa-scatter'); if(!el) return;
    const pts=NB.saaPts;
    const w=620,h=420,pl=66,pb=56,pt=24;
    const xs=pts.map(point=>point[0]).concat([1]), ys=pts.map(point=>point[1]).concat([1]);
    const xpad=Math.max(.05,(Math.max(...xs)-Math.min(...xs))*.12);
    const ypad=Math.max(.08,(Math.max(...ys)-Math.min(...ys))*.12);
    const xmin=Math.max(0,Math.min(...xs)-xpad),xmax=Math.max(...xs)+xpad;
    const ymin=Math.max(0,Math.min(...ys)-ypad),ymax=Math.max(...ys)+ypad;
    const xA=v=>pl+((v-xmin)/(xmax-xmin))*(w-pl-20);
    const yA=v=>pt+(h-pt-pb)-((v-ymin)/(ymax-ymin))*(h-pt-pb);
    let s=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-height:420px">`;
    for(let i=0;i<=4;i++){ const gy=ymin+(ymax-ymin)*i/4, y=yA(gy); s+=`<line x1="${pl}" y1="${y}" x2="${w-20}" y2="${y}" stroke="rgba(244,240,230,.14)"/>`; s+=`<text x="${pl-10}" y="${y+5}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="rgba(244,240,230,.6)">${gy.toFixed(1)}</text>`; }
    for(let i=0;i<=5;i++){ const gx=xmin+(xmax-xmin)*i/5; s+=`<text x="${xA(gx)}" y="${h-30}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" fill="rgba(244,240,230,.6)">${gx.toFixed(2)}</text>`; }
    pts.forEach(p=>{ s+=`<circle cx="${xA(p[0]).toFixed(1)}" cy="${yA(p[1]).toFixed(1)}" r="5" fill="${C.g1}" opacity="0.6"/>`; });
    s+=`<line x1="${xA(1)-9}" y1="${yA(1)}" x2="${xA(1)+9}" y2="${yA(1)}" stroke="${C.ens}" stroke-width="3"/><line x1="${xA(1)}" y1="${yA(1)-9}" x2="${xA(1)}" y2="${yA(1)+9}" stroke="${C.ens}" stroke-width="3"/>`;
    s+=`<text x="${xA(1)+14}" y="${yA(1)-8}" font-family="IBM Plex Sans" font-size="14" fill="${C.ens}">Base (1,1)</text>`;
    s+=`<text x="${(pl+w)/2}" y="${h-8}" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" fill="rgba(244,240,230,.6)">k_D · factor de demanda</text>`;
    s+=`<text x="18" y="${(pt+h-pb)/2}" transform="rotate(-90 18 ${(pt+h-pb)/2})" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" fill="rgba(244,240,230,.6)">k_S · factor solar</text>`;
    el.innerHTML=s+'</svg>';
  }

  /* ---------- oracle ranking (slide 14) ---------- */
  function oracleChart(){
    const el=document.getElementById('oracle-chart'); if(!el) return;
    const rows=[{name:'Oráculo (WS)',cost:NB.oracle.WS,gap:0,grp:'ws'}].concat(NB.oracle.rows);
    const grpC={ws:C.ws,saa:'#264653',res:C.g3};
    const w=900, rh=36, pt=20, pl=200, h=pt+rows.length*rh+20;
    const costs=rows.map(row=>row.cost), base=Math.min(...costs)*.9;
    const xmin=Math.log10(base), xmax=Math.log10(Math.max(...costs)*1.12);
    const xA=c=>pl+((Math.log10(c)-xmin)/(xmax-xmin))*(w-pl-160);
    let s=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-height:560px">`;
    s+=`<line x1="${xA(NB.oracle.WS)}" y1="${pt-6}" x2="${xA(NB.oracle.WS)}" y2="${h-14}" stroke="${C.ws}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    rows.forEach((r,i)=>{ const y=pt+i*rh; const x1=xA(base), x2=xA(r.cost);
      s+=`<text x="${pl-12}" y="${y+rh/2+5}" text-anchor="end" font-family="IBM Plex Sans" font-size="16" fill="${C.ink}" font-weight="${r.grp==='ws'?'700':'500'}">${r.name}</text>`;
      s+=`<rect x="${x1}" y="${y+5}" width="${Math.max(2,x2-x1)}" height="${rh-12}" rx="3" fill="${grpC[r.grp]||C.soft}"/>`;
      s+=`<text x="${x2+8}" y="${y+rh/2+5}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.soft}">$${fmt(r.cost/1000)}k${r.gap?`  ·  +${r.gap.toFixed(0)}%`:'  ·  óptimo'}</text>`;
    });
    el.innerHTML=s+'</svg>';
  }

  /* ---------- textos y cifras vinculados a los resultados ---------- */
  function syncClaims(){
    const lowR=meta('reserveLowPct') ?? NB.reserves[0]?.alpha;
    const highR=meta('reserveHighPct') ?? NB.reserves.at(-1)?.alpha;
    const lowN=meta('sampleLowN') ?? NB.saaInsample[0]?.N;
    const highN=meta('sampleHighN') ?? NB.saaInsample.at(-1)?.N;
    const sigma=NB.saaSigma;

    const table=document.getElementById('system-table-body');
    if(table){
      table.innerHTML=NB.gens.map((g,index)=>`<tr><td class="gtag" style="color:${genColor(g.id,index)}">${esc(g.id)} · ${esc(g.name)}</td><td class="n">${fmt(g.cvar)}</td><td class="n">${fmt(g.Pmin)}</td><td class="n">${fmt(g.Pmax)}</td><td class="n">${fmt(g.cnl)}</td><td class="n">${fmt(g.cstart)}</td></tr>`).join('')+
        `<tr><td class="gtag" style="color:var(--solar)">☀ Solar</td><td class="n">0</td><td class="n">—</td><td class="n">${fmt(NB.Smax)}</td><td class="n">—</td><td class="n">—</td></tr>`;
    }
    setHTML('system-cap',`${fmt(NB.cap)}<span class="small muted" style="font-size:18px;"> MW</span>`);
    setHTML('system-dmax',`${fmt(NB.Dmax)}<span class="small muted" style="font-size:18px;"> MW</span>`);
    setHTML('system-voll',`${fmt(NB.VOLL)}<span class="small muted" style="font-size:18px;"> $/MWh</span>`);

    const reserveLabels=NB.reserves.map(item=>`${item.alpha}%`).join(', ');
    setText('reserve-set',`Se evalúa R ∈ {${reserveLabels}}; el menor margen es la base determinista.`);
    setText('saa-dist-d',`\\(k_D \\sim \\mathcal{N}(1,\\,${Math.abs(sigma.D).toFixed(2)}^2)\\)`);
    setText('saa-dist-s',`\\(k_S \\sim \\mathcal{N}(1,\\,${Math.abs(sigma.S).toFixed(2)}^2)\\)`);
    const relation=sigma.rho<0
      ? 'un día nublado tiende a juntar menos sol con más demanda (caso de estrés).'
      : sigma.rho>0
        ? 'los factores de demanda y sol tienden a moverse en la misma dirección.'
        : 'los factores se muestrean sin correlación lineal.';
    setText('saa-rho',`\\(\\rho=${Number(sigma.rho).toLocaleString('es-CL')}\\) — ${relation}`);
    setText('saa-sample-hint',`Muestras (k_D, k_S) · distribución bivariada · N=${meta('scenarioSampleN') ?? NB.saaPts.length}`);

    const reserveCards=document.getElementById('reserve-cards');
    if(reserveCards){
      const colors=['var(--g1)','var(--g2)','var(--g3)','var(--ens)'];
      reserveCards.innerHTML=NB.reserves.map((row,index)=>`<div class="card grow" style="padding:13px 20px;"><span class="stat" style="flex-direction:row;align-items:baseline;gap:12px;"><span class="k">R=${row.alpha}%</span><span class="v" style="font-size:26px;color:${colors[index%colors.length]};">${money(row.cost)}</span></span></div>`).join('');
    }

    const commitButtons=document.querySelectorAll('#commit-mode-toggle button');
    commitButtons.forEach(button=>{
      button.textContent=button.dataset.mode==='saa'
        ? `SAA · N=${lowN} vs N=${highN}`
        : `Reservas · ${lowR}% vs ${highR}%`;
    });
    document.querySelectorAll('#det-disp-toggle button').forEach(button=>{
      const value=button.dataset.det==='r0'?lowR:highR;
      button.textContent=`R = ${value}% · ${button.dataset.det==='r0'?'menor margen':'más conservador'}`;
    });
    const factor=(1+Number(highR)/100).toLocaleString('es-CL',{maximumFractionDigits:2});
    setHTML('det-high-explain',`Con <strong>R=${highR}%</strong> el despacho se sobredimensiona a <strong>${factor}·D</strong>: el área apilada supera la <em class="it">demanda nominal</em> (línea punteada). Esa holgura tiene costo, pero no garantiza cubrir escenarios peores que el margen.`);

    const low=NB.saaInsample.find(row=>row.N===lowN) || NB.saaInsample[0];
    const high=NB.saaInsample.find(row=>row.N===highN) || NB.saaInsample.at(-1);
    setHTML('insample-summary',`El costo <em class="it">dentro de la muestra</em> con N=${low.N} es ${moneyK(low.cost)}. Al aumentar N, el costo in-sample <strong>no tiene por qué ser monótono</strong>; con N=${high.N} llega a <strong>${moneyK(high.cost)}</strong>. La calidad debe comprobarse fuera de la muestra.`);
    setHTML('insample-low-card',`<span class="stat"><span class="k">N=${low.N} · ${low.onHours} u·h ON</span><span class="v" style="color:var(--g3);">${moneyK(low.cost)}</span></span>`);
    setHTML('insample-high-card',`<span class="stat"><span class="k">N=${high.N} · ${high.onHours} u·h ON</span><span class="v" style="color:var(--g1);">${moneyK(high.cost)}</span></span>`);
    const lowOOS=NB.oracle.rows.find(row=>row.name===`SAA N=${lowN}`);
    const worst=NB.oracle.rows.at(-1);
    setHTML('insample-warning',`Un costo in-sample bajo <strong>no</strong> significa una buena decisión: hay que evaluarla <em class="it">fuera de la muestra</em>. ${lowOOS ? `SAA N=${lowN} obtiene allí un gap de ${fmt1(lowOOS.gap)}%${worst===lowOOS?' y es el peor resultado evaluado.':'.'}` : ''}`);

    document.querySelectorAll('[data-n-eval]').forEach(node=>{ node.textContent=meta('N_eval') ?? ''; });
    setText('oracle-ws',money(NB.oracle.WS));
    const best=NB.oracle.rows[0];
    const bestReserve=NB.oracle.rows.find(row=>row.grp==='res');
    if(best){
      setHTML('oracle-message',`El mejor compromiso evaluado es <strong>${esc(best.name)}</strong>: costo ${moneyK(best.cost)}, gap ${fmt1(best.gap)}% y ENS esperada ${fmt1(best.ens)} MWh. ${bestReserve ? `La mejor regla de reserva es <strong>${esc(bestReserve.name)}</strong> (gap ${fmt1(bestReserve.gap)}%).` : ''}`);
    }
  }

  function ranges(values){
    const spans=[]; let start=null;
    values.forEach((on,index)=>{
      if(on && start===null) start=index;
      if(start!==null && (!on || index===values.length-1)){
        const end=on && index===values.length-1?index:index-1;
        const a=NB.T?.[start]??start, b=NB.T?.[end]??end;
        spans.push(a===b?`h${a}`:`h${a}–${b}`); start=null;
      }
    });
    return spans.length?spans.join(', '):'apagada';
  }

  function commitmentSummary(key){
    return NB.gens.slice(1).map(g=>`${g.id}: ${ranges(NB.commit[key][g.id])}`).join('; ');
  }

  function totalOn(commitment){
    return sum(Object.values(commitment).map(values=>sum(values)));
  }

  /* ---------- toggles ---------- */
  function detDispToggle(){
    const grp=document.getElementById('det-disp-toggle'); if(!grp) return;
    const note=document.getElementById('det-note');
    const lowR=meta('reserveLowPct') ?? NB.reserves[0]?.alpha;
    const highR=meta('reserveHighPct') ?? NB.reserves.at(-1)?.alpha;
    const notes={
      r0:`R=${lowR}% · base determinista: la solar desplaza generación al mediodía. Compromiso adicional — ${commitmentSummary('r0')}. El balance se satisface sin holgura extra.`,
      r20:`R=${highR}% · caso más conservador: se comprometen más unidades para sostener el margen. Compromiso adicional — ${commitmentSummary('r20')}.`
    };
    function apply(button){
      grp.querySelectorAll('button').forEach(other=>other.setAttribute('aria-pressed',other===button));
      const id=button.dataset.det;
      dispChart('det-disp-chart',NB.det[id],true);
      if(note) note.textContent=notes[id];
      setHTML('det-ens-value',`${fmt1(sum(NB.det[id].ens))} <span class="small muted" style="font-size:22px;">MWh</span>`);
    }
    grp.querySelectorAll('button').forEach(button=>{ button.onclick=()=>apply(button); });
    apply(grp.querySelector('button[aria-pressed="true"]') || grp.querySelector('button'));
  }

  function commitModeToggle(){
    const grp=document.getElementById('commit-mode-toggle'); if(!grp) return;
    const la=document.getElementById('commit-a-lab'), lb=document.getElementById('commit-b-lab');
    const read=document.getElementById('commit-read');
    const lowR=meta('reserveLowPct') ?? NB.reserves[0]?.alpha;
    const highR=meta('reserveHighPct') ?? NB.reserves.at(-1)?.alpha;
    const lowN=meta('sampleLowN') ?? NB.saaInsample[0]?.N;
    const highN=meta('sampleHighN') ?? NB.saaInsample.at(-1)?.N;
    const modes={
      reservas:{a:{u:NB.commit.r0,c:C.res,lab:`R=${lowR}% · menor margen`},b:{u:NB.commit.r20,c:C.res,lab:`R=${highR}% · más conservador`},
        text:`El compromiso total pasa de ${totalOn(NB.commit.r0)} a ${totalOn(NB.commit.r20)} unidades-hora al aumentar la reserva de ${lowR}% a ${highR}%.`},
      saa:{a:{u:NB.commit.saa2,c:'#264653',lab:`SAA N=${lowN} · muestra pequeña`},b:{u:NB.commit.saa100,c:'#264653',lab:`SAA N=${highN} · muestra grande`},
        text:`El compromiso total pasa de ${totalOn(NB.commit.saa2)} a ${totalOn(NB.commit.saa100)} unidades-hora entre N=${lowN} y N=${highN}; ambas decisiones siguen siendo únicas para todos sus escenarios.`}
    };
    function apply(mode){
      const m=modes[mode];
      commitHM('commit-a',m.a.u,m.a.c); commitHM('commit-b',m.b.u,m.b.c);
      if(la) la.textContent=m.a.lab; if(lb) lb.textContent=m.b.lab;
      if(read) read.textContent=m.text;
    }
    grp.querySelectorAll('button').forEach(button=>{ button.onclick=()=>{
      grp.querySelectorAll('button').forEach(other=>other.setAttribute('aria-pressed',other===button));
      apply(button.dataset.mode);
    }; });
    const selected=grp.querySelector('button[aria-pressed="true"]') || grp.querySelector('button');
    apply(selected?.dataset.mode || 'saa');
  }

  function init(){
    syncClaims();
    highlight(); tree();
    reservesChart();
    detDispToggle();
    commitModeToggle();
    insampleChart();
    saaScatter();
    oracleChart();
  }
  window.A2ICCharts = { init };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
