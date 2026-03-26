import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useStore } from '../store';
import KeyboardRenderer from '../components/KeyboardRenderer';
import { getLayoutForFormFactor } from '../data/layouts';

const WORD_LISTS = {
  common: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'],
  keyboard: ['switch', 'keycap', 'mechanical', 'keyboard', 'cherry', 'gateron', 'linear', 'tactile', 'clicky', 'hotswap', 'gasket', 'mount', 'pcb', 'plate', 'foam', 'lube', 'stabilizer', 'spacebar', 'enter', 'backspace', 'shift', 'control', 'escape', 'function', 'arrow', 'numpad', 'tenkeyless', 'compact', 'wireless', 'bluetooth', 'rgb', 'backlit', 'profile', 'sculpted', 'uniform', 'doubleshot', 'pbt', 'abs', 'gmk', 'thock', 'clack', 'sound', 'typing', 'feel', 'premium', 'enthusiast', 'hobby', 'custom', 'build', 'mod']
};

// Map keyboard event keys to layout labels
const KEY_TO_LABEL = {
  'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'h': 'H',
  'i': 'I', 'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P',
  'q': 'Q', 'r': 'R', 's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W', 'x': 'X',
  'y': 'Y', 'z': 'Z', ' ': '', // spacebar has empty label
  ',': ',', '.': '.', '/': '/', ';': ';', "'": "'", '[': '[', ']': ']', '\\': '\\',
  '-': '-', '=': '=', '`': '`', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
  '6': '6', '7': '7', '8': '8', '9': '9', '0': '0',
  'Enter': 'Enter', 'Backspace': 'Backspace', 'Tab': 'Tab', 'Escape': 'Esc',
  'Shift': 'Shift', 'Control': 'Ctrl', 'Alt': 'Alt'
};

// Find key ID by label in the layout
function findKeyByLabel(layout, label) {
  if (!layout) return null;
  const key = layout.find(k => k.label === label || k.label?.toLowerCase() === label?.toLowerCase());
  return key?.id || null;
}

function generateWords(count = 50) {
  const list = WORD_LISTS.common;
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(list[Math.floor(Math.random() * list.length)]);
  }
  return result;
}

