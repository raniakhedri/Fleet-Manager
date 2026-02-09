import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertDriver } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:3000/api");
  const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
  return `${baseUrl}${cleanPath}`;
}

export function useDrivers() {
  return useQuery({
    queryKey: [api.drivers.list.path],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.drivers.list.path), { 
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return api.drivers.list.responses[200].parse(await res.json());
    },
  });
}

export function useDriver(id: number) {
  return useQuery({
    queryKey: [api.drivers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.drivers.get.path, { id });
      const res = await fetch(getApiUrl(url), { 
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch driver");
      return api.drivers.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertDriver) => {
      const validated = api.drivers.create.input.parse(data);
      const res = await fetch(getApiUrl(api.drivers.create.path), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create driver");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.drivers.list.path] });
      
      // Check if email was sent or if we need to show the password
      if (data.temporaryPassword) {
        toast({
          title: "Chauffeur créé",
          description: `Email non envoyé. Mot de passe temporaire : ${data.temporaryPassword}`,
          duration: 30000, // Show for 30 seconds
        });
      } else {
        toast({
          title: "Succès",
          description: "Chauffeur ajouté. Un email avec les identifiants a été envoyé.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertDriver>) => {
      const url = buildUrl(api.drivers.update.path, { id });
      const res = await fetch(getApiUrl(url), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update driver");
      return api.drivers.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.drivers.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.drivers.get.path, variables.id] });
      toast({
        title: "Updated",
        description: "Driver information updated",
      });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.drivers.delete.path, { id });
      const res = await fetch(getApiUrl(url), { 
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete driver");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.drivers.list.path] });
      toast({
        title: "Deleted",
        description: "Driver removed",
      });
    },
  });
}
