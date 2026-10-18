export const BOARDS = [
  { slug: 'recipe', number: '01', title: 'The recipe on the board' },
  { slug: 'step', number: '02', title: 'Guided cut' },
  { slug: 'weigh', number: '03', title: 'Weigh on the board' },
  { slug: 'record', number: '04', title: 'Record grandma' },
  { slug: 'anatomy', number: '05', title: 'Anatomy and open questions' },
] as const

export type BoardSlug = (typeof BOARDS)[number]['slug']
