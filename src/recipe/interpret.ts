import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { describeOps, isOp, type RecipeDoc, type RecipeOp, type Who } from './model'

export const ACTIONS = ['confirm', 'change_recipe', 'start_cooking', 'go_to_step', 'next_step', 'previous_step', 'stop_cooking', 'answer', 'unclear'] as const
export type Action = (typeof ACTIONS)[number]

export type Decision = { action: Action; ops: RecipeOp[]; step?: number; reply: string }

const OP_TYPES = ['set_servings', 'set_mild', 'set_chicken', 'set_kencur_swapped', 'swap_word', 'reset'] as const

/** The JSON the model must return (strict mode wants every field present, so unused ones are null). */
export const DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ACTIONS },
    ops: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: OP_TYPES },
          number: { type: ['integer', 'null'] },
          flag: { type: ['boolean', 'null'] },
          find: { type: ['string', 'null'] },
          replace: { type: ['string', 'null'] },
        },
        required: ['type', 'number', 'flag', 'find', 'replace'],
      },
    },
    step: { type: ['integer', 'null'], minimum: 1, maximum: 8 },
    reply: { type: 'string' },
  },
  required: ['action', 'ops', 'step', 'reply'],
} as const

export function describeRecipe(doc: RecipeDoc, who: Who, activeStep: number | null, note: string, pending: RecipeOp[] = []) {
  const { ingredients, steps, tools, cookingTimeMinutes } = GRANDKIDS_RECIPE_CONTEXT
  const m = doc.mods
  return [
    `Recipe: Lawar Bali, from Oma Lien. Cooking time ${cookingTimeMinutes} minutes. Tools: ${tools.join(', ')}.`,
    `Right now: ${m.servings} servings; ${m.mild ? 'milder spice' : 'normal spice'}; ${m.chicken ? 'made with chicken' : 'made with pork'}; kencur ${m.kencurSwapped ? 'swapped for ginger and lime zest' : 'as Oma wrote it'}.`,
    doc.storyEdits.length ? `Words already swapped in Oma’s story: ${doc.storyEdits.map((e) => `${e.find} → ${e.replace}`).join(', ')}.` : 'No words swapped in Oma’s story yet.',
    `Who is speaking: ${who === 'Grandma' ? 'Oma, on the screen where she tells and edits the recipe note' : 'a grandkid, on the cooking display'}.`,
    `Screen: ${activeStep === null ? 'the recipe overview' : `cooking step ${activeStep} of ${steps.length}`}.`,
    `Ingredients: ${ingredients.map((i) => `${i.name} (${i.familyAmount})`).join(', ')}.`,
    `Steps: ${steps.map((s) => `${s.number}. ${s.text}`).join(' ')}`,
    pending.length ? `Waiting for a yes or no: ${describeOps(pending)}.` : 'Nothing is waiting for a yes or no.',
    note ? `Oma’s story note, which words can be swapped in:\n${note}` : '',
  ].filter(Boolean).join('\n')
}

export function instructionsFor(doc: RecipeDoc, who: Who, activeStep: number | null, note: string, pending: RecipeOp[] = []) {
  // Each screen is told only about the changes it has, so the model never reaches for one that is not there.
  const changes = who === 'Grandma'
    ? [
        '- swap_word (find: one word that appears in Oma’s story note, spelled as written there; replace: the new word). Use it for every request to change one thing into another, however it is phrased: “replace pork with beef”, “I want beef instead of pork”, “change pork to lamb”, “use lamb for the pork”.',
        '- reset: put everything back to Oma’s original.',
      ]
    : [
        '- set_servings (number 2 or 4), set_mild (flag: less spicy), set_chicken (flag: chicken instead of pork), set_kencur_swapped (flag: ginger and lime zest instead of kencur), reset (back to Oma’s recipe). Several are fine in one go.',
      ]
  return [
    'You are Popo, a warm, quick kitchen helper. The transcript may begin with the wake phrase “Hey Popo” and “change recipe”; ignore those.',
    'You can really change the shared recipe, which both screens show, but you always check first. Work out what the person wants and pick exactly one action:',
    '- confirm: the person asked for a change and nothing is waiting yet. Do not make it. Put exactly the changes you would make in `ops` and a short spoken question in `reply`.',
    '- change_recipe: only when a change is waiting for a yes and the person agrees. Put the changes in `ops`.',
    'Each op has a `type` and its fields, with the unused fields null. The changes you can make here:',
    ...changes,
    who === 'Grandma' ? '' : '- start_cooking, go_to_step (step 1–8), next_step, previous_step, stop_cooking: moving through the cooking steps.',
    '- answer: a question about this recipe or cooking it, answered from the facts below only. Never invent a recipe fact or family memory. A question about anything else is unclear: say kindly that you can only help with this recipe.',
    'If a change is waiting and the person says no or never mind, answer unclear with a short, friendly okay. If they correct it (“no, just the servings”), answer confirm with only the corrected changes. If they ask for something else, treat it as a new request.',
    '- unclear: you did not understand, the word is not in the note, or it is unrelated. Say so kindly in one line.',
    'The reply is spoken aloud: one or two short, natural sentences in your own words each time. Confirm what you actually changed.',
    '',
    describeRecipe(doc, who, activeStep, note, pending),
  ].filter((line) => line !== '').join('\n')
}

