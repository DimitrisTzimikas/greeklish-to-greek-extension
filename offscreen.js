chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "copyToClipboard") {
    const el = document.getElementById("clipboard");
    el.value = msg.text;
    el.select();
    document.execCommand("copy");
  }
});
