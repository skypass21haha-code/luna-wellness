import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity,
  Bell,
  BookHeart,
  CalendarDays,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Home,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Pill,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Trash2,
  X,
} from 'lucide-react'
import './App.css'
import { supabase } from './lib/supabase'
import { getNotificationDiagnostics, refreshNotificationStatus, requestNotificationPermission, showTestNotification } from './lib/notifications'
import { createMedicationScheduler, type MedicationReminder } from './lib/medicationScheduler'
import { consumeAuthUrlError, friendlyAuthError, getAuthRedirectUrl } from './lib/auth'
import { DailyAffirmation } from './components/DailyAffirmation'
import { getAffirmationDateKey } from './lib/affirmationService'

type Session = NonNullable<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>
type Page = 'Today' | 'Date Tickets' | 'Cycle' | 'Symptoms' | 'Medication' | 'Journal' | 'Insights' | 'Settings'
type DateTicketStatus = 'unused' | 'revealed' | 'redeemed' | 'scheduled' | 'completed'
type DateTicketCategory = 'heritage' | 'art' | 'exploration' | 'play' | 'creative'
type DatePrepPriority = 'essential' | 'recommended' | 'optional'
type DatePrepProfile = {
  environment: string[]
  essentials: string[]
  recommended: string[]
  optional: string[]
}
type ComfortPreferences = {
  keepCool: boolean
  preferShade: boolean
  preferIndoor: boolean
  avoidExcessiveWalking: boolean
  preferLessCrowded: boolean
}
type DateTicket = {
  id: number
  title: string
  category: DateTicketCategory
  description: string
  location: string
  suggestedPlaces: string[]
  status: DateTicketStatus
  favorite: boolean
  prep?: DatePrepProfile
  prepChecklist?: Record<string, boolean>
  date?: string
  time?: string
  meetingPlace?: string
  note?: string
  completionDate?: string
  redemptionDate?: string
  revealedAt?: string
  memoryPhoto?: string
  memoryNote?: string
  favoriteMoment?: string
  rating?: number
}

const today = () => new Date().toISOString().slice(0, 10)
const messageForError = () => 'LUNA is temporarily offline. Please try again when your connection is restored.'

const goals = [
  'Complete 5 daily check-ins this week.',
  'Get to bed 30 minutes earlier twice this week.',
  'Log symptoms before they feel like a spiral.',
  'Take medication on time and keep a quiet reminder to yourself.',
]

const privacyItems = [
  'Private by default: health data stays in your account unless you choose to share.',
  'Partner mode is always optional and can be changed at any time.',
  'Data export and account deletion stay available from your privacy center.',
]

const dateTicketCategoryMeta: Record<DateTicketCategory, { label: string; icon: string }> = {
  heritage: { label: 'Heritage', icon: '🏛️' },
  art: { label: 'Art', icon: '🎨' },
  exploration: { label: 'Exploration', icon: '🌆' },
  play: { label: 'Play', icon: '🎮' },
  creative: { label: 'Creative', icon: '📸' },
}

const datePrepItemMeta: Record<string, { label: string; icon: string; priority: DatePrepPriority }> = {
  phone: { label: 'Phone', icon: '📱', priority: 'essential' },
  wallet: { label: 'Wallet', icon: '💳', priority: 'essential' },
  power_bank: { label: 'Power bank', icon: '🔋', priority: 'essential' },
  charging_cable: { label: 'Charging cable', icon: '🔌', priority: 'recommended' },
  water: { label: 'Water', icon: '💧', priority: 'essential' },
  portable_fan: { label: 'Portable fan', icon: '🌬️', priority: 'essential' },
  umbrella: { label: 'Umbrella', icon: '☂️', priority: 'recommended' },
  sunscreen: { label: 'Sunscreen', icon: '☀️', priority: 'recommended' },
  hat: { label: 'Cap or hat', icon: '🧢', priority: 'recommended' },
  cooling_towel: { label: 'Cooling towel', icon: '🧊', priority: 'recommended' },
  comfortable_shoes: { label: 'Comfortable shoes', icon: '👟', priority: 'essential' },
  tissues: { label: 'Tissues', icon: '🧻', priority: 'recommended' },
  wet_wipes: { label: 'Wet wipes', icon: '🧼', priority: 'recommended' },
  hand_sanitizer: { label: 'Hand sanitizer', icon: '🧴', priority: 'recommended' },
  deodorant: { label: 'Deodorant', icon: '🌸', priority: 'recommended' },
  breath_mints: { label: 'Breath mints', icon: '🍬', priority: 'recommended' },
  reusable_bag: { label: 'Reusable bag', icon: '👜', priority: 'recommended' },
  cash: { label: 'Cash', icon: '💵', priority: 'recommended' },
  camera: { label: 'Camera', icon: '📸', priority: 'optional' },
  sketchbook: { label: 'Sketchbook', icon: '✏️', priority: 'optional' },
  pencil: { label: 'Pencil', icon: '✏️', priority: 'optional' },
  small_towel: { label: 'Small towel', icon: '🧢', priority: 'recommended' },
  extra_shirt: { label: 'Extra shirt', icon: '👕', priority: 'recommended' },
  breathable_clothing: { label: 'Breathable clothing', icon: '🌿', priority: 'recommended' },
  waterproof_phone_pouch: { label: 'Waterproof phone pouch', icon: '📦', priority: 'optional' },
  shaded_break: { label: 'Shaded break', icon: '🏠', priority: 'recommended' },
  indoor_alternative: { label: 'Indoor alternative', icon: '🏡', priority: 'recommended' },
  earlier_start_time: { label: 'Earlier time slot', icon: '⏰', priority: 'recommended' },
  spirit: { label: 'A little excitement', icon: '♡', priority: 'optional' },
}

