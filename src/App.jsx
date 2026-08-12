import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { questions } from '../questions.js'
import { questionsPhase2 } from './questions-phase2.js'
import './App.css'

const CATEGORIES_PHASE1 = [
  { key: 'all', label: 'All', color: '#8a8a86' },
  { key: 'code', label: 'Code / NFPA', color: '#e63946' },
  { key: 'building', label: 'Building / IBC', color: '#f59e0b' },
  { key: 'business', label: 'Business / Est.', color: '#2563eb' },
  { key: 'safety', label: 'Safety / HR', color: '#16a34a' },
]

const CATEGORIES_PHASE2 = [
  { key: 'all', label: 'All', color: '#8a8a86' },
  { key: 'nicet', label: 'NICET', color: '#a855f7' },
]

const QUESTION_SECONDS = 30

const PHASE2_PART_COUNT = 4
const PHASE2_PART_COLORS = ['#a855f7', '#2563eb', '#16a34a', '#e63946']

function splitIntoParts(arr, count) {
  const size = Math.ceil(arr.length / count)
  const parts = []
  for (let i = 0; i < count; i++) {
    const start = i * size
    const slice = arr.slice(start, start + size)
    if (slice.length === 0) continue
    parts.push({
      key: i,
      label: `Part ${i + 1}`,
      range: `Q${start + 1}–${start + slice.length}`,
      color: PHASE2_PART_COLORS[i % PHASE2_PART_COLORS.length],
      questions: slice,
    })
  }
  return parts
}

