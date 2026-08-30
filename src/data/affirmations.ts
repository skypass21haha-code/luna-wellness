export type AffirmationCategory =
  | 'rest'
  | 'self_compassion'
  | 'confidence'
  | 'patience'
  | 'growth'
  | 'balance'
  | 'courage'
  | 'boundaries'
  | 'hope'
  | 'calm'
  | 'resilience'

export type LoveAffirmationCategory =
  | 'random_love'
  | 'morning_love'
  | 'afternoon_love'
  | 'evening_love'
  | 'goodnight_love'
  | 'encouragement'
  | 'appreciation'
  | 'i_miss_you'
  | 'little_smile'
  | 'deep_love'

export type Affirmation = {
  id: string
  text: string
  category: AffirmationCategory
}

export type LoveAffirmation = {
  id: string
  title: string
  message: string
  category: LoveAffirmationCategory
}

export const affirmations: Affirmation[] = [
  { id: 'rest-01', text: 'You are allowed to rest without earning it.', category: 'rest' },
  { id: 'rest-02', text: 'Rest is part of caring for yourself.', category: 'rest' },
  { id: 'rest-03', text: 'Your body deserves tenderness today.', category: 'rest' },
  { id: 'rest-04', text: 'A slower day can still be a meaningful day.', category: 'rest' },
  { id: 'rest-05', text: 'You do not have to fill every quiet moment.', category: 'rest' },
  { id: 'self-compassion-01', text: 'You do not have to have everything figured out today.', category: 'self_compassion' },
  { id: 'self-compassion-02', text: 'Speak to yourself with the same patience you offer others.', category: 'self_compassion' },
  { id: 'self-compassion-03', text: 'You are worthy of kindness on the days that feel unfinished.', category: 'self_compassion' },
  { id: 'self-compassion-04', text: 'Your feelings can be real without needing to define the whole day.', category: 'self_compassion' },
  { id: 'self-compassion-05', text: 'You can meet yourself exactly where you are.', category: 'self_compassion' },
  { id: 'confidence-01', text: 'You are doing enough by taking the next honest step.', category: 'confidence' },
  { id: 'confidence-02', text: 'Your voice and your needs both deserve room.', category: 'confidence' },
  { id: 'confidence-03', text: 'You can trust yourself to respond one moment at a time.', category: 'confidence' },
  { id: 'confidence-04', text: 'You are more capable than this difficult moment suggests.', category: 'confidence' },
  { id: 'confidence-05', text: 'You do not need permission to take yourself seriously.', category: 'confidence' },
  { id: 'patience-01', text: 'Your pace does not need to match anyone else\'s.', category: 'patience' },
  { id: 'patience-02', text: 'Good things can grow quietly and slowly.', category: 'patience' },
  { id: 'patience-03', text: 'You can let progress take the time it needs.', category: 'patience' },
  { id: 'patience-04', text: 'There is no prize for rushing your own becoming.', category: 'patience' },
  { id: 'patience-05', text: 'One small step is a complete step.', category: 'patience' },
  { id: 'growth-01', text: 'Small progress is still progress.', category: 'growth' },
  { id: 'growth-02', text: 'Be gentle with yourself while you grow.', category: 'growth' },
  { id: 'growth-03', text: 'You are learning, and learning rarely happens in a straight line.', category: 'growth' },
  { id: 'growth-04', text: 'Every kind choice is part of the person you are becoming.', category: 'growth' },
  { id: 'growth-05', text: 'You can begin again without starting from nothing.', category: 'growth' },
  { id: 'balance-01', text: 'Your life can hold both effort and ease.', category: 'balance' },
  { id: 'balance-02', text: 'Balance is a rhythm, not a perfect position.', category: 'balance' },
  { id: 'balance-03', text: 'You are allowed to change what no longer feels sustainable.', category: 'balance' },
  { id: 'balance-04', text: 'Make room for what restores you.', category: 'balance' },
  { id: 'balance-05', text: 'You can care deeply without carrying everything.', category: 'balance' },
  { id: 'courage-01', text: 'Courage can look like asking for what you need.', category: 'courage' },
  { id: 'courage-02', text: 'You can be tender and brave at the same time.', category: 'courage' },
  { id: 'courage-03', text: 'It is brave to keep showing up for yourself.', category: 'courage' },
  { id: 'courage-04', text: 'You do not have to feel ready to take one careful step.', category: 'courage' },
  { id: 'courage-05', text: 'Your honesty is a quiet form of courage.', category: 'courage' },
  { id: 'boundaries-01', text: 'A clear no can make space for a wholehearted yes.', category: 'boundaries' },
  { id: 'boundaries-02', text: 'Protecting your peace is a valid form of care.', category: 'boundaries' },
  { id: 'boundaries-03', text: 'You are allowed to choose what belongs in your day.', category: 'boundaries' },
  { id: 'boundaries-04', text: 'Your needs are not an inconvenience.', category: 'boundaries' },
  { id: 'boundaries-05', text: 'You can be kind without abandoning yourself.', category: 'boundaries' },
  { id: 'hope-01', text: 'Today does not have to be perfect to be meaningful.', category: 'hope' },
  { id: 'hope-02', text: 'There can be a little more ease ahead.', category: 'hope' },
  { id: 'hope-03', text: 'You deserve moments that feel peaceful.', category: 'hope' },
  { id: 'hope-04', text: 'A hard chapter is not the whole story.', category: 'hope' },
  { id: 'hope-05', text: 'Let a small possibility of good be enough for today.', category: 'hope' },
  { id: 'calm-01', text: 'Take today one moment at a time.', category: 'calm' },
  { id: 'calm-02', text: 'You can return to your breath and begin again.', category: 'calm' },
  { id: 'calm-03', text: 'Quiet does not need to be productive to be valuable.', category: 'calm' },
  { id: 'calm-04', text: 'Let this moment be smaller than the whole day.', category: 'calm' },
  { id: 'calm-05', text: 'There is no need to solve everything in this breath.', category: 'calm' },
  { id: 'resilience-01', text: 'You can be proud of yourself for making it through today.', category: 'resilience' },
  { id: 'resilience-02', text: 'You have made it through difficult moments before.', category: 'resilience' },
  { id: 'resilience-03', text: 'You can carry what is true and release what is not yours.', category: 'resilience' },
  { id: 'resilience-04', text: 'Even a small return to yourself counts.', category: 'resilience' },
  { id: 'resilience-05', text: 'You are allowed to rebuild your energy gently.', category: 'resilience' },
]

