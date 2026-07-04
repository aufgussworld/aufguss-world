/* Wspólny komponent recenzji/komentarzy aufguss.world.
   Użycie:  AufgussComments.render(document.getElementById('mount'), { type:'object'|'master'|'tournament', name:'...' });
   Wstrzykuje własne style raz. Korzysta ze zmiennych CSS portalu (--ember-* itd.). */
(function(){
  if(window.AufgussComments) return;

  // ── rangi użytkowników (progresja rycerska) + krytyk ──
  const RANKS = {
    paz:       {label:'Paź',       cls:'r-paz'},
    giermek:   {label:'Giermek',   cls:'r-giermek'},
    rycerz:    {label:'Rycerz',    cls:'r-rycerz'},
    chorazy:   {label:'Chorąży',   cls:'r-choragy'},
    kawaleria: {label:'Kawaleria', cls:'r-kawaleria'},
    krytyk:    {label:'Bloger', cls:'r-krytyk'},
  };
  const ICON = {
    fire:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3c1.2 3-2 4.2-2 7a2 2 0 0 0 4 .2c2 1.8 3 3.8 3 5.8a5 5 0 0 1-10 0c0-3.8 3-6 5-9z"/></svg>',
    heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8.8 1.7z"/></svg>',
    thumb:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM7 11l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/></svg>',
    reply:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17l-5-5 5-5M4 12h12a4 4 0 0 1 4 4v2"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.8.7-5.1 4.6 1.4 6.7L12 17.8 6 21l1.4-6.7L2.3 9.7l6.8-.7z"/></svg>',
  };
  const REACTIONS = [{k:'fire',label:'Zajawka'},{k:'heart',label:'Serce'},{k:'thumb',label:'Popieram'}];

  const css = `
  .cmt{max-width:820px;}
  .cmt h3.sec{font-family:'Fraunces',serif;font-size:1.5rem;font-weight:500;margin:0 0 6px;color:var(--ink);}
  .cmt .sec-sub{font-size:0.84rem;color:var(--stone);margin-bottom:18px;}
  /* KRYTYCY */
  .crit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:12px;}
  .crit-card{display:flex;gap:14px;background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--ember-2);border-radius:16px;padding:18px;}
  .crit-card .av{width:56px;height:56px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:1.3rem;color:#fff6ea;background:linear-gradient(150deg,#ff8a3d,#e8552a);}
  .crit-card .who{font-weight:600;font-size:0.95rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .crit-card h4{font-family:'Fraunces',serif;font-weight:500;font-size:1.05rem;margin:6px 0 4px;line-height:1.25;color:var(--ink);}
  .crit-card p{font-size:0.85rem;color:var(--ink-dim);line-height:1.5;margin-bottom:10px;}
  .crit-card .read{font-size:0.8rem;font-weight:600;color:var(--ember-2);cursor:pointer;}
  .crit-card .read:hover{color:var(--ember-3);}
  .crit-score{margin-left:auto;text-align:center;flex-shrink:0;}
  .crit-score .n{font-family:'Fraunces',serif;font-size:1.7rem;line-height:1;color:var(--ember-3);}
  .crit-score .max{font-size:0.66rem;color:var(--stone);}
  .rank-badge{display:inline-flex;align-items:center;gap:5px;font-size:0.64rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:3px 9px;border-radius:100px;}
  .r-paz{background:rgba(138,121,96,0.16);color:#6b5a47;}
  .r-giermek{background:rgba(255,140,60,0.16);color:#b5560f;}
  .r-rycerz{background:rgba(232,85,42,0.14);color:#c43a13;}
  .r-choragy{background:rgba(120,60,20,0.14);color:#7a3618;}
  .r-kawaleria{background:linear-gradient(120deg,#ff8a3d,#e8552a);color:#fff6ea;}
  .r-krytyk{background:linear-gradient(120deg,#2a1208,#7a3618);color:#ffd2a8;}
  .cmt-divider{height:1px;background:var(--line);margin:26px 0 22px;}
  /* KOMENTARZE */
  .cmt-item{display:flex;gap:13px;padding:16px 0;border-top:1px solid var(--line);}
  .cmt-item:first-child{border-top:none;}
  .cmt-av{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.9rem;color:#fff6ea;background:linear-gradient(150deg,#ffd9a8,#ff8a3d);}
  .cmt-body{flex:1;min-width:0;}
  .cmt-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px;}
  .cmt-top .nm{font-weight:600;font-size:0.92rem;color:var(--ink);}
  .cmt-top .dt{font-size:0.74rem;color:var(--stone);margin-left:auto;}
  .cmt-text{font-size:0.9rem;color:var(--ink-dim);line-height:1.55;margin-bottom:10px;}
  .cmt-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .react{display:inline-flex;align-items:center;gap:6px;font-size:0.76rem;font-weight:600;color:var(--ink-dim);background:var(--surface-2);border:1px solid transparent;padding:5px 11px;border-radius:100px;cursor:pointer;transition:all .15s;}
  .react svg{width:15px;height:15px;}
  .react:hover{border-color:var(--line-strong);}
  .react.on{background:rgba(255,122,61,0.14);color:var(--ember-3);border-color:rgba(255,122,61,0.3);}
  .reply-btn{display:inline-flex;align-items:center;gap:6px;font-size:0.76rem;font-weight:600;color:var(--ink-dim);background:none;border:none;cursor:pointer;padding:5px 6px;}
  .reply-btn svg{width:15px;height:15px;}
  .reply-btn:hover{color:var(--ember-2);}
  .cmt-replies{margin-top:12px;padding-left:16px;border-left:2px solid var(--line);display:flex;flex-direction:column;gap:12px;}
  .cmt-reply{display:flex;gap:11px;}
  .cmt-reply .cmt-av{width:36px;height:36px;font-size:0.78rem;}
  .venue-reply{background:linear-gradient(120deg,rgba(255,138,61,0.1),var(--surface-2));border:1px solid rgba(255,122,61,0.35);border-radius:12px;padding:12px 14px;}
  .venue-reply .badge-v{display:inline-flex;align-items:center;gap:5px;font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#fff6ea;background:linear-gradient(120deg,#ff8a3d,#e8552a);padding:3px 9px;border-radius:100px;margin-bottom:6px;}
  .reply-form{margin-top:10px;display:flex;gap:8px;}
  .reply-form input{flex:1;padding:9px 13px;border:1px solid var(--line-strong);border-radius:10px;font-family:inherit;font-size:0.85rem;outline:none;color:var(--ink);background:var(--surface);}
  .reply-form input:focus{border-color:var(--ember-1);}
  .reply-form button,.cmt-add button{border:none;background:linear-gradient(120deg,#ff8a3d,#ff5a3d);color:#2a0e02;font:700 0.72rem 'Instrument Sans';letter-spacing:0.05em;text-transform:uppercase;border-radius:100px;padding:9px 16px;cursor:pointer;}
  .cmt-add{margin-top:22px;background:var(--surface-2);border:1px dashed var(--line-strong);border-radius:16px;padding:18px;}
  .cmt-add h4{font-size:0.98rem;font-weight:600;font-family:'Instrument Sans';margin-bottom:12px;color:var(--ink);}
  .cmt-add textarea{width:100%;min-height:70px;resize:vertical;padding:12px 14px;border:1px solid var(--line-strong);border-radius:11px;font-family:inherit;font-size:0.9rem;outline:none;color:var(--ink);background:var(--surface);margin-bottom:12px;}
  .cmt-add textarea:focus{border-color:var(--ember-1);}
  /* MODAL RECENZJI */
  .crit-modal-bg{position:fixed;inset:0;background:rgba(30,16,8,0.62);backdrop-filter:blur(3px);display:none;align-items:flex-start;justify-content:center;z-index:150;padding:40px 18px;overflow:auto;}
  .crit-modal-bg.open{display:flex;}
  .crit-modal{background:var(--bg);border-radius:20px;max-width:680px;width:100%;padding:30px 34px 34px;position:relative;margin:auto;box-shadow:0 30px 80px rgba(0,0,0,0.4);}
  .crit-modal .close{position:absolute;top:15px;right:18px;background:none;border:none;font-size:1.5rem;color:var(--stone);cursor:pointer;}
  .crit-modal .m-meta{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
  .crit-modal .m-meta .av{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;color:#fff6ea;background:linear-gradient(150deg,#ff8a3d,#e8552a);}
  .crit-modal .m-score{margin-left:auto;font-family:'Fraunces',serif;font-size:1.6rem;color:var(--ember-3);}
  .crit-modal h2{font-family:'Fraunces',serif;font-weight:500;font-size:1.7rem;line-height:1.15;margin-bottom:14px;color:var(--ink);}
  .crit-modal .m-body p{color:var(--ink-dim);line-height:1.75;margin-bottom:14px;font-size:1rem;}
  @media(max-width:560px){ .crit-score{display:none;} .cmt-top .dt{width:100%;margin-left:0;} }
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // ── przykładowe dane per typ ──
  const SAMPLE = {
    object: {
      replyLabel:'Odpowiedź obiektu',
      critics:[
        {name:'Wojciech Kadź', init:'WK', score:'8,8', title:'Rzymski przepych, który działa nie tylko na Instagramie', excerpt:'Colosseum Sauna Arena robi wrażenie skalą, ale prawdziwą wartością są ceremonie i obsługa.', body:['Satama to obiekt, który łatwo sprowadzić do efektownych zdjęć — antyczne kolumny, ogromna arena, para unosząca się pod sklepieniem. Byłoby jednak krzywdzące zatrzymać się na warstwie wizualnej.','Program ceremonii jest gęsty i różnorodny, a saunamistrzowie potrafią prowadzić seans jak spektakl — z narracją, muzyką i wyczuciem temperatury. Strefa banii i rytuał z wenikiem to mocne punkty.','Minusy? W szczycie weekendu bywa tłoczno, a część seansów wymaga wcześniejszej rezerwacji. Mimo to — jeden z najlepszych obiektów aufguss w Europie.'] },
        {name:'Ilona Brzoza', init:'IB', score:'9,1', title:'Nad jeziorem czas płynie inaczej', excerpt:'Połączenie natury i mistrzowskiego aufguss, jakiego trudno szukać gdzie indziej.', body:['Największym atutem Satamy jest kontekst — jezioro Scharmützelsee tuż obok sprawia, że schłodzenie po saunie staje się osobnym przeżyciem.','Ceremonie utrzymują wysoki, wyrównany poziom. Widać, że obiekt inwestuje w saunamistrzów i traktuje aufguss jako sztukę, nie dodatek.'] },
      ],
      comments:[
        {name:'Marek W.', rank:'rycerz', date:'maj 2026', text:'Najlepsze ceremonie, jakie widziałem w Europie. Nad jeziorem klimat nie do podrobienia.', reactions:{fire:14,heart:6,thumb:3}, replies:[ {venue:true, name:'Satama Sauna Resort', date:'maj 2026', text:'Dziękujemy za tak ciepłe słowa! Do zobaczenia na kolejnej nocy aufguss. 🔥'} ] },
        {name:'Anna K.', rank:'chorazy', date:'kwiecień 2026', text:'Magiczne miejsce, spędziłam tu cały dzień. Banya rewelacyjna.', reactions:{heart:9,thumb:2}, replies:[] },
        {name:'Tomasz P.', rank:'giermek', date:'marzec 2026', text:'Świetny obiekt, choć w weekendy bywa tłoczno. Warto rezerwować ceremonie z wyprzedzeniem.', reactions:{thumb:5}, replies:[ {name:'Kasia', rank:'paz', date:'marzec 2026', text:'Dokładnie, sobotnie popołudnia to szał. Polecam przyjść rano.'} ] },
      ],
    },
    master: {
      replyLabel:'Odpowiedź saunamistrza',
      critics:[
        {name:'Wojciech Kadź', init:'WK', score:'9,0', title:'Showman, który nie zapomina o rzemiośle', excerpt:'Maciej łączy widowiskowość z precyzją — rzadkie połączenie na tym poziomie.', body:['Piczura to saunamistrz, który rozumie, że aufguss jest teatrem. Jego seanse mają dramaturgię, ale pod spodem jest solidne rzemiosło: praca temperaturą, aromatami, tempem.','Na dużej arenie potrafi utrzymać uwagę setek osób, a w kameralnej saunie zbudować intymność. To klasa mistrzowska.'] },
      ],
      comments:[
        {name:'Ola R.', rank:'rycerz', date:'czerwiec 2026', text:'Byłam na jego nocy pod Tatrami — gęsia skórka. Absolutny mistrz.', reactions:{fire:21,heart:8}, replies:[ {venue:true, name:'Maciej Piczura', date:'czerwiec 2026', text:'Dziękuję! To publiczność tworzy tę energię. Do zobaczenia. 🙌'} ] },
        {name:'Piotr Z.', rank:'giermek', date:'maj 2026', text:'Warsztaty u Maćka to inny poziom. Dużo wyniosłem jako początkujący saunamistrz.', reactions:{thumb:6,heart:2}, replies:[] },
      ],
    },
    post: {
      replyLabel:'Odpowiedź autora',
      critics:[],
      comments:[
        {name:'Kasia M.', rank:'rycerz', date:'przedwczoraj', text:'Świetna inicjatywa! Czy na wydarzenie obowiązują wcześniejsze zapisy, czy wystarczy przyjść z biletem wstępu?', reactions:{fire:4,heart:1}, replies:[ {venue:true, name:'Autor wpisu', date:'wczoraj', text:'Dzień dobry! Liczba miejsc jest ograniczona, więc rekomendujemy rezerwację — link pojawi się w tym wpisie w piątek.'} ] },
        {name:'Bartek', rank:'giermek', date:'wczoraj', text:'Będzie transmisja / relacja dla tych, którzy nie mogą dojechać?', reactions:{thumb:6}, replies:[] },
        {name:'Ola R.', rank:'chorazy', date:'dziś', text:'Byłam na poprzedniej edycji — polecam każdemu. Klimat nie do opisania.', reactions:{fire:9,heart:3}, replies:[] },
      ],
    },
    tournament: {
      replyLabel:'Odpowiedź organizatora',
      critics:[
        {name:'Ilona Brzoza', init:'IB', score:'8,6', title:'Turniej, który wyniósł aufguss na poziom widowiska', excerpt:'The Battle of Gladiators to nie tylko rywalizacja — to święto społeczności.', body:['Format z eliminacjami krajowymi budującymi napięcie aż do finału w Czeladzi jest strzałem w dziesiątkę. Widz czuje stawkę.','Organizacja na wysokim poziomie, choć logistyka finału przy takiej frekwencji to wyzwanie. Kierunek — znakomity.'] },
      ],
      comments:[
        {name:'Bartek S.', rank:'chorazy', date:'kwiecień 2026', text:'Byłem na finale w Czeladzi — poziom kosmos. Colosseum Arena robi robotę.', reactions:{fire:33,heart:11}, replies:[ {venue:true, name:'Organizator WCF', date:'kwiecień 2026', text:'Dziękujemy za doping! Już pracujemy nad kolejną edycją.'} ] },
        {name:'Nina', rank:'rycerz', date:'kwiecień 2026', text:'Eliminacje w Suntago też były świetne. Fajnie, że można śledzić całą drogę zawodników.', reactions:{thumb:7}, replies:[] },
      ],
    },
  };

  // znani blogerzy → slug profilu/bloga
  const BLOG_SLUG = {'Wojciech Kadź':'wojciech-kadz'};
  function blogLink(name){ const s=BLOG_SLUG[name]; return s?`<a href="blog.html?blog=${s}" style="color:inherit">${esc(name)}</a>`:esc(name); }
  function avatarText(name){ return name.split(' ').map(n=>n[0]).slice(0,2).join(''); }
  function esc(s){ return String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }

  function render(mount, cfg){
    cfg = cfg||{};
    const base = SAMPLE[cfg.type] || SAMPLE.object;
    // stan (kopia, żeby akcje mogły mutować)
    const state = JSON.parse(JSON.stringify(base));
    if(cfg.replyLabel) state.replyLabel = cfg.replyLabel;
    const reacted = {}; // {commentIdx: Set(reactionKeys)}

    let modal = document.querySelector('.crit-modal-bg');
    if(!modal){
      modal=document.createElement('div'); modal.className='crit-modal-bg';
      modal.innerHTML='<div class="crit-modal"><button class="close" aria-label="Zamknij">×</button><div class="m-inner"></div></div>';
      modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('open'); });
      modal.querySelector('.close').addEventListener('click',()=>modal.classList.remove('open'));
      document.body.appendChild(modal);
    }
    function openReview(c){
      modal.querySelector('.m-inner').innerHTML =
        `<div class="m-meta"><div class="av">${avatarText(c.name)}</div><div><div style="font-weight:600">${blogLink(c.name)}</div><span class="rank-badge r-krytyk">${ICON.star} Bloger</span></div><div class="m-score">${c.score}<span style="font-size:0.7rem;color:var(--stone)">/10</span></div></div>
         <h2>${esc(c.title)}</h2><div class="m-body">${c.body.map(p=>`<p>${esc(p)}</p>`).join('')}</div>`;
      modal.classList.add('open');
    }

    function reactionsHTML(ci){
      const c=state.comments[ci];
      return REACTIONS.map(r=>{
        const on = reacted[ci] && reacted[ci].has(r.k);
        const n = (c.reactions[r.k]||0) + (on?1:0);
        return `<button class="react ${on?'on':''}" data-ci="${ci}" data-rk="${r.k}" title="${r.label}">${ICON[r.k]} ${n}</button>`;
      }).join('');
    }
    function replyHTML(rp){
      if(rp.venue) return `<div class="cmt-reply"><div class="cmt-av" style="background:linear-gradient(150deg,#ff8a3d,#e8552a)">${avatarText(rp.name)}</div>
        <div class="cmt-body"><div class="venue-reply"><span class="badge-v">${state.replyLabel}</span><div class="cmt-top"><span class="nm">${esc(rp.name)}</span><span class="dt">${esc(rp.date||'')}</span></div><div class="cmt-text" style="margin:0">${esc(rp.text)}</div></div></div></div>`;
      const rb = rp.rank?`<span class="rank-badge ${RANKS[rp.rank].cls}">${RANKS[rp.rank].label}</span>`:'';
      return `<div class="cmt-reply"><div class="cmt-av">${avatarText(rp.name)}</div>
        <div class="cmt-body"><div class="cmt-top"><span class="nm">${esc(rp.name)}</span>${rb}<span class="dt">${esc(rp.date||'')}</span></div><div class="cmt-text" style="margin:0">${esc(rp.text)}</div></div></div>`;
    }
    function commentHTML(c,ci){
      const rb = c.rank?`<span class="rank-badge ${RANKS[c.rank].cls}">${RANKS[c.rank].label}</span>`:'';
      const replies = c.replies&&c.replies.length?`<div class="cmt-replies">${c.replies.map(replyHTML).join('')}</div>`:'';
      return `<div class="cmt-item"><div class="cmt-av">${avatarText(c.name)}</div>
        <div class="cmt-body">
          <div class="cmt-top"><span class="nm">${esc(c.name)}</span>${rb}<span class="dt">${esc(c.date||'')}</span></div>
          <div class="cmt-text">${esc(c.text)}</div>
          <div class="cmt-actions">${reactionsHTML(ci)}<button class="reply-btn" data-reply="${ci}">${ICON.reply} Odpowiedz</button></div>
          <div class="reply-slot" data-slot="${ci}"></div>
          ${replies}
        </div></div>`;
    }

    function draw(){
      mount.className='cmt';
      const critHTML = state.critics.map((c,i)=>`
        <div class="crit-card">
          <div class="av">${c.init||avatarText(c.name)}</div>
          <div style="flex:1;min-width:0">
            <div class="who">${blogLink(c.name)} <span class="rank-badge r-krytyk">${ICON.star} Bloger</span></div>
            <h4>${esc(c.title)}</h4><p>${esc(c.excerpt)}</p>
            <span class="read" data-crit="${i}">Czytaj pełną recenzję →</span>
          </div>
          <div class="crit-score"><div class="n">${c.score}</div><div class="max">/ 10</div></div>
        </div>`).join('');
      const hasCritics = state.critics && state.critics.length;
      const critSection = hasCritics ? `
        <h3 class="sec">Recenzje blogerów</h3>
        <div class="sec-sub">Oceny zweryfikowanych blogerów saunowych.</div>
        <div class="crit-grid">${critHTML}</div>
        <div class="cmt-divider"></div>` : '';
      const cmtHead = cfg.type==='post' ? 'Komentarze' : 'Opinie społeczności';
      const cmtSub = cfg.type==='post'
        ? `${state.comments.length} ${state.comments.length===1?'komentarz':'komentarzy'} · dołącz do dyskusji i zadawaj pytania.`
        : `${state.comments.length} ${state.comments.length===1?'opinia':'opinii'} · dodawaj recenzje i zdobywaj rangi (Paź → Kawaleria).`;
      mount.innerHTML = `
        ${critSection}
        <h3 class="sec">${cmtHead}</h3>
        <div class="sec-sub">${cmtSub}</div>
        <div id="cmtList">${state.comments.map(commentHTML).join('')}</div>
        <div class="cmt-add"><h4>${cfg.type==='post'?'Dodaj komentarz':'Dodaj swoją opinię'}</h4><textarea placeholder="${cfg.type==='post'?'Napisz komentarz lub zadaj pytanie…':'Podziel się wrażeniami…'}"></textarea><button data-add>Opublikuj</button></div>`;

      mount.querySelectorAll('.read').forEach(el=>el.addEventListener('click',()=>openReview(state.critics[+el.dataset.crit])));
      mount.querySelectorAll('.react').forEach(b=>b.addEventListener('click',()=>{
        const ci=+b.dataset.ci, rk=b.dataset.rk; reacted[ci]=reacted[ci]||new Set();
        reacted[ci].has(rk)?reacted[ci].delete(rk):reacted[ci].add(rk); draw();
      }));
      mount.querySelectorAll('[data-reply]').forEach(b=>b.addEventListener('click',()=>{
        const ci=b.dataset.reply, slot=mount.querySelector(`.reply-slot[data-slot="${ci}"]`);
        if(slot.dataset.open){ slot.innerHTML=''; slot.dataset.open=''; return; }
        slot.dataset.open='1';
        slot.innerHTML=`<div class="reply-form"><input type="text" placeholder="Twoja odpowiedź…"><button>Wyślij</button></div>`;
        const inp=slot.querySelector('input'); inp.focus();
        slot.querySelector('button').addEventListener('click',()=>{
          const v=inp.value.trim(); if(!v)return;
          state.comments[+ci].replies.push({name:'Ty', rank:'paz', date:'przed chwilą', text:v}); draw();
        });
      }));
      mount.querySelector('[data-add]').addEventListener('click',()=>{
        const ta=mount.querySelector('.cmt-add textarea'), v=ta.value.trim(); if(!v)return;
        state.comments.unshift({name:'Ty', rank:'paz', date:'przed chwilą', text:v, reactions:{fire:0,heart:0,thumb:0}, replies:[]}); draw();
      });
    }
    draw();
  }

  window.AufgussComments = { render, RANKS };
})();
