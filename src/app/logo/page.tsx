import { MoldableMark } from '@/MoldableMark'

export const metadata = { title: 'Moldable logo' }

export default function Page() {
  const swatches = [
    { bg: '#000', fg: '#ffe600' },
    { bg: '#1a1a1a', fg: '#f6c90e' },
    { bg: '#f4efe6', fg: '#d9531e' },
  ]
  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', minHeight: '100vh' }}>
      {swatches.map((s) => (
        <div key={s.bg} style={{ background: s.bg, display: 'grid', placeItems: 'center', padding: 32, gap: 16 }}>
          <MoldableMark color={s.fg} className="logo-demo" />
          <span style={{ color: s.fg, fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em' }}>moldable</span>
        </div>
      ))}
      <style>{`.logo-demo{width:min(70%,260px);height:auto;overflow:visible}`}</style>
    </main>
  )
}
