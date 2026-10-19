import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectPill } from './ProjectPill';

describe('ProjectPill brand', () => {
  it('uses the connected Moldable wordmark in place of the old image logo', () => {
    render(<ProjectPill />);
    expect(screen.getByRole('img', { name: 'Moldable' })).toHaveClass('moldable-wordmark');
    expect(screen.getByRole('img', { name: 'Moldable' }).querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Moldable' }).querySelector('.moldable-wordmark__symbol')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Moldable' }).querySelector('.moldable-wordmark__name')).toHaveTextContent('moldable');
    expect(screen.getByRole('img', { name: 'Moldable' }).querySelector('.moldable-wordmark__join')).toHaveTextContent('da');
    expect(screen.queryByText('Groth')).not.toBeInTheDocument();
  });
});
