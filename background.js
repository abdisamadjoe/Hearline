chrome.runtime.onInstalled.addListener(() => {
  console.log('Hearline installed');
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-hearline') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'show' });
      chrome.tabs.sendMessage(tabs[0].id, { action: 'play', mode: 'read', selectionOnly: false, rate: 1.0 });
    });
  }
});
