// static/js/translator.js

(async function(){
  // 1) Supported languages
  const langs = [
    { code:'en', label:'English' },
    { code:'ta', label:'தமிழ்'   },
    { code:'hi', label:'हिन्दी'  },
    { code:'ml', label:'മലയാളം' },
    { code:'te', label:'తెలుగు'  }
  ];

  // 2) Manual override for gender/options etc if needed
  const optionMap = {
    // ...
  };

  function getLang(){ return localStorage.getItem('lang') || 'en'; }
  function setLang(c){ localStorage.setItem('lang', c); }

  // 3) Collect all text nodes (skip scripts/styles)
  function collectTextNodes(){
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode(node){
          const t = node.textContent.trim();
          if (!t) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT','STYLE','NOSCRIPT','IFRAME','OPTION']
                .includes(node.parentNode.tagName))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const out = [];
    while(walker.nextNode()) out.push(walker.currentNode);
    return out;
  }

  let textNodes, originals;
  async function translatePage(target){
    if (target==='en') {
      textNodes.forEach(n=>n.textContent = originals.get(n));
    } else {
      // batch & dedupe
      const unique = [...new Set(textNodes.map(n=>originals.get(n)))];
      const res = await fetch('/api/translate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          q: unique, source:'en', target, format:'text'
        })
      });
      const data = await res.json();
      const map = {};
      unique.forEach((s,i)=> map[s] = data[i].translatedText || s);
      textNodes.forEach(n=>{
        const orig = originals.get(n);
        n.textContent = map[orig] || orig;
      });
    }
    // manual option overrides (if you have any <select> you want custom)
    document.querySelectorAll('select option').forEach(opt=>{
      const key = opt.value.toLowerCase();
      const lang = getLang();
      if (optionMap[key] && optionMap[key][lang])
        opt.textContent = optionMap[key][lang];
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    textNodes = collectTextNodes();
    originals = new Map(textNodes.map(n=>[n,n.textContent]));

    // build the little floating button
    const btn = document.createElement('div');
    btn.id = 'translatorBtn';
    Object.assign(btn.style, {
      position:'fixed', bottom:'16px', right:'16px',
      background:'#fff', color:'#000', border:'1px solid #ccc',
      borderRadius:'8px', padding:'8px 12px', cursor:'pointer',
      boxShadow:'0 2px 6px rgba(0,0,0,0.2)', zIndex:2000
    });
    document.body.appendChild(btn);

    // the language menu
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position:'fixed', bottom:'56px', right:'16px',
      background:'#fff', borderRadius:'8px', boxShadow:'0 2px 6px rgba(0,0,0,0.2)',
      display:'none', flexDirection:'column', zIndex:2000
    });
    langs.forEach(l=>{
      const it = document.createElement('div');
      it.textContent = l.label;
      Object.assign(it.style, {
        padding:'8px 12px', cursor:'pointer', color:'#000'
      });
      it.onmouseenter = ()=>it.style.background='rgba(0,0,0,0.05)';
      it.onmouseleave = ()=>it.style.background='transparent';
      it.onclick = ()=>{
        setLang(l.code);
        translatePage(l.code);
        updateBtn();
        menu.style.display = 'none';
      };
      menu.appendChild(it);
    });
    document.body.appendChild(menu);

    btn.onclick = ()=> menu.style.display = menu.style.display==='flex' ? 'none' : 'flex';

    function updateBtn(){
      const code = getLang();
      btn.textContent = `🌐 ${langs.find(x=>x.code===code).label}`;
    }
    updateBtn();
    translatePage(getLang());
  });
})();
