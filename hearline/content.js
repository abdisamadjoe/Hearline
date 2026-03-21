// SECTION A — State
let state = {
  chunks: [],           // array of { text, node }
  currentIndex: 0,
  isPlaying: false,
  isPaused: false,
  mode: 'read',         // 'read' | 'rsvp' | 'summary'
  rate: 1.0,
  highlightedNode: null,
  rsvpInterval: null,
  rsvpWords: [],
  rsvpIndex: 0,
  keepaliveInterval: null,
  summaryOverlay: null,
  rsvpOverlay: null
};

// Listen for Escape key to stop
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    stopAll();
  }
});

// SECTION B — Text Extractor
function extractText(selectionOnly) {
  if (selectionOnly) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return [];
    
    // We get the selected text and the anchor node's closest block parent
    let node = selection.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    
    // Fallback block finding
    let blockNode = node;
    while (blockNode && !['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE', 'TD', 'DIV', 'ARTICLE', 'MAIN'].includes(blockNode.tagName)) {
      if (blockNode.parentElement) {
        blockNode = blockNode.parentElement;
      } else {
        break;
      }
    }
    
    return [{ text: selection.toString().trim(), node: blockNode || node }];
  }

  // Full page extraction
  const containers = [
    'article', '[role="main"]', '.post-content', '.article-body', '.entry-content', 'main', 'body'
  ];
  
  let container = null;
  for (const selector of containers) {
    const el = document.querySelector(selector);
    if (el) {
      container = el;
      break;
    }
  }

  if (!container) container = document.body;

  const validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE', 'TD'];
  const skipSelectors = ['nav', 'header', 'footer', 'aside', 'script', 'style', '.sidebar', '[role="navigation"]'];

  const extracted = [];
  
  function walk(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const sel of skipSelectors) {
        if (node.tagName.toLowerCase() === sel || (node.matches && node.matches(sel))) {
          return;
        }
      }
      
      if (validTags.includes(node.tagName.toUpperCase())) {
        const text = node.innerText ? node.innerText.trim() : '';
        if (text.length >= 20) {
          extracted.push({ text: text, node: node });
        }
        // Don't traverse children of valid block elements to avoid duplicates
        return; 
      }

      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  }

  walk(container);
  
  return extracted;
}

// SECTION C — Sentence Chunker
function chunkText(extractedItems) {
  const chunks = [];
  // Split on sentence boundaries, keeping the punctuation attached to the sentence
  const sentenceRegex = /(?<=[.?!])\s+/;
  
  for (const item of extractedItems) {
    const sentences = item.text.split(sentenceRegex);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 15) {
        chunks.push({ text: trimmed, node: item.node });
      }
    }
  }
  return chunks;
}

