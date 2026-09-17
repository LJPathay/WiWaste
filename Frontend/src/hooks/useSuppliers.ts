import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliers, type CreateSupplierPayload } from '../services/api';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliers.list(),
  });
}

export function useSupplierDetail(id: number) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliers.show(id),
    enabled: !!id,
  });
}

export function useSupplierCompliance() {
  return useQuery({
    queryKey: ['suppliers', 'compliance'],
    queryFn: () => suppliers.compliance(),
  });
}

export function useSupplierAlerts(days = 30) {
  return useQuery({
    queryKey: ['suppliers', 'alerts', days],
    queryFn: () => suppliers.alerts(days),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierPayload) => suppliers.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSupplierPayload> }) =>
      suppliers.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => suppliers.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
