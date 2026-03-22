// Hearline — Any page, read aloud.
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;

  chrome.storage.local.get(['hl_rate', 'hl_voice'], (data) => {
    const rate = data.hl_rate || 1.0;
    const voice = data.hl_voice || null;

    // Show player and start playing (content.js handles toggle if already playing)
    chrome.tabs.sendMessage(tabs[0].id, { action: 'show' });
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'play',
      mode: 'read',
      selectionOnly: false,
      rate: rate,
      voice: voice
    });

    // Close popup instantly
    setTimeout(() => window.close(), 50);
  });
});
