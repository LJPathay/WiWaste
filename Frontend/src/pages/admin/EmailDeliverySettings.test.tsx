import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailDeliverySettings } from './EmailDeliverySettings';

const { getMock, updateMock } = vi.hoisted(() => ({ getMock: vi.fn(), updateMock: vi.fn() }));
vi.mock('../../services/api', () => ({ emailSettings: { get: getMock, update: updateMock } }));

const config = {
  enabled: true, host: 'smtp.example.com', port: 587, encryption: 'tls', username: 'owner@example.com',
  from_address: 'notifications@example.com', from_name: 'WiWaste', password_configured: true,
};
beforeEach(() => { getMock.mockResolvedValue(config); updateMock.mockReset().mockResolvedValue(config); });
afterEach(cleanup);

describe('owner email settings', () => {
  it('keeps a saved password masked and omits it from ordinary configuration updates', async () => {
    render(<EmailDeliverySettings />);
    const password = await screen.findByLabelText('SMTP Password');
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('placeholder', 'Saved securely; leave blank to keep');
    fireEvent.click(screen.getByRole('button', { name: 'Save Email Settings' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('password');
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('password_configured');
  });

  it('clears a newly entered password after saving and shows server validation failures', async () => {
    render(<EmailDeliverySettings />);
    const password = await screen.findByLabelText('SMTP Password');
    fireEvent.change(password, { target: { value: 'new-provider-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Email Settings' }));
    await screen.findByText('Email delivery settings saved.');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ password: 'new-provider-secret' }));
    expect(password).toHaveValue('');
    updateMock.mockRejectedValue(new Error('SMTP host is required.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Email Settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP host is required.');
  });
});
