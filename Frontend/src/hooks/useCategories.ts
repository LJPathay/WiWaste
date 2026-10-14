import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categories } from '../services/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => categories.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => categories.update(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// `useDeleteCategory` was removed. It called `categories.delete`, which the `categories`
// API object never had -- it exposes `archive` -- so invoking the hook would have thrown
// "categories.delete is not a function". Nothing imported it, and categories are retired
// through `archive` rather than hard-deleted, so there was nothing to repair.
