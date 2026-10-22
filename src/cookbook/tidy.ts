import type { Ingredient } from './model'

// Tidying a told recipe: her story (and her answers to follow-up questions) in, a recipe out. The model does it when it can;
// `fallbackTidy` does a plainer job by rule, so the flow still works with no API key.

export type Answer = { question: string; answer: string }

/** A tidied recipe, not yet saved. `questions` are what's still missing: amounts, time, servings, tools she didn't say. */
export type Draft = {
  name: string
  summary: string
  minutes: number | null
  serves: number | null
  ingredients: Ingredient[]
  steps: string[]
  tools: string[]
  questions: string[]
}

/** The JSON the model must return (strict mode wants every field present, so unknown numbers are null). */
export const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    minutes: { type: ['integer', 'null'] },
    serves: { type: ['integer', 'null'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { name: { type: 'string' }, amount: { type: 'string' }, said: { type: 'string' } },
        required: ['name', 'amount', 'said'],
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
    tools: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'summary', 'minutes', 'serves', 'ingredients', 'steps', 'tools', 'questions'],
} as const

export function tidyInstructions(book: string, title: string) {
  return [
    `You turn a family member's spoken recipe into a tidy recipe card for ${book || 'their'} cookbook, on a kitchen display.`,
    'Keep her voice in the details; never invent facts she did not say.',
    `- name: the dish, 1 to 4 words${title ? ` (the story was titled “${title}”; use the dish name, not the story title)` : ''}.`,
    '- summary: one warm sentence about the dish, under 20 words.',
    '- minutes: total time if she said or clearly implied it, else null. serves: how many it feeds if said, else null.',
    '- ingredients: every ingredient. amount: a tidy measurement (grams, ml, tbsp, tsp, cups, pieces) only when she gave one or an answer did; otherwise "". said: her own words for the amount ("a good handful"), or "".',
    '- steps: the method in order, each one short and starting with a verb (“Blend the shallots and chili into a paste.”). 3 to 12 steps.',
    '- tools: the pans, pots and utensils needed, including ones the method implies (frying means a pan).',
    '- questions: up to 4 short, friendly questions about what is still missing to cook it: amounts left blank, time, servings, heat, a tool. Ask nothing already answered. Empty when nothing important is missing.',
    'The input may end with answers she gave to earlier questions; use them.',
  ].join('\n')
}

/** Everything the model said, made safe and bounded; null if it isn't a recipe. */
export function cleanDraft(value: unknown): Draft | null {
  if (!value || typeof value !== 'object') return null
  const d = value as Record<string, unknown>
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const count = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) > 0 && (v as number) <= max ? (v as number) : null)
  const list = (v: unknown, max: number, each: number) => (Array.isArray(v) ? v.map((x) => text(x, each)).filter(Boolean).slice(0, max) : [])
  const name = text(d.name, 60)
  if (!name) return null
  const ingredients = (Array.isArray(d.ingredients) ? d.ingredients : []).map((i) => {
    const o = (i && typeof i === 'object' ? i : {}) as Record<string, unknown>
    return { name: text(o.name, 60), amount: text(o.amount, 40), said: text(o.said, 80) }
  }).filter((i) => i.name).slice(0, 30)
  return {
    name,
    summary: text(d.summary, 200),
    minutes: count(d.minutes, 24 * 60),
    serves: count(d.serves, 50),
    ingredients,
    steps: list(d.steps, 20, 240),
    tools: list(d.tools, 12, 40),
    questions: list(d.questions, 4, 160),
  }
}

/** The story and answers as the model reads them. */
export function tidyInput(transcript: string, answers: Answer[]) {
  const asked = answers.filter((a) => a.answer.trim()).map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n')
  return asked ? `${transcript}\n\nHer answers to follow-up questions:\n${asked}` : transcript
}

// --- The rule-based tidy -------------------------------------------------------------------------------------------------

