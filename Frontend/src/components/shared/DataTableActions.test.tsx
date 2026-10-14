import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from './DataTableActions';

describe('table actions', () => {
  it('executes the action inside its tooltip without selecting the row', () => {
    const action = vi.fn();
    const rowClick = vi.fn();
    render(<div onClick={rowClick}><ActionButton label="Archive" icon={<span>A</span>} onClick={action} /></div>);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(action).toHaveBeenCalledOnce();
    expect(rowClick).not.toHaveBeenCalled();
  });
});