type RawOp = { type?: unknown; number?: unknown; flag?: unknown; find?: unknown; replace?: unknown }

/** Turns what the model returned into checked changes; anything that does not fit is dropped. */
export function toOps(raw: unknown, note: string): RecipeOp[] {
  if (!Array.isArray(raw)) return []
  const ops: RecipeOp[] = []
  for (const r of raw as RawOp[]) {
    let op: unknown
    switch (r?.type) {
      case 'set_servings': op = { type: 'set_servings', value: r.number }; break
      case 'set_mild': case 'set_chicken': case 'set_kencur_swapped': op = { type: r.type, value: r.flag }; break
      case 'swap_word': op = { type: 'swap_word', find: r.find, replace: r.replace }; break
      case 'reset': op = { type: 'reset' }; break
    }
    if (!isOp(op)) continue
    // A word can only be swapped if it is in the note she can see.
    if (op.type === 'swap_word' && !new RegExp(`\\b${op.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(note)) continue
    ops.push(op)
  }
  return ops
}

const pick = <T,>(options: readonly T[]) => options[Math.floor(Math.random() * options.length)]

/** Used only when the model can't be reached (no network, no credits): the simplest readings of what was said. */
export function fallbackDecision(transcript: string, doc: RecipeDoc, note: string, pending: RecipeOp[] = []): Decision {
  const t = transcript.toLowerCase()
  if (pending.length) {
    if (/^\W*(yes|yeah|yep|yup|sure|ok|okay|please|do it|go ahead|correct|right)\b/.test(t)) return { action: 'change_recipe', ops: pending, reply: pick(['Okay, done!', 'Done — it’s changed.', 'All right, I’ve changed it.']) }
    if (/^\W*(no|nope|nah|cancel|don'?t|never ?mind|stop)\b/.test(t)) return { action: 'unclear', ops: [], reply: 'Okay, I’ll leave it as it is.' }
  }
  const change = (ops: RecipeOp[], reply: string): Decision => ({ action: 'change_recipe', ops, reply })
  const swap = t.match(/(?:replace|change|swap|switch)\s+(?:the\s+)?([a-z]+)\s+(?:with|to|for|into)\s+(?:the\s+)?([a-z]+)/)
  if (swap && toOps([{ type: 'swap_word', number: null, flag: null, find: swap[1], replace: swap[2] }], note).length) {
    return change([{ type: 'swap_word', find: swap[1], replace: swap[2] }], pick(['Okay!', 'Okay, done!', 'Got it, changed!']))
  }
  if (/for (just )?(two|2)|two (people|servings)|halve|half/.test(t)) return change([{ type: 'set_servings', value: 2 }], pick(['Okay, I’ve halved everything for two.', 'Two servings it is.']))
  if (/for (four|4)|four (people|servings)|double/.test(t)) return change([{ type: 'set_servings', value: 4 }], pick(['Back to four servings.', 'Okay, cooking for four again.']))
  if (/mild|less spicy|not spicy|gentle/.test(t)) return change([{ type: 'set_mild', value: true }], pick(['I made it a little gentler.', 'Okay, less spicy.']))
  if (/chicken/.test(t)) return change([{ type: 'set_chicken', value: true }], pick(['Chicken instead of pork, done.', 'Swapped the pork for chicken.']))
  if (/kencur|ginger/.test(t)) {
    return doc.mods.kencurSwapped
      ? change([{ type: 'set_kencur_swapped', value: false }], 'I put the kencur back.')
      : change([{ type: 'set_kencur_swapped', value: true }], pick(['Ginger and lime zest instead of kencur.', 'No kencur — I swapped in ginger and lime zest.']))
  }
  if (/original|reset|start over/.test(t)) return change([{ type: 'reset' }], 'Back to Oma’s recipe.')
  if (/start cooking|let'?s cook|begin/.test(t)) return { action: 'start_cooking', ops: [], reply: pick(['Okay, let’s cook!', 'Starting with step one.']) }
  if (/next/.test(t)) return { action: 'next_step', ops: [], reply: 'Next step.' }
  if (/back|previous|before/.test(t)) return { action: 'previous_step', ops: [], reply: 'Going back a step.' }
  if (/stop|done|finish|leave/.test(t)) return { action: 'stop_cooking', ops: [], reply: 'Okay, back to the recipe.' }
  const step = t.match(/step\s*(\d)/)
  if (step && Number(step[1]) >= 1 && Number(step[1]) <= 8) return { action: 'go_to_step', ops: [], step: Number(step[1]), reply: `Step ${step[1]}.` }
  return { action: 'unclear', ops: [], reply: 'I can change the recipe, swap a word in the story, or move between steps. What would you like?' }
}