export const loveAffirmations: LoveAffirmation[] = [
  { id: 'random-01', title: 'A little reminder ♡', message: 'You are deeply loved, exactly as you are.', category: 'random_love' },
  { id: 'random-02', title: 'Thinking of you 🌷', message: 'Somehow, you found your way into my thoughts again.', category: 'random_love' },
  { id: 'random-03', title: 'For your heart 💗', message: 'You matter to me more than you probably realize.', category: 'random_love' },
  { id: 'random-04', title: 'Before you continue ✨', message: 'Take a tiny moment to remember that someone loves you very much.', category: 'random_love' },
  { id: 'random-05', title: 'Just a note', message: 'No special reason. I just love you. ♡', category: 'random_love' },
  { id: 'morning-01', title: 'Good morning, love ☀️', message: 'You make my world a little softer just by being in it.', category: 'morning_love' },
  { id: 'morning-02', title: 'Morning reminder', message: 'I hope today is kind to you, my love.', category: 'morning_love' },
  { id: 'morning-03', title: 'Wake gently', message: 'You are one of my favorite parts of every day.', category: 'morning_love' },
  { id: 'afternoon-01', title: 'A quick check-in 💌', message: 'You are thought of, cared for, and loved. Always. ♡', category: 'afternoon_love' },
  { id: 'afternoon-02', title: 'Midday love', message: 'You deserve all the gentle things life has to offer.', category: 'afternoon_love' },
  { id: 'afternoon-03', title: 'Tiny pause', message: 'Just checking in with your heart: you are loved.', category: 'afternoon_love' },
  { id: 'evening-01', title: 'Evening warmth 🌙', message: 'I hope you sleep knowing how loved you are.', category: 'evening_love' },
  { id: 'evening-02', title: 'Tonight', message: 'Even on ordinary days, you are extraordinary to me.', category: 'evening_love' },
  { id: 'evening-03', title: 'Sweet evening note', message: 'You crossed my mind again. You always do.', category: 'evening_love' },
  { id: 'goodnight-01', title: 'Goodnight love 🌙', message: 'Take a breath, sweetheart. You are loved.', category: 'goodnight_love' },
  { id: 'goodnight-02', title: 'Soft landing', message: 'You do not have to do anything special to be loved.', category: 'goodnight_love' },
  { id: 'goodnight-03', title: 'Before sleep', message: 'Your existence makes my days brighter.', category: 'goodnight_love' },
  { id: 'encouragement-01', title: 'You are doing so well', message: 'If you ever forget, let this notification remind you: I love you.', category: 'encouragement' },
  { id: 'encouragement-02', title: 'Keep going', message: 'You are stronger, softer, and more loved than you know.', category: 'encouragement' },
  { id: 'encouragement-03', title: 'For your heart', message: 'You are still my favorite thought.', category: 'encouragement' },
  { id: 'appreciation-01', title: 'I appreciate you', message: 'I’m grateful that I get to love someone like you.', category: 'appreciation' },
  { id: 'appreciation-02', title: 'Grateful heart', message: 'I’m always grateful for the little moments we share.', category: 'appreciation' },
  { id: 'appreciation-03', title: 'You matter', message: 'You are a beautiful part of my life.', category: 'appreciation' },
  { id: 'i-miss-you-01', title: 'Missing you', message: 'I hope something makes you smile today. You deserve it.', category: 'i_miss_you' },
  { id: 'i-miss-you-02', title: 'A soft reminder', message: 'Just wanted your heart to hear this: you matter so much to me.', category: 'i_miss_you' },
  { id: 'i-miss-you-03', title: 'Still thinking of you', message: 'Wherever today takes you, remember that you are loved.', category: 'i_miss_you' },
  { id: 'little-smile-01', title: 'Little smile', message: 'Sending you a little love through this notification. 💗', category: 'little_smile' },
  { id: 'little-smile-02', title: 'A tiny joy', message: 'You make ordinary moments feel special.', category: 'little_smile' },
  { id: 'little-smile-03', title: 'Warm thought', message: 'You are someone I will always be grateful for.', category: 'little_smile' },
  { id: 'deep-love-01', title: 'All my love', message: 'You are deeply loved, appreciated, and treasured more than words can say.', category: 'deep_love' },
  { id: 'deep-love-02', title: 'My favorite person', message: 'You are more special to me than words can explain.', category: 'deep_love' },
  { id: 'deep-love-03', title: 'Constant love', message: 'A tiny notification carrying a very big I love you.', category: 'deep_love' },
  { id: 'deep-love-04', title: 'Always', message: 'You are loved. You are appreciated. You matter to me. And I hope you never forget that.', category: 'deep_love' },
]

