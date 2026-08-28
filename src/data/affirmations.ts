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

export type Affirmation = {
  id: string
  text: string
  category: AffirmationCategory
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

export const affirmationFallback: Affirmation = {
  id: 'fallback',
  text: 'Take today one moment at a time.',
  category: 'calm',
}
