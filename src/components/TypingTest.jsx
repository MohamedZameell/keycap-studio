import React, { useState, useEffect, useRef, useCallback } from 'react';

const WORD_LISTS = {
  common: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'],
  keyboard: ['switch', 'keycap', 'mechanical', 'keyboard', 'cherry', 'gateron', 'linear', 'tactile', 'clicky', 'hotswap', 'gasket', 'mount', 'pcb', 'plate', 'foam', 'lube', 'stabilizer', 'spacebar', 'enter', 'backspace', 'shift', 'control', 'escape', 'function', 'arrow', 'numpad', 'tenkeyless', 'compact', 'wireless', 'bluetooth', 'rgb', 'backlit', 'profile', 'sculpted', 'uniform', 'doubleshot', 'dye-sub', 'pbt', 'abs', 'gmk', 'sa', 'dsa', 'cherry', 'oem', 'xda', 'kat', 'build', 'custom', 'thock', 'clack', 'sound', 'typing', 'feel', 'premium', 'enthusiast', 'hobby']
};

function generateWords(count = 50, list = 'common') {
  const words = WORD_LISTS[list] || WORD_LISTS.common;
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result;
}

export default function TypingTest({ onClose }) {
  const [words, setWords] = useState(() => generateWords(60));
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
  const [wordList, setWordList] = useState('common');
  const inputRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!started || finished) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));

      // Calculate WPM
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
  }, [started, finished, startTime, correctWords]);

  const handleKeyDown = useCallback((e) => {
    if (finished) return;

    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      // Check word
      const currentWord = words[currentIndex];
      const isCorrect = input.trim() === currentWord;

      if (isCorrect) {
        setCorrectWords(c => c + 1);
      }
      setTotalTyped(t => t + 1);
      setAccuracy(Math.round(((correctWords + (isCorrect ? 1 : 0)) / (totalTyped + 1)) * 100));

      setCurrentIndex(i => i + 1);
      setInput('');
    }
  }, [started, finished, words, currentIndex, input, correctWords, totalTyped]);

  const reset = () => {
    setWords(generateWords(60, wordList));
    setCurrentIndex(0);
    setInput('');
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setTimeLeft(60);
    setCorrectWords(0);
    setTotalTyped(0);
    setWpm(0);
    setAccuracy(100);
    inputRef.current?.focus();
  };

  const switchWordList = (list) => {
    setWordList(list);
    setWords(generateWords(60, list));
    reset();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>×</button>

        <div style={styles.header}>
          <h2 style={styles.title}>TYPING TEST</h2>
          <div style={styles.wordListToggle}>
            <button
              style={wordList === 'common' ? styles.listBtnActive : styles.listBtn}
              onClick={() => switchWordList('common')}
            >Common</button>
            <button
              style={wordList === 'keyboard' ? styles.listBtnActive : styles.listBtn}
              onClick={() => switchWordList('keyboard')}
            >Keyboard</button>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>{wpm}</div>
            <div style={styles.statLabel}>WPM</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{accuracy}%</div>
            <div style={styles.statLabel}>Accuracy</div>
          </div>
          <div style={styles.stat}>
            <div style={{ ...styles.statValue, color: timeLeft <= 10 ? '#ff6b6b' : 'var(--primary)' }}>{timeLeft}s</div>
            <div style={styles.statLabel}>Time Left</div>
          </div>
        </div>

        {finished ? (
          <div style={styles.results}>
            <div style={styles.finalWpm}>{wpm} WPM</div>
            <div style={styles.finalStats}>
              {correctWords} correct / {totalTyped} total ({accuracy}% accuracy)
            </div>
            <button style={styles.resetBtn} onClick={reset}>Try Again</button>
          </div>
        ) : (
          <>
            <div style={styles.wordContainer}>
              {words.slice(currentIndex, currentIndex + 15).map((word, i) => (
                <span
                  key={currentIndex + i}
                  style={{
                    ...styles.word,
                    color: i === 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                    fontWeight: i === 0 ? 700 : 400,
                    background: i === 0 ? 'var(--surface-container-high)' : 'transparent',
                    padding: i === 0 ? '4px 8px' : '4px 4px',
                    borderRadius: 4
                  }}
                >
                  {word}
                </span>
              ))}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={started ? '' : 'Start typing...'}
              style={{
                ...styles.input,
                borderColor: input && words[currentIndex]?.startsWith(input) ? 'var(--primary)' : input ? '#ff6b6b' : 'var(--outline-variant)'
              }}
              autoFocus
            />

            <p style={styles.hint}>Press SPACE after each word</p>
          </>
        )}

        <button style={styles.resetBtnSmall} onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 4,
    padding: '40px 48px',
    width: '100%',
    maxWidth: 600,
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'none',
    border: 'none',
    color: 'var(--on-surface-variant)',
    fontSize: 24,
    cursor: 'pointer'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: 'var(--on-surface)'
  },
  wordListToggle: {
    display: 'flex',
    gap: 8
  },
  listBtn: {
    padding: '6px 12px',
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 4,
    color: 'var(--on-surface-variant)',
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer'
  },
  listBtnActive: {
    padding: '6px 12px',
    background: 'var(--primary)',
    border: '1px solid var(--primary)',
    borderRadius: 4,
    color: 'var(--on-primary)',
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer'
  },
  stats: {
    display: 'flex',
    gap: 24,
    marginBottom: 32
  },
  stat: {
    textAlign: 'center'
  },
  statValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: 36,
    fontWeight: 700,
    color: 'var(--primary)'
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase'
  },
  wordContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    minHeight: 80,
    alignItems: 'center'
  },
  word: {
    fontFamily: 'var(--font-body)',
    fontSize: 18,
    transition: 'all 0.15s'
  },
  input: {
    width: '100%',
    padding: '16px 20px',
    background: 'var(--surface-container)',
    border: '2px solid var(--outline-variant)',
    borderRadius: 4,
    color: 'var(--on-surface)',
    fontFamily: 'var(--font-body)',
    fontSize: 20,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  hint: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--on-surface-variant)',
    textAlign: 'center',
    marginTop: 12
  },
  results: {
    textAlign: 'center',
    padding: '32px 0'
  },
  finalWpm: {
    fontFamily: 'var(--font-heading)',
    fontSize: 72,
    fontWeight: 700,
    color: 'var(--primary)',
    marginBottom: 8
  },
  finalStats: {
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    color: 'var(--on-surface-variant)',
    marginBottom: 32
  },
  resetBtn: {
    padding: '14px 32px',
    background: 'var(--primary)',
    border: 'none',
    borderRadius: 4,
    color: 'var(--on-primary)',
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase'
  },
  resetBtnSmall: {
    display: 'block',
    margin: '24px auto 0',
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--outline-variant)',
    borderRadius: 4,
    color: 'var(--on-surface-variant)',
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'uppercase'
  }
};
