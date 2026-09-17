import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventory, type ApiInventory, type ApiStockMovement } from '../services/api';

export function useInventoryList(params?: { search?: string; status?: string; page?: number }) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => inventory.list(params),
  });
}

export function useStockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { product_id: number; quantity: number; remarks?: string }) =>
      inventory.stockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useStockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { product_id: number; quantity: number; remarks?: string }) =>
      inventory.stockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useInventoryMovements(id: number) {
  return useQuery({
    queryKey: ['inventory-movements', id],
    queryFn: () => inventory.movements(id),
    enabled: !!id,
  });
}

export function useAllMovements(params?: {
  search?: string;
  movement_type?: string;
  from_date?: string;
  to_date?: string;
  product_id?: number;
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: ['all-movements', params],
    queryFn: () => inventory.allMovements(params),
  });
}
