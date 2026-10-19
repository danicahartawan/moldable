const PARTS = [
  { n: 1, title: 'Screen strip', body: 'Touch screen with the recipe bar, a camera that reads recipe cards, a mic for her voice and questions, and a speaker.' },
  { n: 2, title: 'Guidance surface', body: 'Draws outlines, cut lines at real size, and step numbers. Ink line drawing only, like a printed instruction sheet.' },
  { n: 3, title: 'Scale in the four feet', body: 'Load cells weigh anything on the board and check ingredients off by weight. Target: 1 g steps up to 5 kg.' },
  { n: 4, title: 'Removable chopping insert', body: 'Knives never touch the glass. The insert lifts out to wash.' },
]

const QUESTIONS = [
  'How do the lines show through a chopping insert? Options: a clear insert over the display, projection from the screen strip, or chopping only on one side.',
  'Display under glass or projection? A display costs more and adds weight. Projection needs a mast and gets washed out in a bright kitchen.',
  'Water, heat and knife marks: what does food-safe and dishwasher-safe mean for each layer?',
  'Mains power or battery, and how long does a 3-hour rendang need it to last?',
]

const shadow = { boxShadow: 'var(--shadow-1)' }

export function AnatomyBoard() {
  return (
    <div className="b-anatomy">
      <section aria-label="Top and side views" style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
        <p className="b-eyebrow b-muted">Top view, about 60 × 40 cm</p>
        <div style={{ position: 'relative', width: '100%', maxWidth: 760, height: 470, borderRadius: 'var(--radius-md)', background: 'var(--flour)', boxShadow: 'var(--shadow-2)' }}>
          <div style={{ position: 'absolute', left: 22, right: 22, top: 20, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: 'var(--radius-sm)', background: 'var(--flour)', ...shadow }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ink)' }} />
            <span style={{ fontSize: 11, fontWeight: 300 }}>1  Screen strip</span>
          </div>
          <div className="b-dashed" style={{ position: 'absolute', left: 40, right: 40, top: 110, bottom: 34, display: 'grid', placeItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 300 }}>2  Guidance surface</span>
              <span className="b-muted" style={{ fontSize: 13 }}>Outlines, cut lines and numbers appear here</span>
            </div>
          </div>
          <span className="b-corner-dot" style={{ left: 6, bottom: 6, display: 'grid', placeItems: 'center', color: 'var(--flour)', fontSize: 11, fontWeight: 300 }}>3</span>
          <span className="b-corner-dot" style={{ right: 6, bottom: 6 }} />
          <span className="b-corner-dot" style={{ left: 6, top: 6 }} />
          <span className="b-corner-dot" style={{ right: 6, top: 6 }} />
        </div>

        <div>
          <p className="b-eyebrow b-muted" style={{ margin: '0 0 14px' }}>Side section showing the layers</p>
          <div role="img" aria-label="Layers from top: removable chopping insert, food-safe glass, display, frame, load-cell feet" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 760 }}>
            <div style={{ height: 30, margin: '0 120px 0 60px', display: 'flex', alignItems: 'center', padding: '0 14px', border: '1.3px solid var(--ink)', borderRadius: 4, background: 'var(--flour-sunken)', fontSize: 12, fontWeight: 300 }}>4  Removable chopping insert</div>
            <div style={{ height: 14, margin: '0 20px', border: '1.3px solid var(--thermal-violet)', borderRadius: 4, background: 'var(--violet-soft)' }} />
            <div style={{ height: 22, margin: '0 24px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 4, background: 'var(--ink)', color: 'var(--flour)', fontSize: 11 }}>Display layer</div>
            <div className="b-muted" style={{ height: 34, display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 4, background: 'var(--flour-sunken)', fontSize: 11 }}>Frame, battery and speaker</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px' }}>
              <span style={{ width: 40, height: 16, borderRadius: 4, background: 'var(--ink)' }} />
              <span style={{ width: 40, height: 16, borderRadius: 4, background: 'var(--ink)' }} />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Parts and open questions" style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 300, letterSpacing: '-0.02em' }}>What the board is made of</h1>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PARTS.map((p) => (
            <li key={p.n} style={{ display: 'flex', gap: 14 }}>
              <span style={{ display: 'grid', width: 26, height: 26, flex: 'none', placeItems: 'center', border: '1.3px solid var(--ink)', borderRadius: '50%', fontSize: 12, fontWeight: 300 }}>{p.n}</span>
              <div>
                <b style={{ display: 'block', fontSize: 17, lineHeight: '22px', fontWeight: 300 }}>{p.title}</b>
                <span className="b-muted" style={{ fontSize: 14, lineHeight: '20px' }}>{p.body}</span>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 6, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 'var(--radius-md)', background: 'var(--yolk-soft)' }}>
          <p className="b-eyebrow" style={{ color: 'var(--yolk-ink)' }}>Open questions before building</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: '20px' }}>
            {QUESTIONS.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}
