import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ManageUsers } from './ManageUsers';
import type { ApiUser, UpdateUserPayload } from '../../services/api';

const { listMock, updateMock, createMock, addItemMock, updateItemMock, refetchMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
  addItemMock: vi.fn(),
  updateItemMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock('../../hooks/useOptimisticList', () => ({ useOptimisticList: listMock }));
vi.mock('../../services/api', () => ({
  users: { list: vi.fn(), update: updateMock, create: createMock },
}));

async function openEditFromAccountDetails(role: ApiUser['role']) {
  const user: ApiUser = {
    id: 5,
    name: 'Test Account',
    First_name: 'Test',
    Middle_name: '',
    Surname: 'Account',
    contact_number: '09123456789',
    address: 'Original Address',
    username: 'test-account',
    email: 'test-account@example.com',
    role,
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  };
  const loadedList = {
    data: [user],
    loading: false,
    error: null,
    addItem: addItemMock,
    updateItem: updateItemMock,
    removeItem: vi.fn(),
    refetch: refetchMock,
  };
  listMock.mockReturnValue(loadedList);
  updateMock.mockImplementation(async (id: number, payload: UpdateUserPayload) => ({
    ...user,
    ...payload,
    id,
    name: payload.Full_name ?? user.name,
    email: payload.email ?? user.email,
    role: payload.role ?? user.role,
    status: payload.status ?? user.status,
  }));
  updateItemMock.mockImplementation((id: number, updated: ApiUser) => {
    loadedList.data = loadedList.data.map(item => item.id === id ? updated : item);
  });
  refetchMock.mockResolvedValue(undefined);

  render(<ManageUsers />);
  const row = within(screen.getByRole('table')).getByText(user.name).closest('tr')!;
  fireEvent.click(row);

  const details = screen.getByText('User Account Details').closest('.fixed') as HTMLElement;
  fireEvent.click(within(details).getByRole('button', { name: 'Edit' }));

  await screen.findByRole('heading', { name: 'Edit User Details' });
  expect(screen.queryByText('User Account Details')).not.toBeInTheDocument();
  const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')!;
  expect(within(form).getByRole('button', { name: role })).toBeInTheDocument();

  return { user, form };
}

describe('editing user roles from account details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it.each(['Owner', 'Cashier', 'Pharmacist'] as const)(
    'opens the %s editor and preserves its role when saving account details',
    async (role) => {
      const { user, form } = await openEditFromAccountDetails(role);
      const fields = within(form);
      expect(form.querySelector('input[type="password"]')).toBeNull();
      expect(fields.queryByPlaceholderText('Optional new password...')).not.toBeInTheDocument();
      fireEvent.change(fields.getByLabelText('First Name *'), { target: { value: 'Updated' } });
      fireEvent.change(fields.getByDisplayValue(user.email), { target: { value: 'updated@example.com' } });
      fireEvent.click(fields.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
      expect(updateMock).toHaveBeenCalledWith(user.id, {
        Full_name: 'Updated Account',
        First_name: 'Updated',
        email: 'updated@example.com',
      });
      expect(updateMock.mock.calls[0][1]).not.toHaveProperty('password');
      expect(updateItemMock).toHaveBeenCalledWith(user.id, expect.objectContaining({
        name: 'Updated Account',
        email: 'updated@example.com',
        role,
      }));
      await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit User Details' })).not.toBeInTheDocument());
      expect(refetchMock).not.toHaveBeenCalled();
    },
  );

  it('opens an unrecognized role without silently selecting a different role', async () => {
    await openEditFromAccountDetails('Auditor' as ApiUser['role']);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('shows missing legacy email as blank and permits an address edit without filling unrelated legacy fields', async () => {
    const user: ApiUser = { id: 5, name: 'Legacy Account', username: 'legacy-account', email: '', role: 'Cashier', status: 'Active', address: '' };
    const loaded = { data: [user], loading: false, error: null, addItem: addItemMock, updateItem: updateItemMock, refetch: refetchMock };
    listMock.mockReturnValue(loaded);
    updateMock.mockResolvedValue({ ...user, address: 'New Address' });
    render(<ManageUsers />);
    const table = screen.getByRole('table');
    const row = within(table).getByText('Legacy Account').closest('tr')!;
    expect(row.querySelectorAll('td')[2]).toHaveTextContent('');
    expect(within(table).queryByText('Not provided')).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Legacy Account' }));
    const details = screen.getByRole('dialog', { name: 'User Account Details' });
    expect(within(details).getByText('Email Address').nextElementSibling).toHaveTextContent('');
    fireEvent.click(within(details).getByRole('button', { name: 'Edit' }));
    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')!;
    expect(within(form).getByLabelText('Email Address')).toHaveValue('');
    expect(within(form).getByLabelText('Email Address')).not.toBeRequired();
    fireEvent.change(within(form).getByLabelText('Address'), { target: { value: 'New Address' } });
    fireEvent.submit(form);
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(user.id, { address: 'New Address' }));
  });

  it('filters the four retained account statuses independently', () => {
    const accounts = ['Active', 'Inactive', 'Quarantined', 'Archived'].map((status, index) => ({ id: index + 1, name: `${status} Account`, username: `${status.toLowerCase()}-account`, email: '', role: 'Cashier', status } as ApiUser));
    listMock.mockReturnValue({ data: accounts, loading: false, error: null, addItem: addItemMock, updateItem: updateItemMock, refetch: refetchMock });
    render(<ManageUsers />);
    for (const account of accounts) {
      fireEvent.click(screen.getByRole('button', { name: `${account.status} (1)` }));
      const table = screen.getByRole('table');
      expect(within(table).getByText(account.name)).toBeInTheDocument();
      for (const other of accounts.filter(other => other.id !== account.id)) expect(within(table).queryByText(other.name)).not.toBeInTheDocument();
    }
  });

  it('keeps status read only until Edit and confirms a changed status before saving', async () => {
    const { user, form } = await openEditFromAccountDetails('Owner');
    fireEvent.change(within(form).getByLabelText('Status'), { target: { value: 'Inactive' } });
    fireEvent.submit(form);
    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Confirm User Status Change' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(updateMock).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('button', { name: 'Save Changes' }).closest('form')!);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Status Change' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(user.id, expect.objectContaining({ status: 'Inactive', status_change_confirmed: true })));
    const details = await screen.findByRole('dialog', { name: 'User Account Details' });
    expect(within(details).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(details).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(details).getByText('Inactive')).toBeInTheDocument();
  });

  it('archives and reactivates through explicit confirmations while retaining the account', async () => {
    const { user } = await openEditFromAccountDetails('Cashier');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Test Account' }));
    const details = screen.getByRole('dialog', { name: 'User Account Details' });
    expect(within(details).queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    fireEvent.click(within(details).getByRole('button', { name: 'Archive' }));
    expect(updateMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Status Change' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(user.id, { status: 'Archived', status_change_confirmed: true }));
    const archivedDetails = await screen.findByRole('dialog', { name: 'User Account Details' });
    fireEvent.click(within(archivedDetails).getByRole('button', { name: 'Reactivate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Status Change' }));
    await waitFor(() => expect(updateMock).toHaveBeenLastCalledWith(user.id, { status: 'Active', status_change_confirmed: true }));
    expect(updateItemMock).toHaveBeenCalledTimes(2);
  });

  it('requires separate names, email, contact, and an eight character password when adding a user', async () => {
    listMock.mockReturnValue({ data: [], loading: false, error: null, addItem: addItemMock, updateItem: updateItemMock, refetch: refetchMock });
    render(<ManageUsers />);
    fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
    const form = screen.getByRole('dialog', { name: 'Add New User' }).querySelector('form')!;
    const fields = within(form);
    expect(fields.getByLabelText('Email Address *')).toBeRequired();
    fireEvent.change(fields.getByLabelText('First Name *'), { target: { value: 'Jane' } });
    fireEvent.change(fields.getByLabelText('Middle Name'), { target: { value: 'Marie' } });
    fireEvent.change(fields.getByLabelText('Surname *'), { target: { value: 'Doe' } });
    fireEvent.change(fields.getByLabelText('Contact Number *'), { target: { value: '09123456789' } });
    fireEvent.change(fields.getByLabelText('Email Address *'), { target: { value: 'jane@example.com' } });
    fireEvent.change(fields.getByLabelText('Username *'), { target: { value: 'janedoe' } });
    fireEvent.change(fields.getByLabelText('Password *'), { target: { value: 'Short1!' } });
    fireEvent.submit(form);
    expect(createMock).not.toHaveBeenCalled();
    const created = { id: 10, name: 'Jane Marie Doe', username: 'janedoe', email: 'jane@example.com', role: 'Inventory', status: 'Active' };
    createMock.mockResolvedValue(created);
    addItemMock.mockImplementation(() => listMock.mockReturnValue({ data: [created], loading: false, error: null, addItem: addItemMock, updateItem: updateItemMock, refetch: refetchMock }));
    fireEvent.change(fields.getByLabelText('Password *'), { target: { value: 'Strong1!' } });
    fireEvent.submit(form);
    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ First_name: 'Jane', Middle_name: 'Marie', Surname: 'Doe', email: 'jane@example.com', contact_number: '09123456789', password: 'Strong1!' })));
    expect(await screen.findByText('User added successfully.')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Jane Marie Doe')).toBeInTheDocument();
  });
});
