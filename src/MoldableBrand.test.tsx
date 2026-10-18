import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectPill } from './ProjectPill';

describe('ProjectPill brand', () => {
  it('uses the supplied Moldable logo in place of the Groth wordmark', () => {
    render(<ProjectPill />);
    expect(screen.getByRole('img', { name: 'Moldable' })).toHaveAttribute(
      'src',
      '/assets/moldable-logo.png',
    );
    expect(screen.queryByText('Groth')).not.toBeInTheDocument();
  });
});
