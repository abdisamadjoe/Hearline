const state = {
  chunks: [],
  currentIndex: 0,
  isPlaying: false,
  isPaused: false,
  rate: 1.0,
  voice: null,
  highlightedNode: null,
  keepAliveInterval: null,
}

const WANT_VOICES = [
  { name: 'Microsoft Mark - English (United States)', label: 'Mark (Male)' },
  { name: 'Microsoft David - English (United States)', label: 'David (Male)' },
  { name: 'Microsoft Zira - English (United States)', label: 'Zira (Female)' },
  { name: 'Google US English', label: 'Google US (Female)' },
]

function extractText() {
  const BLOCK = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'BUTTON', 'TD']
  const SKIP = ['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'INPUT', 'SELECT', 'TEXTAREA', 'IFRAME', 'NOSCRIPT']

  const SELECTORS = [
    'article', '[role="main"]', '.post-content',
    '.article-body', '.entry-content', '.content', 'main'
  ]

  let root = null
  for (const sel of SELECTORS) {
    root = document.querySelector(sel)
    if (root) break
  }
  if (!root) root = document.body

  const results = []

  function walk(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return
    const tag = node.tagName.toUpperCase()
    if (SKIP.includes(tag)) return
    if (node.hidden) return
    if (node.getAttribute('aria-hidden') === 'true') return
    if (getComputedStyle(node).display === 'none') return
    if (getComputedStyle(node).visibility === 'hidden') return
    if (BLOCK.includes(tag)) {
      const text = node.innerText?.trim()
      if (text && text.length > 5) {
        results.push({ text, node })
      }
      return
    }
    for (const child of Array.from(node.children)) walk(child)
  }

  walk(root)
  return results
}

function chunkText(extracted) {
  const chunks = []
  for (const { text, node } of extracted) {
    const sentences = text.split(/(?<=[.?!])\s+/)
    for (const s of sentences) {
      if (s.trim().length > 15) {
        chunks.push({ text: s.trim(), node })
      }
    }
  }
  return chunks
}

function loadVoices() {
  const all = window.speechSynthesis.getVoices()

  if (!all || all.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      loadVoices()
    }
    return
  }

  const select = document.getElementById('hl-voice')
  if (!select) return

  while (select.firstChild) select.removeChild(select.firstChild)

  let added = 0
  for (const wv of WANT_VOICES) {
    const found = all.find(v => v.name === wv.name)
    if (found) {
      const opt = document.createElement('option')
      opt.value = found.name
      opt.textContent = wv.label
      if (added === 0) opt.selected = true
      select.appendChild(opt)
      added++
    }
  }

  if (added === 0) {
    const fallback = all.find(v => v.lang === 'en-US') || all[0]
    if (fallback) {
      const opt = document.createElement('option')
      opt.value = fallback.name
      opt.textContent = fallback.name
      select.appendChild(opt)
    }
  }

  const saved = localStorage.getItem('hl_voice')
  if (saved && select.querySelector(`option[value="${saved}"]`)) {
    select.value = saved
  }

  state.voice = all.find(v => v.name === select.value) || null
}

function speakChunk(index) {
  if (index >= state.chunks.length) {
    stopAll()
    return
  }

  state.currentIndex = index
  const chunk = state.chunks[index]

  if (chunk.node !== state.highlightedNode) {
    if (state.highlightedNode) {
      state.highlightedNode.classList.remove('hl-highlight')
    }
    chunk.node.classList.add('hl-highlight')
    // We clear the node once at the start of highlighting using DOM methods
    // to allow sentence-by-sentence insertion without duplication
    while (chunk.node.firstChild) chunk.node.removeChild(chunk.node.firstChild)
    state.highlightedNode = chunk.node
  }

  const words = chunk.text.split(/\s+/)
  const wordSpans = []

  const wrapper = document.createElement('span')
  wrapper.className = 'hl-sentence-wrap'
  wrapper.style.display = 'inline'

  words.forEach((word, i) => {
    const span = document.createElement('span')
    span.className = 'hl-word'
    span.setAttribute('data-word', i)
    span.textContent = word
    wrapper.appendChild(span)
    if (i < words.length - 1) {
      wrapper.appendChild(document.createTextNode(' '))
    }
    wordSpans.push(span)
  })

  chunk.node.appendChild(wrapper)

  window.speechSynthesis.cancel()

  setTimeout(() => {
    const utter = new SpeechSynthesisUtterance(chunk.text)
    utter.voice = state.voice
    utter.rate = state.rate
    utter.lang = 'en-US'

    let lastWordIndex = 0

    utter.onboundary = (e) => {
      if (e.name !== 'word') return

      if (wordSpans[lastWordIndex]) {
        wordSpans[lastWordIndex].classList.remove('hl-word-active')
      }

      let charCount = 0
      let found = 0
      for (let i = 0; i < words.length; i++) {
        if (charCount >= e.charIndex) {
          found = i
          break
        }
        charCount += words[i].length + 1
      }

      lastWordIndex = found
      if (wordSpans[found]) {
        wordSpans[found].classList.add('hl-word-active')
      }
    }

    utter.onend = () => {
      if (wordSpans[lastWordIndex]) {
        wordSpans[lastWordIndex].classList.remove('hl-word-active')
      }
      wrapper.replaceWith(document.createTextNode(chunk.text + ' '))
      if (!state.isPaused) speakChunk(index + 1)
    }

    utter.onerror = (e) => {
      console.warn('Hearline:', e.error)
      wrapper.replaceWith(document.createTextNode(chunk.text + ' '))
      speakChunk(index + 1)
    }

    window.speechSynthesis.speak(utter)

    const btn = document.getElementById('hl-play-pause')
    if (btn) btn.textContent = '❚❚'

  }, 80)
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
  clearInterval(state.keepAliveInterval)

  if (state.highlightedNode) {
    state.highlightedNode.classList.remove('hl-highlight')
    state.highlightedNode = null
  }

  document.querySelectorAll('.hl-para-btn').forEach(b => b.remove())

  state.isPlaying = false
  state.isPaused = false
  state.currentIndex = 0

  const btn = document.getElementById('hl-play-pause')
  if (btn) btn.textContent = '▶'
}

