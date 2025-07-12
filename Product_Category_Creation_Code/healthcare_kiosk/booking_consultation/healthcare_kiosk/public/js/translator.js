const LANGUAGE_CODES = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
  { code: "ml", label: "മലയാളം" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" }
];

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("custom-translate-toggle");
  const langLabel = document.getElementById("lang-label");

  // Dropdown menu (if not already created)
  let menu = document.getElementById("custom-translate-dropdown");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "custom-translate-dropdown";
    menu.className = "lang-dropdown notranslate";
    menu.setAttribute("translate", "no");
    menu.style.display = "none";
    LANGUAGE_CODES.forEach(lang => {
      let btn = document.createElement("button");
      btn.textContent = lang.label;
      btn.setAttribute("data-lang", lang.code);
      btn.className = "notranslate";
      btn.setAttribute("translate", "no");
      btn.onclick = (e) => {
        e.stopPropagation();
        setLanguage(lang.code);
        menu.style.display = "none";
      };
      menu.appendChild(btn);
    });
    toggle.appendChild(menu);
  }

  // Toggle menu show/hide
  toggle.onclick = (e) => {
    e.stopPropagation();
    menu.style.display = (menu.style.display === "block" ? "none" : "block");
  };
  document.body.onclick = () => { menu.style.display = "none"; };

  function setLanguage(code) {
    document.cookie = `googtrans=/en/${code};domain=${window.location.hostname};path=/`;
    localStorage.setItem("ui-lang", code);
    updateLangLabel(code);
    setTimeout(() => { location.reload(); }, 200);
  }
  function updateLangLabel(code) {
    const found = LANGUAGE_CODES.find(l => l.code === code);
    langLabel.textContent = found ? found.label : "English";
  }

  // Initial
  let lang = localStorage.getItem("ui-lang") || "en";
  let match = document.cookie.match(/googtrans=\/en\/(\w+)/);
  if (match && match[1]) lang = match[1];
  updateLangLabel(lang);
});