// SECTION D — Read Aloud Engine
function speakChunk(index) {
  if (index >= state.chunks.length) {
    stopAll();
    return;
  }

  state.currentIndex = index;
  const chunk = state.chunks[index];

  // Highlight
  if (state.highlightedNode) {
    state.highlightedNode.classList.remove('hl-highlight');
  }
  
  if (chunk.node && chunk.node.classList) {
    chunk.node.classList.add('hl-highlight');
    state.highlightedNode = chunk.node;
    chunk.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Speak
  if (!window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(chunk.text);
  utterance.rate = state.rate;
  
  utterance.onend = () => {
    if (!state.isPlaying) return;
    speakChunk(index + 1);
  };
  
  utterance.onerror = (e) => {
    console.error('Speech error', e);
    if (!state.isPlaying) return;
    speakChunk(index + 1);
  };

  // Wait for voices if empty
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', function onVoices() {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      window.speechSynthesis.speak(utterance);
    });
  } else {
    window.speechSynthesis.speak(utterance);
  }

  // Chrome 15-second bug workaround
  if (!state.keepaliveInterval) {
    state.keepaliveInterval = setInterval(() => {
      if (state.isPlaying && !state.isPaused && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }
}

// SECTION E — RSVP Engine
function startRSVP(words) {
  state.rsvpWords = words;
  state.rsvpIndex = 0;

  let overlay = document.createElement('div');
  overlay.className = 'hl-rsvp-overlay';
  state.rsvpOverlay = overlay;

  let closeBtn = document.createElement('div');
  closeBtn.className = 'hl-rsvp-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = stopAll;
  
  let wordDiv = document.createElement('div');
  wordDiv.className = 'hl-rsvp-word';
  
  let progressDiv = document.createElement('div');
  progressDiv.className = 'hl-rsvp-progress';

  overlay.appendChild(closeBtn);
  overlay.appendChild(wordDiv);
  overlay.appendChild(progressDiv);
  document.body.appendChild(overlay);

  const intervalMs = Math.round(60000 / (250 * state.rate));

  state.rsvpInterval = setInterval(() => {
    if (state.isPaused) return;

    if (state.rsvpIndex >= state.rsvpWords.length) {
      stopAll();
      return;
    }

    wordDiv.textContent = state.rsvpWords[state.rsvpIndex];
    progressDiv.textContent = `word ${state.rsvpIndex + 1} of ${state.rsvpWords.length}`;
    
    state.rsvpIndex++;
  }, intervalMs);
}

// SECTION F — Extractive Summarizer
function summarize(chunks) {
  if (chunks.length === 0) return [];

  const stopwords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'that', 'this', 'it', 'its', 'as', 'but', 'or', 'and', 'not', 'no', 'so', 'if', 'than', 'then', 'when', 'where', 'who', 'which', 'what', 'how', 'i', 'you', 'we', 'they', 'he', 'she']);
  
  const signalWords = ['important', 'key', 'main', 'significant', 'result', 'conclusion', 'found', 'shows', 'study', 'research', 'therefore', 'thus', 'however', 'finally'];

  // All text to build frequency map
  let allText = chunks.map(c => c.text).join(' ');
  let words = allText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  
  let freqMap = {};
  for (let w of words) {
    if (!w || stopwords.has(w)) continue;
    freqMap[w] = (freqMap[w] || 0) + 1;
  }

  let maxFreq = Math.max(...Object.values(freqMap), 1);

  // Score chunks
  let scored = chunks.map((chunk, i) => {
    let score = 0;
    let chunkWords = chunk.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    for (let cw of chunkWords) {
      if (freqMap[cw]) {
        score += freqMap[cw] / maxFreq;
      }
    }

    // Positional bias: check if first sentence of its node
    if (i === 0 || chunks[i-1].node !== chunk.node) {
      score += 0.3;
    }

    // Signal words bonus
    let lowerText = chunk.text.toLowerCase();
    for (let sw of signalWords) {
      if (lowerText.includes(sw)) {
        score += 0.2;
        break;
      }
    }

    return { index: i, text: chunk.text, score: score, node: chunk.node };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Select top 30% (min 3, max 8)
  let count = Math.max(3, Math.min(8, Math.ceil(chunks.length * 0.3)));
  let selected = scored.slice(0, count);

  // Sort back to original order
  selected.sort((a, b) => a.index - b.index);

  return selected;
}

function displaySummary(summaryChunks) {
  let overlay = document.createElement('div');
  overlay.className = 'hl-summary-overlay';
  state.summaryOverlay = overlay;

  let header = document.createElement('div');
  header.className = 'hl-summary-header';
  
  let title = document.createElement('h2');
  title.className = 'hl-summary-title';
  title.textContent = 'Summary';

  let actions = document.createElement('div');
  actions.className = 'hl-summary-actions';

  let readBtn = document.createElement('button');
  readBtn.className = 'hl-summary-read-btn';
  readBtn.textContent = 'Read Summary Aloud';
  readBtn.onclick = () => {
    // Pipe summary chunks into speakChunk
    stopAll();
    state.mode = 'read';
    state.isPlaying = true;
    state.chunks = summaryChunks; // Use summary chunks
    speakChunk(0);
  };

  let closeBtn = document.createElement('button');
  closeBtn.className = 'hl-summary-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = stopAll;

  actions.appendChild(readBtn);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);

  let content = document.createElement('div');
  content.className = 'hl-summary-content';
  
  summaryChunks.forEach(sc => {
    let p = document.createElement('p');
    p.textContent = sc.text;
    content.appendChild(p);
  });

  overlay.appendChild(header);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

// SECTION G — Stop / Cleanup
function stopAll() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  if (state.highlightedNode && state.highlightedNode.classList) {
    state.highlightedNode.classList.remove('hl-highlight');
  }

  if (state.rsvpInterval) {
    clearInterval(state.rsvpInterval);
  }

  if (state.rsvpOverlay && state.rsvpOverlay.parentNode) {
    state.rsvpOverlay.parentNode.removeChild(state.rsvpOverlay);
  }

  if (state.summaryOverlay && state.summaryOverlay.parentNode) {
    state.summaryOverlay.parentNode.removeChild(state.summaryOverlay);
  }

  if (state.keepaliveInterval) {
    clearInterval(state.keepaliveInterval);
  }

  state.isPlaying = false;
  state.isPaused = false;
  state.currentIndex = 0;
  state.highlightedNode = null;
  state.rsvpInterval = null;
  state.rsvpOverlay = null;
  state.summaryOverlay = null;
  state.keepaliveInterval = null;
}

// SECTION H — Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'play') {
    stopAll();
    
    state.mode = message.mode || 'read';
    state.rate = message.rate || 1.0;
    let selectionOnly = message.selectionOnly || false;
    
    let extracted = extractText(selectionOnly);
    state.chunks = chunkText(extracted);
    
    if (state.chunks.length === 0) {
      sendResponse({ status: 'empty' });
      return true;
    }
    
    state.isPlaying = true;

    if (state.mode === 'read') {
      speakChunk(0);
    } else if (state.mode === 'rsvp') {
      let words = [];
      for (const c of state.chunks) {
        words.push(...c.text.split(/\s+/).filter(w => w.length > 0));
      }
      startRSVP(words);
    } else if (state.mode === 'summary') {
      let summaryChunks = summarize(state.chunks);
      displaySummary(summaryChunks);
    }

    sendResponse({ status: 'playing' });
    return true;
  }
  
  if (message.action === 'pause') {
    if (state.isPlaying && !state.isPaused) {
      if (state.mode === 'read' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      state.isPaused = true;
    }
    sendResponse({ status: 'paused' });
    return true;
  }
  
  if (message.action === 'resume') {
    if (state.isPaused) {
      if (state.mode === 'read' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      state.isPaused = false;
    }
    sendResponse({ status: 'resumed' });
    return true;
  }
  
  if (message.action === 'stop') {
    stopAll();
    sendResponse({ status: 'stopped' });
    return true;
  }
  
  if (message.action === 'setRate') {
    state.rate = message.rate;
    if (state.mode === 'rsvp' && state.isPlaying && !state.isPaused) {
       clearInterval(state.rsvpInterval);
       const intervalMs = Math.round(60000 / (250 * state.rate));
       state.rsvpInterval = setInterval(() => {
        if (state.isPaused) return;
        if (state.rsvpIndex >= state.rsvpWords.length) {
          stopAll();
          return;
        }
        if (state.rsvpOverlay) {
          let wordDiv = state.rsvpOverlay.querySelector('.hl-rsvp-word');
          let progressDiv = state.rsvpOverlay.querySelector('.hl-rsvp-progress');
          if (wordDiv) wordDiv.textContent = state.rsvpWords[state.rsvpIndex];
          if (progressDiv) progressDiv.textContent = `word ${state.rsvpIndex + 1} of ${state.rsvpWords.length}`;
        }
        state.rsvpIndex++;
      }, intervalMs);
    }
    sendResponse({ status: 'ok' });
    return true;
  }
});