const datePrepProfiles: Record<number, DatePrepProfile> = {
  1: { environment: ['outdoor', 'walking', 'heritage'], essentials: ['water', 'portable_fan', 'comfortable_shoes'], recommended: ['umbrella', 'sunscreen', 'hat', 'tissues', 'power_bank'], optional: ['camera'] },
  2: { environment: ['outdoor', 'walking', 'heritage'], essentials: ['water', 'portable_fan', 'comfortable_shoes'], recommended: ['umbrella', 'sunscreen', 'hat', 'power_bank'], optional: ['camera'] },
  3: { environment: ['indoor', 'walking', 'art'], essentials: ['water', 'comfortable_shoes', 'phone'], recommended: ['power_bank', 'tissues', 'hand_sanitizer'], optional: ['camera'] },
  4: { environment: ['food', 'walking', 'city'], essentials: ['water', 'tissues', 'hand_sanitizer'], recommended: ['portable_fan', 'cash', 'power_bank', 'reusable_bag'], optional: ['camera'] },
  5: { environment: ['outdoor', 'walking', 'heritage'], essentials: ['water', 'comfortable_shoes'], recommended: ['umbrella', 'portable_fan', 'power_bank', 'tissues'], optional: ['camera'] },
  6: { environment: ['outdoor', 'walking', 'heritage'], essentials: ['water', 'comfortable_shoes'], recommended: ['umbrella', 'sunscreen', 'hat', 'portable_fan'], optional: ['camera'] },
  7: { environment: ['outdoor', 'creative', 'heritage'], essentials: ['phone', 'water', 'power_bank'], recommended: ['camera', 'umbrella', 'comfortable_shoes'], optional: ['sketchbook'] },
  8: { environment: ['outdoor', 'walking', 'heritage'], essentials: ['water', 'comfortable_shoes'], recommended: ['umbrella', 'portable_fan', 'tissues', 'power_bank'], optional: ['camera'] },
  9: { environment: ['outdoor', 'exploration', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'power_bank', 'tissues'], optional: ['camera'] },
  10: { environment: ['outdoor', 'creative', 'city'], essentials: ['phone', 'water', 'power_bank'], recommended: ['portable_fan', 'umbrella', 'comfortable_shoes'], optional: ['camera'] },
  11: { environment: ['outdoor', 'exploration', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'power_bank'], optional: ['camera'] },
  12: { environment: ['outdoor', 'exploration', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'power_bank'], optional: ['camera'] },
  13: { environment: ['outdoor', 'exploration', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'tissues'], optional: ['camera'] },
  14: { environment: ['outdoor', 'city', 'exploration'], essentials: ['water', 'power_bank', 'wallet'], recommended: ['comfortable_shoes', 'portable_fan', 'umbrella'], optional: ['camera'] },
  15: { environment: ['outdoor', 'walking', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'power_bank', 'tissues'], optional: ['camera'] },
  16: { environment: ['outdoor', 'walking', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'power_bank'], optional: ['camera'] },
  17: { environment: ['food', 'walking', 'city'], essentials: ['water', 'tissues', 'hand_sanitizer'], recommended: ['portable_fan', 'cash', 'reusable_bag', 'power_bank'], optional: ['camera'] },
  18: { environment: ['outdoor', 'coffee', 'exploration'], essentials: ['water', 'portable_fan'], recommended: ['umbrella', 'cash', 'power_bank', 'sunscreen'], optional: ['camera'] },
  19: { environment: ['outdoor', 'food', 'market'], essentials: ['water', 'wallet', 'cash'], recommended: ['portable_fan', 'tissues', 'reusable_bag', 'power_bank'], optional: ['camera'] },
  20: { environment: ['indoor', 'walking', 'art'], essentials: ['water', 'comfortable_shoes'], recommended: ['phone', 'power_bank', 'tissues'], optional: ['sketchbook'] },
  21: { environment: ['indoor', 'art', 'walking'], essentials: ['water', 'comfortable_shoes'], recommended: ['phone', 'power_bank', 'tissues'], optional: ['camera'] },
  22: { environment: ['indoor', 'art', 'walking'], essentials: ['water', 'comfortable_shoes'], recommended: ['phone', 'power_bank', 'tissues'], optional: ['camera'] },
  23: { environment: ['indoor', 'art', 'gallery'], essentials: ['phone', 'water'], recommended: ['power_bank', 'comfortable_shoes', 'tissues'], optional: ['camera'] },
  24: { environment: ['indoor', 'art'], essentials: ['water', 'phone'], recommended: ['power_bank', 'comfortable_shoes', 'tissues'], optional: ['camera'] },
  25: { environment: ['indoor', 'creative', 'art'], essentials: ['phone', 'water'], recommended: ['power_bank', 'comfortable_shoes', 'tissues'], optional: ['sketchbook'] },
  26: { environment: ['indoor', 'creative', 'art'], essentials: ['phone', 'water'], recommended: ['power_bank', 'camera', 'comfortable_shoes'], optional: ['sketchbook'] },
  27: { environment: ['indoor', 'art'], essentials: ['phone', 'water'], recommended: ['power_bank', 'camera', 'comfortable_shoes'], optional: ['sketchbook'] },
  28: { environment: ['indoor', 'art', 'creative'], essentials: ['water', 'phone'], recommended: ['sketchbook', 'pencil', 'power_bank'], optional: ['camera'] },
  29: { environment: ['indoor', 'art', 'creative'], essentials: ['phone', 'water'], recommended: ['power_bank', 'camera', 'tissues'], optional: ['sketchbook'] },
  30: { environment: ['indoor', 'art', 'creative'], essentials: ['phone', 'water'], recommended: ['power_bank', 'camera', 'tissues'], optional: ['sketchbook'] },
  31: { environment: ['outdoor', 'creative', 'photography'], essentials: ['phone', 'water', 'power_bank'], recommended: ['camera', 'comfortable_shoes', 'umbrella'], optional: ['sketchbook'] },
  32: { environment: ['outdoor', 'walking', 'heritage'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'power_bank'], optional: ['camera'] },
  33: { environment: ['indoor', 'art'], essentials: ['phone', 'wallet'], recommended: ['power_bank', 'water', 'comfortable_shoes'], optional: ['camera'] },
  34: { environment: ['indoor', 'art'], essentials: ['phone', 'water'], recommended: ['power_bank', 'comfortable_shoes'], optional: ['camera'] },
  35: { environment: ['outdoor', 'art', 'city'], essentials: ['water', 'comfortable_shoes'], recommended: ['portable_fan', 'umbrella', 'power_bank'], optional: ['camera'] },
  36: { environment: ['indoor', 'art'], essentials: ['phone', 'water'], recommended: ['power_bank', 'comfortable_shoes', 'tissues'], optional: ['camera'] },
  37: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  38: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  39: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  40: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  41: { environment: ['indoor', 'play'], essentials: ['phone', 'wallet'], recommended: ['water', 'power_bank', 'tissues'], optional: ['camera'] },
  42: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  43: { environment: ['indoor', 'play'], essentials: ['water', 'phone'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['camera'] },
  44: { environment: ['indoor', 'physical_activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['small_towel', 'extra_shirt', 'power_bank', 'comfortable_clothing'], optional: ['camera'] },
  45: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  46: { environment: ['outdoor', 'walking', 'activity'], essentials: ['water', 'portable_fan', 'comfortable_shoes'], recommended: ['umbrella', 'sunscreen', 'hat', 'power_bank', 'tissues'], optional: ['camera'] },
  47: { environment: ['indoor', 'play'], essentials: ['water', 'phone'], recommended: ['power_bank', 'tissues', 'wallet'], optional: ['camera'] },
  48: { environment: ['indoor', 'activity'], essentials: ['water', 'comfortable_shoes'], recommended: ['tissues', 'power_bank', 'comfortable_clothing'], optional: ['small_towel'] },
  49: { environment: ['outdoor', 'physical_activity'], essentials: ['water', 'comfortable_clothing'], recommended: ['small_towel', 'extra_shirt', 'power_bank'], optional: ['camera'] },
  50: { environment: ['outdoor', 'physical_activity'], essentials: ['water', 'comfortable_clothing'], recommended: ['small_towel', 'extra_shirt', 'power_bank'], optional: ['camera'] },
}

const defaultComfortPreferences: ComfortPreferences = {
  keepCool: true,
  preferShade: true,
  preferIndoor: false,
  avoidExcessiveWalking: false,
  preferLessCrowded: true,
}

function loadComfortPreferences(): ComfortPreferences {
  try {
    const saved = localStorage.getItem('luna-date-comfort-preferences-v1')
    if (!saved) return defaultComfortPreferences
    const parsed = JSON.parse(saved) as Partial<ComfortPreferences>
    return { ...defaultComfortPreferences, ...parsed }
  } catch {
    return defaultComfortPreferences
  }
}

const dateTicketCatalog: Array<Omit<DateTicket, 'status' | 'favorite'>> = [
  { id: 1, title: 'Intramuros Walking Date', category: 'heritage', description: 'Let\'s get a little lost in the old streets together.', location: 'Intramuros', suggestedPlaces: ['San Agustin Church — Intramuros', 'Manila Cathedral — Intramuros', 'Fort Santiago — Intramuros'] },
  { id: 2, title: 'Fort Santiago Exploration', category: 'heritage', description: 'Walk the walls, share the stories, and be gentle with every little detail.', location: 'Fort Santiago', suggestedPlaces: ['Fort Santiago — Intramuros', 'Manila Cathedral — Intramuros', 'San Agustin Church — Intramuros'] },
  { id: 3, title: 'National Museum Date', category: 'art', description: 'A slower, sweeter date with stories, textures, and curiosity.', location: 'National Museum Complex', suggestedPlaces: ['National Museum of Fine Arts — Manila', 'National Museum of Anthropology — Manila', 'National Museum of Natural History — Manila'] },
  { id: 4, title: 'Binondo Food Crawl', category: 'exploration', description: 'Little bites, warm laughs, and the joy of discovering a favorite corner.', location: 'Binondo', suggestedPlaces: ['Binondo Church — Binondo', 'San Lorenzo Ruiz Church — Binondo', 'Escolta — Manila'] },
  { id: 5, title: 'Escolta Exploration', category: 'heritage', description: 'A quiet walk through old architecture and lovely neon memories.', location: 'Escolta', suggestedPlaces: ['Escolta — Manila', 'San Sebastian Church — Quiapo', 'Quiapo Church — Manila'] },
  { id: 6, title: 'Rizal Park Walk', category: 'heritage', description: 'An easy stroll with room for conversations, sunsets, and gentle pauses.', location: 'Rizal Park', suggestedPlaces: ['Rizal Park — Ermita', 'Manila Cathedral — Intramuros', 'Our Lady of Remedies Parish — Malate'] },
  { id: 7, title: 'Manila Heritage Photography Date', category: 'creative', description: 'Capture the old corners, the light, and the little things that make us smile.', location: 'Manila Heritage District', suggestedPlaces: ['San Agustin Church — Intramuros', 'Manila Cathedral — Intramuros', 'Quiapo Church — Manila'] },
  { id: 8, title: 'Old Churches & Historic Buildings', category: 'heritage', description: 'A simple date full of old stones, quiet prayers, and beautiful stories.', location: 'Metro Manila Heritage Loop', suggestedPlaces: ['San Agustin Church — Intramuros', 'Manila Cathedral — Intramuros', 'San Sebastian Church — Quiapo'] },
  { id: 9, title: 'Explore BGC', category: 'exploration', description: 'A modern little adventure with streets, bright lights, and good company.', location: 'Bonifacio Global City', suggestedPlaces: ['BGC Arts Center — Taguig', 'The Mind Museum — Taguig', 'Santuario de San Antonio — Makati'] },
  { id: 10, title: 'BGC Street-Art / Photo Walk', category: 'creative', description: 'Look around, find the color, and make a little story out of the city.', location: 'BGC', suggestedPlaces: ['BGC Avenue — Taguig', 'The Mind Museum — Taguig', 'Greenbelt — Makati'] },
  { id: 11, title: 'Makati Walking Date', category: 'exploration', description: 'Slow windows, cozy cafes, and a soft kind of city wandering.', location: 'Makati', suggestedPlaces: ['Greenbelt — Makati', 'Santuario de San Antonio — Makati', 'Nuestra Señora de Gracia Parish — Makati'] },
  { id: 12, title: 'Greenbelt Exploration', category: 'exploration', description: 'A gentle city date full of lovely corners and easy conversation.', location: 'Greenbelt', suggestedPlaces: ['Greenbelt — Makati', 'Ayala Triangle — Makati', 'Santuario de San Antonio — Makati'] },
  { id: 13, title: 'Ayala Triangle Area Walk', category: 'exploration', description: 'Take a slow walk, breathe, and let the city feel like a little ceremony.', location: 'Ayala Triangle Gardens', suggestedPlaces: ['Ayala Triangle — Makati', 'Greenbelt — Makati', 'Nuestra Señora de Gracia Parish — Makati'] },
  { id: 14, title: 'Mall-Hopping Date', category: 'exploration', description: 'A playful little detour through the city, with snacks and wandering as the plan.', location: 'Makati / Metro Manila', suggestedPlaces: ['Greenbelt — Makati', 'SM Mall of Asia — Pasay', 'Ayala Center — Makati'] },
  { id: 15, title: 'Explore Cubao', category: 'exploration', description: 'A nostalgic route full of color, food, and small surprises.', location: 'Cubao', suggestedPlaces: ['Immaculate Conception Cathedral — Cubao', 'Gateway Mall — Quezon City', 'Araneta Center — Quezon City'] },
  { id: 16, title: 'Explore Maginhawa', category: 'exploration', description: 'Find a cafe, linger a bit, and keep the afternoon easy.', location: 'Maginhawa', suggestedPlaces: ['Maginhawa Street — Quezon City', 'Holy Family Parish — Quezon City', 'Our Lady of Pentecost Parish — Quezon City'] },
  { id: 17, title: 'Explore Marikina Local Food Spots', category: 'exploration', description: 'Good food, city charm, and a little adventure around every corner.', location: 'Marikina', suggestedPlaces: ['Marikina Public Market — Marikina', 'Marikina Shoe Capital — Marikina', 'San Pedro Bautista Church — Quezon City'] },
  { id: 18, title: 'Antipolo Art & Café Day', category: 'exploration', description: 'A little scenic date with coffee, art, and room to breathe.', location: 'Antipolo', suggestedPlaces: ['Antipolo City Viewpoints — Rizal', 'Cafe spots in Antipolo', 'Our Lady of Mt. Carmel Shrine — New Manila'] },
  { id: 19, title: 'Local Weekend Market Date', category: 'exploration', description: 'Browse little finds, try new things, and make a day out of wandering.', location: 'Weekend Market', suggestedPlaces: ['Mercato Centrale — Pasig', 'Local weekend markets — Metro Manila', 'San Isidro Labrador Parish — Pasig'] },
  { id: 20, title: 'National Museum of Fine Arts', category: 'art', description: 'Drop into quiet beauty and let the details do the talking.', location: 'Fine Arts Museum', suggestedPlaces: ['National Museum of Fine Arts — Manila', 'National Museum of Anthropology — Manila', 'Rizal Park — Ermita'] },
  { id: 21, title: 'National Museum of Anthropology', category: 'art', description: 'A date full of stories, culture, and warm curiosity.', location: 'Anthropology Museum', suggestedPlaces: ['National Museum of Anthropology — Manila', 'National Museum of Natural History — Manila', 'Manila Cathedral — Intramuros'] },
  { id: 22, title: 'National Museum of Natural History', category: 'art', description: 'A little wonder-filled date with plenty of room for surprise.', location: 'Natural History Museum', suggestedPlaces: ['National Museum of Natural History — Manila', 'Rizal Park — Ermita', 'National Museum of Fine Arts — Manila'] },
  { id: 23, title: 'Independent Art Gallery Date', category: 'art', description: 'Slow down, take in the art, and notice what you love together.', location: 'Independent Gallery', suggestedPlaces: ['Art galleries in Makati', 'Photowalk spots in BGC', 'Cultural Center of the Philippines — Pasay'] },
  { id: 24, title: 'Contemporary Art Exhibition', category: 'art', description: 'A date that feels a little different and very memorable.', location: 'Contemporary Art Venue', suggestedPlaces: ['Art Fair venues', 'BGC art spaces', 'Museum complex — Manila'] },
  { id: 25, title: 'Art Appreciation Date', category: 'creative', description: 'Notice the details, talk about what feels alive, and stay curious.', location: 'Museum or Gallery', suggestedPlaces: ['National Museum of Fine Arts — Manila', 'Art galleries in Makati', 'BGC public art walk'] },
  { id: 26, title: 'Photography Exhibition', category: 'creative', description: 'A story of light, mood, and the way you see the world.', location: 'Gallery or Exhibition Hall', suggestedPlaces: ['BGC arts spaces', 'Rizal Park — Ermita', 'National Museum of Fine Arts — Manila'] },
  { id: 27, title: 'Immersive Art Experience', category: 'art', description: 'Let the space surprise you and share your favorite little moments.', location: 'Immersive Art Venue', suggestedPlaces: ['BGC digital art spaces', 'Art events in Metro Manila', 'Gallery spaces in Makati'] },
  { id: 28, title: 'Museum Sketch Date', category: 'creative', description: 'Sketch what catches your eye and keep the afternoon beautifully slow.', location: 'Museum', suggestedPlaces: ['National Museum of Fine Arts — Manila', 'Museum of Anthropology — Manila', 'BGC art walk'] },
  { id: 29, title: 'Choose Your Favorite Artwork', category: 'creative', description: 'Pick a thing that feels like you and talk about why it speaks to you.', location: 'Gallery', suggestedPlaces: ['Art galleries in Makati', 'Museum complex — Manila', 'BGC arts spaces'] },
  { id: 30, title: 'Create Stories About Paintings', category: 'creative', description: 'Turn every painting into a tiny story about us and the world.', location: 'Museum or Gallery', suggestedPlaces: ['National Museum of Fine Arts — Manila', 'Art galleries in Makati', 'Cultural Center of the Philippines — Pasay'] },
  { id: 31, title: 'Aesthetic Photography Date', category: 'creative', description: 'Take the afternoon one frame at a time and let it become your own little film.', location: 'City streets / cafés / parks', suggestedPlaces: ['Rizal Park — Ermita', 'BGC — Taguig', 'Greenbelt — Makati'] },
  { id: 32, title: 'Cultural Heritage Site Visit', category: 'heritage', description: 'Go where the city tells stories, and let the day unfold gently.', location: 'Heritage District', suggestedPlaces: ['San Agustin Church — Intramuros', 'Manila Cathedral — Intramuros', 'San Sebastian Church — Quiapo'] },
  { id: 33, title: 'Theater Performance', category: 'art', description: 'An evening to dress up a little and share a beautiful feeling.', location: 'Theater or Cultural Center', suggestedPlaces: ['Cultural Center of the Philippines — Pasay', 'Theater venues in Metro Manila', 'Greenbelt — Makati'] },
  { id: 34, title: 'Musical Date', category: 'art', description: 'Let the music set the mood and keep the night warm and soft.', location: 'Live Music Venue', suggestedPlaces: ['Live music spots in Makati', 'BGC performance spaces', 'Theater venues in Metro Manila'] },
  { id: 35, title: 'Public Art Event', category: 'art', description: 'See what the city has made beautiful and make the moment yours.', location: 'Art Walk / Public Event', suggestedPlaces: ['BGC street-art route', 'Makati public art spaces', 'Cultural Center of the Philippines — Pasay'] },
  { id: 36, title: 'Design Exhibition', category: 'art', description: 'Look closely, talk about what you notice, and let it become a favorite memory.', location: 'Design Museum / Fair', suggestedPlaces: ['Design exhibits in Makati', 'BGC galleries', 'Art spaces in Metro Manila'] },
  { id: 37, title: 'Bowling Date', category: 'play', description: 'A cheerful little challenge with plenty of laughter and zero pressure.', location: 'Bowling Center', suggestedPlaces: ['Bowling lanes in Metro Manila', 'BGC / Makati spots', 'Mall entertainment centers'] },
  { id: 38, title: 'Arcade Date', category: 'play', description: 'The perfect excuse to be a little silly and a little competitive.', location: 'Arcade', suggestedPlaces: ['Arcade spots in Makati', 'BGC entertainment', 'Mall arcade areas'] },
  { id: 39, title: 'Billiards Date', category: 'play', description: 'A relaxed challenge and a very good excuse to stay close together.', location: 'Billiards Hall', suggestedPlaces: ['Pool halls in Metro Manila', 'Arcade + billiards lounges', 'BGC / Makati entertainment districts'] },
  { id: 40, title: 'Karaoke Date', category: 'play', description: 'Sing a little loud, laugh a little harder, and enjoy the easy joy.', location: 'Karaoke Room', suggestedPlaces: ['Karaoke rooms in Makati', 'Arcade entertainment hubs', 'Mall karaoke spots'] },
  { id: 41, title: 'Movie Date', category: 'play', description: 'A classic favorite, made even better with your hand in mine.', location: 'Cinema', suggestedPlaces: ['Cinema in Greenbelt', 'Mall cinema spots', 'BGC entertainment districts'] },
  { id: 42, title: 'Escape Room', category: 'play', description: 'A little bit of teamwork, a little bit of chaos, and a lot of fun.', location: 'Escape Room Venue', suggestedPlaces: ['Gaming and escape room venues', 'Makati entertainment spots', 'BGC activity centers'] },
  { id: 43, title: 'Board-Game Café Date', category: 'play', description: 'A cozy date with snacks, strategy, and a little playful energy.', location: 'Board Game Café', suggestedPlaces: ['Board game cafés in Quezon City', 'Makati gaming spots', 'Food and game cafes'] },
  { id: 44, title: 'Roller Skating Date', category: 'play', description: 'A little adventure, a lot of laughter, and a memory worth keeping.', location: 'Skate Rink', suggestedPlaces: ['Skate rinks in Metro Manila', 'Mall entertainment centers', 'BGC / Makati activity venues'] },
  { id: 45, title: 'Indoor Mini Golf', category: 'play', description: 'Gentle chaos, playful wins, and a perfectly easy afternoon.', location: 'Mini Golf Venue', suggestedPlaces: ['Mini golf venues', 'Mall entertainment zones', 'Indoor activity hubs'] },
  { id: 46, title: 'Amusement Park Date', category: 'play', description: 'A bright, joyful little world made for laughter and easy magic.', location: 'Amusement Park', suggestedPlaces: ['Theme parks in Metro Manila', 'Outdoor leisure destinations', 'Weekend fun spots'] },
  { id: 47, title: 'Claw Machine Date', category: 'play', description: 'Tiny wins, silly competition, and a fun little story to remember.', location: 'Arcade or Mall', suggestedPlaces: ['Arcade corners in malls', 'Entertainment zones', 'Mall prize game spots'] },
  { id: 48, title: 'Arcade Competition', category: 'play', description: 'A little friendly challenge and a lot of laughter when the scores go wild.', location: 'Arcade', suggestedPlaces: ['Arcade spots in Makati', 'Game zones in malls', 'BGC entertainment spots'] },
  { id: 49, title: 'Basketball Together', category: 'play', description: 'A quick burst of energy that turns into a good story and good company.', location: 'Court', suggestedPlaces: ['Local basketball courts', 'Outdoor parks', 'Community sports areas'] },
  { id: 50, title: 'Badminton Together', category: 'play', description: 'A little movement, a few laughs, and a date with a rhythm all your own.', location: 'Badminton Court', suggestedPlaces: ['Community sports hubs', 'Sports venues in Metro Manila', 'Local parks / indoor courts'] },
]

function getInitialDateTickets(): DateTicket[] {
  return dateTicketCatalog.map((ticket) => ({
    ...ticket,
    prep: ticket.prep ?? datePrepProfiles[ticket.id] ?? { environment: ['general'], essentials: ['water'], recommended: ['power_bank'], optional: [] },
    prepChecklist: {},
    status: 'unused',
    favorite: false,
  }))
}

function loadDateTickets() {
  try {
    const saved = localStorage.getItem('luna-date-tickets-v1')
    if (!saved) return getInitialDateTickets()

    const parsed = JSON.parse(saved) as DateTicket[]
    const byId = new Map(parsed.map((ticket) => [ticket.id, ticket]))
    return dateTicketCatalog.map((ticket) => ({
      ...ticket,
      prep: ticket.prep ?? byId.get(ticket.id)?.prep ?? datePrepProfiles[ticket.id] ?? { environment: ['general'], essentials: ['water'], recommended: ['power_bank'], optional: [] },
      prepChecklist: byId.get(ticket.id)?.prepChecklist ?? {},
      status: byId.get(ticket.id)?.status ?? 'unused',
      favorite: byId.get(ticket.id)?.favorite ?? false,
      date: byId.get(ticket.id)?.date,
      time: byId.get(ticket.id)?.time,
      meetingPlace: byId.get(ticket.id)?.meetingPlace,
      note: byId.get(ticket.id)?.note,
      completionDate: byId.get(ticket.id)?.completionDate,
      redemptionDate: byId.get(ticket.id)?.redemptionDate,
      memoryPhoto: byId.get(ticket.id)?.memoryPhoto,
      memoryNote: byId.get(ticket.id)?.memoryNote,
      favoriteMoment: byId.get(ticket.id)?.favoriteMoment,
      rating: byId.get(ticket.id)?.rating,
    }))
  } catch {
    return getInitialDateTickets()
  }
}

function getDatePrepList(ticket: DateTicket | null, preferences: ComfortPreferences) {
  const profile = ticket?.prep ?? datePrepProfiles[ticket?.id ?? 0] ?? { environment: ['general'], essentials: ['water'], recommended: ['power_bank'], optional: [] }
  const essentialItems = Array.from(new Set(profile.essentials))
  const recommendedItems = Array.from(new Set(profile.recommended))
  const optionalItems = Array.from(new Set(profile.optional))
  const extraRecommended: string[] = []

  if (preferences.keepCool && profile.environment.some((value) => ['outdoor', 'walking', 'city', 'heritage', 'exploration', 'market', 'activity', 'physical_activity'].includes(value))) {
    extraRecommended.push('portable_fan', 'water', 'umbrella', 'sunscreen', 'hat', 'cooling_towel')
  }
  if (preferences.preferShade && profile.environment.some((value) => ['outdoor', 'walking', 'city', 'heritage', 'exploration', 'market', 'activity'].includes(value))) {
    extraRecommended.push('umbrella')
  }
  if (preferences.preferIndoor && profile.environment.some((value) => ['outdoor', 'walking', 'city', 'market', 'activity'].includes(value))) {
    extraRecommended.push('indoor_alternative')
  }
  if (preferences.avoidExcessiveWalking && profile.environment.some((value) => ['walking', 'outdoor', 'city', 'exploration'].includes(value))) {
    essentialItems.push('comfortable_shoes')
  }
  if (preferences.preferLessCrowded && ['food', 'market', 'city', 'exploration', 'outdoor'].some((value) => profile.environment.includes(value))) {
    extraRecommended.push('tissues', 'hand_sanitizer', 'breath_mints', 'deodorant')
  }

  const uniqueEssential = Array.from(new Set([...essentialItems, ...(preferences.keepCool ? ['water', 'portable_fan'] : []), ...(['water', 'phone', 'wallet', 'power_bank'].filter((item) => item !== 'water' || essentialItems.includes('water')))]))
  const uniqueRecommended = Array.from(new Set([...recommendedItems, ...extraRecommended]))
  const uniqueOptional = Array.from(new Set(optionalItems))

  const checklist = Array.from(new Set([
    'phone',
    'wallet',
    'power_bank',
    'water',
    ...uniqueEssential,
    ...uniqueRecommended,
  ])).slice(0, 10)

  const priorityLabels = ['essential', 'recommended', 'optional'] as const
  return {
    essentialItems: uniqueEssential.filter((item) => item in datePrepItemMeta),
    recommendedItems: uniqueRecommended.filter((item) => item in datePrepItemMeta),
    optionalItems: uniqueOptional.filter((item) => item in datePrepItemMeta),
    checklistItems: checklist.filter((item) => item in datePrepItemMeta),
    comfortNote: preferences.keepCool && profile.environment.some((value) => ['outdoor', 'walking', 'heritage', 'exploration', 'city'].includes(value))
      ? 'This date may involve outdoor walking. Don\'t forget to keep cool, sip water, and take a little pause when the weather feels a bit much. ♡'
      : preferences.preferIndoor && profile.environment.some((value) => ['outdoor', 'walking'].includes(value))
        ? 'LUNA tip: a shaded stop or an indoor break can make the little adventure feel even softer and easier.'
        : 'For this adventure, LUNA is keeping the plan practical, comfortable, and easy to enjoy.',
    priorityLabels,
  }
}

function NotificationStatus() {
  const [diagnostics, setDiagnostics] = useState(getNotificationDiagnostics)
  const [message, setMessage] = useState('')
  const [refreshing, setRefreshing] = useState(true)

  useEffect(() => {
    let mounted = true
    const refresh = () => {
      setRefreshing(true)
      void refreshNotificationStatus().then((next) => {
        if (mounted) setDiagnostics(next)
      }).finally(() => {
        if (mounted) setRefreshing(false)
      })
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      mounted = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  async function refreshStatus() {
    setRefreshing(true)
    setMessage('')
    setDiagnostics(await refreshNotificationStatus())
    setRefreshing(false)
  }

  async function enable() {
    try {
      const permission = await requestNotificationPermission()
      setDiagnostics({ ...getNotificationDiagnostics(), permission })
      if (permission === 'granted') {
        await showTestNotification()
        setMessage('Notifications enabled ✓ A test notification was sent.')
      } else if (permission === 'denied') {
        setMessage('Notifications are blocked. Allow LUNA in your browser or device settings, then try again.')
      } else {
        setMessage('Notification permission was not granted. You can try again whenever you are ready.')
      }
    } catch (error) {
      const currentPermission = getNotificationDiagnostics().permission
      setDiagnostics(getNotificationDiagnostics())
      setMessage(
        currentPermission === 'denied'
          ? 'Notifications are blocked. Allow LUNA in your browser or device settings, then try again.'
          : error instanceof Error
            ? error.message
            : 'LUNA could not enable notifications right now.',
      )
    }
    setDiagnostics(await refreshNotificationStatus())
  }

  async function test() {
    try {
      await showTestNotification()
      setMessage('Test notification sent ✓')
    } catch (error) {
      const currentPermission = getNotificationDiagnostics().permission
      setDiagnostics(getNotificationDiagnostics())
      setMessage(
        currentPermission === 'denied'
          ? 'Notifications are blocked. Allow LUNA in your browser or device settings, then try again.'
          : error instanceof Error
            ? error.message
            : 'The test notification could not be sent right now.',
      )
    }
    setDiagnostics(await refreshNotificationStatus())
  }

  const status = !diagnostics.supported
    ? 'Not supported'
    : !diagnostics.secureContext
      ? 'Secure connection required'
      : diagnostics.permission === 'granted'
        ? 'Enabled'
        : diagnostics.permission === 'denied'
          ? 'Blocked'
          : 'Not enabled'

  const detail = !diagnostics.supported
    ? 'Your current browser does not support the Notification API.'
    : !diagnostics.secureContext
      ? 'Notifications require HTTPS or localhost.'
      : diagnostics.permission === 'denied'
        ? 'Notifications are blocked for this site. Allow them in your browser site settings, then return here.'
        : diagnostics.permission === 'granted'
          ? 'LUNA can send browser notifications for reminders. Browser notifications are not guaranteed native alarms.'
          : 'Allow LUNA to send browser notifications for reminders.'

  return (
    <section className="notification-panel">
      <div>
        <p className="label">DEVICE NOTIFICATIONS</p>
        <strong>{status}</strong>
        <small>
          Support: {diagnostics.supported ? 'Supported' : 'Unavailable'} · Secure context: {diagnostics.secureContext ? 'Yes' : 'No'} · Service worker: {diagnostics.serviceWorker === 'registered' ? 'Available' : 'Unavailable'}. {detail}
        </small>
      </div>
      <div className="notification-actions">
        {diagnostics.supported && diagnostics.secureContext && diagnostics.permission === 'default' && (
          <button className="primary-button" onClick={enable}>
            Enable Notifications
          </button>
        )}
        {diagnostics.permission === 'granted' && (
          <button className="primary-button" onClick={test}>
            Send Test
          </button>
        )}
        <button className="secondary-button" onClick={refreshStatus} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>
      {message && <p className="notification-message">{message}</p>}
    </section>
  )
}

function useMedicationScheduler(session: Session | null) {
  const [reminder, setReminder] = useState<MedicationReminder | null>(null)
  const schedulerRef = useRef<ReturnType<typeof createMedicationScheduler> | null>(null)

  useEffect(() => {
    if (!supabase || !session) return

    const scheduler = createMedicationScheduler(supabase, {
      userId: session.user.id,
      onDue: setReminder,
    })
    schedulerRef.current = scheduler
    const refresh = () => void scheduler.refresh().catch((error) => console.error('[LUNA Medication Scheduler] Refresh failed:', error))
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    void scheduler.start().catch((error) => console.error('[LUNA Medication Scheduler] Start failed:', error))
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      scheduler.stop()
      schedulerRef.current = null
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
      setReminder(null)
    }
  }, [session])

  return { reminder, dismiss: () => setReminder(null), scheduleTest: (delayMs = 10000, kind: MedicationReminder['kind'] = 'due') => schedulerRef.current?.scheduleTest(delayMs, kind) }
}

function MedicationAlarm({ reminder, onDismiss, onTaken }: { reminder: MedicationReminder; onDismiss: () => void; onTaken: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function markTaken() {
    setBusy(true)
    setError('')
    try {
      await onTaken()
      onDismiss()
    } catch {
      setError('LUNA could not save that dose. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="medication-alarm-backdrop" role="presentation">
      <section className="medication-alarm" role="dialog" aria-modal="true" aria-labelledby="medication-alarm-title">
        <div className="alarm-icon"><Pill size={22} /></div>
        <p className="eyebrow">{reminder.kind === 'advance' ? 'LUNA ADVANCE REMINDER' : 'LUNA REMINDER'}</p>
        <h2 id="medication-alarm-title">{reminder.kind === 'advance' ? 'Your medication is due in 10 minutes.' : 'It&apos;s time for your medication.'}</h2>
        <strong>{reminder.medicationName}</strong>
        <p className="alarm-time">Scheduled for {reminder.scheduledLabel}</p>
        <p className="alarm-note">Your browser notification may also appear when notifications are supported and permitted.</p>
        {error && <p className="auth-message">{error}</p>}
        <div className="alarm-actions">
          <button className="primary-button" onClick={() => void markTaken()} disabled={busy}>
            {busy ? 'Saving...' : reminder.kind === 'advance' ? 'Got it' : 'Mark as taken'}
          </button>
          <button className="secondary-button" onClick={onDismiss} disabled={busy}>Dismiss</button>
        </div>
      </section>
    </div>
  )
}

function AuthScreen({ authUrlError }: { authUrlError: ReturnType<typeof consumeAuthUrlError> }) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState(() => authUrlError ? friendlyAuthError(authUrlError) : '')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    if (mode === 'register' && password !== confirmPassword) {
      setMessage('Passwords do not match. Please check them and try again.')
      return
    }
    setBusy(true)
    setMessage('')

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === 'register'
          ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: getAuthRedirectUrl() } })
          : await supabase.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl() })

    setBusy(false)
    setMessage(
      result.error
        ? 'We could not complete that request. Check your details and try again.'
        : mode === 'reset'
          ? 'Check your email for a reset link.'
          : mode === 'register'
            ? 'Check your email to confirm your account.'
            : '',
    )
  }

  async function resendConfirmation() {
    if (!supabase || !email || resending || resendCooldown > 0) return
    setResending(true)
    setMessage('')
    try {
      const result = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: getAuthRedirectUrl() } })
      setResendCooldown(result.error ? 0 : 60)
      setMessage(result.error ? 'Unable to resend the confirmation email. Please check the address and try again.' : 'Confirmation email sent. Please check your inbox and spam folder.')
    } catch (error) {
      console.error('LUNA confirmation email resend failed:', error)
      setMessage('Unable to resend the confirmation email right now. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const isRegister = mode === 'register'
  const isReset = mode === 'reset'

  return (
    <main className="auth-page">
      <header className="auth-nav">
        <button className="brand brand-button" type="button" onClick={() => setMode('login')} aria-label="Go to LUNA login">
          <span className="brand-mark"><Leaf size={17} /></span>
          <span>LUNA Wellness</span>
        </button>
        <nav className="auth-nav-links" aria-label="Authentication navigation">
          <button className={!isRegister && !isReset ? 'secondary-button auth-nav-active' : 'secondary-button'} type="button" onClick={() => setMode('login')}>
            Log in
          </button>
          <button className={isRegister ? 'primary-button' : 'secondary-button'} type="button" onClick={() => setMode('register')}>
            Create account
          </button>
        </nav>
      </header>

      <div className="auth-layout">
        <section className="auth-introduction" aria-labelledby="auth-intro-title">
          <div className="auth-mark-large"><Moon size={28} /></div>
          <p className="eyebrow">YOUR PRIVATE WELLNESS SPACE</p>
          <h2 id="auth-intro-title">Care that meets you where you are.</h2>
          <p>Track your care, understand your patterns, and build gentle routines that work for you.</p>
          <div className="auth-orbit" aria-hidden="true"><span /><span /><span /></div>
        </section>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <p className="eyebrow">{isReset ? 'ACCOUNT ACCESS' : isRegister ? 'BEGIN GENTLY' : 'WELCOME BACK'}</p>
            <h1 id="auth-title">{isReset ? 'Reset your password' : isRegister ? 'Create your LUNA space' : 'Welcome back'}</h1>
            <p className="auth-copy">
              {isReset ? 'Enter your email and we will help you get back into your account.' : isRegister ? 'Start a private wellness journey designed around you.' : 'Sign in to continue your private wellness journey.'}
            </p>
          </div>

          <form onSubmit={submit}>
            {isRegister && (
              <label>
                Full name
                <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            )}

            <label>
              Email address
              <input required autoComplete="email" placeholder="you@example.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            {!isReset && (
              <label>
                Password
                <span className="password-field">
                  <input required minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
            )}

            {isRegister && (
              <label>
                Confirm password
                <input required minLength={8} autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
            )}

            {!isRegister && !isReset && (
              <button className="forgot-link" type="button" onClick={() => setMode('reset')}>Forgot password?</button>
            )}

            <button className="primary-button auth-submit" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? (isReset ? 'Sending...' : isRegister ? 'Creating account...' : 'Signing in...') : isReset ? 'Send reset link' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          {message && <p className={`auth-message ${authUrlError || message.includes('Unable') ? 'error' : 'success'}`}>{message}</p>}

          {(authUrlError || (isRegister && message.includes('confirmation'))) && (
            <button className="secondary-button resend-button" type="button" onClick={() => void resendConfirmation()} disabled={resending || resendCooldown > 0}>
              {resending ? 'Sending...' : resendCooldown > 0 ? `Please wait ${resendCooldown}s` : 'Resend confirmation email'}
            </button>
          )}

          <div className="auth-switch">
            <span>{isRegister ? 'Already have an account?' : 'Don’t have an account?'}</span>
            <button className="secondary-button" type="button" onClick={() => setMode(isRegister || isReset ? 'login' : 'register')}>
              {isRegister || isReset ? 'Log in' : 'Create account'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function useRows<T>(table: string, session: Session | null, order = 'created_at') {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || !session) return

    supabase
      .from(table)
      .select('*')
      .eq('user_id', session.user.id)
      .order(order, { ascending: false })
      .then(({ data, error: resultError }) => {
        setRows((data as T[]) || [])
        setError(resultError ? messageForError() : '')
        setLoading(false)
      })
  }, [table, session, order])

  return { rows, setRows, loading, error }
}

