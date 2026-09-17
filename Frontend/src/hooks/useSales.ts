import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sales, type CreateSalePayload } from '../services/api';

export function useSalesList(params?: { search?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => sales.list(params),
  });
}

export function useSaleDetail(id: number) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => sales.show(id),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalePayload) => sales.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSaleReceipt(id: number) {
  return useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => sales.receipt(id),
    enabled: !!id,
  });
}
