(function() {
  if (window.__HEARLINE_INITIALIZED__) return
  window.__HEARLINE_INITIALIZED__ = true

  const state = {
    chunks: [],
    currentIndex: 0,
    currentCharIndex: 0,
    isPlaying: false,
    isPaused: false,
    rate: 1.0,
    voice: null,
    keepAliveInterval: null,
  }

  const icons = {
    play: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M7.75 5.75V18.25C7.75 19.43 9.05 20.13 10.03 19.49L19.53 13.24C20.37 12.69 20.37 11.31 19.53 10.76L10.03 4.51C9.05 3.87 7.75 4.57 7.75 5.75Z" /></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5C7.45 5 7 5.45 7 6V18C7 18.55 7.45 19 8 19H10C10.55 19 11 18.55 11 18V6C11 5.45 10.55 5 10 5H8ZM14 5C13.45 5 13 5.45 13 6V18C13 18.55 13.45 19 14 19H16C16.55 19 17 18.55 17 18V6C17 5.45 16.55 5 16 5H14Z" /></svg>`,
    back10: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" font-size="7" font-family="Arial, sans-serif" font-weight="900" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>`,
    forward10: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" font-size="7" font-family="Arial, sans-serif" font-weight="900" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>`,
    close: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
  }

  function getVoice() {
    const voices = window.speechSynthesis.getVoices()
    return voices.find(v => v.name === 'Microsoft David - English (United States)')
      || voices.find(v => v.name.includes('David'))
      || voices.find(v => v.lang === 'en-US')
      || voices[0]
  }

  function safeSpeak(utter) {
    const voices = window.speechSynthesis.getVoices()
    if (!voices || voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        utter.voice = getVoice()
        window.speechSynthesis.speak(utter)
      }
      return
    }
    utter.voice = getVoice()
    window.speechSynthesis.speak(utter)
  }

  function extractText() {
    const results = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip unwanted elements and hidden nodes
          if (
            parent.closest('script, style, noscript, nav, header, footer, aside') ||
            parent.offsetParent === null
          ) return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      results.push({
        text: node.nodeValue,
        node: node, // The TextNode itself
        parent: node.parentElement
      });
      // Mark parent for para-button alignment
      node.parentElement.classList.add('hl-relative');
    }
    return results;
  }

  function chunkText(extracted) {
    const chunks = []
    for (const item of extracted) {
      const sentences = item.text.split(/(?<=[.?!])\s+/)
      let runningOffsetInNode = 0
      for (const s of sentences) {
        if (s.trim().length > 1) { // Accept even short labels if they are text nodes
          chunks.push({ 
            text: s, 
            node: item.node, // The specific TextNode
            parent: item.parent,
            startOffsetInNode: runningOffsetInNode
          })
        }
        runningOffsetInNode += s.length + 1
      }
    }
    return chunks
  }

  function ensureMarker() {
    let marker = document.getElementById('hl-word-marker')
    if (!marker) {
      marker = document.createElement('div')
      marker.id = 'hl-word-marker'
      document.body.appendChild(marker)
    }
    return marker
  }

  function highlightWord(chunk, charIndex) {
    const marker = ensureMarker()
    const range = document.createRange()
    
    // Character offset within the specific TextNode
    const start = chunk.startOffsetInNode + charIndex
    
    try {
      range.setStart(chunk.node, start)
      
      const remainingText = chunk.node.textContent.substring(start)
      const wordMatch = remainingText.match(/^\w+/)
      const wordLen = wordMatch ? wordMatch[0].length : 1
      
      range.setEnd(chunk.node, Math.min(start + wordLen, chunk.node.textContent.length))
      
      const rects = range.getClientRects()
      const rect = rects[0]
      if (rect && rect.width > 0) {
        marker.style.display = 'block'
        
        const horizontalPadding = 6
        const verticalPadding = 4
        
        const x = rect.left + window.scrollX - horizontalPadding
        const y = rect.top + window.scrollY - verticalPadding
        
        marker.style.transform = `translate3d(${x}px, ${y}px, 0)`
        marker.style.width = `${rect.width + (horizontalPadding * 2)}px`
        marker.style.height = `${rect.height + (verticalPadding * 2)}px`
        marker.style.opacity = '1'

        if (CSS.highlights) {
          const highlight = new Highlight(range)
          CSS.highlights.set('hl-word-text', highlight)
        }

        if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
          window.scrollTo({
            top: rect.top + window.scrollY - (window.innerHeight / 2),
            behavior: 'smooth'
          })
        }
      }
    } catch (e) {
      marker.style.opacity = '0'
      if (CSS.highlights) CSS.highlights.delete('hl-word-text')
    }
  }

  function speakChunk(index, offset = 0) {
    if (index >= state.chunks.length) { stopAll(); return }

    state.currentIndex = index
    state.currentCharIndex = offset
    const chunk = state.chunks[index]
    const textToSpeak = offset > 0 ? chunk.text.substring(offset) : chunk.text

    window.speechSynthesis.cancel()

    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(textToSpeak)
      utter.rate = state.rate || 1.0
      utter.lang = 'en-US'

      utter.onboundary = (e) => {
        if (e.name === 'word' && state.isPlaying && !state.isPaused) {
          state.currentCharIndex = offset + e.charIndex
          highlightWord(chunk, state.currentCharIndex)
        }
      }

      utter.onend = () => {
        if (state.isPlaying && !state.isPaused) {
          state.currentCharIndex = 0
          speakChunk(index + 1)
        }
      }

      utter.onerror = () => {
        if (state.isPlaying && !state.isPaused) {
          state.currentCharIndex = 0
          speakChunk(index + 1)
        }
      }

      safeSpeak(utter)

      const btn = document.getElementById('hl-play-pause')
      if (btn) {
        btn.innerHTML = icons.pause
        btn.title = 'Pause'
      }
    }, 100)
  }

  function startKeepAlive() {
    clearInterval(state.keepAliveInterval)
    state.keepAliveInterval = setInterval(() => {
      if (state.isPlaying && !state.isPaused) {
        window.speechSynthesis.pause()
        setTimeout(() => window.speechSynthesis.resume(), 50)
      }
    }, 10000)
  }

  function stopAll() {
    window.speechSynthesis.cancel()
    window.speechSynthesis.onvoiceschanged = null
    clearInterval(state.keepAliveInterval)
    
    if (CSS.highlights) CSS.highlights.delete('hl-word-text')

    const marker = document.getElementById('hl-word-marker')
    if (marker) {
      marker.style.opacity = '0'
      setTimeout(() => marker.style.display = 'none', 100)
    }

    document.querySelectorAll('.hl-para-btn').forEach(b => b.remove())
    document.querySelectorAll('.hl-relative').forEach(el => el.classList.remove('hl-relative'))

    state.isPlaying = false
    state.isPaused = false
    state.currentIndex = 0
    state.currentCharIndex = 0

    const btn = document.getElementById('hl-play-pause')
    if (btn) {
      btn.innerHTML = icons.play
      btn.title = 'Play'
    }
  }

  function injectParaButtons() {
    const processedNodes = new Set()
    state.chunks.forEach((chunk, index) => {
      // For clutter-free UI, only show play buttons for text longer than 20 chars
      if (chunk.text.trim().length < 20) return
      if (processedNodes.has(chunk.node)) return
      processedNodes.add(chunk.node)

      const btn = document.createElement('button')
      btn.className = 'hl-para-btn'
      btn.innerHTML = icons.play
      btn.title = 'Play from here'
      btn.setAttribute('data-index', index)
      chunk.parent.insertBefore(btn, chunk.parent.firstChild)

      chunk.parent.addEventListener('mouseenter', () => btn.classList.add('hl-visible'))
      chunk.parent.addEventListener('mouseleave', () => btn.classList.remove('hl-visible'))
    })
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.hl-para-btn')
    if (!btn) return
    e.stopPropagation()
    e.preventDefault()
    const index = parseInt(btn.getAttribute('data-index'))
    if (isNaN(index)) return
    state.isPlaying = true
    state.isPaused = false
    state.currentCharIndex = 0
    speakChunk(index)
  })

  function injectPlayer() {
    if (document.getElementById('hl-player')) return

    const player = document.createElement('div')
    player.id = 'hl-player'

    const playPause = document.createElement('button')
    playPause.id = 'hl-play-pause'
    playPause.innerHTML = icons.play
    playPause.title = 'Play'

    const back = document.createElement('button')
    back.id = 'hl-back'
    back.title = 'Rewind 10s'
    back.innerHTML = icons.back10

    const forward = document.createElement('button')
    forward.id = 'hl-forward'
    forward.title = 'Forward 10s'
    forward.innerHTML = icons.forward10

    const voiceBtn = document.createElement('button')
    voiceBtn.id = 'hl-voice-btn'
    voiceBtn.title = 'Change Voice'
    const flagImg = document.createElement('img')
    flagImg.src = chrome.runtime.getURL('voice_usa.png')
    flagImg.style.width = '24px'
    flagImg.style.height = '24px'
    flagImg.style.borderRadius = '50%'
    voiceBtn.appendChild(flagImg)

    const closeBtn = document.createElement('button')
    closeBtn.id = 'hl-close'
    closeBtn.title = 'Close'
    closeBtn.innerHTML = icons.close

    player.appendChild(playPause)
    player.appendChild(back)
    player.appendChild(forward)
    player.appendChild(voiceBtn)
    player.appendChild(closeBtn)
    document.body.appendChild(player)

    playPause.addEventListener('click', () => {
      if (!state.isPlaying) {
        state.isPlaying = true
        state.isPaused = false
        speakChunk(state.currentIndex)
      } else if (state.isPaused) {
        state.isPaused = false
        speakChunk(state.currentIndex, state.currentCharIndex)
      } else {
        state.isPaused = true
        window.speechSynthesis.cancel()
        playPause.innerHTML = icons.play
        playPause.title = 'Play'
      }
    })

    back.addEventListener('click', () => {
      window.speechSynthesis.cancel()
      state.currentCharIndex = 0
      const newIdx = Math.max(0, state.currentIndex - 1)
      speakChunk(newIdx)
    })

    forward.addEventListener('click', () => {
      window.speechSynthesis.cancel()
      state.currentCharIndex = 0
      const newIdx = Math.min(state.chunks.length - 1, state.currentIndex + 1)
      speakChunk(newIdx)
    })

    closeBtn.addEventListener('click', () => {
      stopAll()
      player.remove()
    })
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'show') {
      injectPlayer()
      const extracted = extractText()
      state.chunks = chunkText(extracted)
      state.isPlaying = false
      state.isPaused = false
      injectParaButtons()
      startKeepAlive()
      sendResponse({ status: 'shown' })
    }
    if (msg.action === 'stop') {
      stopAll()
      sendResponse({ status: 'stopped' })
    }
    return true
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') stopAll()
  })
})();
