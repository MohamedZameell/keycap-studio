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
    background: 'rgba(6, 6, 8, 0.9)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    background: 'rgba(16, 16, 20, 0.95)',
    border: '1px solid rgba(246, 246, 246, 0.08)',
    borderRadius: 16,
    padding: '40px 48px',
    width: '100%',
    maxWidth: 620,
    position: 'relative',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)'
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    background: 'rgba(246, 246, 246, 0.05)',
    border: 'none',
    color: 'var(--on-surface-variant)',
    fontSize: 20,
    cursor: 'pointer',
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: 'var(--on-surface)',
    letterSpacing: '-0.02em'
  },
  wordListToggle: {
    display: 'flex',
    gap: 6,
    background: 'rgba(246, 246, 246, 0.04)',
    padding: 4,
    borderRadius: 10
  },
  listBtn: {
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: 'var(--on-surface-variant)',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  listBtnActive: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
    border: 'none',
    borderRadius: 8,
    color: 'var(--on-primary)',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(208, 188, 255, 0.25)'
  },
  stats: {
    display: 'flex',
    gap: 20,
    marginBottom: 32,
    background: 'rgba(6, 6, 8, 0.5)',
    padding: '20px 24px',
    borderRadius: 12
  },
  stat: {
    textAlign: 'center',
    flex: 1
  },
  statValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--primary)',
    letterSpacing: '-0.02em'
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginTop: 4
  },
  wordContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    minHeight: 80,
    alignItems: 'center',
    padding: '16px 0'
  },
  word: {
    fontFamily: 'var(--font-body)',
    fontSize: 18,
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  input: {
    width: '100%',
    padding: '18px 22px',
    background: 'rgba(246, 246, 246, 0.04)',
    border: '2px solid rgba(246, 246, 246, 0.08)',
    borderRadius: 12,
    color: 'var(--on-surface)',
    fontFamily: 'var(--font-body)',
    fontSize: 20,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  hint: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: '0.05em'
  },
  results: {
    textAlign: 'center',
    padding: '40px 0'
  },
  finalWpm: {
    fontFamily: 'var(--font-heading)',
    fontSize: 80,
    fontWeight: 700,
    background: 'linear-gradient(180deg, #ffffff 20%, var(--primary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 8,
    letterSpacing: '-0.03em'
  },
  finalStats: {
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    color: 'var(--on-surface-variant)',
    marginBottom: 36
  },
  resetBtn: {
    padding: '16px 36px',
    background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
    border: 'none',
    borderRadius: 10,
    color: 'var(--on-primary)',
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(208, 188, 255, 0.3)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  resetBtnSmall: {
    display: 'block',
    margin: '28px auto 0',
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid rgba(246, 246, 246, 0.1)',
    borderRadius: 8,
    color: 'var(--on-surface-variant)',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  }
};
