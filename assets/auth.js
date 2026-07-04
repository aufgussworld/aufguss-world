/* Warstwa sesji (demo) aufguss.world — stan zalogowania, nagłówek „Moje konto",
   dzwoneczek z powiadomieniami oraz przełącznik podglądu ról (prototyp, bez backendu).
   Stan trzymany w localStorage 'aufguss_session'. Konta są WIELOROLOWE.
   Użycie: dodaj element [data-acct-slot] w nagłówku i dołącz <script src="assets/auth.js">. */
(function(){
  if(window.AufgussAuth) return;

  // ── persony demonstracyjne (jedno konto = wiele ról) ──
  const PERSONAS = {
    guest:       { loggedIn:false },
    user:        { name:'Ania Nowak',      init:'AN', roles:['user'], home:'Polska · Wrocław' },
    saunamistrz: { name:'Maciej Piczura',  init:'MP', roles:['user','saunamistrz','szkoleniowiec','bloger'], home:'Polska · Podhale', rank:'Pro Master', verified:true },
    sedzia:      { name:'Robert Zídek',    init:'RZ', roles:['user','saunamistrz','sedzia','bloger'], home:'Czechy · Praga', rank:'Pro Master', verified:true },
    obiekt:      { name:'Satama Sauna Resort', init:'SAT', roles:['user','obiekt'], home:'Niemcy · Bad Saarow', verified:true, org:true },
    organizator: { name:'Polskie Towarzystwo Saunowe', init:'PTS', roles:['user','organizator','bloger'], home:'Polska', verified:true, org:true },
    admin:       { name:'Administrator', init:'AW', roles:['user','admin'], home:'aufguss.world' },
  };
  const ROLE_LABEL = {
    user:'Użytkownik', saunamistrz:'Saunamistrz', sedzia:'Sędzia', szkoleniowiec:'Szkoleniowiec',
    bloger:'Bloger', obiekt:'Obiekt', organizator:'Organizator turniejów', admin:'Administrator',
  };

  // ── przykładowe powiadomienia (poglądowe) ──
  const NOTES = [
    { ic:'heart', unread:true,  text:'<b>Ola R.</b> zareagowała na Twój komentarz pod wpisem „Noc aufguss".', time:'12 min temu', href:'post.html?id=satama-noc-aufguss' },
    { ic:'reply', unread:true,  text:'<b>Satama Sauna Resort</b> odpowiedziała na Twoje pytanie.', time:'1 godz. temu', href:'post.html?id=satama-noc-aufguss' },
    { ic:'cal',   unread:true,  text:'Zbliża się wydarzenie z Twojego kalendarza: <b>The Battle of Gladiators</b> (za 3 dni).', time:'3 godz. temu', href:'calendar.html' },
    { ic:'venue', unread:false, text:'Obserwowany obiekt <b>Chochołowskie Termy</b> dodał nowe wydarzenie.', time:'wczoraj', href:'object.html' },
    { ic:'post',  unread:false, text:'Nowy wpis obserwowanego blogera <b>Wojciech Kadź</b>.', time:'2 dni temu', href:'blog.html?blog=wojciech-kadz' },
  ];

  const IC = {
    heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8.8 1.7z"/></svg>',
    reply:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17l-5-5 5-5M4 12h12a4 4 0 0 1 4 4v2"/></svg>',
    cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    venue:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>',
    post:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v14H7l-3 3z"/><path d="M8 9h8M8 13h5"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
    chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  };

  const css = `
  .acct-area{display:flex;align-items:center;gap:12px;position:relative;}
  .acct-bell{position:relative;width:42px;height:42px;border-radius:50%;border:1px solid var(--line-strong,rgba(42,27,16,0.18));background:var(--surface,#fff);color:var(--ink,#2a1b10);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
  .acct-bell:hover{border-color:var(--ember-1,#ff7a3d);color:var(--ember-2,#e8552a);}
  .acct-bell svg{width:20px;height:20px;}
  .acct-bell .dot{position:absolute;top:6px;right:7px;min-width:17px;height:17px;padding:0 4px;border-radius:100px;background:linear-gradient(120deg,#ff8a3d,#e8552a);color:#fff;font:700 0.62rem/17px 'Instrument Sans',sans-serif;text-align:center;}
  .acct-chip{display:flex;align-items:center;gap:9px;padding:6px 12px 6px 6px;border-radius:100px;border:1px solid var(--line-strong,rgba(42,27,16,0.18));background:var(--surface,#fff);cursor:pointer;transition:all .2s;}
  .acct-chip:hover{border-color:var(--ember-1,#ff7a3d);}
  .acct-chip .av{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font:600 0.74rem 'Instrument Sans',sans-serif;color:#fff6ea;background:linear-gradient(150deg,#ff8a3d,#e8552a);}
  .acct-chip .nm{font:600 0.82rem 'Instrument Sans',sans-serif;color:var(--ink,#2a1b10);white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;}
  .acct-chip .chev{width:14px;height:14px;color:var(--stone,#8a7960);}
  .acct-btn-login{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:100px;background:linear-gradient(120deg,#ff8a3d,#ff5a3d);color:#2a0e02;font:600 0.8rem 'Instrument Sans',sans-serif;cursor:pointer;border:none;}
  .acct-btn-login svg{width:17px;height:17px;}
  .acct-pop{position:absolute;top:calc(100% + 10px);right:0;width:320px;max-width:88vw;background:var(--surface,#fff);border:1px solid var(--line,rgba(42,27,16,0.1));border-radius:16px;box-shadow:0 24px 60px rgba(42,27,16,0.2);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all .18s;z-index:200;overflow:hidden;}
  .acct-pop.open{opacity:1;visibility:visible;transform:translateY(0);}
  .acct-pop .pop-head{padding:16px 18px;border-bottom:1px solid var(--line,rgba(42,27,16,0.1));display:flex;align-items:center;gap:12px;}
  .acct-pop .pop-head .av{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font:600 1rem 'Fraunces',serif;color:#fff6ea;background:linear-gradient(150deg,#ffd9a8,#ff8a3d 55%,#e8552a);}
  .acct-pop .pop-head .nm{font:600 0.94rem 'Instrument Sans',sans-serif;color:var(--ink,#2a1b10);}
  .acct-pop .pop-head .sub{font-size:0.74rem;color:var(--stone,#8a7960);margin-top:2px;}
  .acct-roles{display:flex;flex-wrap:wrap;gap:5px;padding:12px 18px 4px;}
  .acct-roles .rl{font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:3px 9px;border-radius:100px;background:var(--surface-2,#f3e8d6);color:var(--ink-dim,#6b5a47);}
  .acct-roles .rl.verified{background:linear-gradient(120deg,#ff8a3d,#e8552a);color:#fff6ea;}
  .acct-menu{padding:8px;}
  .acct-menu a,.acct-menu button{width:100%;display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;background:none;border:none;text-align:left;font:500 0.88rem 'Instrument Sans',sans-serif;color:var(--ink,#2a1b10);cursor:pointer;text-decoration:none;}
  .acct-menu a:hover,.acct-menu button:hover{background:var(--surface-2,#f3e8d6);color:var(--ember-3,#d6491f);}
  .acct-menu svg{width:17px;height:17px;color:var(--stone,#8a7960);flex-shrink:0;}
  .acct-menu .divider{height:1px;background:var(--line,rgba(42,27,16,0.1));margin:6px 4px;}
  /* powiadomienia */
  .notes-pop{width:360px;}
  .notes-pop .pop-head{justify-content:space-between;}
  .notes-pop .pop-head h4{font:600 0.94rem 'Instrument Sans',sans-serif;}
  .notes-pop .pop-head .mark{font-size:0.72rem;color:var(--ember-2,#e8552a);cursor:pointer;background:none;border:none;padding:0;}
  .notes-list{max-height:60vh;overflow:auto;}
  .note{display:flex;gap:11px;padding:13px 16px;border-top:1px solid var(--line,rgba(42,27,16,0.08));text-decoration:none;color:inherit;position:relative;}
  .note:hover{background:var(--surface-2,#f3e8d6);}
  .note.unread{background:rgba(255,138,61,0.07);}
  .note .nic{width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface-2,#f3e8d6);color:var(--ember-3,#d6491f);}
  .note .nic svg{width:17px;height:17px;}
  .note .ntxt{font-size:0.82rem;line-height:1.4;color:var(--ink,#2a1b10);}
  .note .ntime{font-size:0.7rem;color:var(--stone,#8a7960);margin-top:3px;}
  .note .udot{position:absolute;top:16px;right:14px;width:7px;height:7px;border-radius:50%;background:var(--ember-2,#e8552a);}
  .notes-empty{padding:26px;text-align:center;color:var(--stone,#8a7960);font-size:0.85rem;}
  /* przełącznik ról (demo) */
  .role-demo{position:fixed;bottom:18px;right:18px;z-index:300;font-family:'Instrument Sans',sans-serif;}
  .role-demo .rd-toggle{display:flex;align-items:center;gap:8px;padding:10px 15px;border-radius:100px;background:#2a1b10;color:#ffd9a8;border:none;cursor:pointer;font:600 0.76rem 'Instrument Sans';box-shadow:0 10px 30px rgba(42,27,16,0.35);}
  .role-demo .rd-toggle .d{width:8px;height:8px;border-radius:50%;background:#7ee787;}
  .role-demo .rd-menu{position:absolute;bottom:calc(100% + 10px);right:0;width:250px;background:#fff;border:1px solid var(--line,rgba(42,27,16,0.12));border-radius:14px;box-shadow:0 20px 50px rgba(42,27,16,0.25);padding:8px;display:none;}
  .role-demo.open .rd-menu{display:block;}
  .role-demo .rd-menu .lbl{font-size:0.66rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--stone,#8a7960);padding:8px 10px 4px;}
  .role-demo .rd-menu button{width:100%;text-align:left;padding:9px 11px;border-radius:9px;border:none;background:none;cursor:pointer;font:500 0.84rem 'Instrument Sans';color:var(--ink,#2a1b10);display:flex;align-items:center;justify-content:space-between;}
  .role-demo .rd-menu button:hover{background:var(--surface-2,#f3e8d6);}
  .role-demo .rd-menu button.active{background:rgba(255,138,61,0.14);color:var(--ember-3,#d6491f);font-weight:700;}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  function session(){
    let s; try{ s=JSON.parse(localStorage.getItem('aufguss_session')||'{}'); }catch(e){ s={}; }
    if(!s.persona) s.persona='guest';
    return s;
  }
  function save(s){ localStorage.setItem('aufguss_session', JSON.stringify(s)); }
  function current(){ const s=session(); return { persona:s.persona, ...(PERSONAS[s.persona]||PERSONAS.guest) }; }
  function isLoggedIn(){ return current().loggedIn!==false && current().persona!=='guest'; }
  function setPersona(p){ const s=session(); s.persona=p; save(s); renderAll(); }

  function unreadCount(){ return NOTES.filter(n=>n.unread).length; }

  function closeAllPops(){ document.querySelectorAll('.acct-pop.open').forEach(p=>p.classList.remove('open')); }
  document.addEventListener('click',e=>{ if(!e.target.closest('.acct-area')) closeAllPops(); if(!e.target.closest('.role-demo')) document.querySelector('.role-demo')?.classList.remove('open'); });

  function accountMenuHTML(u){
    const has=r=>u.roles&&u.roles.includes(r);
    const items=[];
    items.push(`<a href="account.html">${IC.user} Mój profil / dane konta</a>`);
    items.push(`<a href="calendar.html">${IC.cal} Mój kalendarz</a>`);
    if(has('saunamistrz')||has('sedzia')) items.push(`<a href="saunamaster.html">${IC.user} Mój profil publiczny</a>`);
    if(has('szkoleniowiec')) items.push(`<a href="account.html#szkolenia">${IC.cal} Moje szkolenia</a>`);
    if(has('bloger')||has('obiekt')||has('organizator')) items.push(`<a href="account.html#wpisy">${IC.post} Moje wpisy</a>`);
    if(has('obiekt')) items.push(`<a href="account.html#obiekt">${IC.venue} Panel obiektu</a>`);
    if(has('organizator')) items.push(`<a href="account.html#turnieje">${IC.venue} Moje turnieje</a>`);
    if(has('admin')) items.push(`<a href="account.html#admin">${IC.user} Panel administratora</a>`);
    items.push('<div class="divider"></div>');
    items.push(`<button data-logout>${IC.user} Wyloguj</button>`);
    const roles=(u.roles||[]).map(r=>`<span class="rl ${u.verified&&r!=='user'?'verified':''}">${ROLE_LABEL[r]||r}</span>`).join('');
    return `<div class="pop-head"><div class="av">${u.init}</div><div><div class="nm">${u.name}</div><div class="sub">${u.home||''}${u.rank?' · '+u.rank:''}</div></div></div>
      <div class="acct-roles">${roles}</div>
      <div class="acct-menu">${items.join('')}</div>`;
  }
  function notesHTML(){
    const list = NOTES.length ? NOTES.map(n=>`<a class="note ${n.unread?'unread':''}" href="${n.href}"><div class="nic">${IC[n.ic]||IC.bell}</div><div><div class="ntxt">${n.text}</div><div class="ntime">${n.time}</div></div>${n.unread?'<span class="udot"></span>':''}</a>`).join('') : '<div class="notes-empty">Brak powiadomień.</div>';
    return `<div class="pop-head"><h4>Powiadomienia</h4><button class="mark" data-mark>Oznacz jako przeczytane</button></div><div class="notes-list">${list}</div>`;
  }

  function renderInto(el){
    const u=current();
    if(!isLoggedIn()){
      el.innerHTML = `<button class="acct-btn-login" data-login>${IC.user} <span>Zaloguj się</span></button>`;
      el.querySelector('[data-login]').addEventListener('click',()=>{
        const m=document.getElementById('loginModal');
        if(m){ m.classList.add('open'); } else { location.href='account.html'; }
      });
      return;
    }
    const n=unreadCount();
    el.innerHTML = `
      <div class="acct-bell" data-bell title="Powiadomienia">${IC.bell}${n?`<span class="dot">${n}</span>`:''}
        <div class="acct-pop notes-pop" data-notespop></div></div>
      <div class="acct-chip" data-chip><div class="av">${u.init}</div><span class="nm">${u.name}</span><span class="chev">${IC.chev}</span>
        <div class="acct-pop" data-acctpop></div></div>`;
    const notesPop=el.querySelector('[data-notespop]'); notesPop.innerHTML=notesHTML();
    const acctPop=el.querySelector('[data-acctpop]'); acctPop.innerHTML=accountMenuHTML(u);
    el.querySelector('[data-bell]').addEventListener('click',e=>{ e.stopPropagation(); const o=notesPop.classList.contains('open'); closeAllPops(); if(!o)notesPop.classList.add('open'); });
    el.querySelector('[data-chip]').addEventListener('click',e=>{ e.stopPropagation(); const o=acctPop.classList.contains('open'); closeAllPops(); if(!o)acctPop.classList.add('open'); });
    acctPop.addEventListener('click',e=>e.stopPropagation());
    notesPop.addEventListener('click',e=>e.stopPropagation());
    acctPop.querySelector('[data-logout]')?.addEventListener('click',()=>{ setPersona('guest'); });
    notesPop.querySelector('[data-mark]')?.addEventListener('click',()=>{ NOTES.forEach(x=>x.unread=false); renderAll(); });
  }

  function renderDemoSwitcher(){
    if(document.querySelector('.role-demo')) return;
    const wrap=document.createElement('div'); wrap.className='role-demo';
    const order=['guest','user','saunamistrz','sedzia','obiekt','organizator','admin'];
    const cur=current().persona;
    wrap.innerHTML=`<button class="rd-toggle"><span class="d"></span> Podgląd: ${cur==='guest'?'Gość':(PERSONAS[cur]?ROLE_LABEL[[...PERSONAS[cur].roles].pop()]||cur:cur)}</button>
      <div class="rd-menu"><div class="lbl">Zobacz portal jako</div>
        ${order.map(p=>`<button data-p="${p}" class="${p===cur?'active':''}">${p==='guest'?'Gość (wylogowany)':PERSONAS[p].name}<span style="font-size:0.66rem;color:var(--stone)">${p==='guest'?'':(PERSONAS[p].roles.filter(r=>r!=='user').map(r=>ROLE_LABEL[r]).join(', ')||'Użytkownik')}</span></button>`).join('')}
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('.rd-toggle').addEventListener('click',e=>{ e.stopPropagation(); wrap.classList.toggle('open'); });
    wrap.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>setPersona(b.dataset.p)));
  }

  function renderAll(){
    document.querySelectorAll('[data-acct-slot]').forEach(renderInto);
    const old=document.querySelector('.role-demo'); if(old) old.remove();
    renderDemoSwitcher();
    document.dispatchEvent(new CustomEvent('aufguss:session', { detail: current() }));
  }

  window.AufgussAuth = {
    current, isLoggedIn, setPersona, session,
    PERSONAS, ROLE_LABEL, NOTES,
    onChange(cb){ document.addEventListener('aufguss:session', e=>cb(e.detail)); cb(current()); },
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', renderAll);
  else renderAll();
})();