function StateMessage({ loading, error, empty, action }: { loading: boolean; error: string; empty: string; action?: () => void }) {
  if (loading) return <p className="module-state">Loading your records...</p>
  if (error) return <p className="module-state error">{error}</p>

  return (
    <div className="module-empty">
      <p>{empty}</p>
      {action && (
        <button className="text-button" onClick={action}>
          Add your first entry <ChevronRight size={15} />
        </button>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="module-field">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Cycle({ session, goHome }: { session: Session; goHome: () => void }) {
  type Period = { id: string; start_date: string; end_date: string | null; spotting: boolean; flow: string | null; pain: number | null; notes: string | null }
  const { rows, setRows, loading, error } = useRows<Period>('period_logs', session, 'start_date')
  const [form, setForm] = useState({ start_date: today(), end_date: '', flow: 'light', pain: '0', notes: '', spotting: false })
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const { data, error: resultError } = await supabase
      .from('period_logs')
      .insert({ user_id: session.user.id, ...form, pain: Number(form.pain), end_date: form.end_date || null })
      .select()
      .single()

    setBusy(false)
    if (!resultError && data) setRows([data as Period, ...rows])
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this period record?')) return
    await supabase.from('period_logs').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Cycle" eyebrow="YOUR CYCLE" onHome={goHome}>
      <div className="module-grid">
        <section className="module-card">
          <h2>Log a period</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Start date" type="date" required value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
            <Field label="End date" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            <label className="module-field">
              Flow
              <select value={form.flow} onChange={(event) => setForm({ ...form, flow: event.target.value })}>
                <option>spotting</option>
                <option>light</option>
                <option>medium</option>
                <option>heavy</option>
              </select>
            </label>
            <Field label="Pain / cramps (0-10)" type="number" value={form.pain} onChange={(v) => setForm({ ...form, pain: v })} />
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <label className="check-field">
              <input type="checkbox" checked={form.spotting} onChange={(event) => setForm({ ...form, spotting: event.target.checked })} />
              Spotting
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save cycle entry'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Recent cycle history</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No cycle entries yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.start_date}</strong>
                    <small>{row.flow || 'Flow not entered'} · {row.pain ?? 0}/10 pain</small>
                    {row.notes && <p>{row.notes}</p>}
                  </div>
                  <button className="icon-button" aria-label="Delete cycle record" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Symptoms({ session, goHome }: { session: Session; goHome: () => void }) {
  type Symptom = { id: string; symptom_id?: string; name?: string; logged_on: string; severity: number; notes: string | null }
  const { rows, setRows, loading, error } = useRows<Symptom>('symptom_logs', session, 'logged_on')
  const [name, setName] = useState('Fatigue')
  const [severity, setSeverity] = useState('5')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const symptom = await supabase.from('symptoms').upsert({ user_id: session.user.id, name }, { onConflict: 'user_id,name' }).select().single()
    if (symptom.error || !symptom.data) {
      setBusy(false)
      return
    }

    const result = await supabase
      .from('symptom_logs')
      .insert({ user_id: session.user.id, symptom_id: symptom.data.id, logged_on: today(), severity: Number(severity), notes })
      .select()
      .single()

    setBusy(false)
    if (!result.error && result.data) setRows([result.data as Symptom, ...rows])
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this symptom entry?')) return
    await supabase.from('symptom_logs').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Symptoms" eyebrow="NOTICE WITH KINDNESS" onHome={goHome}>
      <div className="module-grid">
        <section className="module-card">
          <h2>Log a symptom</h2>
          <form className="module-form" onSubmit={save}>
            <label className="module-field">
              Symptom
              <select value={name} onChange={(event) => setName(event.target.value)}>
                {['Acne', 'Headache', 'Fatigue', 'Cramps', 'Bloating', 'Pelvic discomfort', 'Skin changes', 'Hair changes', 'Breast tenderness', 'Low energy', 'Poor sleep', 'Appetite changes'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Field label="Severity (0-10)" type="number" value={severity} onChange={setSeverity} />
            <Field label="Notes" value={notes} onChange={setNotes} />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save symptom'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Tracked symptoms</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No symptoms logged yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{row.logged_on} · severity {row.severity}/10</small>
                    {row.notes && <p>{row.notes}</p>}
                  </div>
                  <button className="icon-button" aria-label="Delete symptom" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Medication({ session, goHome, onTestReminder }: { session: Session; goHome: () => void; onTestReminder: (kind?: MedicationReminder['kind']) => void }) {
  type Med = { id: string; name: string; strength: string | null; instructions: string | null; active: boolean }
  type Schedule = { id: string; medication_id: string; times: string[]; reminder_enabled: boolean }
  const { rows, setRows, loading, error } = useRows<Med>('medications', session)
  const schedules = useRows<Schedule>('medication_schedules', session)
  const [form, setForm] = useState({ name: '', strength: '', instructions: '', purpose: '', start_date: today(), end_date: '', reminder_time: '20:00' })
  const [busy, setBusy] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaveMessage('')
    setSaveError('')
    if (!supabase) {
      setSaveError('LUNA is not connected to Supabase. Please check the app configuration.')
      return
    }
    if (!form.name.trim()) {
      setSaveError('Medication name is required.')
      return
    }
    if (!form.start_date) {
      setSaveError('Start date is required.')
      return
    }
    if (form.end_date && form.end_date < form.start_date) {
      setSaveError('End date must be on or after the start date.')
      return
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.reminder_time)) {
      setSaveError('Enter a valid reminder time.')
      return
    }

    setBusy(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error('Please log in again.')
      }

      const medicationResult = await supabase
        .from('medications')
        .insert({
          user_id: userData.user.id,
          name: form.name.trim(),
          strength: form.strength.trim() || null,
          purpose: form.purpose.trim() || null,
          instructions: form.instructions.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
        })
        .select('id,name,strength,instructions,active')
        .single()

      if (medicationResult.error || !medicationResult.data) {
        console.error('Medication save error:', medicationResult.error)
        throw new Error(medicationResult.error?.message || 'Supabase rejected the medication record.')
      }

      const medication = medicationResult.data as Med
      const scheduleResult = await supabase
        .from('medication_schedules')
        .insert({ user_id: userData.user.id, medication_id: medication.id, schedule_type: 'once_daily', times: [form.reminder_time], reminder_enabled: true })
        .select('id,medication_id,times,reminder_enabled')
        .single()

      if (scheduleResult.error || !scheduleResult.data) {
        console.error('Medication schedule save error:', scheduleResult.error)
        await supabase.from('medications').delete().eq('id', medication.id).eq('user_id', userData.user.id)
        throw new Error(scheduleResult.error?.message || 'Unable to save medication schedule.')
      }
      const reminderResult = await supabase
        .from('reminders')
        .insert({
          user_id: userData.user.id,
          medication_id: medication.id,
          schedule_id: scheduleResult.data.id,
          scheduled_at: `${form.start_date}T${form.reminder_time}:00`,
          status: 'scheduled',
          reminder_enabled: true,
        })

      if (reminderResult.error) {
        console.error('Medication reminder save error:', reminderResult.error)
        await supabase.from('medication_schedules').delete().eq('id', scheduleResult.data.id).eq('user_id', userData.user.id)
        await supabase.from('medications').delete().eq('id', medication.id).eq('user_id', userData.user.id)
        throw new Error(reminderResult.error.message || 'Unable to save medication reminder.')
      }
      schedules.setRows([scheduleResult.data as Schedule, ...schedules.rows])

      const reloadResult = await supabase.from('medications').select('id,name,strength,instructions,active').eq('user_id', userData.user.id).order('created_at', { ascending: false })
      if (reloadResult.error) {
        console.error('Medication reload error:', reloadResult.error)
        throw new Error('Medication saved, but LUNA could not reload the medication list.')
      }
      setRows((reloadResult.data as Med[]) || [])
      setForm({ name: '', strength: '', instructions: '', purpose: '', start_date: today(), end_date: '', reminder_time: '20:00' })
      setSaveMessage('Medication saved successfully ✓')
    } catch (saveErrorValue) {
      console.error('Medication save failed:', saveErrorValue)
      setSaveError(saveErrorValue instanceof Error ? saveErrorValue.message : 'Unable to save medication.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this medication and its schedules?')) return
    await supabase.from('medications').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Medication" eyebrow="YOUR CARE PLAN" onHome={goHome}>
      <div className="module-grid">
        <section className="module-card">
          <h2>Add medication</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Medication name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Strength" value={form.strength} onChange={(v) => setForm({ ...form, strength: v })} />
            <Field label="Purpose" value={form.purpose} onChange={(v) => setForm({ ...form, purpose: v })} />
            <Field label="Instructions" value={form.instructions} onChange={(v) => setForm({ ...form, instructions: v })} />
            <Field label="Start date" type="date" required value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
            <Field label="End date" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            <Field label="Reminder time" type="time" value={form.reminder_time} onChange={(v) => setForm({ ...form, reminder_time: v })} />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save medication'}
            </button>
          </form>
          {saveMessage && <p className="save-feedback success">{saveMessage}</p>}
          {saveError && <p className="save-feedback error">{saveError}</p>}
          <button className="secondary-button test-reminder-button" type="button" onClick={() => onTestReminder('due')}>
            Test due reminder in 10 seconds
          </button>
          <button className="secondary-button test-reminder-button" type="button" onClick={() => onTestReminder('advance')}>
            Test 10-minute reminder in 10 seconds
          </button>
          <small className="helper-text">Uses the live reminder pipeline without saving a test medication.</small>
        </section>

        <section className="module-card">
          <h2>Medication list</h2>
          {loading || error || schedules.loading || schedules.error || rows.length === 0 ? (
            <StateMessage loading={loading || schedules.loading} error={error || schedules.error} empty="No medications added yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{row.strength || 'Dose not set'} · {row.instructions || 'No instructions added'}</small>
                    {schedules.rows.filter((schedule) => schedule.medication_id === row.id).map((schedule) => (
                      <div className="medication-schedule-summary" key={schedule.id}>
                        <small>Next dose: {schedule.times.join(', ')}</small>
                        <small>Advance notice: 10 minutes before · Reminder: {schedule.reminder_enabled ? 'ON' : 'OFF'}</small>
                      </div>
                    ))}
                  </div>
                  <button className="icon-button" aria-label="Delete medication" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Journal({ session, goHome }: { session: Session; goHome: () => void }) {
  type Entry = { id: string; title: string; content: string; entry_date: string; mood: string | null; tags: string[] }
  const { rows, setRows, loading, error } = useRows<Entry>('journal_entries', session, 'entry_date')
  const [form, setForm] = useState({ title: '', content: '', mood: '', tags: '' })
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const result = await supabase
      .from('journal_entries')
      .insert({ user_id: session.user.id, ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), entry_date: today() })
      .select()
      .single()

    setBusy(false)
    if (!result.error && result.data) {
      setRows([result.data as Entry, ...rows])
      setForm({ title: '', content: '', mood: '', tags: '' })
    }
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this journal entry?')) return
    await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Journal" eyebrow="A PRIVATE PLACE TO REFLECT" onHome={goHome}>
      <div className="module-grid">
        <section className="module-card">
          <h2>New entry</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Title" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <label className="module-field">
              What is on your mind?
              <textarea required value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
            </label>
            <Field label="Mood" value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} />
            <Field label="Tags, separated by commas" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save journal entry'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Recent entries</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No journal entries yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <small>{row.entry_date} · {row.mood || 'Mood not logged'}</small>
                    <p>{row.content}</p>
                  </div>
                  <button className="icon-button" aria-label="Delete journal entry" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Insights({ session, goHome }: { session: Session; goHome: () => void }) {
  const moods = useRows<{ mood: string; energy: number }>('mood_logs', session, 'logged_on')
  const symptoms = useRows<{ severity: number; symptom_id: string }>('symptom_logs', session, 'logged_on')
  const medications = useRows<{ status: string }>('medication_logs', session, 'logged_at')

  return (
    <Module title="Insights" eyebrow="YOUR TRACKING, REFLECTED" onHome={goHome}>
      <section className="insight-grid">
        <Insight title="Mood tracking" value={moods.rows.length ? `${moods.rows.length} logged days` : 'No entries yet'} detail="Keep tracking to notice your own patterns." loading={moods.loading} />
        <Insight title="Symptoms" value={symptoms.rows.length ? `${symptoms.rows.length} logged entries` : 'No entries yet'} detail="Your recent tracking will appear here without diagnosis." loading={symptoms.loading} />
        <Insight title="Medication logs" value={medications.rows.length ? `${medications.rows.length} logged doses` : 'No entries yet'} detail="A neutral record of what you chose to log." loading={medications.loading} />
      </section>
      <p className="insight-disclaimer">These are summaries of information you entered, not medical conclusions.</p>
    </Module>
  )
}

function Insight({ title, value, detail, loading }: { title: string; value: string; detail: string; loading: boolean }) {
  return (
    <article className="module-card insight-card">
      <Sparkles size={18} />
      <p className="label">{title}</p>
      <h2>{loading ? 'Loading...' : value}</h2>
      <p>{detail}</p>
    </article>
  )
}

function Settings({ session, onSignOut, goHome }: { session: Session; onSignOut: () => void; goHome: () => void }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [partnerMode, setPartnerMode] = useState(false)
  const [dailyBriefEnabled, setDailyBriefEnabled] = useState(true)

  useEffect(() => {
    if (supabase) {
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => setName(data?.display_name || ''))
    }
  }, [session])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    const result = await supabase.from('profiles').upsert({ id: session.user.id, display_name: name }).select().single()
    setMessage(result.error ? messageForError() : 'Saved ✓')
  }

  return (
    <Module title="Settings" eyebrow="YOUR PRIVATE SPACE" onHome={goHome}>
      <div className="settings-layout">
        <section className="module-card settings-card">
          <h2>Profile</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Preferred name" value={name} onChange={setName} />
            <Field label="Email" value={session.user.email || ''} onChange={() => undefined} />
            <button className="primary-button">Save settings</button>
          </form>
          {message && <p className="auth-message">{message}</p>}
          <button className="text-button settings-logout" onClick={onSignOut}>
            Sign out <ChevronRight size={15} />
          </button>
        </section>

        <section className="module-card settings-card">
          <h2>Privacy & partner mode</h2>
          <div className="toggle-block">
            <div>
              <strong>Daily brief</strong>
              <small>Personalized daily check-ins, gentle reminders, and a summary tailored to your routine.</small>
            </div>
            <button className={`toggle ${dailyBriefEnabled ? 'on' : ''}`} onClick={() => setDailyBriefEnabled((value) => !value)} aria-label="Toggle daily brief">
              <span />
            </button>
          </div>

          <div className="toggle-block">
            <div>
              <strong>Partner access</strong>
              <small>Only share the details you approve. Your journal, medication details, and cycle info remain private by default.</small>
            </div>
            <button className={`toggle ${partnerMode ? 'on' : ''}`} onClick={() => setPartnerMode((value) => !value)} aria-label="Toggle partner access">
              <span />
            </button>
          </div>

          <ul className="privacy-list">
            {privacyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </Module>
  )
}

function Module({ title, eyebrow, children, onHome }: { title: string; eyebrow: string; children: ReactNode; onHome?: () => void }) {
  return (
    <section className="module-page">
      <div className="module-header-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {onHome && (
          <button className="secondary-button module-home-button" onClick={onHome} type="button">
            ← Back to Dashboard
          </button>
        )}
      </div>
      <NotificationStatus />
      {children}
    </section>
  )
}

function DateTicketsPage({ goHome }: { goHome: () => void }) {
  const [tickets, setTickets] = useState<DateTicket[]>(() => loadDateTickets())
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [revealTicketId, setRevealTicketId] = useState<number | null>(null)
  const [revealStage, setRevealStage] = useState<'loading' | 'flip' | 'done'>('loading')
  const [revealPrompt, setRevealPrompt] = useState<{ ticketId: number; step: 1 | 2 | 3 } | null>(null)
  const [redeemTicketId, setRedeemTicketId] = useState<number | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState({ date: '', time: '', meetingPlace: '', note: '' })
  const [memoryDraft, setMemoryDraft] = useState({ photo: '', memoryNote: '', favoriteMoment: '', rating: 5 })
  const [comfortPreferences, setComfortPreferences] = useState<ComfortPreferences>(() => loadComfortPreferences())

  useEffect(() => {
    localStorage.setItem('luna-date-tickets-v1', JSON.stringify(tickets))
  }, [tickets])

  useEffect(() => {
    localStorage.setItem('luna-date-comfort-preferences-v1', JSON.stringify(comfortPreferences))
  }, [comfortPreferences])

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null
  const revealTicket = tickets.find((ticket) => ticket.id === revealTicketId) ?? null
  const activeSurprise = useMemo(
    () => tickets.find((ticket) => ticket.status === 'revealed' || ticket.status === 'redeemed' || ticket.status === 'scheduled') ?? null,
    [tickets],
  )
  const selectedDatePrep = useMemo(() => getDatePrepList(selectedTicket, comfortPreferences), [selectedTicket, comfortPreferences])
  const canRevealAnotherTicket = !activeSurprise || activeSurprise.status === 'completed'

  const stats = useMemo(() => {
    const secret = tickets.filter((ticket) => ticket.status === 'unused').length
    const revealed = tickets.filter((ticket) => ticket.status === 'revealed').length
    const scheduled = tickets.filter((ticket) => ticket.status === 'scheduled').length
    const completed = tickets.filter((ticket) => ticket.status === 'completed').length
    const total = tickets.length
    return { total, secret, revealed, scheduled, completed }
  }, [tickets])

  const updateTicket = (id: number, updater: (ticket: DateTicket) => DateTicket) => {
    setTickets((current) => current.map((ticket) => ticket.id === id ? updater(ticket) : ticket))
  }

  const openTicket = (id: number) => {
    const ticket = tickets.find((entry) => entry.id === id)
    if (!ticket) return
    setSelectedTicketId(id)
    setScheduleDraft({
      date: ticket.date ?? '',
      time: ticket.time ?? '',
      meetingPlace: ticket.meetingPlace ?? '',
      note: ticket.note ?? '',
    })
    setMemoryDraft({
      photo: ticket.memoryPhoto ?? '',
      memoryNote: ticket.memoryNote ?? '',
      favoriteMoment: ticket.favoriteMoment ?? '',
      rating: ticket.rating ?? 5,
    })
  }

  const revealOneTicket = (id: number) => {
    const ticket = tickets.find((entry) => entry.id === id)
    if (!ticket || ticket.status !== 'unused') return

    setRevealTicketId(id)
    setRevealStage('loading')

    window.setTimeout(() => setRevealStage('flip'), 600)
    window.setTimeout(() => {
      updateTicket(id, (entry) => ({
        ...entry,
        status: 'revealed',
        revealedAt: entry.revealedAt ?? today(),
      }))
      setRevealStage('done')
      setSelectedTicketId(id)
    }, 1500)
  }

  const beginRevealFlow = (ticketId: number) => {
    const ticket = tickets.find((entry) => entry.id === ticketId)
    if (!ticket || ticket.status !== 'unused') return
    if (!canRevealAnotherTicket) {
      if (activeSurprise) setSelectedTicketId(activeSurprise.id)
      return
    }
    setRevealPrompt({ ticketId, step: 1 })
  }

  const cancelRevealFlow = () => setRevealPrompt(null)

  const continueRevealFlow = () => {
    if (!revealPrompt) return
    if (revealPrompt.step === 1) {
      setRevealPrompt({ ticketId: revealPrompt.ticketId, step: 2 })
      return
    }
    if (revealPrompt.step === 2) {
      setRevealPrompt({ ticketId: revealPrompt.ticketId, step: 3 })
      return
    }
    if (revealPrompt.step === 3) {
      setRevealPrompt(null)
      revealOneTicket(revealPrompt.ticketId)
    }
  }

  const pickRandomDate = () => {
    if (!canRevealAnotherTicket) {
      if (activeSurprise) setSelectedTicketId(activeSurprise.id)
      return
    }
    const pool = tickets.filter((ticket) => ticket.status === 'unused')
    if (pool.length === 0) return
    const next = pool[Math.floor(Math.random() * pool.length)]
    beginRevealFlow(next.id)
  }

  const saveSchedule = () => {
    if (!selectedTicketId) return
    updateTicket(selectedTicketId, (ticket) => ({
      ...ticket,
      status: scheduleDraft.date || scheduleDraft.time || scheduleDraft.meetingPlace || scheduleDraft.note ? 'scheduled' : ticket.status,
      date: scheduleDraft.date || ticket.date,
      time: scheduleDraft.time || ticket.time,
      meetingPlace: scheduleDraft.meetingPlace || ticket.meetingPlace,
      note: scheduleDraft.note || ticket.note,
    }))
  }

  const saveMemory = () => {
    if (!selectedTicketId) return
    updateTicket(selectedTicketId, (ticket) => ({
      ...ticket,
      memoryPhoto: memoryDraft.photo || ticket.memoryPhoto,
      memoryNote: memoryDraft.memoryNote || ticket.memoryNote,
      favoriteMoment: memoryDraft.favoriteMoment || ticket.favoriteMoment,
      rating: memoryDraft.rating || ticket.rating || 5,
    }))
  }

  const togglePrepItem = (item: string) => {
    if (!selectedTicketId) return
    updateTicket(selectedTicketId, (ticket) => ({
      ...ticket,
      prepChecklist: {
        ...(ticket.prepChecklist ?? {}),
        [item]: !(ticket.prepChecklist?.[item] ?? false),
      },
    }))
  }

  const markCompleted = () => {
    if (!selectedTicketId) return
    updateTicket(selectedTicketId, (ticket) => ({
      ...ticket,
      status: 'completed',
      completionDate: ticket.completionDate || today(),
      date: ticket.date || today(),
    }))
  }

  const redeemTicket = () => {
    if (!selectedTicketId) return
    updateTicket(selectedTicketId, (ticket) => ({
      ...ticket,
      status: 'redeemed',
      redemptionDate: ticket.redemptionDate || today(),
    }))
    setRedeemTicketId(null)
  }

  const upcomingDates = tickets.filter((ticket) => ticket.status === 'scheduled' || ticket.status === 'revealed')
  const completedDates = tickets.filter((ticket) => ticket.status === 'completed')

  return (
    <section className="date-tickets-page">
      {activeSurprise && activeSurprise.status !== 'completed' && (
        <div className="current-adventure card-surface">
          <p className="eyebrow">🌙 YOUR CURRENT ADVENTURE</p>
          <h2>One little surprise is enough for now.</h2>
          <p>You have a secret waiting for its day. Enjoy this one first. ♡</p>
          <button className="primary-button" type="button" onClick={() => setSelectedTicketId(activeSurprise.id)}>🎟️ View my date</button>
        </div>
      )}

      <div className="date-tickets-hero card-surface">
        <div className="date-hero-mark">🌙</div>
        <p className="eyebrow">YOUR LITTLE ADVENTURES</p>
        <h1>50 surprises are waiting for you.</h1>
        <p className="date-hero-copy">You don't get to choose the date. LUNA does.</p>
        <div className="date-hero-actions">
          {canRevealAnotherTicket ? (
            <button className="primary-button" type="button" onClick={() => {
              const pool = tickets.filter((ticket) => ticket.status === 'unused')
              const next = pool[Math.floor(Math.random() * pool.length)]
              if (next) beginRevealFlow(next.id)
            }}>✨ Reveal my date</button>
          ) : (
            <button className="primary-button" type="button" onClick={() => setSelectedTicketId(activeSurprise?.id ?? null)} disabled={!activeSurprise}>🎟️ View current surprise</button>
          )}
          <button className="secondary-button" type="button" onClick={pickRandomDate} disabled={!canRevealAnotherTicket}>🎲 Let LUNA choose</button>
        </div>
      </div>

      <div className="date-secret-stats">
        <div className="stat-glass"><span>🎟️</span><strong>{stats.total}</strong><small>Total surprises</small></div>
        <div className="stat-glass"><span>🔒</span><strong>{stats.secret}</strong><small>Still secret</small></div>
        <div className="stat-glass"><span>✨</span><strong>{stats.revealed}</strong><small>Revealed</small></div>
        <div className="stat-glass"><span>🌸</span><strong>{stats.completed}</strong><small>Lived</small></div>
      </div>

      <div className="comfort-panel card-surface">
        <div className="mystery-heading compact">
          <p className="eyebrow">🌬️ COMFORT PREFERENCES</p>
          <h2>LUNA keeps the little details gentle.</h2>
        </div>
        <div className="comfort-grid">
          {[
            { key: 'keepCool', label: 'Keep me cool', icon: '🌬️' },
            { key: 'preferShade', label: 'Prefer shade when possible', icon: '☂️' },
            { key: 'preferIndoor', label: 'Prefer indoor alternatives', icon: '🏠' },
            { key: 'avoidExcessiveWalking', label: 'Avoid excessive walking', icon: '🚶' },
            { key: 'preferLessCrowded', label: 'Prefer less crowded places', icon: '👥' },
          ].map(({ key, label, icon }) => (
            <label key={key} className="comfort-toggle">
              <input
                type="checkbox"
                checked={comfortPreferences[key as keyof ComfortPreferences]}
                onChange={(event) => setComfortPreferences((current) => ({ ...current, [key]: event.target.checked }))}
              />
              <span>{icon}</span>
              <strong>{label}</strong>
            </label>
          ))}
        </div>
      </div>

      <div className="make-it-mystery card-surface">
        <div className="mystery-heading">
          <p className="eyebrow">SECRET DATE COLLECTION</p>
          <h2>One little surprise at a time.</h2>
        </div>
        <div className="mystery-grid">
          {tickets.map((ticket) => {
            const isSecret = ticket.status === 'unused'
            const accent = ['🌙', '🌸', '✦', '♡', '🎟️', '🔐', '✨'][ticket.id % 7]

            return (
              <button
                key={ticket.id}
                type="button"
                className={isSecret ? 'mystery-ticket is-secret' : 'mystery-ticket is-open'}
                onClick={() => {
                  if (isSecret) {
                    beginRevealFlow(ticket.id)
                    return
                  }
                  openTicket(ticket.id)
                }}
              >
                <div className="mystery-ticket-inner">
                  <div className="mystery-header">
                    <span>LUNA</span>
                    {ticket.favorite ? <span className="tiny-heart">♥</span> : <span className="tiny-dot">•</span>}
                  </div>
                  <div className="mystery-serial">#{String(ticket.id).padStart(3, '0')}</div>
                  <div className="mystery-symbol">{accent}</div>
                  {isSecret ? (
                    <>
                      <strong>SECRET DATE PASS</strong>
                      <small>Your adventure is hidden</small>
                      <span className="mystery-lock">🔒</span>
                    </>
                  ) : (
                    <>
                      <strong>{ticket.title}</strong>
                      <small>{ticket.status === 'scheduled' ? 'Scheduled' : ticket.status === 'completed' ? 'Completed' : 'Revealed'}</small>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="date-collector-row">
        <div className="date-upcoming card-surface">
          <div className="mystery-heading compact">
            <p className="eyebrow">📅 UPCOMING</p>
            <h2>Plans in motion</h2>
          </div>
          {upcomingDates.length === 0 ? (
            <p className="module-empty">No adventures are scheduled yet. LUNA is still keeping it a surprise.</p>
          ) : (
            <div className="vault-stack">
              {upcomingDates.map((ticket) => (
                <button key={ticket.id} type="button" className="vault-item" onClick={() => openTicket(ticket.id)}>
                  <span>🎟️ #{String(ticket.id).padStart(3, '0')}</span>
                  <strong>{ticket.title}</strong>
                  <small>{ticket.status === 'scheduled' ? `${ticket.date ?? 'Soon'} · ${ticket.time ?? 'Flexible'}` : 'Revealed and ready'}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="date-vault card-surface">
          <div className="mystery-heading compact">
            <p className="eyebrow">🔐 DATE VAULT</p>
            <h2>The adventures we’ve already lived</h2>
          </div>
          {completedDates.length === 0 ? (
            <p className="module-empty">The vault is waiting for its first memory.</p>
          ) : (
            <div className="vault-stack">
              {completedDates.map((ticket) => (
                <button key={ticket.id} type="button" className="vault-item" onClick={() => openTicket(ticket.id)}>
                  <span>🎟️ #{String(ticket.id).padStart(3, '0')}</span>
                  <strong>{ticket.title}</strong>
                  <small>{ticket.completionDate ?? 'Completed'}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="date-generator card-surface">
        <div className="mystery-heading compact">
          <p className="eyebrow">✨ LET LUNA BUILD THE SURPRISE</p>
          <h2>Choose how much control you want.</h2>
        </div>
        <div className="generator-grid">
          <label>
            <span>Energy</span>
            <select defaultValue="surprise">
              <option value="surprise">🌙 Completely random</option>
              <option value="cozy">🌸 Cozy</option>
              <option value="playful">🎮 Playful</option>
              <option value="adventurous">🌆 Adventurous</option>
              <option value="creative">🎨 Creative</option>
            </select>
          </label>
          <label>
            <span>Time</span>
            <select defaultValue="anytime">
              <option value="anytime">Any time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </label>
        </div>
        <button className="primary-button" type="button" onClick={pickRandomDate}>🎟️ Blind date</button>
      </div>

      {revealPrompt && (
        <div className="ticket-modal-backdrop" role="presentation" onClick={cancelRevealFlow}>
          <div className="reveal-confirmation" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="reveal-confirmation-body">
              <div className="reveal-crest">🌙</div>
              {revealPrompt.step === 1 && (
                <>
                  <p className="eyebrow">WAIT...</p>
                  <h3>There are still many little adventures waiting for you.</h3>
                  <p>Once you open this one, the surprise is gone. Do you really want to know what LUNA picked?</p>
                  <div className="modal-actions stacked">
                    <button className="primary-button" type="button" onClick={continueRevealFlow}>YES, I'M SURE</button>
                    <button className="secondary-button" type="button" onClick={cancelRevealFlow}>LET ME WAIT ♡</button>
                    <button className="text-button subtle" type="button" onClick={cancelRevealFlow}>💌 LET SOMEONE ELSE PICK</button>
                  </div>
                </>
              )}
              {revealPrompt.step === 2 && (
                <>
                  <p className="eyebrow">♡ ONE MORE THING...</p>
                  <h3>You don't have to open it right now.</h3>
                  <p>You could let this little secret linger a little longer. Are you really sure?</p>
                  <div className="modal-actions stacked">
                    <button className="primary-button" type="button" onClick={continueRevealFlow}>I'M REALLY SURE</button>
                    <button className="secondary-button" type="button" onClick={cancelRevealFlow}>I'LL WAIT ♡</button>
                  </div>
                </>
              )}
              {revealPrompt.step === 3 && (
                <>
                  <p className="eyebrow">🎟️ LAST CHANCE</p>
                  <h3>This little surprise can only be a surprise once.</h3>
                  <p>Take your time. Do you still want to reveal it?</p>
                  <div className="modal-actions stacked">
                    <button className="primary-button" type="button" onClick={continueRevealFlow}>OPEN MY SURPRISE ✨</button>
                    <button className="secondary-button" type="button" onClick={cancelRevealFlow}>NOT YET</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {revealTicket && (
        <div className="ticket-modal-backdrop" role="presentation" onClick={() => setRevealTicketId(null)}>
          <div className="reveal-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={`reveal-stage ${revealStage}`}>
              {revealStage === 'loading' && (
                <>
                  <p className="eyebrow">🌙 LUNA IS FINDING YOUR ADVENTURE...</p>
                  <div className="pulse-orbit">✦</div>
                  <p className="reveal-loading">Searching the secret collection...</p>
                </>
              )}
              {revealStage === 'flip' && (
                <>
                  <p className="eyebrow">🎟️</p>
                  <div className="mystery-reveal-card">
                    <span className="reveal-luna">LUNA</span>
                    <strong>#{String(revealTicket.id).padStart(3, '0')}</strong>
                    <div className="reveal-spark">✦</div>
                    <small>SECRET DATE PASS</small>
                  </div>
                  <p className="reveal-loading">Your surprise is almost here...</p>
                </>
              )}
              {revealStage === 'done' && (
                <>
                  <p className="eyebrow">✨ YOUR DATE HAS BEEN CHOSEN</p>
                  <div className="reveal-card-hit">
                    <span className="reveal-badge">#{String(revealTicket.id).padStart(3, '0')}</span>
                    <h3>{revealTicket.title}</h3>
                    <div className="reveal-category">{dateTicketCategoryMeta[revealTicket.category].icon} {dateTicketCategoryMeta[revealTicket.category].label}</div>
                    <p>{revealTicket.description}</p>
                  </div>
                  <div className="modal-actions">
                    <button className="primary-button" type="button" onClick={() => { setRevealTicketId(null); setSelectedTicketId(revealTicket.id); }}>Schedule date</button>
                    <button className="secondary-button" type="button" onClick={() => { setRevealTicketId(null); setSelectedTicketId(revealTicket.id); }}>Keep for later</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="ticket-modal-backdrop" role="presentation" onClick={() => setSelectedTicketId(null)}>
          <div className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="date-ticket-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close date ticket" onClick={() => setSelectedTicketId(null)}>×</button>
            <div className="ticket-modal-header">
              <p className="eyebrow">🌙 LUNA</p>
              <span className="ticket-modal-number">#{String(selectedTicket.id).padStart(3, '0')}</span>
            </div>
            <h3 id="date-ticket-title">{selectedTicket.title}</h3>
            <div className="ticket-modal-category">
              <span>{dateTicketCategoryMeta[selectedTicket.category].icon}</span>
              <strong>{dateTicketCategoryMeta[selectedTicket.category].label}</strong>
            </div>
            <p className="ticket-modal-copy">{selectedTicket.description}</p>
            <div className="ticket-detail-grid">
              <div><span>Location</span><strong>{selectedTicket.location}</strong></div>
              <div><span>Status</span><strong>{selectedTicket.status.toUpperCase()}</strong></div>
              <div><span>Date</span><strong>{selectedTicket.date ?? 'Not scheduled yet'}</strong></div>
              <div><span>Time</span><strong>{selectedTicket.time ?? 'Flexible'}</strong></div>
            </div>
            <div className="suggested-places">
              <h4>Suggested places</h4>
              <ul>
                {selectedTicket.suggestedPlaces.map((place) => (
                  <li key={place}>{place}</li>
                ))}
              </ul>
            </div>

            {selectedTicket.status !== 'unused' && selectedDatePrep && (
              <div className="date-prep-panel">
                <div className="date-prep-header">
                  <p className="eyebrow">🎒 DATE PREP</p>
                  <h4>Everything we might want for our little adventure. ♡</h4>
                </div>
                <p className="date-prep-note">{selectedDatePrep.comfortNote}</p>

                <div className="prep-groups">
                  {selectedDatePrep.essentialItems.length > 0 && (
                    <div className="prep-group">
                      <span className="prep-group-label">ESSENTIAL</span>
                      <div className="prep-items">
                        {selectedDatePrep.essentialItems.map((item) => {
                          const meta = datePrepItemMeta[item]
                          return (
                            <div key={item} className="prep-item essential">
                              <span>{meta.icon}</span>
                              <strong>{meta.label}</strong>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedDatePrep.recommendedItems.length > 0 && (
                    <div className="prep-group">
                      <span className="prep-group-label">RECOMMENDED</span>
                      <div className="prep-items">
                        {selectedDatePrep.recommendedItems.map((item) => {
                          const meta = datePrepItemMeta[item]
                          return (
                            <div key={item} className="prep-item recommended">
                              <span>{meta.icon}</span>
                              <strong>{meta.label}</strong>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedDatePrep.optionalItems.length > 0 && (
                    <div className="prep-group">
                      <span className="prep-group-label">OPTIONAL</span>
                      <div className="prep-items">
                        {selectedDatePrep.optionalItems.map((item) => {
                          const meta = datePrepItemMeta[item]
                          return (
                            <div key={item} className="prep-item optional">
                              <span>{meta.icon}</span>
                              <strong>{meta.label}</strong>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="prep-checklist">
                  <div className="prep-checklist-header">♡ BEFORE WE GO</div>
                  <div className="prep-checklist-grid">
                    {selectedDatePrep.checklistItems.map((item) => {
                      const checked = !!selectedTicket.prepChecklist?.[item]
                      const meta = datePrepItemMeta[item]
                      return (
                        <button
                          key={item}
                          type="button"
                          className={checked ? 'prep-check-item checked' : 'prep-check-item'}
                          onClick={() => togglePrepItem(item)}
                          aria-pressed={checked}
                        >
                          <span className="checkmark">{checked ? '☑' : '☐'}</span>
                          <span>{meta.icon}</span>
                          <strong>{meta.label}</strong>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {selectedDatePrep.checklistItems.length > 0 && selectedDatePrep.checklistItems.every((item) => !!selectedTicket.prepChecklist?.[item]) && (
                  <div className="ready-panel" aria-live="polite">
                    <div className="ready-badge">✨ WE'RE READY</div>
                    <p>Everything's packed. Now we just need the adventure. ♡</p>
                  </div>
                )}
              </div>
            )}

            {selectedTicket.status !== 'completed' && (
              <div className="schedule-panel">
                <h4>Date details</h4>
                <div className="schedule-grid">
                  <label>
                    Date
                    <input type="date" value={scheduleDraft.date} onChange={(event) => setScheduleDraft((current) => ({ ...current, date: event.target.value }))} />
                  </label>
                  <label>
                    Time
                    <input type="time" value={scheduleDraft.time} onChange={(event) => setScheduleDraft((current) => ({ ...current, time: event.target.value }))} />
                  </label>
                  <label className="full-width">
                    Meeting place
                    <input value={scheduleDraft.meetingPlace} onChange={(event) => setScheduleDraft((current) => ({ ...current, meetingPlace: event.target.value }))} placeholder="Optional meeting place" />
                  </label>
                  <label className="full-width">
                    Note
                    <textarea value={scheduleDraft.note} onChange={(event) => setScheduleDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Can't wait for this one ♡" />
                  </label>
                </div>
                <div className="modal-actions">
                  {selectedTicket.status === 'revealed' && (
                    <button className="primary-button" type="button" onClick={saveSchedule}>Schedule this date</button>
                  )}
                  {selectedTicket.status === 'unused' && (
                    <button className="primary-button" type="button" onClick={() => setRedeemTicketId(selectedTicket.id)}>Redeem ticket</button>
                  )}
                  {selectedTicket.status === 'redeemed' || selectedTicket.status === 'scheduled' ? (
                    <button className="primary-button" type="button" onClick={saveSchedule}>Save date</button>
                  ) : null}
                  {selectedTicket.status !== 'unused' && (
                    <button className="secondary-button" type="button" onClick={markCompleted}>Mark completed</button>
                  )}
                  <button className="secondary-button" type="button" onClick={() => setSelectedTicketId(null)}>Close</button>
                </div>
              </div>
            )}

            {selectedTicket.status === 'completed' && (
              <div className="memory-panel">
                <h4>Our date</h4>
                <div className="schedule-grid">
                  <label className="full-width">
                    Photo URL
                    <input value={memoryDraft.photo} onChange={(event) => setMemoryDraft((current) => ({ ...current, photo: event.target.value }))} placeholder="https://..." />
                  </label>
                  <label className="full-width">
                    Favorite moment
                    <textarea value={memoryDraft.favoriteMoment} onChange={(event) => setMemoryDraft((current) => ({ ...current, favoriteMoment: event.target.value }))} placeholder="Write something..." />
                  </label>
                  <label className="full-width">
                    Memory note
                    <textarea value={memoryDraft.memoryNote} onChange={(event) => setMemoryDraft((current) => ({ ...current, memoryNote: event.target.value }))} placeholder="How it felt, what made you smile..." />
                  </label>
                  <label>
                    Rating
                    <select value={memoryDraft.rating} onChange={(event) => setMemoryDraft((current) => ({ ...current, rating: Number(event.target.value) }))}>
                      <option value={5}>★★★★★</option>
                      <option value={4}>★★★★☆</option>
                      <option value={3}>★★★☆☆</option>
                      <option value={2}>★★☆☆☆</option>
                      <option value={1}>★☆☆☆☆</option>
                    </select>
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="primary-button" type="button" onClick={saveMemory}>Save memory</button>
                  <button className="secondary-button" type="button" onClick={() => setSelectedTicketId(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {redeemTicketId && (
        <div className="ticket-modal-backdrop" role="presentation" onClick={() => setRedeemTicketId(null)}>
          <div className="redeem-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">🎟️ REDEEM DATE PASS</p>
            <h3>Are you sure you want to redeem this date ticket?</h3>
            <p>Once redeemed, you can schedule your date.</p>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={redeemTicket}>Yes, redeem it</button>
              <button className="secondary-button" type="button" onClick={() => setRedeemTicketId(null)}>Not yet</button>
            </div>
          </div>
        </div>
      )}

      <div className="date-tickets-footer">
        <button type="button" className="secondary-button" onClick={goHome}>← Back to Dashboard</button>
      </div>
    </section>
  )
}

function Today({ session, go }: { session: Session; go: (page: Page) => void }) {
  const [checkIn, setCheckIn] = useState({ mood: 'Good', energy: 7, stress: 3, sleep: 'Good' })
  const [status, setStatus] = useState('Not saved yet')
  const [loading, setLoading] = useState(true)
  const [affirmationDate, setAffirmationDate] = useState(getAffirmationDateKey)

  useEffect(() => {
    const now = new Date()
    const nextDay = new Date(now)
    nextDay.setHours(24, 0, 0, 50)
    const timer = window.setTimeout(() => setAffirmationDate(getAffirmationDateKey()), Math.max(1000, nextDay.getTime() - now.getTime()))
    return () => window.clearTimeout(timer)
  }, [affirmationDate])

  useEffect(() => {
    if (!supabase) return
    const date = today()

    Promise.all([
      supabase.from('mood_logs').select('mood,energy').eq('user_id', session.user.id).eq('logged_on', date).maybeSingle(),
      supabase.from('stress_logs').select('stress').eq('user_id', session.user.id).eq('logged_on', date).maybeSingle(),
      supabase.from('sleep_logs').select('quality').eq('user_id', session.user.id).eq('logged_on', date).maybeSingle(),
    ]).then(([mood, stress, sleep]) => {
      setCheckIn((current) => ({
        ...current,
        ...(mood.data || {}),
        ...(stress.data ? { stress: stress.data.stress } : {}),
        ...(sleep.data ? { sleep: sleep.data.quality } : {}),
      }))
      setLoading(false)
    })
  }, [session])

  async function save() {
    if (!supabase) return
    setStatus('Saving...')
    const date = today()
    const result = await Promise.all([
      supabase.from('mood_logs').upsert({ user_id: session.user.id, logged_on: date, mood: checkIn.mood, energy: checkIn.energy }, { onConflict: 'user_id,logged_on' }),
      supabase.from('stress_logs').upsert({ user_id: session.user.id, logged_on: date, stress: checkIn.stress }, { onConflict: 'user_id,logged_on' }),
      supabase.from('sleep_logs').upsert({ user_id: session.user.id, logged_on: date, quality: checkIn.sleep }, { onConflict: 'user_id,logged_on' }),
    ])

    setStatus(result.some((entry) => entry.error) ? messageForError() : 'Saved ✓')
  }

  const moodOptions = ['Low', 'Okay', 'Good', 'Great']
  const sleepOptions = ['Low', 'Fair', 'Good', 'Restful']

  return (
    <section className="today-page">
      <section className="welcome">
        <div className="welcome-copy">
          <p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>
            Welcome back <span>♡</span>
          </h1>
          <p className="intro">A gentle moment to notice how you are, today.</p>
        </div>
        <div className="date-orb" aria-label={`Today is ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}>
          <CalendarDays size={21} />
          <strong>{new Date().getDate()}</strong>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short' })}</span>
        </div>
      </section>

      <section className="overview-grid">
        <article className="cycle-card">
          <div className="card-top">
            <span className="label">LUNA DAILY BRIEF</span>
            <Heart size={18} />
          </div>
          <div className="brief-card-body">
            <div className="brief-summary">
              <div className="brief-header-copy">
                <p className="brief-greeting">Good morning, Hazel 🌸</p>
                <h2>Cycle day 12</h2>
              </div>
              <span className="brief-pill">Low energy</span>
            </div>

            <div className="brief-metrics">
              <div className="metric-block">
                <span>Sleep</span>
                <strong>7h 42m</strong>
              </div>
              <div className="metric-block">
                <span>Mood</span>
                <strong>Good</strong>
              </div>
              <div className="metric-block">
                <span>Medication</span>
                <strong>8:00 PM</strong>
              </div>
            </div>

            <p className="brief-tip">Take gentle care of yourself today. Keep your rhythm steady and let rest be part of your plan.</p>
          </div>
        </article>

        <article className="care-card">
          <div className="card-top">
            <span className="label">THIS WEEK</span>
            <Sparkles size={18} />
          </div>
          <div className="care-copy">
            <div className="mini-avatar">✦</div>
            <div>
              <p>{goals[0]}</p>
              <button className="dark-button" onClick={() => go('Insights')}>
                View insights
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="checkin-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TODAY'S CHECK-IN</p>
            <h2>How are you feeling?</h2>
          </div>
          <span className="save-status">{loading ? 'Loading...' : status}</span>
        </div>

        <div className="checkin-card">
          <div className="checkin-grid">
            <fieldset>
              <legend>Mood</legend>
              <div className="mood-options">
                {moodOptions.map((option) => (
                  <button
                    key={option}
                    className={checkIn.mood === option ? 'mood selected' : 'mood'}
                    onClick={() => setCheckIn((current) => ({ ...current, mood: option }))}
                  >
                    <span>{option === 'Low' ? '☁️' : option === 'Okay' ? '🙂' : option === 'Good' ? '😊' : '✨'}</span>
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="range-card">
              <label>
                Energy
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={checkIn.energy}
                  onChange={(event) => setCheckIn((current) => ({ ...current, energy: Number(event.target.value) }))}
                />
              </label>
              <strong>{checkIn.energy}/10</strong>
            </div>

            <div className="range-card">
              <label>
                Stress
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={checkIn.stress}
                  onChange={(event) => setCheckIn((current) => ({ ...current, stress: Number(event.target.value) }))}
                />
              </label>
              <strong>{checkIn.stress}/10</strong>
            </div>

            <fieldset>
              <legend>Sleep</legend>
              <div className="sleep-options">
                {sleepOptions.map((option) => (
                  <button
                    key={option}
                    className={checkIn.sleep === option ? 'choice selected' : 'choice'}
                    onClick={() => setCheckIn((current) => ({ ...current, sleep: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="checkin-actions">
            <button className="primary-button" onClick={save}>Save today</button>
            <button className="text-button" onClick={() => go('Cycle')}>View cycle</button>
          </div>
        </div>
      </section>

      <section className="feature-stack">
        <DailyAffirmation key={affirmationDate} userId={session.user.id} />

        <article className="mini-card goal-card">
          <div className="mini-card-icon">
            <Leaf size={16} />
          </div>
          <p className="label">GENTLE GOAL</p>
          <h3>{goals[1]}</h3>
          <div className="goal-progress" aria-label="Goal progress">
            <span style={{ width: '44%' }} />
          </div>
          <small>Keep it gentle. Small steps count.</small>
        </article>

        <article className="mini-card support-card">
          <div className="mini-card-icon gentle-icon">
            <ShieldCheck size={16} />
          </div>
          <p className="label">PRIVATE SUPPORT</p>
          <h3>Your wellness space stays yours.</h3>
          <p>Partner access stays optional and fully controlled.</p>
          <button className="secondary-button support-button" type="button" onClick={() => go('Settings')}>
            Manage Access →
          </button>
        </article>
      </section>
    </section>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authUrlError] = useState(() => consumeAuthUrlError())
  const [page, setPage] = useState<Page>('Today')
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const { reminder, dismiss, scheduleTest } = useMedicationScheduler(session)
  const authClient = supabase

  useEffect(() => {
    if (!authClient) {
      queueMicrotask(() => setAuthLoading(false))
      return
    }

    authClient.auth.getSession().then(async ({ data }) => {
      if (authUrlError && data.session) await authClient.auth.signOut()
      setSession(authUrlError ? null : data.session as Session | null)
      setAuthLoading(false)
    })

    const listener = authClient.auth.onAuthStateChange((_event, next) => setSession(authUrlError ? null : next as Session | null))
    return () => listener.data.subscription.unsubscribe()
  }, [authClient, authUrlError])

  const navigation = [
    { label: 'Today' as Page, icon: Home },
    { label: 'Date Tickets' as Page, icon: Heart },
    { label: 'Cycle' as Page, icon: Moon },
    { label: 'Symptoms' as Page, icon: Activity },
    { label: 'Medication' as Page, icon: Pill },
    { label: 'Journal' as Page, icon: BookHeart },
    { label: 'Insights' as Page, icon: Sparkles },
    { label: 'Settings' as Page, icon: SettingsIcon },
  ]

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <p className="eyebrow">LUNA</p>
          <h1>Loading your private space...</h1>
        </div>
      </main>
    )
  }

  if (!supabase) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <h1>Supabase is not configured</h1>
          <p className="auth-copy">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local before using LUNA.</p>
        </div>
      </main>
    )
  }

  if (!session) return <AuthScreen authUrlError={authUrlError} />

  const go = (next: Page) => {
    setPage(next)
    setMenuOpen(false)
  }

  const goHome = () => go('Today')

  const client = supabase

  const markReminderTaken = async () => {
    if (!reminder || reminder.medicationId === 'test-medication') return
    const result = await client.from('medication_logs').insert({
      user_id: session.user.id,
      medication_id: reminder.medicationId,
      status: 'taken',
      logged_at: new Date().toISOString(),
    })
    if (result.error) throw result.error
  }


  
  return (

    
    <div className={`app ${theme}`}>
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={17} />
          </span>
          <span>LUNA</span>
        </div>
        <p className="brand-subtitle">Her personal wellness companion</p>

        <nav aria-label="Primary navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={page === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile">
            <div className="mini-avatar">{session.user.email?.slice(0, 1).toUpperCase() || 'L'}</div>
            <div>
              <strong>{session.user.email || 'Luna user'}</strong>
              <small>Private profile</small>
            </div>
            <button className="logout-button" onClick={() => void client.auth.signOut()}>
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <div className="header-home-lockup">
            <button className="header-home-button" type="button" onClick={goHome}>
              <Home size={16} />
              <span>Home</span>
            </button>

            <div className="breadcrumb">
              <span>LUNA</span>
              <ChevronRight size={14} />
              <small>{page}</small>
            </div>
          </div>

          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="theme-button" aria-label="Toggle theme" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
              {theme === 'light' ? <Moon size={16} /> : <SunMedium size={16} />}
            </button>
          </div>
        </header>

        {page === 'Today' && <Today session={session} go={go} />}
        {page === 'Date Tickets' && <DateTicketsPage goHome={goHome} />}
        {page === 'Cycle' && <Cycle session={session} goHome={goHome} />}
        {page === 'Symptoms' && <Symptoms session={session} goHome={goHome} />}
        {page === 'Medication' && <Medication session={session} goHome={goHome} onTestReminder={(kind = 'due') => { scheduleTest?.(10000, kind) }} />}
        {page === 'Journal' && <Journal session={session} goHome={goHome} />}
        {page === 'Insights' && <Insights session={session} goHome={goHome} />}
        {page === 'Settings' && <Settings session={session} onSignOut={() => void client.auth.signOut()} goHome={goHome} />}
      </main>
      {reminder && <MedicationAlarm reminder={reminder} onDismiss={dismiss} onTaken={markReminderTaken} />}
    </div>
  )
}

export default App
