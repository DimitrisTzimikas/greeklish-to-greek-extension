const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const status = document.getElementById("status");
const toggleKey = document.getElementById("toggleKey");
const shortcutInput = document.getElementById("shortcutInput");
const resetBtn = document.getElementById("resetBtn");
const shortcutHint = document.getElementById("shortcutHint");

const DEFAULT_SHORTCUT = { ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, key: "g" };

function formatShortcut(s) {
  const parts = [];
  if (s.ctrlKey) parts.push("Ctrl");
  if (s.metaKey) parts.push("Cmd");
  if (s.altKey) parts.push("Alt");
  if (s.shiftKey) parts.push("Shift");
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join(" + ");
}

// Load saved settings
chrome.storage.local.get(["anthropicApiKey", "shortcut"], (data) => {
  if (data.anthropicApiKey) {
    apiKeyInput.value = data.anthropicApiKey;
  }
  const shortcut = data.shortcut || DEFAULT_SHORTCUT;
  shortcutInput.textContent = formatShortcut(shortcut);
});

toggleKey.addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    status.textContent = "Please enter an API key";
    status.className = "status error";
    return;
  }
  if (!key.startsWith("sk-ant-")) {
    status.textContent = "Key should start with sk-ant-";
    status.className = "status error";
    return;
  }
  chrome.storage.local.set({ anthropicApiKey: key }, () => {
    status.textContent = "Saved!";
    status.className = "status success";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});

// Shortcut recorder
let recording = false;

shortcutInput.addEventListener("click", () => {
  recording = true;
  shortcutInput.textContent = "Press keys...";
  shortcutInput.classList.add("recording");
  shortcutHint.textContent = "Press your desired shortcut";
  shortcutInput.focus();
});

shortcutInput.addEventListener("keydown", (e) => {
  if (!recording) return;
  e.preventDefault();
  e.stopPropagation();

  // Ignore lone modifier keys
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

  // Require at least one modifier
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    shortcutHint.textContent = "Must include Ctrl, Cmd, or Alt";
    return;
  }

  const shortcut = {
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    key: e.key.toLowerCase()
  };

  chrome.storage.local.set({ shortcut }, () => {
    shortcutInput.textContent = formatShortcut(shortcut);
    shortcutInput.classList.remove("recording");
    shortcutHint.textContent = "Shortcut saved!";
    recording = false;
    setTimeout(() => { shortcutHint.textContent = "Click to record new shortcut"; }, 2000);
  });
});

shortcutInput.addEventListener("blur", () => {
  if (!recording) return;
  recording = false;
  shortcutInput.classList.remove("recording");
  chrome.storage.local.get("shortcut", (data) => {
    const shortcut = data.shortcut || DEFAULT_SHORTCUT;
    shortcutInput.textContent = formatShortcut(shortcut);
    shortcutHint.textContent = "Click to record new shortcut";
  });
});

resetBtn.addEventListener("click", () => {
  chrome.storage.local.set({ shortcut: DEFAULT_SHORTCUT }, () => {
    shortcutInput.textContent = formatShortcut(DEFAULT_SHORTCUT);
    shortcutInput.classList.remove("recording");
    shortcutHint.textContent = "Reset to default!";
    recording = false;
    setTimeout(() => { shortcutHint.textContent = "Click to record new shortcut"; }, 2000);
  });
});