const INGREDIENTS = [
  'glutinous rice flour', 'rice flour', 'coconut milk', 'coconut cream', 'grated coconut', 'palm sugar', 'gula jawa', 'brown sugar', 'soy sauce',
  'sweet soy sauce', 'kecap manis', 'fish sauce', 'oyster sauce', 'shrimp paste', 'terasi', 'lime leaves', 'bay leaves', 'salam leaves',
  'lemongrass', 'galangal', 'ginger', 'turmeric', 'kencur', 'candlenuts', 'coriander', 'cumin', 'nutmeg', 'cinnamon', 'cloves', 'star anise',
  'pandan', 'shallots', 'shallot', 'garlic', 'onion', 'onions', 'spring onions', 'chives', 'chili', 'chilies', 'chillies', 'sambal', 'tomato', 'tomatoes',
  'potato', 'potatoes', 'carrot', 'carrots', 'cabbage', 'spinach', 'long beans', 'beans', 'bean sprouts', 'cucumber', 'eggplant', 'mushrooms',
  'chicken', 'pork', 'beef', 'lamb', 'duck', 'fish', 'shrimp', 'prawns', 'squid', 'tofu', 'tempeh', 'egg', 'eggs', 'noodles', 'rice', 'flour',
  'cornstarch', 'tapioca', 'sugar', 'salt', 'pepper', 'white pepper', 'butter', 'milk', 'cream', 'cheese', 'oil', 'water', 'stock', 'broth',
  'vinegar', 'lime', 'lemon', 'peanuts', 'cashews', 'sesame', 'vanilla', 'baking powder', 'yeast', 'honey', 'banana', 'bananas', 'coconut',
]
const TOOLS = [
  'rice cooker', 'frying pan', 'saucepan', 'baking tray', 'cutting board', 'mortar and pestle', 'mortar', 'cobek', 'wok', 'pan', 'pot', 'steamer',
  'oven', 'blender', 'food processor', 'bowl', 'knife', 'spatula', 'whisk', 'sieve', 'grater', 'ladle', 'tongs', 'mixer',
]
// Methods that imply a tool she might not name.
const IMPLIED: [RegExp, string][] = [[/\b(fry|fried|saut[eé])/i, 'pan'], [/\b(boil|simmer|stew)/i, 'pot'], [/\bsteam/i, 'steamer'], [/\b(bake|roast)/i, 'oven'], [/\b(blend|puree)/i, 'blender'], [/\b(mix|knead|stir together)/i, 'bowl'], [/\b(chop|slice|dice|cut)/i, 'knife']]
const VERBS = /\b(add|bake|beat|blend|boil|chop|combine|cook|cool|cover|cut|dice|drain|fold|fry|grate|grill|heat|knead|marinate|mash|melt|mix|peel|pound|pour|put|roast|roll|rinse|season|serve|shape|simmer|slice|soak|sprinkle|squeeze|steam|stir|take|toast|wash|whisk|wrap)\b/i
const NUMBER_WORDS: Record<string, string> = { a: '1', an: '1', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', twelve: '12', half: '½', 'a half': '½', 'a quarter': '¼' }
const UNIT = '(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|g|kilos?|kg|ml|millilit(?:er|re)s?|lit(?:er|re)s?|cloves?|pieces?|slices?|stalks?|sticks?|cans?|handfuls?|pinch(?:es)?|bunch(?:es)?|leaves|eggs?)'
const AMOUNT = `(\\d+(?:[.,/]\\d+)?|a half|a quarter|half|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\\s*(${UNIT})?\\s*(?:of\\s+)?`

export const NAME_QUESTION = 'What do you call this dish?'
const capital = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s)
const sentences = (text: string) => text.replace(/\[([^\]]+)\]/g, '$1').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean)

function amountFor(text: string, name: string): { amount: string; said: string } {
  const near = new RegExp(`\\b${AMOUNT}${name.replace(/ /g, '\\s+')}\\b`, 'i').exec(text)
  if (near) {
    const said = near[0].trim()
    const n = NUMBER_WORDS[near[1].toLowerCase()] ?? near[1]
    // “a” or “one” with no unit says nothing useful about how much (“an onion” is fine, “a garlic” isn't).
    if (!near[2] && /^(a|an|one)$/i.test(near[1])) return { amount: '1', said }
    return { amount: near[2] ? `${n} ${near[2].toLowerCase()}` : n, said }
  }
  const loose = new RegExp(`\\b(a (?:good |big |small )?(?:handful|pinch|bit|little|splash|knob) of|some|a little)\\s+${name.replace(/ /g, '\\s+')}`, 'i').exec(text)
  return loose ? { amount: '', said: loose[1] } : { amount: '', said: '' }
}

