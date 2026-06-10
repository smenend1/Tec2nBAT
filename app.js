
const state={view:'inici',filter:{q:'',unitat:'',tema:'',tipus:'',nivell:''},current:null,progress:JSON.parse(localStorage.getItem('ti2-progress')||'{}'),teacher:JSON.parse(localStorage.getItem('ti2-teacher')||'{}')};
const views=['Inici','Temes','Exercicis','Calculadores','Pràctica','Docent','Progrés','Auditoria','Ajuda'];
function $(s){return document.querySelector(s)}; function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function nav(){ $('#nav').innerHTML=views.map(v=>`<button class="tab ${state.view==v.toLowerCase()?'active':''}" onclick="go('${v.toLowerCase()}')">${v}</button>`).join('') }
function go(v){state.view=v; state.current=null; render(); window.scrollTo(0,0)}
function uniq(a){return [...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca'))}

function cleanExtractedText(txt){
  let s=String(txt||'');
  s=s.replace(/Bach_Sol[^\s]*/g,' ');
  s=s.replace(/\/MT\d+/g,' ');
  s=s.replace(/[\u0000-\u001f\u007f]/g,' ');
  s=s.replace(/￾/g,'');
  s=s.replace(/([a-zà-ÿ])-\s+([a-zà-ÿ])/gi,'$1$2');
  s=s.replace(/\s+/g,' ').trim();
  s=s.replace(/([.!?])\s+/g,'$1\n');
  s=s.replace(/(\b[abcde]\))/g,'\n$1');
  s=s.replace(/(\b\d+\.)\s+(?=[A-ZÀ-Ú])/g,'\n$1 ');
  s=s.replace(/\s*([=+−*/·])\s*/g,' $1 ');
  s=s.replace(/\s{2,}/g,' ');
  return s.trim();
}
function paragraphsFromClean(s){
  const txt=cleanExtractedText(s);
  if(!txt) return '<p>No hi ha solució textual depurada disponible. Consulta la pàgina original i fes servir el procediment guiat.</p>';
  return txt.split(/\n+/).filter(Boolean).slice(0,14).map(x=>`<p>${esc(x)}</p>`).join('');
}
function filtered(){let f=state.filter; return EXERCISES.filter(e=>(!f.q||JSON.stringify(e).toLowerCase().includes(f.q.toLowerCase()))&&(!f.unitat||e.unitat==f.unitat)&&(!f.tema||e.tema==f.tema)&&(!f.tipus||e.tipus==f.tipus)&&(!f.nivell||e.nivell==f.nivell))}
function filters(){let us=uniq(EXERCISES.map(e=>e.unitat)), ts=uniq(EXERCISES.map(e=>e.tema)), ty=uniq(EXERCISES.map(e=>e.tipus)), ns=uniq(EXERCISES.map(e=>e.nivell)); return `<div class="card noprint"><h2>Filtres</h2><div class="grid"><label>Cerca<input value="${esc(state.filter.q)}" placeholder="motor, gas, lògica, metrologia..." oninput="state.filter.q=this.value;render()"></label><label>Unitat<select onchange="state.filter.unitat=this.value;render()"><option value="">Totes</option>${us.map(x=>`<option ${state.filter.unitat==x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Tema<select onchange="state.filter.tema=this.value;render()"><option value="">Tots</option>${ts.map(x=>`<option ${state.filter.tema==x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Tipus<select onchange="state.filter.tipus=this.value;render()"><option value="">Tots</option>${ty.map(x=>`<option ${state.filter.tipus==x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Nivell<select onchange="state.filter.nivell=this.value;render()"><option value="">Tots</option>${ns.map(x=>`<option ${state.filter.nivell==x?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div></div>`}
function card(e){let st=state.teacher[e.id]?.status||'pendent'; return `<article class="card"><span class="pill">${esc(e.unitat)}</span><span class="pill">${esc(e.tema)}</span><h3>${esc(e.titol)}</h3><p class="muted">${esc(e.enunciat).slice(0,260)}${e.enunciat.length>260?'...':''}</p><p><b>Pàgina:</b> ${e.page} · <b>Tipus:</b> ${esc(e.tipus)} · <b>Nivell:</b> ${esc(e.nivell)} · <b>Estat:</b> ${esc(st)}</p><button class="btn primary" onclick="openEx('${e.id}')">Obrir exercici</button><button class="btn" onclick="printEx('${e.id}')">Fitxa imprimible</button></article>`}
function openEx(id){state.current=EXERCISES.find(e=>e.id==id); state.view='exercicis'; render(); window.scrollTo(0,0)}

function fixTypography(s){
  return String(s||'')
    .replace(/fi\s+nal/g,'final').replace(/fi\s+ns/g,'fins').replace(/fi\s+x/g,'fix')
    .replace(/gràfi\s+ca/g,'gràfica').replace(/consumi-\s*da/g,'consumida')
    .replace(/Densi-\s*tat/g,'Densitat').replace(/mo-\s*triu/g,'motriu')
    .replace(/con-\s*dicions/g,'condicions').replace(/ne-\s*cessària/g,'necessària')
    .replace(/\s+/g,' ').trim();
}
function latexish(s){
  return String(s||'')
    .replace(/\s*·\s*/g,' · ')
    .replace(/\s*=\s*/g,' = ')
    .replace(/\s*≤\s*/g,' ≤ ')
    .replace(/\s*≥\s*/g,' ≥ ')
    .replace(/\s{2,}/g,' ');
}
function extractResults(txt){
  let s=cleanExtractedText(txt);
  const found=[];
  const patterns=[
    /La resposta correcta és la\s+([a-d]\))/gi,
    /d[’']on\s+([^\.\n]{1,90})/gi,
    /Finalment[:,]?\s*([^\.\n]{1,100})/gi,
    /Resposta:\s*([^\.\n]{1,80})/gi,
    /([A-Za-zÀ-ÿΓηω][A-Za-zÀ-ÿ0-9Γηω_]*\s*=\s*[-+]?[0-9]+[,.]?[0-9]*\s*(?:m\/s|rad\/s|N·m|N|J|kJ|MJ|W|kW|kWh|bar|Pa|m|mm|kg|%|unitats|s|h))/g
  ];
  patterns.forEach(re=>{let m; while((m=re.exec(s)) && found.length<10){let v=fixTypography(m[1]||m[0]); if(v && !found.includes(v)) found.push(v)}});
  return found;
}
function detectParts(txt){
  let s=fixTypography(cleanExtractedText(txt));
  s=s.replace(/\b([a-e])\)\s*/g,'§$1) ');
  let chunks=s.split('§').filter(Boolean);
  if(chunks.length>1) return chunks.slice(0,8).map(c=>latexish(c));
  return [];
}
function themeGuide(e){
  const t=(e.tema+' '+e.unitat+' '+e.bloc).toLowerCase();
  if(t.includes('màquine')||t.includes('mecan')||t.includes('principis')) return ['Converteix velocitats de min⁻¹ a rad/s quan hi aparegui un motor o eix.','Relaciona energia, treball, potència i parell segons el que demani l’apartat.','Si hi ha rendiment, diferencia energia o potència útil i consumida.','Acaba cada apartat amb unitat i frase interpretativa.'];
  if(t.includes('tèrmi')||t.includes('gas')||t.includes('combust')) return ['Identifica si és calor sensible, canvi d’estat, gas ideal o cicle tèrmic.','Converteix temperatures a kelvin quan s’apliqui una llei dels gasos.','Aplica rendiment si l’energia útil no coincideix amb l’energia consumida.','Indica si el resultat és calor, treball, pressió, volum o rendiment.'];
  if(t.includes('corrent')||t.includes('electro')||t.includes('elèct')) return ['Dibuixa o interpreta el circuit abans de calcular.','Treballa amb valors eficaços en corrent altern si no s’indica el contrari.','Calcula impedàncies, intensitats i potències amb unitats coherents.','Diferencia potència activa, reactiva i aparent.'];
  if(t.includes('digital')||t.includes('automàtic')) return ['Defineix variables d’entrada i sortida.','Omple la taula de veritat amb totes les combinacions possibles.','Obtén la funció lògica i simplifica si és possible.','Comprova que l’esquema de portes coincideix amb la funció.'];
  if(t.includes('pneum')||t.includes('hidràul')) return ['Passa pressions a pascals i diàmetres a metres.','Calcula àrees amb A = π·d²/4.','Aplica F = p·A o Q = A·v segons el que demani l’apartat.','Comprova si el resultat és força, cabal, velocitat o temps.'];
  if(t.includes('metrolog')||t.includes('fabric')||t.includes('organització')) return ['Identifica dades de tolerància, cost, producció o qualitat.','Ordena el càlcul per passos i evita barrejar percentatges amb valors absoluts.','Presenta resultat amb criteri tecnològic, no només numèric.','Indica què significa el resultat dins del procés industrial.'];
  return ['Llegeix l’enunciat complet i separa dades, incògnites i condicions.','Tria la fórmula o principi tecnològic que correspon a la unitat.','Substitueix amb unitats i calcula per apartats.','Interpreta el resultat i revisa si és coherent.'];
}
function readableStatement(e){
  let raw=fixTypography(e.enunciat||'');
  raw=raw.replace(/\/MT\d+/g,' ');
  raw=raw.replace(/\s+/g,' ').trim();
  raw=raw.replace(/\b([a-e])\)\s*/g,'\n$1) ');
  // Talla quan comencen fragments clarament de solucionari; manté l’enunciat i els apartats si hi són abans.
  const cutMarkers=[' La resposta correcta',' Primer calculem',' Llavors',' Finalment',' d’on ',' Ec =',' EP =',' W =',' P =',' Q ='];
  let cut=raw.length;
  for(const m of cutMarkers){let i=raw.indexOf(m); if(i>80 && i<cut) cut=i;}
  let text=raw.slice(0,cut).trim();
  if(text.length<80) text=raw.slice(0,420).trim();
  return text.split(/\n+/).filter(Boolean).map(x=>`<p>${esc(latexish(x))}</p>`).join('');
}
function structuredSolution(e){
  const results=extractResults(e.solucioBase);
  const parts=detectParts(e.solucioBase);
  const guide=themeGuide(e);
  const formulas=(e.formules||[]).filter(Boolean).slice(0,8);
  let html=`<div class="solution improved"><h3>Resolució guiada llegible</h3>`;
  html+=`<section class="step"><h4>1. Lectura de l’exercici</h4><p>Treballa aquesta fitxa de <b>${esc(e.unitat)}</b>, dins el tema <b>${esc(e.tema)}</b>. L’objectiu és resoldre-la per apartats i no copiar una cadena de càlculs.</p></section>`;
  html+=`<section class="step"><h4>2. Apartats detectats</h4>`;
  if(parts.length){html+=`<ul class="partlist">${parts.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`} else {html+=`<p>No s’han detectat apartats nets. Usa l’enunciat i la pàgina original per separar les preguntes.</p>`}
  html+=`</section>`;
  html+=`<section class="step"><h4>3. Fórmules o idees clau</h4>${formulas.map(f=>`<code class="formula">${esc(latexish(f))}</code>`).join('')||'<p>Tria la fórmula segons la magnitud demanada.</p>'}</section>`;
  html+=`<section class="step"><h4>4. Procediment recomanat</h4><ol>${guide.map(g=>`<li>${esc(g)}</li>`).join('')}</ol></section>`;
  html+=`<section class="step"><h4>5. Resultats o respostes detectades</h4>`;
  if(results.length){html+=`<ul class="results">${results.map(r=>`<li>${esc(latexish(r))}</li>`).join('')}</ul>`} else {html+=`<p>No hi ha resultat automàtic fiable detectat. En aquesta fitxa cal revisar la pàgina original o resoldre amb el procediment indicat.</p>`}
  html+=`</section>`;
  html+=`<section class="step"><h4>6. Text extret del solucionari</h4><p class="notice"><b>Important:</b> el text OCR del PDF no es mostra com a solució principal perquè pot ajuntar números, fórmules i apartats. Queda només com a consulta docent.</p><details class="noprint"><summary>Veure extracte netejat</summary><div class="rawbox">${esc(cleanExtractedText(e.solucioBase))}</div></details></section>`;
  html+=`<section class="step"><h4>7. Errors habituals</h4><ul><li>No separar apartats abans de calcular.</li><li>Copiar fórmules sense unitats.</li><li>Confondre potència, energia, treball, parell o rendiment.</li><li>No revisar la figura original quan hi ha gràfics o esquemes.</li></ul></section></div>`;
  return html;
}

function solution(e){return structuredSolution(e)}
function exerciseView(){if(state.current){let e=state.current;return `<div class="card"><button class="btn noprint" onclick="state.current=null;render()">← Tornar al banc</button><h2>${esc(e.titol)}</h2><p><span class="pill">${esc(e.bloc)}</span><span class="pill">${esc(e.unitat)}</span><span class="pill">${esc(e.tema)}</span><span class="pill">${esc(e.tipus)}</span></p><h3>Enunciat de treball</h3><div class="statement">${readableStatement(e)}</div><div class="row noprint"><button class="btn primary" onclick="markDone('${e.id}')">Marcar com fet</button><button class="btn" onclick="window.print()">Imprimir fitxa</button><button class="btn" onclick="showPage(${e.page})">Veure pàgina original</button></div><details open><summary><b>Solució pas a pas</b></summary>${solution(e)}</details><details><summary><b>Pàgina original del solucionari</b></summary><p class="muted">S’utilitza per revisar figures, gràfics o esquemes que no quedin ben reflectits al text extret.</p><img class="pageimg" src="assets/pages/page-${String(e.page).padStart(3,'0')}.jpg"></details></div>`} let list=filtered(); return filters()+`<h2>${list.length} fitxes trobades</h2><div class="grid">${list.slice(0,300).map(card).join('')}</div><p class="muted">Si el filtre retorna moltes fitxes, usa unitat o paraula clau. El banc prové del solucionari de 2n i pot contenir activitats, qüestions finals, exercicis i avaluacions.</p>`}
function showPage(p){let w=window.open('assets/pages/page-'+String(p).padStart(3,'0')+'.jpg','_blank');}
function markDone(id){state.progress[id]={done:true,date:new Date().toISOString()}; localStorage.setItem('ti2-progress',JSON.stringify(state.progress)); alert('Exercici marcat com fet.');}
function printEx(id){openEx(id); setTimeout(()=>window.print(),250)}
function inicio(){let units=uniq(EXERCISES.map(e=>e.unitat));let temes=uniq(EXERCISES.map(e=>e.tema));return `<section class="card"><h2>PWA de Tecnologia Industrial 2n BATX</h2><p>Aquesta variant està centrada en el <b>solucionari de 2n de Batxillerat</b>. Permet cercar exercicis per unitat, tema i nivell, veure la pàgina original, treballar la resolució per passos i preparar dossiers o activitats de classe.</p><div class="row"><button class="btn primary" onclick="go('exercicis')">Obrir banc d’exercicis</button><button class="btn" onclick="go('calculadores')">Calculadores</button><button class="btn" onclick="go('docent')">Mode docent</button></div></section><section class="grid"><div class="card"><h3>${EXERCISES.length}</h3><p>fitxes detectades del PDF.</p></div><div class="card"><h3>${units.length}</h3><p>unitats didàctiques.</p></div><div class="card"><h3>${temes.length}</h3><p>temes transversals.</p></div></section><section class="card"><h2>Blocs inclosos</h2><p>${uniq(EXERCISES.map(e=>e.bloc)).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</p></section>`}
function temes(){let m={}; EXERCISES.forEach(e=>{m[e.tema]=(m[e.tema]||0)+1});return `<h2>Temes de 2n BATX</h2><div class="grid">${Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="card"><h3>${esc(k)}</h3><p>${v} fitxes</p><button class="btn" onclick="state.filter.tema='${esc(k)}';go('exercicis')">Veure exercicis</button></div>`).join('')}</div>`}

const CALC_GROUPS = {
  'Sistemes mecànics': {
    'Parell i potència': [['P','Potència (W)',3000],['n','Velocitat (min⁻¹)',1450]],
    'Treball en elevació': [['m','Massa (kg)',3000],['h','Alçada (m)',25],['eta','Rendiment (0-1)',0.6]],
    'Energia cinètica': [['m','Massa (kg)',15000],['v','Velocitat (m/s)',25]],
    'Frenada': [['m','Massa (kg)',15000],['v','Velocitat inicial (m/s)',25],['x','Espai de frenada (m)',150],['Ff','Fricció resistent (N)',1500]],
    'Volant d’inèrcia': [['m','Massa del disc (kg)',250],['d','Diàmetre (m)',0.5],['n','Velocitat (min⁻¹)',250]],
    'Relació de transmissió engranatges': [['z1','Dents motriu 1',14],['z2','Dents conduïda 1',48],['z3','Dents motriu 2',16],['z4','Dents conduïda 2',25]],
    'Corretges i politges': [['d1','Diàmetre politja motriu (mm)',63],['d2','Diàmetre politja conduïda (mm)',500],['n1','Velocitat motriu (min⁻¹)',100]],
    'Velocitat lineal': [['n','Velocitat angular (min⁻¹)',400],['d','Diàmetre (mm)',250]]
  },
  'Màquines tèrmiques': {
    'Calor sensible': [['m','Massa (kg)',10],['ce','Calor específica (J/kg·K)',4180],['dt','Increment T (K)',40]],
    'Canvi d’estat': [['m','Massa (kg)',100],['L','Calor latent (kJ/kg)',2257]],
    'Combustible i poder calorífic': [['E','Energia útil requerida (kJ)',263320],['pc','Poder calorífic (kJ/kg o kJ/m³)',45980],['eta','Rendiment (0-1)',0.8]],
    'Rendiment tèrmic': [['Eu','Energia útil (kJ)',627],['Ec','Energia consumida (kJ)',1672]],
    'Carnot': [['Tc','Temperatura focus fred (°C)',120],['Th','Temperatura focus calent (°C)',3000]],
    'Gas ideal: pressió': [['n','Mols',1],['T','Temperatura (K)',293],['V','Volum (m³)',0.02]],
    'Llei de Boyle': [['p1','Pressió inicial (bar)',1],['V1','Volum inicial (L)',25],['V2','Volum final (L)',5]],
    'Treball isobàric': [['p','Pressió (bar)',6],['V1','Volum inicial (dm³)',1],['V2','Volum final (dm³)',4]],
    'Treball isotèrmic': [['p1','Pressió inicial (bar)',1],['V1','Volum inicial (L)',10],['V2','Volum final (L)',1]],
    'Transformació adiabàtica': [['p1','Pressió inicial (Pa)',1000000],['V1','Volum inicial (m³)',0.0023],['p2','Pressió final (Pa)',300000],['gamma','γ',1.5]]
  },
  'Oleohidràulica i pneumàtica': {
    'Pressió, força i superfície': [['p','Pressió (bar)',80],['A','Superfície (cm²)',20]],
    'Cilindre: força amb diàmetre': [['p','Pressió (bar)',80],['d','Diàmetre (mm)',50]],
    'Cabal i velocitat del pistó': [['Q','Cabal (L/min)',30],['d','Diàmetre pistó (mm)',50]],
    'Temps de cursa': [['Q','Cabal (L/min)',30],['d','Diàmetre pistó (mm)',50],['L','Cursa (mm)',200]],
    'Potència hidràulica': [['p','Pressió (bar)',80],['Q','Cabal (L/min)',30],['eta','Rendiment (0-1)',0.85]],
    'Multiplicació de força': [['F1','Força al pistó petit (N)',100],['d1','Diàmetre petit (mm)',20],['d2','Diàmetre gran (mm)',80]],
    'Consum d’aire aproximat': [['d','Diàmetre cilindre (mm)',40],['L','Cursa (mm)',200],['n','Cicles/min',10],['p','Pressió relativa (bar)',6]]
  },
  'Corrent altern i electromagnetisme': {
    'Valor eficaç i màxim': [['Uef','Valor eficaç',230]],
    'Freqüència i període': [['f','Freqüència (Hz)',50]],
    'Reactància inductiva': [['f','Freqüència (Hz)',50],['L','Inductància (H)',0.2]],
    'Reactància capacitiva': [['f','Freqüència (Hz)',50],['C','Capacitat (µF)',100]],
    'Impedància RL sèrie': [['R','Resistència (Ω)',100],['f','Freqüència (Hz)',50],['L','Inductància (H)',0.2]],
    'Impedància RC sèrie': [['R','Resistència (Ω)',100],['f','Freqüència (Hz)',50],['C','Capacitat (µF)',100]],
    'Impedància RLC sèrie': [['R','Resistència (Ω)',100],['f','Freqüència (Hz)',50],['L','Inductància (H)',0.2],['C','Capacitat (µF)',100]],
    'Potències en CA monofàsica': [['U','Tensió (V)',230],['I','Intensitat (A)',10],['cos','cos φ',0.8]],
    'Trifàsica equilibrada': [['U','Tensió composta (V)',400],['I','Intensitat línia (A)',10],['cos','cos φ',0.8]],
    'Correcció factor de potència': [['P','Potència activa (W)',10000],['cos1','cos φ inicial',0.7],['cos2','cos φ final',0.95]]
  },
  'Màquines elèctriques': {
    'Transformador ideal': [['U1','Tensió primari (V)',230],['N1','Espires primari',500],['N2','Espires secundari',100]],
    'Intensitat transformador': [['S','Potència aparent (VA)',1000],['U','Tensió (V)',230]],
    'Motor CC: força contraelectromotriu': [['U','Tensió (V)',180],['I','Intensitat (A)',2.3],['Ri','Resistència induït (Ω)',5]],
    'Motor CC: parell útil': [['P','Potència útil (W)',350],['n','Velocitat (min⁻¹)',550]],
    'Motor trifàsic: potència absorbida': [['U','Tensió composta (V)',400],['I','Intensitat (A)',90],['cos','cos φ',0.85]],
    'Rendiment motor': [['Pu','Potència útil (W)',50000],['Pa','Potència absorbida (W)',61176]],
    'Velocitat síncrona': [['f','Freqüència (Hz)',50],['p','Parells de pols',2]],
    'Lliscament': [['ns','Velocitat síncrona (min⁻¹)',3000],['n','Velocitat real (min⁻¹)',2860]]
  },
  'Sistemes digitals i automàtics': {
    'Conversió binari a decimal': [['b','Nombre binari',101101]],
    'Conversió decimal a binari': [['d','Nombre decimal',45]],
    'Porta AND': [['a','Entrada A (0/1)',1],['b','Entrada B (0/1)',0]],
    'Porta OR': [['a','Entrada A (0/1)',1],['b','Entrada B (0/1)',0]],
    'Porta XOR': [['a','Entrada A (0/1)',1],['b','Entrada B (0/1)',0]],
    'Funció booleana simple': [['a','A (0/1)',1],['b','B (0/1)',0],['c','C (0/1)',1]],
    'Sistema de control ON/OFF': [['consigna','Consigna',50],['mesura','Mesura',42],['h','Histeresi',2]]
  },
  'Metrologia i fabricació': {
    'Tolerància dimensional': [['nom','Cota nominal (mm)',50],['max','Cota màxima (mm)',50.02],['min','Cota mínima (mm)',49.97]],
    'Error absolut i relatiu': [['mes','Valor mesurat',9.8],['real','Valor real',10]],
    'Resolució instrument': [['div','Divisions llegides',37],['res','Resolució per divisió',0.02]],
    'Velocitat de tall': [['d','Diàmetre peça/eina (mm)',50],['n','Velocitat gir (min⁻¹)',600]],
    'Temps de mecanitzat': [['L','Longitud mecanitzada (mm)',200],['f','Avanç (mm/volta)',0.2],['n','Velocitat gir (min⁻¹)',600]],
    'Productivitat': [['n','Unitats produïdes',120],['t','Temps (h)',3]],
    'Cost bàsic de producció': [['mat','Cost material (€)',25],['temps','Temps màquina (h)',1.5],['costh','Cost horari (€/h)',40],['altres','Altres costos (€)',10]]
  }
};

function calc(){
  const groups=Object.keys(CALC_GROUPS);
  return `<div class="card"><h2>Calculadores completes de 2n BATX</h2><p>Tria un bloc i després un càlcul concret. Cada tema té diverses eines, no només un càlcul simple.</p><div class="grid"><label>Bloc<select id="calcGroup" onchange="updateCalcOptions()">${groups.map(g=>`<option>${esc(g)}</option>`).join('')}</select></label><label>Càlcul<select id="calcType" onchange="setCalcFields()"></select></label></div><div id="calcFields" class="grid"></div><button class="btn primary" onclick="runCalc()">Calcular amb explicació</button><button class="btn" onclick="window.print()">Imprimir càlcul</button><div id="calcOut" class="result"></div></div>`
}
function updateCalcOptions(){
  const g=$('#calcGroup')?.value || Object.keys(CALC_GROUPS)[0];
  const sel=$('#calcType'); if(!sel)return;
  sel.innerHTML=Object.keys(CALC_GROUPS[g]).map(k=>`<option>${esc(k)}</option>`).join('');
  setCalcFields();
}
function setCalcFields(){
  const g=$('#calcGroup')?.value || Object.keys(CALC_GROUPS)[0];
  const t=$('#calcType')?.value || Object.keys(CALC_GROUPS[g])[0];
  const fields=CALC_GROUPS[g][t] || [];
  $('#calcFields').innerHTML=fields.map(([id,lab,val])=>`<label>${esc(lab)}<input id="c_${id}" ${id==='b'?'':'type="number" step="any"'} value="${esc(val)}"></label>`).join('');
  $('#calcOut').innerHTML='';
}
function val(id){return parseFloat($('#c_'+id)?.value)||0}
function sval(id){return String($('#c_'+id)?.value||'')}
function fmt(x,u=''){return `${Number.isFinite(x)?Number(x).toLocaleString('ca-ES',{maximumFractionDigits:4}):'—'}${u?' '+u:''}`}
function block(title,formula,steps,interp){return `<h3>${esc(title)}</h3><code class="formula">${esc(formula)}</code><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol><p><b>Interpretació:</b> ${esc(interp)}</p>`}
function runCalc(){
  const t=$('#calcType').value; let out='';
  switch(t){
    case 'Parell i potència': {let P=val('P'), n=val('n'), w=2*Math.PI*n/60, M=P/w; out=block(t,'Γ = P / ω ; ω = 2πn/60',[`ω = 2π · ${fmt(n)} / 60 = ${fmt(w,'rad/s')}`,`Γ = ${fmt(P,'W')} / ${fmt(w,'rad/s')} = ${fmt(M,'N·m')}`],'El parell indica la capacitat de gir que proporciona l’eix.'); break}
    case 'Treball en elevació': {let m=val('m'),h=val('h'),eta=val('eta'),Wu=m*9.81*h,Ec=Wu/eta,Wp=Ec-Wu; out=block(t,'Wu = m·g·h ; Ec = Wu/η',[`Wu = ${fmt(m,'kg')} · 9,81 · ${fmt(h,'m')} = ${fmt(Wu,'J')}`,`Ec = ${fmt(Wu,'J')} / ${eta} = ${fmt(Ec,'J')}`,`Pèrdues = ${fmt(Wp,'J')}`],'El rendiment fa que l’energia consumida sigui superior a l’energia útil.'); break}
    case 'Energia cinètica': {let E=0.5*val('m')*val('v')**2; out=block(t,'Ec = 1/2·m·v²',[`Ec = 1/2 · ${fmt(val('m'),'kg')} · ${fmt(val('v'),'m/s')}² = ${fmt(E,'J')}`],'L’energia cinètica creix amb el quadrat de la velocitat.'); break}
    case 'Frenada': {let m=val('m'),v=val('v'),x=val('x'),Ff=val('Ff'),F=-(0.5*m*v*v)/x+Ff; out=block(t,'(F - Ff)·x = ΔEc',[`ΔEc = 0 - 1/2·${fmt(m)}·${fmt(v)}² = ${fmt(-0.5*m*v*v,'J')}`,`F = ΔEc/x + Ff = ${fmt(F,'N')}`],'El signe negatiu indica força contrària al moviment.'); break}
    case 'Volant d’inèrcia': {let m=val('m'),R=val('d')/2,n=val('n'),I=0.5*m*R*R,w=2*Math.PI*n/60,E=0.5*I*w*w; out=block(t,'I = 1/2·m·R² ; Ec = 1/2·I·ω²',[`I = 1/2 · ${fmt(m)} · ${fmt(R)}² = ${fmt(I,'kg·m²')}`,`ω = ${fmt(w,'rad/s')}`,`Ec = ${fmt(E,'J')}`],'Un volant acumula energia rotacional.'); break}
    case 'Relació de transmissió engranatges': {let i=(val('z1')/val('z2'))*(val('z3')/val('z4')); out=block(t,'ωsortida/ωentrada = (z1/z2)·(z3/z4)',[`i = (${val('z1')}/${val('z2')}) · (${val('z3')}/${val('z4')}) = ${fmt(i)}`],'Si i < 1 és una reducció de velocitat.'); break}
    case 'Corretges i politges': {let n2=val('n1')*val('d1')/val('d2'); out=block(t,'n1·d1 = n2·d2',[`n2 = ${fmt(val('n1'))} · ${fmt(val('d1'))}/${fmt(val('d2'))} = ${fmt(n2,'min⁻¹')}`],'Una politja gran gira més lenta que una de petita si no hi ha lliscament.'); break}
    case 'Velocitat lineal': {let w=2*Math.PI*val('n')/60, v=w*(val('d')/1000)/2; out=block(t,'v = ω·r',[`ω = ${fmt(w,'rad/s')}`,`r = d/2 = ${fmt(val('d')/2000,'m')}`,`v = ${fmt(v,'m/s')}`],'Relaciona gir amb moviment lineal del perímetre.'); break}
    case 'Calor sensible': {let Q=val('m')*val('ce')*val('dt'); out=block(t,'Q = m·ce·ΔT',[`Q = ${fmt(val('m'),'kg')} · ${fmt(val('ce'),'J/kg·K')} · ${fmt(val('dt'),'K')} = ${fmt(Q,'J')} = ${fmt(Q/1000,'kJ')}`],'És l’energia necessària per canviar la temperatura sense canvi d’estat.'); break}
    case 'Canvi d’estat': {let Q=val('m')*val('L'); out=block(t,'Q = m·L',[`Q = ${fmt(val('m'),'kg')} · ${fmt(val('L'),'kJ/kg')} = ${fmt(Q,'kJ')}`],'El canvi d’estat consumeix o allibera energia sense variar la temperatura.'); break}
    case 'Combustible i poder calorífic': {let Ec=val('E')/val('eta'), m=Ec/val('pc'); out=block(t,'Ec = Eu/η ; m = Ec/pc',[`Ec = ${fmt(val('E'),'kJ')} / ${val('eta')} = ${fmt(Ec,'kJ')}`,`m o V = ${fmt(Ec,'kJ')} / ${fmt(val('pc'),'kJ/unitat')} = ${fmt(m,'unitats')}`],'El rendiment obliga a consumir més energia química que la útil.'); break}
    case 'Rendiment tèrmic': {let eta=val('Eu')/val('Ec'); out=block(t,'η = Eu/Ec',[`η = ${fmt(val('Eu'))}/${fmt(val('Ec'))} = ${fmt(eta)} = ${fmt(eta*100,'%')}`],'El rendiment sempre ha de ser inferior a 1 en una màquina real.'); break}
    case 'Carnot': {let eta=1-(val('Tc')+273)/(val('Th')+273); out=block(t,'ηc = 1 - Tc/Th',[`Tc = ${fmt(val('Tc')+273,'K')}`,`Th = ${fmt(val('Th')+273,'K')}`,`ηc = ${fmt(eta)} = ${fmt(eta*100,'%')}`],'És el límit teòric màxim de rendiment.'); break}
    case 'Gas ideal: pressió': {let p=val('n')*8.314*val('T')/val('V'); out=block(t,'p = nRT/V',[`p = ${fmt(val('n'))}·8,314·${fmt(val('T'))}/${fmt(val('V'))} = ${fmt(p,'Pa')} = ${fmt(p/1e5,'bar')}`],'Cal usar temperatura en kelvin i volum en m³.'); break}
    case 'Llei de Boyle': {let p2=val('p1')*val('V1')/val('V2'); out=block(t,'p1·V1 = p2·V2',[`p2 = ${fmt(val('p1'))}·${fmt(val('V1'))}/${fmt(val('V2'))} = ${fmt(p2,'bar')}`],'A temperatura constant, si el volum baixa, la pressió puja.'); break}
    case 'Treball isobàric': {let W=val('p')*1e5*(val('V2')-val('V1'))/1000; out=block(t,'W = p·(V2 - V1)',[`W = ${fmt(val('p')*1e5,'Pa')} · (${fmt(val('V2')/1000)} - ${fmt(val('V1')/1000)}) = ${fmt(W,'J')}`],'Treball positiu si el gas s’expandeix.'); break}
    case 'Treball isotèrmic': {let W=val('p1')*1e5*val('V1')/1000*Math.log(val('V2')/val('V1')); out=block(t,'W = p1·V1·ln(V2/V1)',[`W = ${fmt(W,'J')}`],'En compressió isotèrmica el treball del gas és negatiu.'); break}
    case 'Transformació adiabàtica': {let V2=(val('p1')*val('V1')**val('gamma')/val('p2'))**(1/val('gamma')); out=block(t,'p1·V1^γ = p2·V2^γ',[`V2 = ${fmt(V2,'m³')}`],'No hi ha intercanvi de calor amb l’exterior.'); break}
    case 'Pressió, força i superfície': {let F=val('p')*1e5*val('A')/10000; out=block(t,'F = p·A',[`F = ${fmt(val('p')*1e5,'Pa')} · ${fmt(val('A')/10000,'m²')} = ${fmt(F,'N')}`],'Més pressió o més superfície impliquen més força.'); break}
    case 'Cilindre: força amb diàmetre': {let A=Math.PI*(val('d')/1000)**2/4,F=val('p')*1e5*A; out=block(t,'A = πd²/4 ; F = p·A',[`A = ${fmt(A,'m²')}`,`F = ${fmt(F,'N')}`],'Converteix sempre el diàmetre a metres.'); break}
    case 'Cabal i velocitat del pistó': {let A=Math.PI*(val('d')/1000)**2/4,Q=val('Q')/1000/60,v=Q/A; out=block(t,'v = Q/A',[`Q = ${fmt(Q,'m³/s')}`,`A = ${fmt(A,'m²')}`,`v = ${fmt(v,'m/s')}`],'El pistó va més ràpid si augmenta el cabal o disminueix l’àrea.'); break}
    case 'Temps de cursa': {let A=Math.PI*(val('d')/1000)**2/4,Q=val('Q')/1000/60,v=Q/A,temps=(val('L')/1000)/v; out=block(t,'t = cursa / v',[`v = ${fmt(v,'m/s')}`,`t = ${fmt(temps,'s')}`],'El temps depèn de la velocitat del pistó i de la cursa.'); break}
    case 'Potència hidràulica': {let P=val('p')*1e5*(val('Q')/1000/60)/val('eta'); out=block(t,'P = p·Q/η',[`P = ${fmt(P,'W')}`],'És la potència que cal subministrar tenint en compte el rendiment.'); break}
    case 'Multiplicació de força': {let F2=val('F1')*(val('d2')/val('d1'))**2; out=block(t,'F2/F1 = A2/A1 = (d2/d1)²',[`F2 = ${fmt(F2,'N')}`],'La hidràulica permet multiplicar força amb una superfície major.'); break}
    case 'Consum d’aire aproximat': {let V=Math.PI*(val('d')/1000)**2/4*(val('L')/1000)*val('n')*(val('p')+1); out=block(t,'Consum ≈ volum cilindre · cicles · pressió absoluta',[`Consum = ${fmt(V*1000,'L/min aproximats')}`],'És una estimació ràpida amb aire lliure equivalent.'); break}
    case 'Valor eficaç i màxim': {let Um=val('Uef')*Math.sqrt(2); out=block(t,'Umax = Uef·√2',[`Umax = ${fmt(Um)}`],'En sinusoidal, el valor màxim és √2 vegades l’eficaç.'); break}
    case 'Freqüència i període': {let T=1/val('f'),w=2*Math.PI*val('f'); out=block(t,'T=1/f ; ω=2πf',[`T = ${fmt(T,'s')}`,`ω = ${fmt(w,'rad/s')}`],'La pulsació és la velocitat angular del senyal.'); break}
    case 'Reactància inductiva': {let XL=2*Math.PI*val('f')*val('L'); out=block(t,'XL = 2πfL',[`XL = ${fmt(XL,'Ω')}`],'La bobina s’oposa més al corrent quan augmenta la freqüència.'); break}
    case 'Reactància capacitiva': {let XC=1/(2*Math.PI*val('f')*val('C')*1e-6); out=block(t,'XC = 1/(2πfC)',[`XC = ${fmt(XC,'Ω')}`],'El condensador ofereix menys reactància quan augmenta la freqüència.'); break}
    case 'Impedància RL sèrie': {let XL=2*Math.PI*val('f')*val('L'),Z=Math.hypot(val('R'),XL),cos=val('R')/Z; out=block(t,'Z = √(R² + XL²)',[`XL = ${fmt(XL,'Ω')}`,`Z = ${fmt(Z,'Ω')}`,`cosφ = ${fmt(cos)}`],'La impedància combina resistència i reactància inductiva.'); break}
    case 'Impedància RC sèrie': {let XC=1/(2*Math.PI*val('f')*val('C')*1e-6),Z=Math.hypot(val('R'),XC),cos=val('R')/Z; out=block(t,'Z = √(R² + XC²)',[`XC = ${fmt(XC,'Ω')}`,`Z = ${fmt(Z,'Ω')}`,`cosφ = ${fmt(cos)}`],'En RC la reactància és capacitiva.'); break}
    case 'Impedància RLC sèrie': {let XL=2*Math.PI*val('f')*val('L'),XC=1/(2*Math.PI*val('f')*val('C')*1e-6),X=XL-XC,Z=Math.hypot(val('R'),X); out=block(t,'X = XL - XC ; Z = √(R² + X²)',[`XL = ${fmt(XL,'Ω')}`,`XC = ${fmt(XC,'Ω')}`,`X = ${fmt(X,'Ω')}`,`Z = ${fmt(Z,'Ω')}`],'Si XL i XC són semblants, el circuit s’acosta a la ressonància.'); break}
    case 'Potències en CA monofàsica': {let S=val('U')*val('I'),P=S*val('cos'),Q=S*Math.sqrt(Math.max(0,1-val('cos')**2)); out=block(t,'S=U·I ; P=S·cosφ ; Q=S·sinφ',[`S = ${fmt(S,'VA')}`,`P = ${fmt(P,'W')}`,`Q = ${fmt(Q,'var')}`],'Separa potència activa, reactiva i aparent.'); break}
    case 'Trifàsica equilibrada': {let S=Math.sqrt(3)*val('U')*val('I'),P=S*val('cos'),Q=S*Math.sqrt(Math.max(0,1-val('cos')**2)); out=block(t,'S=√3·U·I ; P=S·cosφ ; Q=S·sinφ',[`S = ${fmt(S,'VA')}`,`P = ${fmt(P,'W')}`,`Q = ${fmt(Q,'var')}`],'En trifàsica equilibrada s’utilitza la tensió composta.'); break}
    case 'Correcció factor de potència': {let Qc=val('P')*(Math.tan(Math.acos(val('cos1')))-Math.tan(Math.acos(val('cos2')))); out=block(t,'Qc = P·(tanφ1 - tanφ2)',[`Qc = ${fmt(Qc,'var')}`],'És la potència reactiva capacitiva a compensar.'); break}
    case 'Transformador ideal': {let U2=val('U1')*val('N2')/val('N1'); out=block(t,'U2/U1 = N2/N1',[`U2 = ${fmt(U2,'V')}`],'La tensió és proporcional al nombre d’espires.'); break}
    case 'Intensitat transformador': {let I=val('S')/val('U'); out=block(t,'I = S/U',[`I = ${fmt(I,'A')}`],'En transformador ideal, la potència aparent es conserva aproximadament.'); break}
    case 'Motor CC: força contraelectromotriu': {let E=val('U')-val('I')*val('Ri'); out=block(t,'E = U - I·Ri',[`E = ${fmt(E,'V')}`],'La força contraelectromotriu és la tensió interna associada al gir.'); break}
    case 'Motor CC: parell útil': {let w=2*Math.PI*val('n')/60,M=val('P')/w; out=block(t,'Γ = P/ω',[`ω = ${fmt(w,'rad/s')}`,`Γ = ${fmt(M,'N·m')}`],'El parell útil surt de la potència mecànica a l’eix.'); break}
    case 'Motor trifàsic: potència absorbida': {let P=Math.sqrt(3)*val('U')*val('I')*val('cos'); out=block(t,'Pabs = √3·U·I·cosφ',[`Pabs = ${fmt(P,'W')}`],'És la potència activa absorbida de la xarxa trifàsica.'); break}
    case 'Rendiment motor': {let eta=val('Pu')/val('Pa'); out=block(t,'η = Pu/Pa',[`η = ${fmt(eta)} = ${fmt(eta*100,'%')}`],'Compara potència útil i potència absorbida.'); break}
    case 'Velocitat síncrona': {let ns=60*val('f')/val('p'); out=block(t,'ns = 60f/p',[`ns = ${fmt(ns,'min⁻¹')}`],'p és el nombre de parells de pols.'); break}
    case 'Lliscament': {let s=(val('ns')-val('n'))/val('ns'); out=block(t,'s = (ns - n)/ns',[`s = ${fmt(s)} = ${fmt(s*100,'%')}`],'El motor d’inducció gira una mica per sota de la velocitat síncrona.'); break}
    case 'Conversió binari a decimal': {let b=sval('b').replace(/[^01]/g,''),d=parseInt(b||'0',2); out=block(t,'Decimal = suma de potències de 2',[`${b}₂ = ${d}₁₀`],'Cada posició binària val una potència de 2.'); break}
    case 'Conversió decimal a binari': {let d=Math.trunc(val('d')),b=d.toString(2); out=block(t,'Divisions successives per 2',[`${d}₁₀ = ${b}₂`],'El binari només utilitza 0 i 1.'); break}
    case 'Porta AND': {let r=(val('a')&&val('b'))?1:0; out=block(t,'S = A·B',[`S = ${r}`],'AND només dona 1 si totes les entrades són 1.'); break}
    case 'Porta OR': {let r=(val('a')||val('b'))?1:0; out=block(t,'S = A + B',[`S = ${r}`],'OR dona 1 si almenys una entrada és 1.'); break}
    case 'Porta XOR': {let r=(!!val('a') !== !!val('b'))?1:0; out=block(t,'S = A ⊕ B',[`S = ${r}`],'XOR dona 1 si les entrades són diferents.'); break}
    case 'Funció booleana simple': {let r=(val('a') && !val('b')) || val('c') ? 1:0; out=block(t,'S = A·¬B + C',[`S = ${r}`],'Exemple de funció combinacional simple.'); break}
    case 'Sistema de control ON/OFF': {let r=val('mesura')<val('consigna')-val('h')?'Activa':(val('mesura')>val('consigna')+val('h')?'Atura':'Manté estat'); out=block(t,'Control amb banda d’histeresi',[`Decisió: ${esc(r)}`],'La histèresi evita commutacions contínues.'); break}
    case 'Tolerància dimensional': {let Ts=val('max')-val('min'),es=val('max')-val('nom'),ei=val('min')-val('nom'); out=block(t,'T = Cmax - Cmin',[`T = ${fmt(Ts,'mm')}`,`Desviació superior = ${fmt(es,'mm')}`,`Desviació inferior = ${fmt(ei,'mm')}`],'La tolerància defineix l’interval admissible de fabricació.'); break}
    case 'Error absolut i relatiu': {let ea=val('mes')-val('real'),er=Math.abs(ea)/Math.abs(val('real')); out=block(t,'Ea = mesurat - real ; Er = |Ea|/real',[`Ea = ${fmt(ea)}`,`Er = ${fmt(er*100,'%')}`],'L’error relatiu permet comparar mesures de magnitud diferent.'); break}
    case 'Resolució instrument': {let lectura=val('div')*val('res'); out=block(t,'Lectura = divisions · resolució',[`Lectura = ${fmt(lectura)}`],'La resolució és el valor mínim apreciable.'); break}
    case 'Velocitat de tall': {let Vc=Math.PI*val('d')*val('n')/1000; out=block(t,'Vc = π·d·n/1000',[`Vc = ${fmt(Vc,'m/min')}`],'És la velocitat relativa entre eina i peça.'); break}
    case 'Temps de mecanitzat': {let t=val('L')/(val('f')*val('n')); out=block(t,'t = L/(f·n)',[`t = ${fmt(t,'min')}`],'El temps baixa si augmenten avanç o velocitat de gir.'); break}
    case 'Productivitat': {let pr=val('n')/val('t'); out=block(t,'Productivitat = unitats/temps',[`Productivitat = ${fmt(pr,'unitats/h')}`],'Mesura la capacitat de producció.'); break}
    case 'Cost bàsic de producció': {let c=val('mat')+val('temps')*val('costh')+val('altres'); out=block(t,'Cost = material + temps·cost horari + altres',[`Cost = ${fmt(c,'€')}`],'És una estimació bàsica de cost industrial.'); break}
  }
  $('#calcOut').innerHTML=out || '<p>No s’ha pogut calcular.</p>';
}
function practica(){let e=EXERCISES[Math.floor(Math.random()*EXERCISES.length)];return `<div class="card"><h2>Pràctica ràpida</h2><p>Exercici proposat aleatoriament:</p>${card(e)}<button class="btn primary" onclick="go('pràctica')">Generar-ne un altre</button></div>`}
function docent(){let n=filtered().length;return filters()+`<div class="card"><h2>Mode docent</h2><p>Prepara classe amb el banc de 2n. Filtra per unitat o tema i imprimeix un dossier d’alumne o un solucionari orientatiu.</p><div class="row"><button class="btn primary" onclick="printDossier(false)">Imprimir dossier d’alumne (${n})</button><button class="btn" onclick="printDossier(true)">Imprimir solucionari docent (${n})</button></div></div>`}
function printDossier(sol){let list=filtered().slice(0,30);let html=list.map(e=>`<div class="card"><h2>${esc(e.titol)}</h2><div class="statement">${readableStatement(e)}</div>${sol?solution(e):'<p><b>Espai de resposta:</b></p><br><br><br>'}</div>`).join(''); let old=$('#app').innerHTML; $('#app').innerHTML=html; window.print(); $('#app').innerHTML=old;}
function progres(){let done=Object.keys(state.progress).length;return `<div class="card"><h2>Progrés local</h2><p>Exercicis marcats com fets en aquest navegador: <b>${done}</b></p><button class="btn" onclick="localStorage.removeItem('ti2-progress');state.progress={};render()">Esborrar progrés</button><button class="btn" onclick="downloadJSON()">Exportar progrés</button></div>`}
function downloadJSON(){let blob=new Blob([JSON.stringify(state.progress,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='progres_ti2batx.json';a.click()}
function auditoria(){let statuses=['pendent','verificat','revisar resultat','depèn de figura','millorar enunciat']; let list=filtered().slice(0,80);return filters()+`<div class="card"><h2>Auditoria docent</h2><p>Marca l’estat de cada fitxa. Les marques es guarden només al navegador.</p></div><div class="grid">${list.map(e=>`<div class="card"><h3>${esc(e.titol)}</h3><p>${esc(e.enunciat).slice(0,180)}...</p><select onchange="state.teacher['${e.id}']={status:this.value};localStorage.setItem('ti2-teacher',JSON.stringify(state.teacher))">${statuses.map(s=>`<option ${state.teacher[e.id]?.status==s?'selected':''}>${s}</option>`).join('')}</select></div>`).join('')}</div>`}
function ajuda(){return `<div class="card"><h2>Ajuda ràpida</h2><h3>Com començar?</h3><ol><li>Ves a <b>Temes</b> i tria el bloc que vols treballar.</li><li>Obre una fitxa i demana a l’alumnat que identifiqui dades, fórmula i unitats.</li><li>Mostra la solució pas a pas només després de la primera resolució.</li><li>Usa <b>Docent</b> per imprimir dossiers filtrats.</li></ol><h3>Què volen dir N1-N4?</h3><p>N1 identifica dades, N2 calcula, N3 interpreta i N4 justifica o compara.</p><h3>Avís</h3><p>El banc és una transformació didàctica del solucionari aportat. Les fitxes complexes o amb figures s’han de revisar abans d’usar-les com a solucionari definitiu.</p></div>`}
function render(){nav(); let v=state.view; $('#app').innerHTML = v=='inici'?inicio():v=='temes'?temes():v=='exercicis'?exerciseView():v=='calculadores'?calc():v=='pràctica'?practica():v=='docent'?docent():v=='progrés'?progres():v=='auditoria'?auditoria():ajuda(); if(v=='calculadores'){updateCalcOptions();}}
render();
