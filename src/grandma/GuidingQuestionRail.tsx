export const guidingQuestions = [
  'How old was Nev when that happened?',
  'What should the beef smell like when it’s ready?',
  'How brown should the edges look?',
  'What else did you add by instinct?',
] as const

function circularOffset(index: number, activeIndex: number) {
  let offset = index - activeIndex
  if (offset > guidingQuestions.length / 2) offset -= guidingQuestions.length
  if (offset < -(guidingQuestions.length / 2)) offset += guidingQuestions.length
  return offset
}

export function GuidingQuestionRail({ activeIndex }: { activeIndex: number }) {
  const normalizedIndex = ((activeIndex % guidingQuestions.length) + guidingQuestions.length) % guidingQuestions.length

  return (
    <section className="grandma-question-rail" aria-label="Guiding questions">
      {guidingQuestions.map((question, index) => {
        const offset = circularOffset(index, normalizedIndex)
        const isActive = offset === 0
        return (
          <p
            className="grandma-question-rail__question"
            data-offset={offset}
            aria-hidden={isActive ? undefined : true}
            aria-live={isActive ? 'polite' : undefined}
            key={question}
          >
            {question}
          </p>
        )
      })}
    </section>
  )
}