const PHASE2_PARTS = splitIntoParts(questionsPhase2, PHASE2_PART_COUNT)

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(questionSet, category) {
  const indices = questionSet
    .map((q, i) => i)
    .filter((i) => category === 'all' || questionSet[i].category === category)
  return shuffleArray(indices)
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function App() {
  const [selectedPhase, setSelectedPhase] = useState(null) // null | 'phase1' | 'phase2'
  const [phase2Part, setPhase2Part] = useState(null) // null | part index | 'all'
  const [category, setCategory] = useState('all')
  const [deck, setDeck] = useState([])
  const [pos, setPos] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [history, setHistory] = useState({})
  const [transitioning, setTransitioning] = useState(false)
  const [phase, setPhase] = useState('quiz') // 'quiz' | 'results'
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS)
  const [isPaused, setIsPaused] = useState(false)

  const submittingRef = useRef(false)
  const isPausedRef = useRef(false)

  const activeQuestions =
    selectedPhase === 'phase2'
      ? phase2Part !== null && phase2Part !== 'all'
        ? PHASE2_PARTS[phase2Part].questions
        : questionsPhase2
      : questions
  const activeCategories = selectedPhase === 'phase2' ? CATEGORIES_PHASE2 : CATEGORIES_PHASE1
  const CATEGORY_META = Object.fromEntries(activeCategories.map((c) => [c.key, c]))

  const currentQIndex = deck.length ? deck[pos % deck.length] : null
  const current = currentQIndex !== null ? activeQuestions[currentQIndex] : null
  const isMulti = current ? current.correct.length > 1 : false
  const meta = current ? CATEGORY_META[current.category] : activeCategories[0]
  const isLastCard = pos + 1 >= deck.length
  const alreadyGraded = currentQIndex !== null && history[currentQIndex] != null

  const startQuiz = useCallback((questionSet) => {
    const d = buildDeck(questionSet, 'all')
    setDeck(d)
    setCategory('all')
    setPos(0)
    setSelected(new Set())
    setScore(0)
    setAnswered(0)
    setHistory({})
    setPhase('quiz')
    setTimeLeft(QUESTION_SECONDS)
    setIsPaused(false)
    submittingRef.current = false
  }, [])

  const initPhase = useCallback(
    (phaseKey) => {
      setSelectedPhase(phaseKey)
      setPhase2Part(null)
      if (phaseKey === 'phase1') {
        startQuiz(questions)
      }
      // phase2 waits for a part to be chosen on the part-selector screen
    },
    [startQuiz]
  )

  const selectPhase2Part = useCallback(
    (partKey) => {
      setPhase2Part(partKey)
      const questionSet = partKey === 'all' ? questionsPhase2 : PHASE2_PARTS[partKey].questions
      startQuiz(questionSet)
    },
    [startQuiz]
  )

  const resetSession = useCallback(
    (key) => {
      const d = buildDeck(activeQuestions, key)
      setDeck(d)
      setPos(0)
      setSelected(new Set())
      setScore(0)
      setAnswered(0)
      setHistory({})
      setPhase('quiz')
      setTimeLeft(QUESTION_SECONDS)
      setIsPaused(false)
      submittingRef.current = false
    },
    [activeQuestions]
  )

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
    setIsPaused(false)
  }, [])

  const handleRestart = useCallback(() => {
    resetSession(category)
  }, [category, resetSession])

  const handleChangePhase = useCallback(() => {
    setSelectedPhase(null)
    setPhase2Part(null)
    setCategory('all')
    setDeck([])
    setPos(0)
    setSelected(new Set())
    setScore(0)
    setAnswered(0)
    setHistory({})
    setPhase('quiz')
    setTimeLeft(QUESTION_SECONDS)
    setIsPaused(false)
    submittingRef.current = false
  }, [])

  const handleChangePart = useCallback(() => {
    setPhase2Part(null)
    setCategory('all')
    setDeck([])
    setPos(0)
    setSelected(new Set())
    setScore(0)
    setAnswered(0)
    setHistory({})
    setPhase('quiz')
    setTimeLeft(QUESTION_SECONDS)
    setIsPaused(false)
    submittingRef.current = false
  }, [])

  const handleReviewMissed = useCallback((missedIndices) => {
    setDeck(shuffleArray(missedIndices))
    setPos(0)
    setSelected(new Set())
    setScore(0)
    setAnswered(0)
    setHistory({})
    setPhase('quiz')
    setTimeLeft(QUESTION_SECONDS)
    setIsPaused(false)
    submittingRef.current = false
  }, [])

  const toggleOption = (optIdx) => {
    if (isPaused) return
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

  const goToPos = useCallback(
    (newPos) => {
      if (newPos < 0 || newPos >= deck.length || newPos === pos) return
      const qIdx = deck[newPos]
      const priorSelection = history[qIdx]?.selectedArr
      setPos(newPos)
      setSelected(new Set(priorSelection ?? []))
      setIsPaused(false)
      submittingRef.current = false
    },
    [deck, history, pos]
  )

  const goPrevious = useCallback(() => goToPos(pos - 1), [pos, goToPos])
  const goNext = useCallback(() => goToPos(pos + 1), [pos, goToPos])

  const submitAnswer = useCallback(() => {
    if (!current || submittingRef.current || isPaused) return
    submittingRef.current = true

    const correctSet = new Set(current.correct)
    const isCorrect =
      selected.size > 0 &&
      correctSet.size === selected.size &&
      [...correctSet].every((c) => selected.has(c))

    const prior = history[currentQIndex]
    if (prior) {
      if (prior.correct !== isCorrect) {
        setScore((s) => s + (isCorrect ? 1 : -1))
      }
    } else {
      setAnswered((a) => a + 1)
      if (isCorrect) setScore((s) => s + 1)
    }
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
  }, [current, selected, currentQIndex, isLastCard, isPaused, history])

  const submitAnswerRef = useRef(submitAnswer)
  useEffect(() => {
    submitAnswerRef.current = submitAnswer
  }, [submitAnswer])

  // per-card countdown timer
  useEffect(() => {
    if (phase !== 'quiz' || !current) return
    setTimeLeft(QUESTION_SECONDS)
    setIsPaused(false)
    const interval = setInterval(() => {
      if (isPausedRef.current) return
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

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  const togglePause = useCallback(() => {
    if (phase !== 'quiz' || !current || timeLeft === 0) return
    setIsPaused((p) => !p)
  }, [phase, current, timeLeft])

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
  }, [current, phase, submitAnswer])

  // Phase selection screen
  if (!selectedPhase) {
    return <PhaseSelector onSelectPhase={initPhase} />
  }

  // Phase II part selection screen
  if (selectedPhase === 'phase2' && phase2Part === null) {
    return (
      <Phase2PartSelector
        parts={PHASE2_PARTS}
        total={questionsPhase2.length}
        onSelectPart={selectPhase2Part}
        onBack={handleChangePhase}
      />
    )
  }

  const timerLow = timeLeft <= 10
  const progressPct = deck.length ? ((pos) / deck.length) * 100 : 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand brand-home" onClick={handleChangePhase} aria-label="Back to phase selection">
            <span className="home-icon">⌂</span> Fire Alarm Quiz
          </button>

          <nav className="category-tabs" aria-label="Category filter">
            {activeCategories.map((c) => (
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
            <button className="ghost-btn" onClick={handleChangePhase}>
              Change phase
            </button>
            {selectedPhase === 'phase2' && (
              <button className="ghost-btn" onClick={handleChangePart}>
                Change part
              </button>
            )}
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
              className={'question-card' + (transitioning ? ' question-card-out' : '') + (isPaused ? ' question-card-paused' : '')}
              style={{ '--tab-color': meta.color }}
            >
              {isPaused && (
                <div className="paused-overlay">
                  <span>Paused</span>
                </div>
              )}
              <div className="question-nav">
                <button className="nav-btn" onClick={goPrevious} disabled={pos === 0}>
                  ‹ Prev
                </button>
                <span className="question-count">
                  Question {pos + 1} of {deck.length}
                  {alreadyGraded && <span className="answered-badge"> • Answered</span>}
                </span>
                <button className="nav-btn" onClick={goNext} disabled={pos === deck.length - 1}>
                  Next ›
                </button>
              </div>

              <div className="question-meta">
                <span className="category-chip">
                  <span className="category-dot" />
                  {meta.label}
                </span>
                {isMulti && <span className="multi-hint">Select all that apply</span>}
                <span className={'timer' + (timerLow ? ' timer-low' : '')}>
                  {formatTime(timeLeft)}
                </span>
                <button
                  className="pause-btn"
                  onClick={togglePause}
                  aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
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
                      disabled={isPaused}
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
                  disabled={selected.size === 0 || isPaused}
                >
                  {isLastCard ? 'Finish quiz' : alreadyGraded ? 'Update answer' : 'Lock in answer'}
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
          activeQuestions={activeQuestions}
          history={history}
          score={score}
          answered={answered}
          CATEGORY_META={CATEGORY_META}
          onRestart={handleRestart}
          onChangePhase={handleChangePhase}
          onReviewMissed={handleReviewMissed}
        />
      )}
    </div>
  )
}

function PhaseSelector({ onSelectPhase }) {
  return (
    <div className="phase-selector-wrapper">
      <header className="topbar topbar-selector">
        <div className="topbar-inner">
          <span className="brand">Fire Alarm Quiz</span>
        </div>
      </header>
      <main className="phase-selector">
        <div className="phase-selector-card">
          <h1>Choose a quiz</h1>
          <p className="phase-selector-subtitle">Select the phase to get started</p>

          <div className="phase-grid">
            <button
              className="phase-option phase-option-1"
              onClick={() => onSelectPhase('phase1')}
            >
              <div className="phase-option-number">I</div>
              <div className="phase-option-title">Fundamentals</div>
              <div className="phase-option-count">{questions.length} questions</div>
            </button>

            <button
              className="phase-option phase-option-2"
              onClick={() => onSelectPhase('phase2')}
            >
              <div className="phase-option-number">II</div>
              <div className="phase-option-title">NICET Advanced</div>
              <div className="phase-option-count">{questionsPhase2.length} questions</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function Phase2PartSelector({ parts, total, onSelectPart, onBack }) {
  return (
    <div className="phase-selector-wrapper">
      <header className="topbar topbar-selector">
        <div className="topbar-inner">
          <span className="brand">Fire Alarm Quiz</span>
        </div>
      </header>
      <main className="phase-selector">
        <div className="phase-selector-card">
          <h1>Phase II — NICET Advanced</h1>
          <p className="phase-selector-subtitle">
            Split into {parts.length} parts of ~{parts[0].questions.length} questions each, or take all {total} at once
          </p>

          <div className="phase-grid part-grid">
            {parts.map((part) => (
              <button
                key={part.key}
                className="phase-option part-option"
                style={{ '--tab-color': part.color }}
                onClick={() => onSelectPart(part.key)}
              >
                <div className="phase-option-number">{part.key + 1}</div>
                <div className="phase-option-title">{part.label}</div>
                <div className="phase-option-count">
                  {part.questions.length} questions ({part.range})
                </div>
              </button>
            ))}
            <button
              className="phase-option part-option part-option-all"
              onClick={() => onSelectPart('all')}
            >
              <div className="phase-option-number">∗</div>
              <div className="phase-option-title">All parts</div>
              <div className="phase-option-count">{total} questions</div>
            </button>
          </div>

          <button className="text-btn part-back-btn" onClick={onBack}>
            ← Back to phase selection
          </button>
        </div>
      </main>
    </div>
  )
}

function Results({ deck, activeQuestions, history, score, answered, CATEGORY_META, onRestart, onChangePhase, onReviewMissed }) {
  const [filter, setFilter] = useState('all') // 'all' | 'missed'

  const graded = deck.map((qIndex) => ({
    qIndex,
    q: activeQuestions[qIndex],
    result: history[qIndex],
  }))
  const missed = graded.filter((g) => g.result && !g.result.correct)
  const passed = graded.filter((g) => g.result && g.result.correct)
  const pct = answered ? Math.round((score / answered) * 100) : 0
  const visible = filter === 'missed' ? missed : graded

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
        <div className="results-actions">
          <button className="primary-btn" onClick={onRestart}>
            Start new session
          </button>
          {missed.length > 0 && (
            <button
              className="ghost-btn"
              onClick={() => onReviewMissed(missed.map((m) => m.qIndex))}
            >
              Retake missed only ({missed.length})
            </button>
          )}
          <button className="ghost-btn" onClick={onChangePhase}>
            Change phase
          </button>
        </div>
        {missed.length > 0 && (
          <div className="results-filter">
            <button
              className={'filter-btn' + (filter === 'all' ? ' filter-btn-active' : '')}
              onClick={() => setFilter('all')}
            >
              All ({graded.length})
            </button>
            <button
              className={'filter-btn' + (filter === 'missed' ? ' filter-btn-active' : '')}
              onClick={() => setFilter('missed')}
            >
              Missed only ({missed.length})
            </button>
          </div>
        )}
      </div>

      <div className="results-list">
        {visible.map(({ qIndex, q, result }) => {
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