export const loveAffirmationCategories: LoveAffirmationCategory[] = [
  'random_love',
  'morning_love',
  'afternoon_love',
  'evening_love',
  'goodnight_love',
  'encouragement',
  'appreciation',
  'i_miss_you',
  'little_smile',
  'deep_love',
]

export function getLoveAffirmationByCategory(category: LoveAffirmationCategory = 'random_love', seed = Date.now()): LoveAffirmation {
  const matches = loveAffirmations.filter((affirmation) => affirmation.category === category)
  if (matches.length === 0) {
    return loveAffirmations[0]
  }

  const index = Math.abs(Math.floor(seed) % matches.length)
  return matches[index] || matches[0]
}

export function getLoveAffirmationForTime(date = new Date()): LoveAffirmation {
  const hour = date.getHours()

  if (hour >= 5 && hour < 11) {
    return getLoveAffirmationByCategory('morning_love', date.getTime())
  }

  if (hour >= 11 && hour < 17) {
    return getLoveAffirmationByCategory('afternoon_love', date.getTime())
  }

  if (hour >= 17 && hour < 22) {
    return getLoveAffirmationByCategory('evening_love', date.getTime())
  }

  if (hour >= 22 || hour < 5) {
    return getLoveAffirmationByCategory('goodnight_love', date.getTime())
  }

  return getLoveAffirmationByCategory('random_love', date.getTime())
}

export const affirmationFallback: Affirmation = {
  id: 'fallback',
  text: 'Take today one moment at a time.',
  category: 'calm',
}