function minutesIn(text: string) {
  let total = 0
  for (const m of text.matchAll(/(\d+(?:\.\d+)?|half an?|an?|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|forty-five)\s*(hours?|hrs?|minutes?|mins?)\b/gi)) {
    const word = m[1].toLowerCase()
    const words: Record<string, number> = { 'half a': 0.5, 'half an': 0.5, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45 }
    const n = words[word] ?? Number(word)
    if (Number.isFinite(n)) total += /^h/i.test(m[2]) ? n * 60 : n
  }
  return total > 0 ? Math.round(total) : null
}

function servesIn(text: string) {
  const m = /\b(?:serves|feeds|enough for|for)\s+(\d+|two|three|four|five|six|eight|ten)\s*(?:people|persons|of us|kids)?\b/i.exec(text)
  if (!m) return null
  const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10 }
  return words[m[1].toLowerCase()] ?? Number(m[1])
}

/** A plain tidy by rule: the method from her sentences, the ingredients and tools it can recognise, and what's left to ask. */
export function fallbackTidy(transcript: string, title = '', answers: Answer[] = []): Draft {
  const said = tidyInput(transcript, answers)
  const lower = said.toLowerCase()
  const found: string[] = []
  for (const name of INGREDIENTS) {
    // Longer names come first in the list, so “coconut milk” claims its words before “coconut” or “milk” could.
    if (new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\b`, 'i').test(lower) && !found.some((f) => f.includes(name))) found.push(name)
  }
  const ingredients = found.map((name) => ({ name: capital(name), ...amountFor(said, name) }))

  const tools: string[] = []
  for (const t of TOOLS) if (new RegExp(`\\b${t}s?\\b`, 'i').test(lower) && !tools.some((x) => x.includes(t))) tools.push(t)
  for (const [pattern, tool] of IMPLIED) if (pattern.test(transcript) && !tools.some((x) => x.includes(tool))) tools.push(tool)

  const lines = sentences(transcript)
  const method = lines.filter((s) => VERBS.test(s))
  const steps = (method.length ? method : lines).slice(0, 12)
    .map((s) => capital(s.replace(/^(?:and|then|now|so|okay|ok|first|next|after that|and then)[,\s]+/i, '')))

  // Her answers fill in what she was asked about: an amount, the time, how many it feeds.
  let minutes = minutesIn(transcript)
  let serves = servesIn(transcript)
  for (const a of answers) {
    const q = a.question.toLowerCase()
    if (/how long|time/.test(q)) minutes = minutesIn(a.answer) ?? minutes
    if (/how many|feed|serve/.test(q)) serves = servesIn(`serves ${a.answer}`) ?? serves
    const much = /how much (.+?)\??$/i.exec(a.question)
    if (much) {
      const item = ingredients.find((i) => i.name.toLowerCase() === much[1].toLowerCase())
      // “A cup of grated coconut” is kept as “a cup”: the ingredient's own name isn't part of its amount.
      const amount = a.answer.trim().replace(new RegExp(`\\s*(?:of\\s+)?(?:the\\s+)?${much[1].replace(/ /g, '\\s+')}[.!]*$`, 'i'), '').trim()
      if (item && amount) { item.amount = amount.slice(0, 40); item.said ||= a.answer.trim().slice(0, 80) }
    }
  }
  // With no name from the story, she is asked what she calls it, and her answer is the name.
  const called = answers.find((a) => a.question === NAME_QUESTION)?.answer.trim().replace(/^(?:it'?s|we call it|i call it|that'?s|it is)\s+/i, '').replace(/[.!?]+$/, '')

  const asked = new Set(answers.map((a) => a.question))
  const questions = [
    title || called ? '' : NAME_QUESTION,
    ...ingredients.filter((i) => !i.amount && !i.said && !/^(salt|pepper|water|oil)$/i.test(i.name)).slice(0, 2).map((i) => `How much ${i.name.toLowerCase()}?`),
    minutes === null ? 'How long does it take, start to finish?' : '',
    serves === null ? 'How many people does it feed?' : '',
    tools.length === 0 ? 'What do you cook it in: a pan, a pot, a steamer?' : '',
  ].filter((q) => q && !asked.has(q)).slice(0, 4)

  const first = lines[0] ?? ''
  return {
    name: title || (called ? capital(called).slice(0, 60) : capital(found[0] ? `${found[0]} recipe` : 'New recipe')),
    summary: first.length > 140 ? `${first.slice(0, 137).trim()}…` : first,
    minutes,
    serves,
    ingredients,
    steps,
    tools: tools.map(capital),
    questions,
  }
}
