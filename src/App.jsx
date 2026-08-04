import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { questions } from '../questions.js'
import './App.css'

const CATEGORIES = [
  { key: 'all', label: 'All', color: '#8a8a86' },
  { key: 'code', label: 'Code / NFPA', color: '#c1432c' },
  { key: 'building', label: 'Building / IBC', color: '#b8892b' },
  { key: 'business', label: 'Business / Est.', color: '#2f6fb8' },
  { key: 'safety', label: 'Safety / HR', color: '#2f7a4f' },
]

const CATEGORY_META = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

const QUESTION_SECONDS = 30

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(category) {
  const indices = questions
    .map((q, i) => i)
    .filter((i) => category === 'all' || questions[i].category === category)
  return shuffleArray(indices)
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function App() {
  const [category, setCategory] = useState('all')
  const [deck, setDeck] = useState(() => buildDeck('all'))
  const [pos, setPos] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [history, setHistory] = useState({})
  const [transitioning, setTransitioning] = useState(false)
  const [phase, setPhase] = useState('quiz') // 'quiz' | 'results'
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS)

  const submittingRef = useRef(false)

  const currentQIndex = deck.length ? deck[pos % deck.length] : null
  const current = currentQIndex !== null ? questions[currentQIndex] : null
  const isMulti = current ? current.correct.length > 1 : false
  const meta = current ? CATEGORY_META[current.category] : CATEGORY_META.all
  const isLastCard = pos + 1 >= deck.length

  const resetSession = useCallback((key) => {
    const d = buildDeck(key)
    setDeck(d)
    setPos(0)
    setSelected(new Set())
    setScore(0)
    setAnswered(0)
    setHistory({})
    setPhase('quiz')
    setTimeLeft(QUESTION_SECONDS)
    submittingRef.current = false
  }, [])

  const changeCategory = useCallback(
    (key) => {
      setCategory(key)
      resetSession(key)
    },
    [resetSession]
  )

  const handleShuffle = useCallback(() => {
    setDeck((d) => shuffleArray(d))
    setPos(0)
    setSelected(new Set())
    setTimeLeft(QUESTION_SECONDS)
  }, [])

  const handleRestart = useCallback(() => {
    resetSession(category)
  }, [category, resetSession])

  const toggleOption = (optIdx) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (isMulti) {
        if (next.has(optIdx)) next.delete(optIdx)
        else next.add(optIdx)
      } else {
        next.clear()
        next.add(optIdx)
      }
      return next
    })
  }

  // Locks in the current answer (whatever is selected, even nothing) and
  // advances to the next card without revealing correct/incorrect.
  const submitAnswer = useCallback(() => {
    if (!current || submittingRef.current) return
    submittingRef.current = true

    const correctSet = new Set(current.correct)
    const isCorrect =
      selected.size > 0 &&
      correctSet.size === selected.size &&
      [...correctSet].every((c) => selected.has(c))

    setAnswered((a) => a + 1)
    if (isCorrect) setScore((s) => s + 1)
    setHistory((h) => ({
      ...h,
      [currentQIndex]: {
        qIndex: currentQIndex,
        correct: isCorrect,
        selectedArr: [...selected],
      },
    }))

    const wasLast = isLastCard
    setTransitioning(true)
    setTimeout(() => {
      setSelected(new Set())
      setTransitioning(false)
      submittingRef.current = false
      if (wasLast) {
        setPhase('results')
      } else {
        setPos((p) => p + 1)
      }
    }, 180)
  }, [current, selected, currentQIndex, isLastCard])

  const submitAnswerRef = useRef(submitAnswer)
  useEffect(() => {
    submitAnswerRef.current = submitAnswer
  }, [submitAnswer])

  // per-card countdown timer
  useEffect(() => {
    if (phase !== 'quiz' || !current) return
    setTimeLeft(QUESTION_SECONDS)
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [currentQIndex, phase, current])

  // auto-submit when time runs out
  useEffect(() => {
    if (phase === 'quiz' && timeLeft === 0) {
      submitAnswerRef.current()
    }
  }, [timeLeft, phase])

  useEffect(() => {
    const onKey = (e) => {
      if (phase !== 'quiz' || !current) return
      if (e.key === 'Enter') submitAnswer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const timerLow = timeLeft <= 10
  const progressPct = deck.length ? ((pos) / deck.length) * 100 : 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Fire Alarm Quiz</span>

          <nav className="category-tabs" aria-label="Category filter">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={
                  'category-tab' + (category === c.key ? ' category-tab-active' : '')
                }
                style={{ '--tab-color': c.color }}
                onClick={() => changeCategory(c.key)}
              >
                <span className="category-dot" />
                {c.label}
              </button>
            ))}
          </nav>

          <div className="topbar-right">
            <div className="score-pill">
              <span className="score-value">{score}</span>
              <span className="score-sep">/</span>
              <span className="score-total">{answered}</span>
            </div>
            <button className="ghost-btn" onClick={handleRestart}>
              Restart
            </button>
          </div>
        </div>
      </header>

      {phase === 'quiz' && deck.length > 0 && (
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {phase === 'quiz' ? (
        <main className="quiz-main">
          {current ? (
            <div
              className={'question-card' + (transitioning ? ' question-card-out' : '')}
              style={{ '--tab-color': meta.color }}
            >
              <div className="question-meta">
                <span className="category-chip">
                  <span className="category-dot" />
                  {meta.label}
                </span>
                <span className="question-count">
                  Question {pos + 1} of {deck.length}
                </span>
                {isMulti && <span className="multi-hint">Select all that apply</span>}
                <span className={'timer' + (timerLow ? ' timer-low' : '')}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div className="timer-track">
                <div
                  className={'timer-fill' + (timerLow ? ' timer-fill-low' : '')}
                  style={{ width: `${(timeLeft / QUESTION_SECONDS) * 100}%` }}
                />
              </div>

              <p className="question-text">{current.q}</p>

              <ul className="options">
                {current.options.map((opt, i) => (
                  <li key={i}>
                    <button
                      className={'option' + (selected.has(i) ? ' option-selected' : '')}
                      onClick={() => toggleOption(i)}
                    >
                      <span className="option-marker">
                        {isMulti ? (selected.has(i) ? '☑' : '☐') : (selected.has(i) ? '●' : '○')}
                      </span>
                      <span className="option-text">{opt}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="card-actions">
                <button className="text-btn" onClick={handleShuffle}>
                  Shuffle deck
                </button>
                <button
                  className="primary-btn"
                  onClick={submitAnswer}
                  disabled={selected.size === 0}
                >
                  {isLastCard ? 'Finish quiz' : 'Lock in answer'}
                </button>
              </div>
            </div>
          ) : (
            <div className="question-card empty-card">
              <p className="question-text">No questions in this category.</p>
            </div>
          )}
        </main>
      ) : (
        <Results
          deck={deck}
          history={history}
          score={score}
          answered={answered}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}

function Results({ deck, history, score, answered, onRestart }) {
  const graded = deck.map((qIndex) => ({
    qIndex,
    q: questions[qIndex],
    result: history[qIndex],
  }))
  const missed = graded.filter((g) => g.result && !g.result.correct)
  const passed = graded.filter((g) => g.result && g.result.correct)
  const pct = answered ? Math.round((score / answered) * 100) : 0

  return (
    <main className="results-main">
      <div className="results-summary">
        <h1>Session complete</h1>
        <div className="results-score">
          <span className="results-score-value">{pct}%</span>
          <span className="results-score-detail">
            {score} / {answered} correct
          </span>
        </div>
        <div className="results-tally">
          <span className="tally-pass">{passed.length} passed</span>
          <span className="tally-fail">{missed.length} missed</span>
        </div>
        <button className="primary-btn" onClick={onRestart}>
          Start new session
        </button>
      </div>

      <div className="results-list">
        {graded.map(({ qIndex, q, result }) => {
          const meta = CATEGORY_META[q.category]
          const isCorrect = result?.correct
          const selectedArr = result?.selectedArr ?? []
          return (
            <div
              key={qIndex}
              className={'result-card' + (isCorrect ? ' result-pass' : ' result-fail')}
              style={{ '--tab-color': meta.color }}
            >
              <div className="question-meta">
                <span className="category-chip">
                  <span className="category-dot" />
                  {meta.label}
                </span>
                <span className={'result-status' + (isCorrect ? ' status-pass' : ' status-fail')}>
                  {isCorrect ? 'Passed' : selectedArr.length ? 'Missed' : 'No answer — timed out'}
                </span>
              </div>
              <p className="question-text">{q.q}</p>
              <ul className="options">
                {q.options.map((opt, i) => {
                  const wasSelected = selectedArr.includes(i)
                  const isCorrectOpt = q.correct.includes(i)
                  let cls = ''
                  if (isCorrectOpt) cls = 'option-correct'
                  else if (wasSelected) cls = 'option-incorrect'
                  return (
                    <li key={i}>
                      <div className={'option option-static ' + cls}>
                        <span className="option-marker">{wasSelected ? '●' : '○'}</span>
                        <span className="option-text">{opt}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="explanation">{q.explanation}</p>
            </div>
          )
        })}
      </div>
    </main>
  )
}
