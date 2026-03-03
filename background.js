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
        copyToClipboard(result);
        return sendResponse({ success: true, text: result });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function copyToClipboard(text) {
  try {
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
    await chrome.runtime.sendMessage({ action: "copyToClipboard", text });
  } catch (e) {
    console.error("Clipboard copy failed:", e);
  }
}

const MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-3-5-haiku-20241022"
];

const PROMPT_PREFIX = `Convert the following Greeklish (Greek written with Latin characters) to proper Greek text. Rules:
- Only output the translated Greek text, nothing else
- Keep any English words as-is
- Keep punctuation, emojis, and formatting
- If something is already in Greek, keep it as-is
- Preserve the casual/formal tone of the original

Greeklish text:
`;

async function callModel(apiKey, model, text) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: PROMPT_PREFIX + text }]
    })
  });
  return response;
}

async function handleApiCall(text) {
  const data = await chrome.storage.local.get("anthropicApiKey");
  const apiKey = data.anthropicApiKey;
  if (!apiKey) {
    throw new Error("Set your API key in the extension popup");
  }

  for (let m = 0; m < MODELS.length; m++) {
    const model = MODELS[m];
    const isLastModel = m === MODELS.length - 1;

    // Try each model with 1 retry
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000));
      }

      const response = await callModel(apiKey, model, text);

      if (response.ok) {
        const result = await response.json();
        return result.content[0].text;
      }

      if (response.status === 529 || response.status === 503) {
        // Overloaded - retry same model or fall through to next model
        continue;
      }

      // Non-overload error - throw immediately
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    if (!isLastModel) {
      console.log(`Model ${model} overloaded, falling back to ${MODELS[m + 1]}`);
    }
  }

  throw new Error("All models are overloaded. Please try again in a few seconds.");
}
