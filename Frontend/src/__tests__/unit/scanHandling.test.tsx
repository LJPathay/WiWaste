import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { POSTerminal } from '../../pages/cashier/POSTerminal';
import { products as productsApi } from '../../services/api';
import { cashierProducts } from '../../utils/cashierData';

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

/** Seeded from src/utils/cashierData.ts — matched locally, no API round-trip. */
const LOCAL_PRODUCT = cashierProducts[0];

const EMPTY_CART = 'No items in current transaction.';

function renderPOS() {
  return render(
    <MemoryRouter>
      <POSTerminal />
    </MemoryRouter>,
  );
}

function scanField() {
  return screen.getByPlaceholderText(/scan barcode/i) as HTMLInputElement;
}

async function scanViaField(code: string) {
  const input = scanField();
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  listMock.mockResolvedValue({ data: [], current_page: 1, last_page: 1, per_page: 50, total: 0 } as never);
  lookupMock.mockRejectedValue(new Error('404 not found'));
});

describe('Barcode scan handling', () => {
  it('resolves a barcode from the local catalog without calling the API', async () => {
    renderPOS();

    await scanViaField(LOCAL_PRODUCT.barcode);

    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument());
    expect(lookupMock).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('falls back to productsApi.lookup for an unknown barcode', async () => {
    const remote = { id: 9, sku: '999999999', name: 'Remote Vitamin C', category: 'pharma', supplier: 'acme', cost_price: 5, selling_price: 12, reorder_level: 10, stock: 30 };
    lookupMock.mockResolvedValue(remote as never);
    renderPOS();

    await scanViaField('999999999');

    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith('999999999'));
    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument());
  });

  it('surfaces a "not found" toast and leaves the cart empty', async () => {
    renderPOS();

    await scanViaField('000000');

    await waitFor(() => expect(screen.getByText(/Product not found: 000000/)).toBeInTheDocument());
    expect(screen.getByText(EMPTY_CART)).toBeInTheDocument();
  });

  it('keeps the PLU buffer hidden until digits are typed outside the search field', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    expect(screen.queryByText(/^PLU:/)).not.toBeInTheDocument();

    scanField().blur();
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: '0' });
    fireEvent.keyDown(document, { key: '0' });

    expect(screen.getByText('PLU: 100')).toBeInTheDocument();
  });

  it('auto-submits the PLU buffer once the entry timeout elapses', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    scanField().blur();
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: '0' });
    fireEvent.keyDown(document, { key: '0' });
    fireEvent.keyDown(document, { key: '1' });

    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument(), { timeout: 2000 });
    expect(lookupMock).not.toHaveBeenCalledWith('1001');
  });

  it('submits the PLU buffer immediately when Enter is pressed', async () => {
    localStorage.setItem('pos_hotkeys_enabled', 'true');
    renderPOS();

    scanField().blur();
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: '0' });
    fireEvent.keyDown(document, { key: '0' });
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: 'Enter' });

    await waitFor(() => expect(screen.queryByText(EMPTY_CART)).not.toBeInTheDocument());
    expect(screen.queryByText(/^PLU:/)).not.toBeInTheDocument();
  });

  it('refocuses the scan field after a successful lookup', async () => {
    renderPOS();
    const input = scanField();

    await scanViaField(LOCAL_PRODUCT.barcode);

    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('clears the search field after a scan so the next item starts clean', async () => {
    renderPOS();

    await scanViaField(LOCAL_PRODUCT.barcode);

    await waitFor(() => expect(scanField()).toHaveValue(''));
  });
});