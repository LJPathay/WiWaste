import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { POSTerminal } from '../../pages/cashier/POSTerminal';
import { products as productsApi, sales as salesApi } from '../../services/api';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 7, email: 'cashier@wiwaste.test', name: 'Cashier', role: 'cashier', apiRole: 'Cashier' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  products: {
    list: vi.fn(),
    lookup: vi.fn(),
  },
  sales: {
    create: vi.fn(),
  },
}));

const listMock = vi.mocked(productsApi.list);
const lookupMock = vi.mocked(productsApi.lookup);
const createMock = vi.mocked(salesApi.create);

/** ApiProduct shape accepted by apiProductToCashier(). */
const paracetamol = {
  id: 1,
  sku: '123456',
  name: 'Paracetamol 500mg',
  category: 'pharma',
  supplier: 'watsons',
  cost_price: 6,
  selling_price: 10.5,
  reorder_level: 20,
  stock: 100,
};

const ibuprofen = {
  ...paracetamol,
  id: 2,
  sku: '789012',
  name: 'Ibuprofen 200mg',
  selling_price: 15,
  stock: 50,
};

const EMPTY_CART = 'No items in current transaction.';

function renderPOS() {
  return render(
    <MemoryRouter>
      <POSTerminal />
    </MemoryRouter>,
  );
}

/** Types a barcode into the scan field and commits it with Enter. */
async function scan(code: string) {
  const input = screen.getByPlaceholderText(/scan barcode/i);
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  listMock.mockResolvedValue({ data: [paracetamol, ibuprofen], current_page: 1, last_page: 1, per_page: 50, total: 2 } as never);
  lookupMock.mockResolvedValue(paracetamol as never);
  createMock.mockResolvedValue({ transaction_id: 'TXN-001' } as never);
});

describe('POS cart', () => {
  it('starts with an empty cart', () => {
    renderPOS();
    expect(screen.getByText(EMPTY_CART)).toBeInTheDocument();
  });

  it('adds a scanned product to the cart', async () => {
    renderPOS();

    await scan('123456');

    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith('123456'));
    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('increments the quantity when the same barcode is scanned twice', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument());

    await scan('123456');

    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('1')).not.toBeInTheDocument();
  });

  it('keeps separate cart lines for different barcodes', async () => {
    lookupMock.mockImplementation((code) =>
      Promise.resolve(code === '123456' ? (paracetamol as never) : (ibuprofen as never)),
    );
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument());

    await scan('789012');

    await waitFor(() => expect(screen.getAllByDisplayValue('1')).toHaveLength(2));
  });

  it('removes the cart line when its quantity is set to 0', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '0' } });

    await waitFor(() => expect(screen.getByText(EMPTY_CART)).toBeInTheDocument());
  });

  it('increments quantity from the + button', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    const qtyRow = screen.getByDisplayValue('1').closest('div') as HTMLElement;
    // [0] is the "−" decrement button, [1] is the "+" increment button.
    const [, plusButton] = within(qtyRow).getAllByRole('button');

    fireEvent.click(plusButton);

    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument());
  });

  it('never lets a cart line exceed available stock', async () => {
    lookupMock.mockResolvedValue({ ...paracetamol, stock: 2 } as never);
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    await scan('123456');
    await scan('123456');

    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('3')).not.toBeInTheDocument();
  });

  it('completes a cash checkout and persists the sale via the API', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    // Proceed to checkout.
    fireEvent.click(screen.getByRole('button', { name: /Proceed to Checkout/ }));

    // Amount due and tendered input should be visible.
    expect(screen.getByText('Amount Due', { exact: true })).toBeInTheDocument();
    const tendered = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    fireEvent.change(tendered, { target: { value: '20' } });

    // Complete payment should call the API once.
    fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));

    const payload = createMock.mock.calls[0][0];
    expect(payload.payment_method).toBe('Cash');
    expect(payload.amount_tendered).toBe(20);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].product_id).toBe(1);
    expect(payload.items[0].quantity).toBe(1);
  });

  it('prevents duplicate checkout submissions on rapid double-click', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Proceed to Checkout/ }));

    const tendered = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    fireEvent.change(tendered, { target: { value: '20' } });

    const complete = screen.getByRole('button', { name: 'Complete Payment' });
    fireEvent.click(complete);
    fireEvent.click(complete); // rapid second click — must be ignored

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
  });

  it('refuses checkout when the cart is empty', async () => {
    renderPOS();

    fireEvent.click(screen.getByRole('button', { name: /Proceed to Checkout/ }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('refuses cash checkout when tendered is below the total', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Proceed to Checkout/ }));

    const tendered = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    fireEvent.change(tendered, { target: { value: '1' } });

    const complete = screen.getByRole('button', { name: 'Complete Payment' });
    expect(complete).toBeDisabled();
    expect(createMock).not.toHaveBeenCalled();
  });
});