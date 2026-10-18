import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('shows one centered ginger illustration and no controls', () => {
    const { container } = render(<App />);
    expect(screen.getByRole('img', { name: 'Ginger root' })).toHaveAttribute(
      'src',
      '/assets/ginger-root.png',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(container.querySelector('.ginger-stage')).toBeInTheDocument();
  });
});
