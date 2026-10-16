import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const EMPTY_CART_TESTID = 'cart-empty';

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
    expect(screen.getByTestId(EMPTY_CART_TESTID)).toBeInTheDocument();
  });

  it('adds a scanned product to the cart', async () => {
    renderPOS();

    await scan('123456');

    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith('123456'));
    await waitFor(() => expect(screen.queryByTestId(EMPTY_CART_TESTID)).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('increments the quantity when the same barcode is scanned twice', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.queryByTestId(EMPTY_CART_TESTID)).not.toBeInTheDocument());

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
    await waitFor(() => expect(screen.queryByTestId(EMPTY_CART_TESTID)).not.toBeInTheDocument());

    await scan('789012');

    await waitFor(() => expect(screen.getAllByDisplayValue('1')).toHaveLength(2));
  });

  it('removes the cart line when its quantity is set to 0', async () => {
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '0' } });

    await waitFor(() => expect(screen.getByTestId(EMPTY_CART_TESTID)).toBeInTheDocument());
  });

  it('raises the quantity of the selected line with the + key', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    // Keyboard-only path: Tab selects the first cart line, + bumps its quantity.
    (screen.getByPlaceholderText(/scan barcode/i) as HTMLInputElement).blur();
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.keyDown(document, { key: '+' });

    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument());
  });

  it('lowers the quantity with the - key and drops the line at zero', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    (screen.getByPlaceholderText(/scan barcode/i) as HTMLInputElement).blur();
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.keyDown(document, { key: '-' });

    await waitFor(() => expect(screen.getByTestId(EMPTY_CART_TESTID)).toBeInTheDocument());
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
    // Checkout is keyboard-only now, so hotkeys must be on before mounting.
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    // Proceed to checkout with the F4 shortcut.
    fireEvent.keyDown(document, { key: 'F4' });

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
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'F4' });

    const tendered = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    fireEvent.change(tendered, { target: { value: '20' } });

    const complete = screen.getByRole('button', { name: 'Complete Payment' });
    fireEvent.click(complete);
    fireEvent.click(complete); // rapid second click — must be ignored

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
  });

  it('refuses checkout when the cart is empty', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    // F4 is a no-op with an empty cart: no payment step, no sale.
    fireEvent.keyDown(document, { key: 'F4' });

    expect(screen.queryByText('Amount Due', { exact: true })).not.toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('refuses cash checkout when tendered is below the total', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    await scan('123456');
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'F4' });

    const tendered = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    fireEvent.change(tendered, { target: { value: '1' } });

    const complete = screen.getByRole('button', { name: 'Complete Payment' });
    expect(complete).toBeDisabled();
    expect(createMock).not.toHaveBeenCalled();
  });
});