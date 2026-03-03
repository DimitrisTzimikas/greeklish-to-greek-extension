chrome.commands.onCommand.addListener((command) => {
  if (command === "translate-greeklish") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "translate" });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "callApi") {
    handleApiCall(msg.text)
      .then((result) => {
        // Copy to clipboard via offscreen document or fallback
        copyToClipboard(result);
        return sendResponse({ success: true, text: result });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function copyToClipboard(text) {
  try {
    // Use offscreen document to access clipboard API from background
    const offscreenUrl = "offscreen.html";
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"]
    });
    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: offscreenUrl,
        reasons: ["CLIPBOARD"],
        justification: "Copy translated text to clipboard"
      });
    }
    // Send message to offscreen document to copy
    await chrome.runtime.sendMessage({ action: "copyToClipboard", text });
  } catch (e) {
    console.error("Clipboard copy failed:", e);
  }
}

async function handleApiCall(text) {
  const data = await chrome.storage.local.get("anthropicApiKey");
  const apiKey = data.anthropicApiKey;
  if (!apiKey) {
    throw new Error("Set your API key in the extension popup");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Convert the following Greeklish (Greek written with Latin characters) to proper Greek text. Rules:
- Only output the translated Greek text, nothing else
- Keep any English words as-is
- Keep punctuation, emojis, and formatting
- If something is already in Greek, keep it as-is
- Preserve the casual/formal tone of the original

Greeklish text:
${text}`
        }
      ]
    })
  });

  if (response.status === 529 || response.status === 503) {
    // Retry up to 2 times with backoff on overload
    for (let attempt = 1; attempt <= 2; attempt++) {
      await new Promise(r => setTimeout(r, attempt * 1000));
      const retry = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Convert the following Greeklish (Greek written with Latin characters) to proper Greek text. Rules:
- Only output the translated Greek text, nothing else
- Keep any English words as-is
- Keep punctuation, emojis, and formatting
- If something is already in Greek, keep it as-is
- Preserve the casual/formal tone of the original

Greeklish text:
${text}`
            }
          ]
        })
      });
      if (retry.ok) {
        const result = await retry.json();
        return result.content[0].text;
      }
      if (retry.status !== 529 && retry.status !== 503) {
        const err = await retry.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${retry.status}`);
      }
    }
    throw new Error("API is overloaded. Please try again in a few seconds.");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const result = await response.json();
  return result.content[0].text;
}
