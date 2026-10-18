import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GrandkidsPage } from './GrandkidsPage'

afterEach(cleanup)

describe('GrandkidsPage', () => {
  it('renders Soto Ayam title in a main region', () => {
    render(<GrandkidsPage />)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(screen.getByText(/Soto Ayam/i)).toBeInTheDocument()
  })

  it('displays all 14 Soto Ayam ingredients with accessible names', () => {
    render(<GrandkidsPage />)

    // All 14 ingredients from the spec
    expect(screen.getByText(/chicken thighs/i)).toBeInTheDocument()
    expect(screen.getByText(/lemongrass/i)).toBeInTheDocument()
    expect(screen.getByText(/daun salam/i)).toBeInTheDocument()
    expect(screen.getByText(/makrut lime leaves/i)).toBeInTheDocument()
    expect(screen.getByText(/fresh turmeric/i)).toBeInTheDocument()
    expect(screen.getByText(/ginger/i)).toBeInTheDocument()
    expect(screen.getByText(/garlic/i)).toBeInTheDocument()
    expect(screen.getByText(/candlenuts/i)).toBeInTheDocument()
    expect(screen.getByText(/ground coriander/i)).toBeInTheDocument()
    expect(screen.getByText(/rice noodles/i)).toBeInTheDocument()
    expect(screen.getByText(/bean sprouts/i)).toBeInTheDocument()
    expect(screen.getByText(/eggs/i)).toBeInTheDocument()
    expect(screen.getByText(/limes/i)).toBeInTheDocument()
    expect(screen.getByText(/fried shallots/i)).toBeInTheDocument()
  })

  it('defaults to four servings', () => {
    render(<GrandkidsPage />)
    // Base quantities should match 4 servings
    expect(screen.getByText(/700\s*g/)).toBeInTheDocument() // chicken thighs
  })

  it('does not render project bar or ginger UI', () => {
    render(<GrandkidsPage />)
    expect(screen.queryByAltText(/Moldable/)).not.toBeInTheDocument()
    expect(screen.queryByAltText(/Ginger root/)).not.toBeInTheDocument()
  })
})
