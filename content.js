const DEFAULT_SHORTCUT = { ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, key: "g" };
let currentShortcut = DEFAULT_SHORTCUT;

chrome.storage.local.get("shortcut", (data) => {
  if (data.shortcut) currentShortcut = data.shortcut;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcut) {
    currentShortcut = changes.shortcut.newValue || DEFAULT_SHORTCUT;
  }
});

document.addEventListener("keydown", (e) => {
  if (
    e.ctrlKey === currentShortcut.ctrlKey &&
    e.shiftKey === currentShortcut.shiftKey &&
    e.altKey === currentShortcut.altKey &&
    e.metaKey === currentShortcut.metaKey &&
    e.key.toLowerCase() === currentShortcut.key
  ) {
    e.preventDefault();
    handleTranslation();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "translate") {
    handleTranslation();
  }
  if (msg.action === "status") {
    showToast(msg.message, "loading");
  }
});

async function handleTranslation() {
  const activeEl = document.activeElement;
  if (!activeEl) return;

  let greeklishText = "";
  let selectionStart = 0;
  let selectionEnd = 0;
  let isContentEditable = false;
  let savedRange = null;
  let hadSelection = false;

  if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
    selectionStart = activeEl.selectionStart;
    selectionEnd = activeEl.selectionEnd;

    if (selectionStart !== selectionEnd) {
      greeklishText = activeEl.value.substring(selectionStart, selectionEnd);
    } else {
      greeklishText = activeEl.value;
      selectionStart = 0;
      selectionEnd = activeEl.value.length;
    }
  } else {
    // Walk up to find the closest contenteditable ancestor
    let editableEl = activeEl;
    while (editableEl && !editableEl.isContentEditable && editableEl !== document.body) {
      editableEl = editableEl.parentElement;
    }
    if (!editableEl || !editableEl.isContentEditable) {
      // Also check if the active element itself has contenteditable
      if (activeEl.getAttribute && activeEl.getAttribute("contenteditable") === "true") {
        editableEl = activeEl;
      } else {
        return;
      }
    }

    isContentEditable = true;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        savedRange = selection.getRangeAt(0).cloneRange();
      } catch (e) {
        savedRange = null;
      }
      if (!selection.isCollapsed) {
        greeklishText = selection.toString();
        hadSelection = true;
      } else {
        greeklishText = editableEl.innerText;
      }
    }
  }

  if (!greeklishText.trim()) return;

  showToast("Translating...", "loading");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "callApi",
      text: greeklishText
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const greek = response.text;
    let replaced = false;

    if (isContentEditable) {
      replaced = tryReplaceContentEditable(activeEl, greek, savedRange, hadSelection);
    } else {
      activeEl.focus();
      activeEl.setSelectionRange(selectionStart, selectionEnd);
      replaced = document.execCommand("insertText", false, greek);
    }

    if (replaced) {
      showToast("Done!", "success");
    } else {
      // Text is already on clipboard (copied by background script)
      showToast("Translated! Cmd+V to paste", "success", 4000);
    }
  } catch (err) {
    console.error("Greeklish translation error:", err);
    let msg = err.message;
    if (msg.startsWith("model:")) {
      msg = "Model unavailable. Try again shortly.";
    }
    showToast("Failed: " + msg, "error", 4000);
  }
}

function tryReplaceContentEditable(el, newText, savedRange, hadSelection) {
  try {
    el.focus();
    const selection = window.getSelection();

    if (hadSelection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const success = document.execCommand("insertText", false, newText);
    if (success) return true;

    // Fallback: paste event
    const dt = new DataTransfer();
    dt.setData("text/plain", newText);
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dt
    });
    el.dispatchEvent(pasteEvent);

    if (el.innerText.includes(newText)) return true;
  } catch (e) {
    console.error("Greeklish replace error:", e);
  }

  return false;
}

function showToast(message, type, duration) {
  const existing = document.getElementById("greeklish-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "greeklish-toast";
  toast.textContent = message;

  const colors = {
    loading: { bg: "#1e293b", text: "#f1f5f9" },
    success: { bg: "#16a34a", text: "#fff" },
    error: { bg: "#dc2626", text: "#fff" }
  };
  const c = colors[type] || colors.loading;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: c.bg,
    color: c.text,
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    zIndex: "2147483647",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transition: "opacity 0.3s",
    opacity: "1"
  });

  document.body.appendChild(toast);

  if (type !== "loading") {
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, duration || 2000);
  }
}
