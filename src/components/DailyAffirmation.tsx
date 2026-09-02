import { useEffect, useRef, useState } from 'react'
import { Copy, Sparkles } from 'lucide-react'
import { affirmations, affirmationFallback, type Affirmation, type AffirmationCategory } from '../data/affirmations'
import { getAffirmationDateKey } from '../lib/affirmationService'

type DailyAffirmationProps = {
  userId: string
}

const stateKey = (userId: string) => `luna_affirmation_state:${userId}`
function hashDay(value: string) {
  return [...value].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7)
}

function preferredCategories(hour: number): AffirmationCategory[] {
  if (hour >= 5 && hour < 12) return ['hope', 'calm', 'balance', 'self_compassion', 'growth']
  if (hour >= 12 && hour < 17) return ['confidence', 'courage', 'boundaries', 'growth', 'patience']
  if (hour >= 17 && hour < 22) return ['rest', 'calm', 'hope', 'resilience', 'balance']
  return ['rest', 'calm', 'self_compassion', 'hope', 'resilience']
}

function selectDailyAffirmation(userId: string, date: string): Affirmation {
  try {
    const hour = new Date().getHours()
    const key = stateKey(userId)
    const saved = JSON.parse(localStorage.getItem(key) || '{}') as { day?: string; id?: string; recent?: string[] }
    if (saved.day === date && saved.id) {
      return affirmations.find((affirmation) => affirmation.id === saved.id) || affirmationFallback
    }

    const preferred = preferredCategories(hour)
    const pool = affirmations.filter((affirmation) => preferred.includes(affirmation.category))
    const source = pool.length > 0 ? pool : affirmations
    const recent = new Set(saved.recent || [])
    const start = hashDay(`${userId}:${date}:${hour}`) % source.length
    let selected = source[start] || affirmationFallback
    for (let offset = 0; offset < source.length; offset += 1) {
      const candidate = source[(start + offset) % source.length]
      if (!recent.has(candidate.id) || recent.size >= source.length - 1) {
        selected = candidate
        break
      }
    }
    localStorage.setItem(key, JSON.stringify({ day: date, id: selected.id, recent: [...recent, selected.id].slice(-7) }))
    return selected
  } catch {
    return affirmations[hashDay(date) % affirmations.length] || affirmationFallback
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function DailyAffirmation({ userId }: DailyAffirmationProps) {
  const date = getAffirmationDateKey()
  const [copied, setCopied] = useState(false)
  const affirmation = selectDailyAffirmation(userId, date)
  const completedStorageKey = `${stateKey(userId)}:completed:${date}`
  const [completed, setCompleted] = useState(() => localStorage.getItem(completedStorageKey) === 'true' || prefersReducedMotion())
  const [visibleText, setVisibleText] = useState(() => completed ? affirmation.text : '')
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (completed) return undefined

    let index = 0
    const typeNext = () => {
      index += 1
      setVisibleText(affirmation.text.slice(0, index))
      if (index >= affirmation.text.length) {
        setCompleted(true)
        localStorage.setItem(completedStorageKey, 'true')
        return
      }
      const character = affirmation.text[index - 1]
      const pause = '.!?—'.includes(character) ? 180 : character === ',' ? 120 : 42
      timerRef.current = window.setTimeout(typeNext, pause)
    }
    timerRef.current = window.setTimeout(typeNext, 70)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [affirmation.id, affirmation.text, completed, completedStorageKey])

  async function copyAffirmation() {
    try {
      await navigator.clipboard.writeText(affirmation.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function showFull() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setVisibleText(affirmation.text)
    setCompleted(true)
    localStorage.setItem(completedStorageKey, 'true')
  }

  const greeting = new Date().getHours() < 12 ? 'Something gentle for your morning.' : new Date().getHours() < 18 ? 'A little reminder for your afternoon.' : 'Something soft to carry into tonight.'

  return (
    <article className="affirmation-card" aria-labelledby="affirmation-title">
      <div className="affirmation-card-top">
        <div className="affirmation-icon"><Sparkles size={17} /></div>
        <div>
          <p className="label" id="affirmation-title">AFFIRMATION ✦</p>
          <small>{greeting}</small>
        </div>
        <button className="affirmation-copy-button" type="button" onClick={() => void copyAffirmation()} aria-label="Copy affirmation">
          <Copy size={16} />
          <span>{copied ? 'Copied ✓' : 'Copy'}</span>
        </button>
      </div>
      <div className="affirmation-message" aria-hidden="true">
        <span>{visibleText}</span>
        {!completed && <i aria-hidden="true" />}
      </div>
      <p className="affirmation-accessible">{affirmation.text}</p>
      {!completed && <button className="affirmation-skip" type="button" onClick={showFull}>Show full affirmation <span>→</span></button>}
      {completed && <p className="affirmation-footer">A tiny moment of kindness, just for today.</p>}
    </article>
  )
}
