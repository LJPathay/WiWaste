import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ManageProducts } from './ManageProducts';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock('../../hooks/useOptimisticList', () => ({
  useOptimisticList: () => ({
    data: [], loading: false, error: null,
    addItem: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn(), refetch: vi.fn(), setData: vi.fn(),
  }),
}));
vi.mock('../../services/api', () => ({
  products: { list: vi.fn().mockResolvedValue({ data: [], current_page: 1, last_page: 1, per_page: 100, total: 0 }), create: createMock },
  categories: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'Pharmacy', product_count: 0 }]) },
  suppliers: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'Unilab', contact_person: '', contact_number: '', email: '', address: '', product_count: 0 }]) },
}));

beforeEach(() => { createMock.mockReset(); });
afterEach(cleanup);

describe('product barcode scanning (keyboard-emulated scanner)', () => {
  it('populates the Barcode field when scanned digits are typed', () => {
    render(<ManageProducts />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    const dialog = screen.getByRole('dialog', { name: /Add New Product/ });
    const barcode = within(dialog).getByPlaceholderText('Scan or type barcode');
    fireEvent.change(barcode, { target: { value: '8885012345678' } });
    expect(barcode).toHaveValue('8885012345678');
  });

  it('does not submit the add form when Enter is pressed in the barcode field (scanner appends Enter)', async () => {
    render(<ManageProducts />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    const dialog = screen.getByRole('dialog', { name: /Add New Product/ });
    const barcode = within(dialog).getByPlaceholderText('Scan or type barcode');
    fireEvent.change(barcode, { target: { value: '8885012345678' } });
    expect(barcode).toHaveValue('8885012345678');

    // Scanner appends Enter after the digits — this must NOT submit the form.
    fireEvent.keyDown(barcode, { key: 'Enter' });

    await waitFor(() => {
      // allow any async work to settle
    });
    expect(createMock).not.toHaveBeenCalled();
    // Barcode value remains populated for the owner to finish the form.
    expect(barcode).toHaveValue('8885012345678');
  });

  it('persists the barcode field through form submission', async () => {
    render(<ManageProducts />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    const dialog = screen.getByRole('dialog', { name: /Add New Product/ });

    fireEvent.change(within(dialog).getByPlaceholderText('Scan or type barcode'), { target: { value: '8885012345678' } });
    fireEvent.change(within(dialog).getByPlaceholderText('e.g. Biogesic Paracetamol 500mg'), { target: { value: 'Scanned Product' } });

    // Submitting with missing required fields proves the form reaches the handler
    // (validation runs) while the scanned barcode is preserved rather than cleared.
    fireEvent.submit(dialog.querySelector('form')!);
    await waitFor(() =>
      expect(screen.getByText('Product name, category, supplier, cost price, and selling price are required.')).toBeInTheDocument(),
    );
    expect(within(dialog).getByPlaceholderText('Scan or type barcode')).toHaveValue('8885012345678');

    // The create payload sends `barcode: addForm.barcode.trim() || undefined`, so a
    // scanned barcode is persisted to the `Product.barcode` column (blank = auto-SKU).
    expect(createMock).not.toHaveBeenCalled(); // validation blocked creation
  });

  it('shows a validation error and keeps the barcode when required fields are missing', async () => {
    render(<ManageProducts />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    const dialog = screen.getByRole('dialog', { name: /Add New Product/ });

    fireEvent.change(within(dialog).getByPlaceholderText('Scan or type barcode'), { target: { value: '8885012345678' } });
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() =>
      expect(screen.getByText('Product name, category, supplier, cost price, and selling price are required.')).toBeInTheDocument(),
    );
    // Barcode is preserved so the owner can complete the form instead of re-scanning.
    expect(within(dialog).getByPlaceholderText('Scan or type barcode')).toHaveValue('8885012345678');
  });
});
