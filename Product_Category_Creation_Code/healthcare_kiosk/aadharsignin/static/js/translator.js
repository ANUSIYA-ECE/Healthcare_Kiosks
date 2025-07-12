// static/js/translator.js
(function(){
  // — Supported languages —
  const langs = [
    { code:'en', label:'English' },
    { code:'ta', label:'தமிழ்'   },
    { code:'hi', label:'हिन्दी'  },
    { code:'ml', label:'മലയാളം' },
    { code:'te', label:'తెలుగు'  }
  ];

  // — Remember user’s choice in localStorage —
  function getLang(){ return localStorage.getItem('lang') || 'en'; }
  function setLang(c){ localStorage.setItem('lang', c); }

  // — Collect all text nodes to translate (skip OPTION, SCRIPT, STYLE, IFRAME) —
  function collectTextNodes(){
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode(n) {
          if (!n.textContent.trim()) return NodeFilter.FILTER_REJECT;
          const p = n.parentNode.tagName;
          if (['SCRIPT','STYLE','NOSCRIPT','IFRAME','OPTION'].includes(p))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const arr = [];
    while(walker.nextNode()) arr.push(walker.currentNode);
    return arr;
  }

  let textNodes, originals;

  // — Call our Flask proxy to translate —
  async function translatePage(to){
    if (to==='en') {
      textNodes.forEach(n => n.textContent = originals.get(n));
    } else {
      const unique = [...new Set(textNodes.map(n=>originals.get(n)))];
      const res = await fetch('/api/translate',{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ q: unique, source:'en', target:to, format:'text' })
      });
      const data = await res.json();
      const map = {};
      unique.forEach((s,i)=> map[s] = data[i].translatedText || s);
      textNodes.forEach(n=>{
        const o = originals.get(n);
        n.textContent = map[o] || o;
      });
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // 1) grab all text nodes
    textNodes = collectTextNodes();
    originals = new Map(textNodes.map(n=>[n,n.textContent]));

    // 2) create translate button
    const btn = document.createElement('div');
    btn.id = 'translatorBtn';
    Object.assign(btn.style,{
      position:'fixed', bottom:'16px', right:'16px', zIndex:2000,
      background:'white', color:'black',
      border:'1px solid #ccc', borderRadius:'8px',
      padding:'8px 12px', cursor:'pointer',
      boxShadow:'0 2px 6px rgba(0,0,0,0.2)',
      display:'flex', alignItems:'center', userSelect:'none'
    });
    document.body.appendChild(btn);

    // 3) create hidden menu
    const menu = document.createElement('div');
    Object.assign(menu.style,{
      position:'fixed', bottom:'56px', right:'16px', zIndex:2000,
      background:'white', color:'black',
      border:'1px solid #ccc', borderRadius:'8px',
      boxShadow:'0 2px 6px rgba(0,0,0,0.2)',
      display:'none', flexDirection:'column'
    });
    langs.forEach(l=>{
      const item = document.createElement('div');
      item.textContent = l.label;
      Object.assign(item.style,{
        padding:'8px 12px', cursor:'pointer', userSelect:'none'
      });
      item.addEventListener('click', ()=>{
        setLang(l.code);
        translatePage(l.code);
        updateBtn();
        menu.style.display='none';
      });
      item.addEventListener('mouseover', ()=>item.style.background='#f0f0f0');
      item.addEventListener('mouseout', ()=>item.style.background='white');
      menu.appendChild(item);
    });
    document.body.appendChild(menu);

    btn.addEventListener('click', ()=> {
      menu.style.display = menu.style.display==='flex' ? 'none' : 'flex';
      menu.style.flexDirection = 'column';
    });

    function updateBtn(){
      const code = getLang();
      const lbl  = langs.find(x=>x.code===code).label;
      btn.textContent = `🌐 ${lbl}`;
    }
    updateBtn();

    // 4) initial translate
    translatePage(getLang());

    // 5) inject CSS to hide Google’s UI
    const style = document.createElement('style');
    style.innerHTML = `
      /* hide Google top banner */
      .goog-te-banner-frame, .goog-te-banner-frame.skiptranslate {
        display: none !important;
      }

      /* hide Google drop-down & rating balloon */
      .goog-te-menu-frame, .goog-te-balloon-frame {
        display: none !important;
      }

      /* prevent body push-down */
      body { top:0 !important; }

      /* hide default widget */
      #google_translate_element { display:none !important; }
      .goog-logo-link { display:none !important; }
      .goog-te-gadget { color:transparent !important; }
    `;
    document.head.appendChild(style);
  });
})();
