import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Login } from './Login';

const { loginMock, navigateMock, forgotMock, resetMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  navigateMock: vi.fn(),
  forgotMock: vi.fn(),
  resetMock: vi.fn(),
}));

vi.mock('../services/api', () => ({ auth: { login: loginMock, forgotPassword: forgotMock, resetPassword: resetMock } }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

describe('Login form submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loginMock.mockResolvedValue({
      token: 'test-token',
      user: { id: 5, username: 'owner2', name: 'Second Owner', email: 'owner2@example.com', role: 'Owner' },
    });
    forgotMock.mockResolvedValue({ message: 'If an active account exists for that email, a reset code has been sent.' });
    resetMock.mockResolvedValue({ message: 'Password reset successfully. Please sign in with your new password.' });
  });

  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('submits the visible password when autofill changes the input without a change event', async () => {
    render(<Login />);
    const username = screen.getByLabelText('Username or Email');
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.change(username, { target: { value: 'owner2' } });
    fireEvent.change(password, { target: { value: 'OlderPass123!' } });

    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(password, 'UpdatedPass123!');
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('owner2', 'UpdatedPass123!'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('trims the username while preserving spaces in the password', async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText('Username or Email'), { target: { value: ' owner2 ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '  UpdatedPass123!  ' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('owner2', '  UpdatedPass123!  '));
  });

  it('routes legacy Business Owner accounts to Cashier and keeps a missing email empty', async () => {
    loginMock.mockResolvedValue({ token: 'test-token', user: { id: 8, username: 'cashier', name: 'Cashier Account', role: 'Business Owner' } });
    render(<Login />);
    fireEvent.change(screen.getByLabelText('Username or Email'), { target: { value: 'cashier' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Strong1!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/cashier/pos'));
    expect(JSON.parse(localStorage.getItem('wiwaste-session')!)).toMatchObject({ role: 'cashier', email: '' });
  });

  it('shows the server lockout countdown and allows another attempt when it expires', async () => {
    vi.useFakeTimers();
    loginMock.mockRejectedValueOnce(Object.assign(new Error('Account locked.'), { status: 423, retryAfter: 2 }));
    render(<Login />);
    fireEvent.change(screen.getByLabelText('Username or Email'), { target: { value: 'owner2' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'WrongPassword!' } });
    await act(async () => { fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!); });
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in is temporarily locked');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('resets with an emailed OTP without submitting the sign in form', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Email Address'), { target: { value: 'owner2@example.com' } });
    fireEvent.submit(within(dialog).getByRole('button', { name: 'Send Reset Code' }).closest('form')!);
    await waitFor(() => expect(forgotMock).toHaveBeenCalledWith('owner2@example.com'));
    fireEvent.change(await screen.findByLabelText('Reset Code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Strong1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'Strong1!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset Password' }).closest('form')!);
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith({ email: 'owner2@example.com', otp: '123456', password: 'Strong1!', password_confirmation: 'Strong1!' }));
    expect(await screen.findByText('Password reset complete')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('keeps reset errors visible and rejects short or mismatched passwords', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'owner2@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Reset Code' }).closest('form')!);
    fireEvent.change(await screen.findByLabelText('Reset Code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Short1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'Short1!' } });
    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);
    expect(resetMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('policy requirements');
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Strong1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'Different1!' } });
    fireEvent.submit(form);
    expect(resetMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    resetMock.mockRejectedValueOnce(new Error('The reset code is invalid or expired.'));
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'Strong1!' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');
    expect(screen.getByLabelText('Reset Code')).toBeInTheDocument();
  });
});
