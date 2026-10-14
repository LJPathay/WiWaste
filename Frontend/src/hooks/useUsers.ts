import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { users, type CreateUserPayload, type UpdateUserPayload } from '../services/api';

export function useUsers(page = 1) {
  return useQuery({
    queryKey: ['users', page],
    queryFn: () => users.list(page),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => users.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) =>
      users.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => users.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useQuarantineUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => users.quarantine(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => users.reactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