function injectParaButtons() {
  state.chunks.forEach((chunk, index) => {
    if (chunk.node.querySelector('.hl-para-btn')) return

    const btn = document.createElement('button')
    btn.className = 'hl-para-btn'
    btn.textContent = '▶'
    btn.setAttribute('data-index', index)
    chunk.node.insertBefore(btn, chunk.node.firstChild)

    chunk.node.addEventListener('mouseover', () => {
      btn.classList.add('hl-visible')
    })
    chunk.node.addEventListener('mouseleave', () => {
      btn.classList.remove('hl-visible')
    })
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
  speakChunk(index)
})

function injectPlayer() {
  if (document.getElementById('hl-player')) return

  const player = document.createElement('div')
  player.id = 'hl-player'

  const left = document.createElement('div')
  left.id = 'hl-left'

  const back = document.createElement('button')
  back.id = 'hl-back'
  back.textContent = '«'

  const playPause = document.createElement('button')
  playPause.id = 'hl-play-pause'
  playPause.textContent = '▶'

  const forward = document.createElement('button')
  forward.id = 'hl-forward'
  forward.textContent = '»'

  left.appendChild(back)
  left.appendChild(playPause)
  left.appendChild(forward)

  const divider = document.createElement('div')
  divider.id = 'hl-divider'

  const right = document.createElement('div')
  right.id = 'hl-right'

  const voiceSelect = document.createElement('select')
  voiceSelect.id = 'hl-voice'

  const speedSelect = document.createElement('select')
  speedSelect.id = 'hl-speed'

  const speeds = [
    { value: '0.5', label: '0.5x' },
    { value: '0.75', label: '0.75x' },
    { value: '1', label: '1x' },
    { value: '1.25', label: '1.25x' },
    { value: '1.5', label: '1.5x' },
    { value: '2', label: '2x' },
    { value: '3', label: '3x' },
  ]
  for (const s of speeds) {
    const opt = document.createElement('option')
    opt.value = s.value
    opt.textContent = s.label
    if (s.value === '1') opt.selected = true
    speedSelect.appendChild(opt)
  }

  right.appendChild(voiceSelect)
  right.appendChild(speedSelect)

  const closeBtn = document.createElement('button')
  closeBtn.id = 'hl-close'
  closeBtn.textContent = '×'

  player.appendChild(left)
  player.appendChild(divider)
  player.appendChild(right)
  player.appendChild(closeBtn)
  document.body.appendChild(player)

  loadVoices()
  setTimeout(loadVoices, 1000)

  playPause.addEventListener('click', () => {
    if (!state.isPlaying) {
      state.isPlaying = true
      state.isPaused = false
      speakChunk(state.currentIndex)
    } else if (state.isPaused) {
      state.isPaused = false
      window.speechSynthesis.resume()
      playPause.textContent = '❚❚'
    } else {
      state.isPaused = true
      window.speechSynthesis.pause()
      playPause.textContent = '▶'
    }
  })

  back.addEventListener('click', () => {
    speakChunk(Math.max(0, state.currentIndex - 1))
  })

  forward.addEventListener('click', () => {
    speakChunk(Math.min(state.chunks.length - 1, state.currentIndex + 1))
  })

  speedSelect.addEventListener('change', function () {
    state.rate = parseFloat(this.value)
    localStorage.setItem('hl_rate', this.value)
  })

  voiceSelect.addEventListener('change', function () {
    const all = window.speechSynthesis.getVoices()
    state.voice = all.find(v => v.name === this.value) || null
    localStorage.setItem('hl_voice', this.value)
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
    state.isPlaying = true
    state.isPaused = false
    injectParaButtons()
    startKeepAlive()
    speakChunk(0)
    sendResponse({ status: 'playing' })
  }

  if (msg.action === 'stop') {
    stopAll()
    sendResponse({ status: 'stopped' })
  }

  if (msg.action === 'setRate') {
    state.rate = msg.rate
    sendResponse({ status: 'ok' })
  }

  return true
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') stopAll()
})
