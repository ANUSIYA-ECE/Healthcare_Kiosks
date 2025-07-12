// public/js/translator.js

(async function(){
  // 1) Supported languages
  const langs = [
    { code:'en', label:'English' },
    { code:'ta', label:'தமிழ்'   },
    { code:'hi', label:'हिन्दी'  },
    { code:'ml', label:'മലയാളം' },
    { code:'te', label:'తెలుగు'  }
  ];

  // 2) Gender option overrides
  const optionMap = {
    male: {
      ta: 'ஆண்',
      hi: 'पुरुष',
      ml: 'പുരുഷൻ',
      te: 'పురుషుడు'
    },
    female: {
      ta: 'பெண்',
      hi: 'महिला',
      ml: 'സ്ത്രീ',
      te: 'స్త్రీ'
    }
  };

  // 3) Manual Hindi dictionary for ALL static text + labels
  const hindiDict = {
    'Start':                            'आरंभ करें',
    'Ready to check your vitals?':      'अपने जीवन संकेत जांचने के लिए तैयार?',
    'Enter Your Vitals':                'अपने जीवन संकेत दर्ज करें',
    '🩺 Please enter all fields below':'🩺 कृपया नीचे सभी फ़ील्ड भरें',
    'Age':                              'आयु',
    'Gender':                           'लिंग',
    'Select…':                          'चुनें…',
    'male':                             'पुरुष',
    'female':                           'महिला',
    'Blood Pressure (e.g. 120/80)':     'रक्तचाप (उदा. 120/80)',
    'Pulse Rate (bpm)':                 'नाड़ी दर (bpm)',
    'Body Temperature (°F)':            'शरीरिक तापमान (°F)',
    'Height (cm)':                      'ऊँचाई (cm)',
    'Weight (kg)':                      'वजन (kg)',
    'Oxygen Saturation (%)':            'ऑक्सीजन संतृप्ति (%)',
    'Submit':                           'प्रस्तुत करें',
    'Try Again':                        'पुनः प्रयास करें',
    'Start Over':                       'फिर से शुरू करें',
    'Your Vitals Summary':              'आपके जीवन संकेत सारांश',
    'Here is your result':              'यहाँ आपका परिणाम है',
    'Blood Pressure:':                  'रक्तचाप:',
    'Pulse Rate:':                      'नाड़ी दर:',
    'Body Temperature:':                'शरीरिक तापमान:',
    'Oxygen Saturation:':               'ऑक्सीजन संतृप्ति:',
    'BMI:':                             'बीएमआई:',
    // **Classification labels**
    'normal':                           'सामान्य',
    'elevated':                         'उच्च',
    'critical':                         'गंभीर'
  };

  function getLang(){ return localStorage.getItem('lang') || 'en'; }
  function setLang(c){ localStorage.setItem('lang', c); }

  // 4) Gather all text nodes (skip OPTIONs)
  function collectTextNodes(){
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode(node){
          const t = node.textContent.trim();
          if (!t) return NodeFilter.FILTER_REJECT;
          const p = node.parentNode.tagName;
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

  // 5) Translation pass
  async function translatePage(target){
    if (target === 'en') {
      // restore originals
      textNodes.forEach(n => n.textContent = originals.get(n));
    }
    else if (target === 'hi') {
      // use manual dictionary
      textNodes.forEach(n => {
        const orig = originals.get(n);
        n.textContent = hindiDict[orig] || orig;
      });
    }
    else {
      // fallback proxy for other languages
      const unique = [...new Set(textNodes.map(n=>originals.get(n)))];
      const res = await fetch('/api/translate',{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ q: unique, source:'en', target, format:'text' })
      });
      const data = await res.json();
      const map = {};
      unique.forEach((s,i)=> map[s] = data[i].translatedText || s);
      textNodes.forEach(n=>{
        const orig = originals.get(n);
        n.textContent = map[orig] || orig;
      });
    }

    // override gender options
    document.querySelectorAll('select[name="gender"] option').forEach(opt=>{
      const key = opt.value.toLowerCase();
      const lang = getLang();
      if (optionMap[key] && optionMap[key][lang]) {
        opt.textContent = optionMap[key][lang];
      }
    });
  }

  // 6) Build the UI toggle
  document.addEventListener('DOMContentLoaded', ()=>{
    textNodes = collectTextNodes();
    originals = new Map(textNodes.map(n=>[n,n.textContent]));

    const btn = document.createElement('div');
    btn.id = 'translatorBtn';
    Object.assign(btn.style,{
      position:'fixed', bottom:'16px', right:'16px', zIndex:'2000',
      background:'rgba(255,255,255,0.9)', border:'1px solid #ccc',
      borderRadius:'8px', padding:'8px 12px', cursor:'pointer',
      display:'flex', alignItems:'center',
      boxShadow:'0 2px 6px rgba(0,0,0,0.3)', userSelect:'none',
      fontSize:'1rem'
    });
    document.body.appendChild(btn);

    const menu = document.createElement('div');
    Object.assign(menu.style,{
      position:'fixed', bottom:'56px', right:'16px', zIndex:'2000',
      background:'white', borderRadius:'8px',
      boxShadow:'0 2px 6px rgba(0,0,0,0.2)',
      display:'none', flexDirection:'column', overflow:'hidden'
    });
    langs.forEach(l=>{
      const item = document.createElement('div');
      item.textContent = l.label;
      Object.assign(item.style,{
        padding:'8px 12px', cursor:'pointer',
        fontSize:'0.9rem', userSelect:'none'
      });
      item.onmouseover = ()=>item.style.background='#eee';
      item.onmouseout  = ()=>item.style.background='white';
      item.onclick     = ()=>{
        setLang(l.code);
        translatePage(l.code);
        updateButton();
        menu.style.display='none';
      };
      menu.appendChild(item);
    });
    document.body.appendChild(menu);

    btn.onclick = ()=> {
      menu.style.display = menu.style.display==='flex' ? 'none' : 'flex';
    };

    function updateButton(){
      const code = getLang();
      const lbl  = langs.find(x=>x.code===code).label;
      btn.innerHTML = `🌐 ${lbl}`;
    }
    updateButton();

    // initial pass
    translatePage(getLang());
  });
})();
