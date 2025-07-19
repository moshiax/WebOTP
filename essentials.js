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

// ================================
// URL Updater
// ================================

function updateURL() {
  const data = JSON.stringify(keys);
  const base64Data = base64EncodeUnicode(data);
  const newURL =
    window.location.origin +
    window.location.pathname +
    "#keys=" +
    base64Data;
  history.replaceState(null, "", newURL);
}

function getKeysFromURL() {
  if (window.location.hash.startsWith("#keys=")) {
    try {
return JSON.parse(
  base64DecodeUnicode(window.location.hash.substring(6))
);
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

window.alert = function (message) {
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

    if (PasswordHideOn === 0) {
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

window.prompt = customPrompt;

document.getElementById('customPromptInput').addEventListener('input', function() {
  document.getElementById('customPromptOk').disabled = !this.value.trim();
});

