/* Warstwa sesji aufguss.world — prawdziwe konta (Supabase Auth: Google, Facebook, e-mail)
   + nagłówek „Moje konto", dzwoneczek i przełącznik podglądu ról (demo).
   Konta są WIELOROLOWE: role pochodzą z tabeli user_roles, nadaje je administrator.
   Użycie: dodaj element [data-acct-slot] w nagłówku i dołącz <script src="../assets/auth.js">.
   Moduł sam dogrywa supabase-js z CDN oraz supabase/config.js (klucz publiczny; dostęp ogranicza RLS).
   Bez konfiguracji bazy działa wyłącznie tryb demo (persony poniżej). */
(function(){
  if(window.AufgussAuth) return;

  const SCRIPT_SRC=(document.currentScript&&document.currentScript.src)||'';
  const BASE=SCRIPT_SRC.replace(/assets\/auth\.js.*$/,'');      // katalog główny projektu (…/aufguss-world/)
  const SB_CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.min.js';
  let SB=null;        // klient Supabase (null = tryb demo)
  let live=null;      // zalogowane prawdziwe konto (obiekt użytkownika) albo null
  let providers=null; // {google:bool, facebook:bool} z /auth/v1/settings — null = jeszcze nie sprawdzono

  // ── persony demonstracyjne (jedno konto = wiele ról) — podgląd portalu oczami różnych kont ──
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

  // ── przykładowe powiadomienia (tylko dla person demo; prawdziwe konta nie mają jeszcze powiadomień w bazie) ──
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
    google:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1H12v3.25h5.35c-.25 1.5-1.72 4.4-5.35 4.4a5.75 5.75 0 0 1 0-11.5c1.8 0 3.02.78 3.72 1.45l2.53-2.44C16.9 4.4 14.68 3.5 12 3.5a8.5 8.5 0 1 0 0 17c4.9 0 8.15-3.45 8.15-8.3 0-.56-.06-.98-.15-1.4z"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.8l.42-3.2H13.5V8.75c0-.93.26-1.56 1.6-1.56h1.7V4.3c-.3-.04-1.3-.13-2.48-.13-2.46 0-4.14 1.5-4.14 4.26v2.34H7.4V14h2.28v8z"/></svg>',
    warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 9v4M12 16.5v.5"/></svg>',
    mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  };

  const css = `
  .acct-area{display:flex;align-items:center;gap:12px;position:relative;}
  .acct-bell{position:relative;width:42px;height:42px;border-radius:50%;border:1px solid var(--line-strong,rgba(42,27,16,0.18));background:var(--surface,#fff);color:var(--ink,#2a1b10);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
  .acct-bell:hover{border-color:var(--ember-1,#ff7a3d);color:var(--ember-2,#e8552a);}
  .acct-bell svg{width:20px;height:20px;}
  .acct-bell .dot{position:absolute;top:6px;right:7px;min-width:17px;height:17px;padding:0 4px;border-radius:100px;background:linear-gradient(120deg,#ff8a3d,#e8552a);color:#fff;font:700 0.62rem/17px 'Instrument Sans',sans-serif;text-align:center;}
  .acct-chip{display:flex;align-items:center;gap:9px;padding:6px 12px 6px 6px;border-radius:100px;border:1px solid var(--line-strong,rgba(42,27,16,0.18));background:var(--surface,#fff);cursor:pointer;transition:all .2s;}
  .acct-chip:hover{border-color:var(--ember-1,#ff7a3d);}
  .acct-chip .av{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font:600 0.74rem 'Instrument Sans',sans-serif;color:#fff6ea;background:linear-gradient(150deg,#ff8a3d,#e8552a);overflow:hidden;}
  .acct-chip .av img,.acct-pop .pop-head .av img{width:100%;height:100%;object-fit:cover;display:block;}
  .acct-chip .nm{font:600 0.82rem 'Instrument Sans',sans-serif;color:var(--ink,#2a1b10);white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;}
  .acct-chip .chev{width:14px;height:14px;color:var(--stone,#8a7960);}
  .acct-btn-login{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:100px;background:linear-gradient(120deg,#ff8a3d,#ff5a3d);color:#2a0e02;font:600 0.8rem 'Instrument Sans',sans-serif;cursor:pointer;border:none;}
  .acct-btn-login svg{width:17px;height:17px;}
  .acct-pop{position:absolute;top:calc(100% + 10px);right:0;width:320px;max-width:88vw;background:var(--surface,#fff);border:1px solid var(--line,rgba(42,27,16,0.1));border-radius:16px;box-shadow:0 24px 60px rgba(42,27,16,0.2);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all .18s;z-index:200;overflow:hidden;}
  .acct-pop.open{opacity:1;visibility:visible;transform:translateY(0);}
  .acct-pop .pop-head{padding:16px 18px;border-bottom:1px solid var(--line,rgba(42,27,16,0.1));display:flex;align-items:center;gap:12px;}
  .acct-pop .pop-head .av{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font:600 1rem 'Fraunces',serif;color:#fff6ea;background:linear-gradient(150deg,#ffd9a8,#ff8a3d 55%,#e8552a);overflow:hidden;}
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
  /* przełącznik ról (demo) — tylko gdy nikt nie jest zalogowany naprawdę */
  .role-demo{position:fixed;bottom:18px;right:18px;z-index:300;font-family:'Instrument Sans',sans-serif;}
  .role-demo .rd-toggle{display:flex;align-items:center;gap:8px;padding:10px 15px;border-radius:100px;background:#2a1b10;color:#ffd9a8;border:none;cursor:pointer;font:600 0.76rem 'Instrument Sans';box-shadow:0 10px 30px rgba(42,27,16,0.35);}
  .role-demo .rd-toggle .d{width:8px;height:8px;border-radius:50%;background:#7ee787;}
  .role-demo .rd-menu{position:absolute;bottom:calc(100% + 10px);right:0;width:250px;background:#fff;border:1px solid var(--line,rgba(42,27,16,0.12));border-radius:14px;box-shadow:0 20px 50px rgba(42,27,16,0.25);padding:8px;display:none;}
  .role-demo.open .rd-menu{display:block;}
  .role-demo .rd-menu .lbl{font-size:0.66rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--stone,#8a7960);padding:8px 10px 4px;}
  .role-demo .rd-menu button{width:100%;text-align:left;padding:9px 11px;border-radius:9px;border:none;background:none;cursor:pointer;font:500 0.84rem 'Instrument Sans';color:var(--ink,#2a1b10);display:flex;align-items:center;justify-content:space-between;}
  .role-demo .rd-menu button:hover{background:var(--surface-2,#f3e8d6);}
  .role-demo .rd-menu button.active{background:rgba(255,138,61,0.14);color:var(--ember-3,#d6491f);font-weight:700;}
  /* okno logowania (wspólne dla całego portalu) */
  .auth-bg{position:fixed;inset:0;background:rgba(30,16,8,0.6);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;z-index:400;padding:24px;font-family:'Instrument Sans',sans-serif;}
  .auth-bg.open{display:flex;}
  .auth-modal{background:var(--surface,#fff);border-radius:22px;max-width:420px;width:100%;max-height:92vh;overflow-y:auto;padding:34px 34px 28px;position:relative;box-shadow:0 30px 80px rgba(20,8,2,0.4);animation:authIn .3s cubic-bezier(.2,.8,.2,1);}
  @keyframes authIn{from{opacity:0;transform:translateY(14px) scale(.98);}to{opacity:1;transform:none;}}
  .auth-modal .close{position:absolute;top:15px;right:18px;background:none;border:none;font-size:1.5rem;color:var(--stone,#8a7960);cursor:pointer;line-height:1;}
  .auth-modal h3{font-family:'Fraunces',serif;font-weight:500;font-size:1.7rem;margin:0 0 6px;color:var(--ink,#2a1b10);}
  .auth-modal .sub{font-size:0.88rem;color:var(--ink-dim,#6b5a47);margin-bottom:22px;line-height:1.5;}
  .auth-soc{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:12px 10px;white-space:nowrap;border:1px solid var(--line-strong,rgba(42,27,16,0.18));border-radius:12px;background:var(--surface,#fff);font:600 0.9rem 'Instrument Sans';color:var(--ink,#2a1b10);cursor:pointer;margin-bottom:10px;transition:all .18s;}
  .auth-soc:hover{border-color:var(--ember-1,#ff7a3d);background:var(--surface-2,#f3e8d6);}
  .auth-soc svg{width:19px;height:19px;color:var(--ember-3,#d6491f);}
  .auth-soc:disabled{opacity:.55;cursor:not-allowed;}
  .auth-soc .soon{font-size:0.58rem;margin-left:2px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:100px;background:var(--surface-2,#f3e8d6);color:var(--stone,#8a7960);}
  .auth-div{display:flex;align-items:center;gap:12px;color:var(--stone,#8a7960);font-size:0.76rem;margin:18px 0;text-transform:uppercase;letter-spacing:0.06em;}
  .auth-div::before,.auth-div::after{content:'';flex:1;height:1px;background:var(--line,rgba(42,27,16,0.1));}
  .auth-f{margin-bottom:14px;}
  .auth-f label{display:block;font-size:0.78rem;font-weight:600;color:var(--ink-dim,#6b5a47);margin-bottom:6px;}
  .auth-f input{width:100%;padding:12px 14px;border:1px solid var(--line-strong,rgba(42,27,16,0.18));border-radius:11px;font-family:inherit;font-size:0.94rem;color:var(--ink,#2a1b10);outline:none;background:var(--surface,#fff);transition:border-color .2s;box-sizing:border-box;}
  .auth-f input:focus{border-color:var(--ember-1,#ff7a3d);}
  .auth-f .hint{font-size:0.74rem;color:var(--stone,#8a7960);margin-top:5px;}
  .auth-link{background:none;border:none;padding:0;font:inherit;font-size:0.78rem;color:var(--ember-2,#e8552a);cursor:pointer;font-weight:600;}
  .auth-forgot{display:block;text-align:right;margin:-2px 0 16px;}
  .auth-submit{width:100%;padding:14px;border:none;border-radius:100px;background:linear-gradient(120deg,#ff8a3d,#ff5a3d);color:#2a0e02;font:700 0.8rem 'Instrument Sans';letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:transform .18s;}
  .auth-submit:hover{transform:translateY(-2px);}
  .auth-submit:disabled{opacity:.6;cursor:wait;transform:none;}
  .auth-foot{text-align:center;font-size:0.86rem;color:var(--ink-dim,#6b5a47);margin-top:20px;}
  .auth-err{display:none;align-items:flex-start;gap:8px;padding:11px 13px;border-radius:11px;background:rgba(214,73,31,0.08);color:#a33413;font-size:0.82rem;line-height:1.4;margin-bottom:14px;}
  .auth-err.on{display:flex;}
  .auth-err svg{width:16px;height:16px;flex-shrink:0;margin-top:1px;}
  .auth-ok{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:10px 0 4px;}
  .auth-ok .ico{width:56px;height:56px;border-radius:16px;background:var(--surface-2,#f3e8d6);color:var(--ember-3,#d6491f);display:flex;align-items:center;justify-content:center;}
  .auth-ok .ico svg{width:26px;height:26px;}
  .auth-ok p{font-size:0.9rem;color:var(--ink-dim,#6b5a47);line-height:1.5;margin:0;}
  .auth-ok b{color:var(--ink,#2a1b10);}
  .auth-demo{margin-top:16px;padding-top:14px;border-top:1px solid var(--line,rgba(42,27,16,0.1));font-size:0.74rem;color:var(--stone,#8a7960);text-align:center;line-height:1.5;}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  const esc=s=>String(s==null?'':s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  const initials=n=>String(n||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?';

  // ── sesja demo (persony) ──
  function session(){
    let s; try{ s=JSON.parse(localStorage.getItem('aufguss_session')||'{}'); }catch(e){ s={}; }
    if(!s.persona) s.persona='guest';
    return s;
  }
  function save(s){ localStorage.setItem('aufguss_session', JSON.stringify(s)); }
  function current(){
    if(live) return live;
    const s=session(); return { persona:s.persona, ...(PERSONAS[s.persona]||PERSONAS.guest) };
  }
  function isLoggedIn(){ const u=current(); return u.loggedIn!==false && u.persona!=='guest'; }
  function setPersona(p){ const s=session(); s.persona=p; save(s); renderAll(); }

  // ── Supabase: klient, sesja, konto ──
  function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('nie wczytano '+src)); document.head.appendChild(s); }); }
  async function initSupabase(){
    try{
      if(!window.supabase) await loadScript(SB_CDN);
      if(!window.AUFGUSS_SUPABASE) await loadScript(BASE+'supabase/config.js');
      const c=window.AUFGUSS_SUPABASE; if(!c||!c.url||!c.key) throw new Error('brak konfiguracji');
      SB=window.supabase.createClient(c.url,c.key,{ auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    }catch(e){ console.warn('[auth] tryb demo — Supabase niedostępny:', e.message); SB=null; return; }
    // którzy dostawcy są włączeni w projekcie — wyłączony przycisk zamiast wyskoku na stronę błędu
    const cfg=window.AUFGUSS_SUPABASE;
    fetch(cfg.url+'/auth/v1/settings',{headers:{apikey:cfg.key}}).then(r=>r.json()).then(j=>{ providers={google:!!(j.external&&j.external.google), facebook:!!(j.external&&j.external.facebook)}; if(modalEl&&modalEl.classList.contains('open')) openLogin(modalView); }).catch(()=>{});
    SB.auth.onAuthStateChange(async (ev,s)=>{
      if(ev==='PASSWORD_RECOVERY'){ openLogin('recovery'); }
      live = s ? await buildLiveUser(s) : null;
      renderAll();
      if(s && (ev==='SIGNED_IN') && modalView!=='recovery') closeLogin();
    });
    // błąd zwrócony przez dostawcę OAuth wraca w adresie (#error=…) — pokazujemy go w oknie logowania
    const h=new URLSearchParams(location.hash.replace(/^#/,''));
    if(h.get('error_description')||h.get('error')){ openLogin('login'); showErr(prettyError({message:h.get('error_description')||h.get('error')})); history.replaceState(null,'',location.pathname+location.search); }
  }
  async function buildLiveUser(s){
    const uid=s.user.id, meta=s.user.user_metadata||{}, email=s.user.email||'';
    let p=null, r=[];
    try{
      const [pr,rr]=await Promise.all([
        SB.from('profiles').select('display_name,country,city,avatar_url').eq('id',uid).maybeSingle(),
        SB.from('user_roles').select('role').eq('profile_id',uid).eq('status','active'),
      ]);
      p=pr.data; r=rr.data||[];
    }catch(e){ console.warn('[auth] profil niedostępny:', e.message); }
    const name=(p&&p.display_name)||meta.display_name||meta.full_name||meta.name||email.split('@')[0]||'Użytkownik';
    const roles=r.map(x=>x.role); if(!roles.includes('user')) roles.unshift('user');
    return { persona:'live', live:true, loggedIn:true, uid, email, name, init:initials(name), roles,
      home:[p&&p.country,p&&p.city].filter(Boolean).join(' · '),
      avatar:(p&&p.avatar_url)||meta.avatar_url||meta.picture||null,
      verified: roles.some(x=>x!=='user') };
  }
  function prettyError(e){
    const m=(e&&e.message)||String(e||'');
    if(/invalid login credentials/i.test(m)) return 'Nieprawidłowy e-mail lub hasło.';
    if(/email not confirmed/i.test(m)) return 'Adres e-mail nie został jeszcze potwierdzony. Sprawdź skrzynkę (także spam).';
    if(/already registered|already exists/i.test(m)) return 'Konto z tym adresem już istnieje. Zaloguj się albo użyj „Nie pamiętasz hasła?".';
    if(/password should be|at least 6/i.test(m)) return 'Hasło musi mieć co najmniej 6 znaków.';
    if(/rate limit|too many|security purposes/i.test(m)) return 'Za dużo prób w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.';
    if(/provider is not enabled|unsupported provider/i.test(m)) return 'To logowanie nie jest jeszcze włączone. Użyj e-maila albo spróbuj później.';
    if(/invalid email|unable to validate email/i.test(m)) return 'Podaj poprawny adres e-mail.';
    if(/network|fetch/i.test(m)) return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
    return m||'Coś poszło nie tak. Spróbuj ponownie.';
  }

  // ── okno logowania ──
  let modalView='login', modalEl=null, modalEmail='';
  function ensureModal(){
    if(modalEl) return modalEl;
    modalEl=document.createElement('div'); modalEl.className='auth-bg'; modalEl.id='authModal';
    modalEl.addEventListener('click',e=>{ if(e.target===modalEl) closeLogin(); });
    document.body.appendChild(modalEl);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeLogin(); });
    return modalEl;
  }
  function viewHTML(v){
    const provBtn=(p,label)=>{ const off=providers&&!providers[p]; return `<button class="auth-soc" type="button" data-prov="${p}"${off?' disabled title="Logowanie przez '+label+' zostanie włączone wkrótce"':''}>${IC[p]} Kontynuuj z kontem ${label}${off?' <span class="soon">wkrótce</span>':''}</button>`; };
    const soc=`${provBtn('google','Google')}${provBtn('facebook','Facebook')}
      <div class="auth-div">lub e-mailem</div>`;
    const err=`<div class="auth-err" data-err>${IC.warn}<span></span></div>`;
    const demo = SB ? '' : `<div class="auth-demo">Baza jest niedostępna — dostępny jest tylko podgląd demo (przełącznik w prawym dolnym rogu).</div>`;
    if(v==='register') return `<h3>Załóż konto</h3><div class="sub">Komentuj, obserwuj obiekty i saunamistrzów, zbieraj rangi.</div>${soc}${err}
      <form data-form="register">
        <div class="auth-f"><label for="aName">Imię i nazwisko (lub pseudonim)</label><input id="aName" required maxlength="60" autocomplete="name" placeholder="np. Ania Nowak"></div>
        <div class="auth-f"><label for="aEmail">E-mail</label><input id="aEmail" type="email" required autocomplete="email" placeholder="twój@email.com" value="${esc(modalEmail)}"></div>
        <div class="auth-f"><label for="aPass">Hasło</label><input id="aPass" type="password" required minlength="6" autocomplete="new-password" placeholder="co najmniej 6 znaków"><div class="hint">Zakładając konto, akceptujesz regulamin i politykę prywatności aufguss.world.</div></div>
        <button type="submit" class="auth-submit">Załóż konto</button>
      </form>
      <div class="auth-foot">Masz już konto? <button class="auth-link" data-view="login">Zaloguj się</button></div>${demo}`;
    if(v==='forgot') return `<h3>Nie pamiętasz hasła?</h3><div class="sub">Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.</div>${err}
      <form data-form="forgot">
        <div class="auth-f"><label for="aEmail">E-mail</label><input id="aEmail" type="email" required autocomplete="email" placeholder="twój@email.com" value="${esc(modalEmail)}"></div>
        <button type="submit" class="auth-submit">Wyślij link</button>
      </form>
      <div class="auth-foot"><button class="auth-link" data-view="login">Wróć do logowania</button></div>`;
    if(v==='recovery') return `<h3>Ustaw nowe hasło</h3><div class="sub">Wpisz nowe hasło do swojego konta.</div>${err}
      <form data-form="recovery">
        <div class="auth-f"><label for="aPass">Nowe hasło</label><input id="aPass" type="password" required minlength="6" autocomplete="new-password" placeholder="co najmniej 6 znaków"></div>
        <div class="auth-f"><label for="aPass2">Powtórz hasło</label><input id="aPass2" type="password" required minlength="6" autocomplete="new-password"></div>
        <button type="submit" class="auth-submit">Zapisz hasło</button>
      </form>`;
    if(v==='check-email') return `<div class="auth-ok"><div class="ico">${IC.mail}</div><h3>Sprawdź skrzynkę</h3>
      <p>Wysłaliśmy wiadomość na <b>${esc(modalEmail)}</b>. Kliknij link w środku, aby dokończyć. Jeśli nic nie przyszło, zajrzyj do folderu spam.</p>
      <button class="auth-submit" type="button" data-close style="margin-top:8px">Zamknij</button></div>`;
    if(v==='done') return `<div class="auth-ok"><div class="ico">${IC.user}</div><h3>Gotowe</h3><p>Hasło zostało zmienione. Jesteś zalogowany.</p>
      <button class="auth-submit" type="button" data-close style="margin-top:8px">Zamknij</button></div>`;
    return `<h3>Zaloguj się</h3><div class="sub">Dołącz do społeczności Global Aufguss Community Hub.</div>${soc}${err}
      <form data-form="login">
        <div class="auth-f"><label for="aEmail">E-mail</label><input id="aEmail" type="email" required autocomplete="email" placeholder="twój@email.com" value="${esc(modalEmail)}"></div>
        <div class="auth-f"><label for="aPass">Hasło</label><input id="aPass" type="password" required autocomplete="current-password" placeholder="••••••••"></div>
        <button class="auth-link auth-forgot" type="button" data-view="forgot">Nie pamiętasz hasła?</button>
        <button type="submit" class="auth-submit">Zaloguj się</button>
      </form>
      <div class="auth-foot">Nie masz jeszcze konta? <button class="auth-link" data-view="register">Zarejestruj się</button></div>${demo}`;
  }
  function showErr(msg){ const e=modalEl&&modalEl.querySelector('[data-err]'); if(!e) return; e.querySelector('span').textContent=msg; e.classList.add('on'); }
  function busy(on){ modalEl.querySelectorAll('button').forEach(b=>b.disabled=on); }
  function openLogin(view){
    modalView=view||'login'; const m=ensureModal();
    m.innerHTML=`<div class="auth-modal"><button class="close" type="button" data-close aria-label="Zamknij">×</button>${viewHTML(modalView)}</div>`;
    m.classList.add('open'); wireModal();
    setTimeout(()=>{ const f=m.querySelector('input'); if(f) f.focus(); },60);
  }
  function closeLogin(){ if(modalEl) modalEl.classList.remove('open'); }
  function wireModal(){
    const m=modalEl;
    m.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeLogin);
    m.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{ const em=m.querySelector('#aEmail'); if(em) modalEmail=em.value.trim(); openLogin(b.dataset.view); });
    m.querySelectorAll('[data-prov]').forEach(b=>b.onclick=async()=>{
      if(!SB) return showErr('Baza jest niedostępna — logowanie nie działa w tym trybie.');
      if(providers&&!providers[b.dataset.prov]) return showErr('Logowanie przez '+(b.dataset.prov==='google'?'Google':'Facebook')+' nie jest jeszcze włączone. Użyj e-maila.');
      busy(true);
      const { error } = await SB.auth.signInWithOAuth({ provider:b.dataset.prov, options:{ redirectTo: location.href.split('#')[0] } });
      if(error){ busy(false); showErr(prettyError(error)); }
    });
    const form=m.querySelector('form'); if(!form) return;
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!SB) return showErr('Baza jest niedostępna — logowanie nie działa w tym trybie.');
      const kind=form.dataset.form, val=id=>{ const el=m.querySelector('#'+id); return el?el.value.trim():''; };
      busy(true);
      try{
        if(kind==='login'){
          modalEmail=val('aEmail');
          const { error } = await SB.auth.signInWithPassword({ email:modalEmail, password:m.querySelector('#aPass').value });
          if(error) throw error;                       // sukces zamyka okno przez onAuthStateChange
        } else if(kind==='register'){
          modalEmail=val('aEmail');
          const { data, error } = await SB.auth.signUp({ email:modalEmail, password:m.querySelector('#aPass').value, options:{ data:{ display_name:val('aName') }, emailRedirectTo: location.href.split('#')[0] } });
          if(error) throw error;
          if(!data.session) openLogin('check-email');   // wymagane potwierdzenie e-maila
        } else if(kind==='forgot'){
          modalEmail=val('aEmail');
          const { error } = await SB.auth.resetPasswordForEmail(modalEmail, { redirectTo: BASE+'design-prototype/account.html' });
          if(error) throw error;
          openLogin('check-email');
        } else if(kind==='recovery'){
          const p1=m.querySelector('#aPass').value, p2=m.querySelector('#aPass2').value;
          if(p1!==p2) throw new Error('Hasła różnią się od siebie.');
          const { error } = await SB.auth.updateUser({ password:p1 });
          if(error) throw error;
          modalView='login'; openLogin('done');
        }
      }catch(err){ busy(false); showErr(prettyError(err)); }
    });
  }

  async function signOut(){
    if(live && SB){ await SB.auth.signOut(); live=null; }
    else setPersona('guest');
    renderAll();
  }

  // ── nagłówek: przycisk / chip konta / powiadomienia ──
  function unreadCount(){ return live ? 0 : NOTES.filter(n=>n.unread).length; }
  function closeAllPops(){ document.querySelectorAll('.acct-pop.open').forEach(p=>p.classList.remove('open')); }
  document.addEventListener('click',e=>{ if(!e.target.closest('.acct-area')) closeAllPops(); if(!e.target.closest('.role-demo')) document.querySelector('.role-demo')?.classList.remove('open'); });

  const avatarHTML=u=>u.avatar?`<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">`:esc(u.init);
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
    if(has('admin')||has('obiekt')||has('organizator')||has('saunamistrz')||has('szkoleniowiec')||has('sedzia')) items.push(`<a href="admin/index.html">${IC.venue} Panel zarządzania</a>`);
    items.push('<div class="divider"></div>');
    items.push(`<button data-logout>${IC.user} Wyloguj</button>`);
    const roles=(u.roles||[]).map(r=>`<span class="rl ${u.verified&&r!=='user'?'verified':''}">${ROLE_LABEL[r]||r}</span>`).join('');
    return `<div class="pop-head"><div class="av">${avatarHTML(u)}</div><div><div class="nm">${esc(u.name)}</div><div class="sub">${esc(u.home||u.email||'')}${u.rank?' · '+esc(u.rank):''}</div></div></div>
      <div class="acct-roles">${roles}</div>
      <div class="acct-menu">${items.join('')}</div>`;
  }
  function notesHTML(){
    const notes = live ? [] : NOTES;
    const list = notes.length ? notes.map(n=>`<a class="note ${n.unread?'unread':''}" href="${n.href}"><div class="nic">${IC[n.ic]||IC.bell}</div><div><div class="ntxt">${n.text}</div><div class="ntime">${n.time}</div></div>${n.unread?'<span class="udot"></span>':''}</a>`).join('') : '<div class="notes-empty">Brak powiadomień.</div>';
    return `<div class="pop-head"><h4>Powiadomienia</h4>${notes.length?'<button class="mark" data-mark>Oznacz jako przeczytane</button>':''}</div><div class="notes-list">${list}</div>`;
  }

  function renderInto(el){
    const u=current();
    if(!isLoggedIn()){
      el.innerHTML = `<button class="acct-btn-login" data-login>${IC.user} <span>Zaloguj się</span></button>`;
      el.querySelector('[data-login]').addEventListener('click',()=>openLogin('login'));
      return;
    }
    const n=unreadCount();
    el.innerHTML = `
      <div class="acct-bell" data-bell title="Powiadomienia">${IC.bell}${n?`<span class="dot">${n}</span>`:''}
        <div class="acct-pop notes-pop" data-notespop></div></div>
      <div class="acct-chip" data-chip><div class="av">${avatarHTML(u)}</div><span class="nm">${esc(u.name)}</span><span class="chev">${IC.chev}</span>
        <div class="acct-pop" data-acctpop></div></div>`;
    const notesPop=el.querySelector('[data-notespop]'); notesPop.innerHTML=notesHTML();
    const acctPop=el.querySelector('[data-acctpop]'); acctPop.innerHTML=accountMenuHTML(u);
    el.querySelector('[data-bell]').addEventListener('click',e=>{ e.stopPropagation(); const o=notesPop.classList.contains('open'); closeAllPops(); if(!o)notesPop.classList.add('open'); });
    el.querySelector('[data-chip]').addEventListener('click',e=>{ e.stopPropagation(); const o=acctPop.classList.contains('open'); closeAllPops(); if(!o)acctPop.classList.add('open'); });
    acctPop.addEventListener('click',e=>e.stopPropagation());
    notesPop.addEventListener('click',e=>e.stopPropagation());
    acctPop.querySelector('[data-logout]')?.addEventListener('click',signOut);
    notesPop.querySelector('[data-mark]')?.addEventListener('click',()=>{ NOTES.forEach(x=>x.unread=false); renderAll(); });
  }

  function renderDemoSwitcher(){
    if(live) return;                                   // prawdziwe konto = bez podglądu person
    if(document.querySelector('.role-demo')) return;
    const wrap=document.createElement('div'); wrap.className='role-demo';
    const order=['guest','user','saunamistrz','sedzia','obiekt','organizator','admin'];
    const cur=current().persona;
    wrap.innerHTML=`<button class="rd-toggle"><span class="d"></span> Podgląd: ${cur==='guest'?'Gość':(PERSONAS[cur]?ROLE_LABEL[[...PERSONAS[cur].roles].pop()]||cur:cur)}</button>
      <div class="rd-menu"><div class="lbl">Zobacz portal jako (demo)</div>
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
    current, isLoggedIn, setPersona, session, signOut, openLogin, closeLogin,
    PERSONAS, ROLE_LABEL, NOTES,
    get client(){ return SB; },
    onChange(cb){ document.addEventListener('aufguss:session', e=>cb(e.detail)); cb(current()); },
  };

  function start(){ renderAll(); initSupabase(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
