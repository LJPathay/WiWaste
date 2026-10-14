import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ManageSuppliers } from './ManageSuppliers';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock('../../hooks/useOptimisticList', () => ({
  useOptimisticList: () => ({ data: [], loading: false, error: null, addItem: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn(), refetch: vi.fn() }),
}));
vi.mock('../../services/api', () => ({ suppliers: { list: vi.fn(), create: createMock } }));

beforeEach(() => { createMock.mockReset(); });
afterEach(cleanup);

describe('supplier validation', () => {
  it('requires email and address and limits contact input to eleven digits', () => {
    render(<ManageSuppliers />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Supplier' }));
    expect(screen.getByLabelText('Email Address')).toBeRequired();
    expect(screen.getByLabelText('Address')).toBeRequired();
    const phone = screen.getByLabelText('Phone Number');
    fireEvent.change(phone, { target: { value: '09abc!123456789123' } });
    expect(phone).toHaveValue('09123456789');
    expect(phone).toHaveAttribute('maxlength', '11');
  });

  it('does not submit missing information or an invalid contact number', () => {
    render(<ManageSuppliers />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Supplier' }));
    const name = screen.getByLabelText('Supplier Name');
    const form = name.closest('form')!;
    fireEvent.submit(form);
    expect(createMock).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: 'Valid Supplier' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 's@example.com' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Manila' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '123' } });
    fireEvent.submit(form);
    expect(createMock).not.toHaveBeenCalled();
    expect(screen.getByText('Contact number must contain 7 to 11 digits only.')).toBeInTheDocument();
  });

  it('includes email and address in a valid creation request', async () => {
    createMock.mockResolvedValue({ id: 7, name: 'Valid Supplier', product_count: 0 });
    render(<ManageSuppliers />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Supplier' }));
    fireEvent.change(screen.getByLabelText('Supplier Name'), { target: { value: 'Valid Supplier' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 's@example.com' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Manila' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '09123456789' } });
    fireEvent.submit(screen.getByLabelText('Supplier Name').closest('form')!);
    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ email: 's@example.com', address: 'Manila', contact_number: '09123456789' })));
    expect(await screen.findByText('Supplier "Valid Supplier" added successfully.')).toBeInTheDocument();
  });
});
