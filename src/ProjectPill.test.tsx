import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectPill } from './ProjectPill';

describe('ProjectPill', () => {
  it('renders Groth with ten accessible food illustration buttons', () => {
    render(<ProjectPill />);
    expect(screen.getByText('Groth')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(10);
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Bean pancakes', 'Colorful rice cakes', 'Brown layered cakes', 'Banana leaf cakes',
      'Green coconut cakes', 'Sesame balls', 'Steamed cupcakes', 'Wrapped rice cakes',
      'Red rice rolls', 'Striped layer cake',
    ]);
  });

  it('uses local transparent artwork and a responsive scroll region', () => {
    const { container } = render(<ProjectPill />);
    const rail = container.querySelector('.project-pill__rail');
    expect(rail).toHaveAttribute('aria-label', 'Food illustrations');
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(10);
    for (const image of images) expect(image.getAttribute('src')).toMatch(/^\/assets\/food-/);
  });
});
