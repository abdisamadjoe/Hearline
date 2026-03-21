document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    modeButtons: document.querySelectorAll('#mode-selector .pill'),
    sourceButtons: document.querySelectorAll('#source-selector .pill'),
    speedSlider: document.getElementById('speed-slider'),
    speedDisplay: document.getElementById('speed-display'),
    btnPlay: document.getElementById('btn-play'),
    btnPause: document.getElementById('btn-pause'),
    btnStop: document.getElementById('btn-stop'),
    statusDisplay: document.getElementById('status-display')
  };

  let uiState = {
    mode: 'read',
    source: 'full',
    rate: 1.0
  };

  // Load saved preferences
  chrome.storage.local.get(['mode', 'source', 'rate'], (result) => {
    if (result.mode) uiState.mode = result.mode;
    if (result.source) uiState.source = result.source;
    if (result.rate) uiState.rate = result.rate;
    updateUI();
  });

  function updateUI() {
    elements.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === uiState.mode);
    });
    elements.sourceButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.source === uiState.source);
    });
    elements.speedSlider.value = uiState.rate;
    elements.speedDisplay.textContent = uiState.rate.toFixed(2) + '×';
  }

  elements.modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      uiState.mode = btn.dataset.mode;
      chrome.storage.local.set({ mode: uiState.mode });
      updateUI();
    });
  });

  elements.sourceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      uiState.source = btn.dataset.source;
      chrome.storage.local.set({ source: uiState.source });
      updateUI();
    });
  });

  elements.speedSlider.addEventListener('input', (e) => {
    uiState.rate = parseFloat(e.target.value);
    elements.speedDisplay.textContent = uiState.rate.toFixed(2) + '×';
    chrome.storage.local.set({ rate: uiState.rate });
    sendMessageToContent({ action: 'setRate', rate: uiState.rate });
  });

  elements.btnPlay.addEventListener('click', () => {
    sendMessageToContent({
      action: 'play',
      mode: uiState.mode,
      selectionOnly: (uiState.source === 'selection'),
      rate: uiState.rate
    });
    elements.statusDisplay.textContent = 'Playing...';
  });

  elements.btnPause.addEventListener('click', () => {
    const isPaused = elements.btnPause.textContent === 'Resume';
    if (isPaused) {
      sendMessageToContent({ action: 'resume' });
      elements.btnPause.textContent = 'Pause';
      elements.statusDisplay.textContent = 'Playing...';
    } else {
      sendMessageToContent({ action: 'pause' });
      elements.btnPause.textContent = 'Resume';
      elements.statusDisplay.textContent = 'Paused';
    }
  });

  elements.btnStop.addEventListener('click', () => {
    sendMessageToContent({ action: 'stop' });
    elements.statusDisplay.textContent = 'Stopped';
    elements.btnPause.textContent = 'Pause';
  });

  function sendMessageToContent(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) return;
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not injected or inactive. Ignore silently.
          console.warn('Could not send message to content script:', chrome.runtime.lastError);
        } else if (response) {
          if (response.status === 'empty') {
            elements.statusDisplay.textContent = 'No text found';
          }
        }
      });
    });
  }
});