export default function TypingTestScreen() {
  const store = useStore();
  const [words, setWords] = useState(() => generateWords(100));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [correctWords, setCorrectWords] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [testDuration, setTestDuration] = useState(60);
  const inputRef = useRef(null);

  // Map form factor to layout key
const ffMap = { '60%': 'SIXTY', '65%': 'SIXTY_FIVE', '75%': 'SEVENTY_FIVE', 'TKL': 'TKL_80', '80%': 'TKL_80', '100%': 'FULL_100' };
const layout = getLayoutForFormFactor(ffMap[store.selectedFormFactor] || 'SEVENTY_FIVE');

  // Timer
  useEffect(() => {
    if (!started || finished) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, testDuration - elapsed);
      setTimeLeft(Math.ceil(remaining));

      const minutes = elapsed / 60;
      if (minutes > 0) {
        setWpm(Math.round(correctWords / minutes));
      }

      if (remaining <= 0) {
        setFinished(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [started, finished, startTime, correctWords, testDuration]);

  // Key press handler
  const handleKeyDown = useCallback((e) => {
    if (finished) return;

    // Find the key in the layout by its label
    const label = KEY_TO_LABEL[e.key] ?? KEY_TO_LABEL[e.key.toLowerCase()];
    const keyId = label !== undefined ? findKeyByLabel(layout, label) : null;

    if (keyId) {
      setPressedKeys(prev => new Set([...prev, keyId]));
      setTimeout(() => {
        setPressedKeys(prev => {
          const next = new Set(prev);
          next.delete(keyId);
          return next;
        });
      }, 150);
    }

    if (!started && e.key.length === 1) {
      setStarted(true);
      setStartTime(Date.now());
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const currentWord = words[currentIndex];
      const isCorrect = input.trim() === currentWord;

      if (isCorrect) setCorrectWords(c => c + 1);
      setTotalTyped(t => t + 1);
      setAccuracy(Math.round(((correctWords + (isCorrect ? 1 : 0)) / (totalTyped + 1)) * 100));
      setCurrentIndex(i => i + 1);
      setInput('');
    }
  }, [started, finished, words, currentIndex, input, correctWords, totalTyped, layout]);

  const handleKeyUp = useCallback((e) => {
    const label = KEY_TO_LABEL[e.key] ?? KEY_TO_LABEL[e.key.toLowerCase()];
    const keyId = label !== undefined ? findKeyByLabel(layout, label) : null;
    if (keyId) {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
    }
  }, [layout]);

  const reset = () => {
    setWords(generateWords(100));
    setCurrentIndex(0);
    setInput('');
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setTimeLeft(testDuration);
    setCorrectWords(0);
    setTotalTyped(0);
    setWpm(0);
    setAccuracy(100);
    setPressedKeys(new Set());
    inputRef.current?.focus();
  };

  useEffect(() => {
    inputRef.current?.focus();
    // Add global key listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Get current word with character highlighting
  const currentWord = words[currentIndex] || '';
  const renderWord = (word, idx) => {
    if (idx < currentIndex) return null; // Already typed
    if (idx > currentIndex + 12) return null; // Too far ahead

    const isCurrent = idx === currentIndex;

    if (!isCurrent) {
      return (
        <span key={idx} style={{ color: 'var(--on-surface-variant)', opacity: 0.5, marginRight: 12 }}>
          {word}
        </span>
      );
    }

    // Current word - show character by character
    return (
      <span key={idx} style={{ marginRight: 12 }}>
        {word.split('').map((char, i) => {
          let color = 'var(--on-surface)';
          if (i < input.length) {
            color = input[i] === char ? 'var(--primary)' : '#ff6b6b';
          }
          return <span key={i} style={{ color, fontWeight: i < input.length ? 700 : 400 }}>{char}</span>;
        })}
        {input.length > word.length && (
          <span style={{ color: '#ff6b6b', textDecoration: 'line-through' }}>
            {input.slice(word.length)}
          </span>
        )}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => store.setScreen('studio')}>← BACK TO STUDIO</button>
        <h1 style={styles.title}>TYPING TEST</h1>
        <div style={styles.headerRight}>
          {[15, 30, 60, 120].map(t => (
            <button
              key={t}
              onClick={() => { setTestDuration(t); setTimeLeft(t); reset(); }}
              style={testDuration === t ? styles.durationBtnActive : styles.durationBtn}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{wpm}</span>
          <span style={styles.statLabel}>WPM</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{accuracy}%</span>
          <span style={styles.statLabel}>ACC</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: timeLeft <= 10 ? '#ff6b6b' : 'var(--primary)' }}>{timeLeft}</span>
          <span style={styles.statLabel}>SEC</span>
        </div>
        <button style={styles.resetBtn} onClick={reset}>RESET</button>
      </div>

      {/* Word Display */}
      <div style={styles.wordSection}>
        {finished ? (
          <div style={styles.results}>
            <div style={styles.finalWpm}>{wpm}</div>
            <div style={styles.finalLabel}>words per minute</div>
            <div style={styles.finalStats}>
              {correctWords}/{totalTyped} correct ({accuracy}% accuracy)
            </div>
            <button style={styles.tryAgainBtn} onClick={reset}>TRY AGAIN</button>
          </div>
        ) : (
          <>
            <div style={styles.wordsContainer}>
              {words.map((word, idx) => renderWord(word, idx))}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              style={styles.hiddenInput}
              autoFocus
            />
            {!started && (
              <div style={styles.hint}>Start typing to begin the test...</div>
            )}
          </>
        )}
      </div>

      {/* 3D Keyboard */}
      <div style={styles.keyboardSection}>
        <Canvas
          camera={{ position: [0, 6, 7], fov: 55 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} />
          <Suspense fallback={null}>
            <KeyboardRenderer
              layout={layout}
              pressedKeys={pressedKeys}
              showPressAnimation={true}
            />
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
      </div>

      {/* Footer hint */}
      <div style={styles.footer}>
        <span>Press <kbd style={styles.kbd}>Tab</kbd> + <kbd style={styles.kbd}>Enter</kbd> to restart</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--surface-dim)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-body)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid var(--outline-variant)'
  },
  backBtn: {
    background: 'none',
    border: '1px solid var(--outline-variant)',
    color: 'var(--on-surface-variant)',
    padding: '8px 16px',
    borderRadius: 4,
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--on-surface)',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    gap: 8
  },
  durationBtn: {
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    color: 'var(--on-surface-variant)',
    padding: '8px 16px',
    borderRadius: 4,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer'
  },
  durationBtnActive: {
    background: 'var(--primary)',
    border: '1px solid var(--primary)',
    color: 'var(--on-primary)',
    padding: '8px 16px',
    borderRadius: 4,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer'
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    padding: '24px',
    background: 'var(--surface)'
  },
  stat: {
    textAlign: 'center'
  },
  statValue: {
    display: 'block',
    fontFamily: 'var(--font-heading)',
    fontSize: 48,
    fontWeight: 700,
    color: 'var(--primary)',
    lineHeight: 1
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  },
  resetBtn: {
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    color: 'var(--on-surface-variant)',
    padding: '12px 24px',
    borderRadius: 4,
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: 24
  },
  wordSection: {
    padding: '24px 64px',
    minHeight: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  wordsContainer: {
    fontSize: 28,
    fontFamily: 'var(--font-body)',
    lineHeight: 1.8,
    maxWidth: 900,
    textAlign: 'center'
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none'
  },
  hint: {
    marginTop: 16,
    color: 'var(--on-surface-variant)',
    fontFamily: 'var(--font-mono)',
    fontSize: 14
  },
  results: {
    textAlign: 'center'
  },
  finalWpm: {
    fontFamily: 'var(--font-heading)',
    fontSize: 120,
    fontWeight: 700,
    color: 'var(--primary)',
    lineHeight: 1
  },
  finalLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    marginBottom: 16
  },
  finalStats: {
    fontFamily: 'var(--font-body)',
    fontSize: 18,
    color: 'var(--on-surface-variant)',
    marginBottom: 32
  },
  tryAgainBtn: {
    background: 'var(--primary)',
    border: 'none',
    color: 'var(--on-primary)',
    padding: '16px 48px',
    borderRadius: 4,
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer'
  },
  keyboardSection: {
    flex: 1,
    minHeight: 450,
    maxHeight: 550
  },
  footer: {
    padding: 16,
    textAlign: 'center',
    color: 'var(--on-surface-variant)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12
  },
  kbd: {
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 4,
    padding: '2px 8px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11
  }
};
