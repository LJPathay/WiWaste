import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products, type PaginatedResponse, type ApiProduct, type CreateProductPayload } from '../services/api';

export function useProducts(params?: { search?: string; category_id?: number; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => products.list(params),
  });
}

export function useProductLookup(code: string) {
  return useQuery({
    queryKey: ['product', code],
    queryFn: () => products.lookup(code),
    enabled: !!code,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductPayload) => products.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateProductPayload> }) =>
      products.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => products.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
