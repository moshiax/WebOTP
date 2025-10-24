// ================================
// URL Updater
// ================================

function updateURL() {
    if (!config.get("updateURL")) return;

    if (!keys || keys.length === 0) {
        history.replaceState(null, "", globalThis.location.origin + globalThis.location.pathname);
        return;
    }

    const keysForURL = keys.map(k => prepareKey(k, { shortImport: true }));

    const data = JSON.stringify(keysForURL);
    const base64Data = base64EncodeUnicode(data);
    const newURL = globalThis.location.origin + globalThis.location.pathname + "#keys=" + base64Data;
    history.replaceState(null, "", newURL);
}

function getKeysFromURL() {
    if (globalThis.location.hash.startsWith("#keys=")) {
        try {
            return JSON.parse(base64DecodeUnicode(globalThis.location.hash.substring(6)));
        } catch (e) {
            console.error("Error reading keys from URL:", e);
        }
    }
    return null;
}

// ================================
// Notifications
// ================================

function showNotification(message) {
  const n = document.getElementById("notification");
  n.querySelector("p").innerHTML = message;
  n.style.display = "block";
  n.style.animation = "fadeIn 0.5s ease-in-out";
  setTimeout(() => {
    n.style.animation = "fadeOut 0.5s ease-in-out";
    setTimeout(() => {
n.style.display = "none";
    }, 500);
  }, 2300);
}

globalThis.alert = function (message) {
  showNotification(message);
};

// ================================
// Custom Prompt
// ================================

function customPrompt(text, isPassword = 0, noEscape = 0) {
  return new Promise((resolve) => {
    const promptDialog = document.getElementById("customPromptDialog");
    const promptText = document.getElementById("customPromptText");
    const promptInput = document.getElementById("customPromptInput");
    const okBtn = document.getElementById("customPromptOk");
    const cancelBtn = document.getElementById("customPromptCancel");

    promptText.innerText = text;
    promptInput.value = "";

    if (config.get('passwordHideOn') === false) {
      promptInput.type = "text";
    } else {
      promptInput.type = isPassword ? "password" : "text";
    }

    okBtn.disabled = true;
    promptDialog.showModal();

    function blockEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
      }
    }

    if (noEscape === 1) {
      promptDialog.addEventListener("cancel", preventCancel);
      document.addEventListener("keydown", blockEscape);
    }

    function preventCancel(e) {
      e.preventDefault();
    }

    function cleanup() {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      if (noEscape === 1) {
        document.removeEventListener("keydown", blockEscape);
        promptDialog.removeEventListener("cancel", preventCancel);
      }
      promptInput.type = "text";
      promptDialog.close();
    }

    function onOk(e) {
      e.preventDefault();
      resolve(promptInput.value);
      cleanup();
    }

    function onCancel() {
      resolve(null);
      cleanup();
    }

    promptInput.addEventListener('input', function() {
      okBtn.disabled = !this.value.trim();
    });

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

globalThis.prompt = customPrompt;

document.getElementById('customPromptInput').addEventListener('input', function() {
  document.getElementById('customPromptOk').disabled = !this.value.trim();
});

// ================================
// Config
// ================================

const config = {
    key: 'config',
    values: {},
    defaults: {},

    load() {
        try {
            const stored = localStorage.getItem(this.key);
            if (stored) {
                this.values = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Error loading config:", e);
            this.values = {};
        }

        for (let key in this.defaults) {
            if (!(key in this.values)) {
                this.values[key] = this.defaults[key];
            }
        }
    },

    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.values));
        } catch (e) {
            console.error("Error saving config:", e);
        }
    },

    set(key, value) {
        this.values[key] = value;
        this.save();
    },

    get(key) {
        return this.values[key];
    },

    reset(key) {
        if (key in this.defaults) {
            this.values[key] = this.defaults[key];
            this.save();
        }
    },

    exportstr() {
        return JSON.stringify(this.values);
    },

    importstr(str) {
        try {
            const obj = JSON.parse(str);
            if (typeof obj === 'object' && obj !== null) {
                this.values = obj;
                this.save();
            }
        } catch (e) {
            console.error("[Config] Invalid import string", e);
        }
    }
};

// ================================
// Serviceworker
// ================================

if (location.origin !== "null" && location.protocol !== "file:") {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.log("sw registered"))
      .catch((error) => console.error("sw error:", error));
  }
}

