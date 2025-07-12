// static/js/translator.js

(function(){
  // 1) Callback once Google's translate script loads
  window.googleTranslateElementInit = function(){
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'en,ta,hi,ml,te',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    }, 'google_translate_element');
  };

  // 2) Inject Google's translate library
  const gtScript = document.createElement('script');
  gtScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(gtScript);

  // 3) Our supported languages
  const langs = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'te', label: 'తెలుగు' }
  ];

  // Helpers to read/write the Google Translate cookie
  function getLang(){
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]+\/([^;]+)/);
    return m ? m[1] : 'en';
  }
  function setLang(code){
    // set both paths to cover all variations
    document.cookie = `googtrans=/en/${code};path=/`;
    document.cookie = `googtrans=/en/${code};path=/translate_a`;
  }

  // 4) Build our custom button + menu
  document.addEventListener('DOMContentLoaded', ()=>{

    // a) Create the toggle button
    const btn = document.createElement('div');
    btn.id = 'customTranslateBtn';
    Object.assign(btn.style, {
      position:       'fixed',
      bottom:         '16px',
      right:          '16px',
      zIndex:         '2000',
      background:     '#fff',
      color:          '#000',
      border:         '1px solid #ccc',
      borderRadius:   '8px',
      padding:        '8px 12px',
      cursor:         'pointer',
      display:        'flex',
      alignItems:     'center',
      boxShadow:      '0 2px 6px rgba(0,0,0,0.2)',
      userSelect:     'none',
      fontSize:       '1rem'
    });
    document.body.appendChild(btn);

    // b) Create the dropdown menu
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position:       'fixed',
      bottom:         '56px',
      right:          '16px',
      zIndex:         '2000',
      background:     '#fff',
      borderRadius:   '8px',
      boxShadow:      '0 2px 6px rgba(0,0,0,0.2)',
      display:        'none',
      flexDirection:  'column',
      overflow:       'hidden'
    });
    langs.forEach(lang => {
      const item = document.createElement('div');
      item.textContent = lang.label;
      Object.assign(item.style, {
        padding:      '8px 12px',
        cursor:       'pointer',
        fontSize:     '0.9rem',
        userSelect:   'none',
        color:        '#000'
      });
      item.onmouseover = () => item.style.background = 'rgba(0,0,0,0.05)';
      item.onmouseout  = () => item.style.background = 'transparent';
      item.onclick     = () => {
        setLang(lang.code);
        window.location.reload();
      };
      menu.appendChild(item);
    });
    document.body.appendChild(menu);

    // c) Toggle menu on button click
    btn.onclick = () => {
      menu.style.display = (menu.style.display === 'flex' ? 'none' : 'flex');
    };

    // d) Update button label based on current language
    function updateButton(){
      const cur = getLang();
      const lbl = langs.find(l => l.code === cur).label;
      btn.textContent = `🌐 ${lbl}`;
    }
    updateButton();
  });

  // 5) Inject CSS to hide all Google Translate UI elements
  const style = document.createElement('style');
  style.innerHTML = `
    /* Hide the top bar ("Translated into…") */
    .goog-te-banner-frame.skiptranslate { display: none !important; }

    /* Hide the Google menu iframe */
    .goog-te-menu-frame { display: none !important; }

    /* Hide the little hover/tooltip rating box */
    .goog-te-balloon-frame, #goog-gt-tt { display: none !important; }

    /* Hide any default widget container */
    #google_translate_element, .goog-te-menu-value { display: none !important; }

    /* Prevent page shifting when banner is hidden */
    body { top: 0 !important; }
  `;
  document.head.appendChild(style);

})();
