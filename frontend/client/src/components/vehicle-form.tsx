import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type InsertVehicle, type Vehicle } from "@shared/schema";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

interface VehicleFormProps {
  vehicle?: Vehicle;
  trigger?: React.ReactNode;
}

export function VehicleForm({ vehicle, trigger }: VehicleFormProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const isEditing = !!vehicle;

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: vehicle ? {
      name: vehicle.name,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate,
      status: vehicle.status,
      fuelLevel: vehicle.fuelLevel,
      lat: vehicle.lat || 0,
      lng: vehicle.lng || 0,
    } : {
      name: "",
      model: "",
      licensePlate: "",
      status: "active",
      fuelLevel: 100,
      lat: 48.8566, // Default Paris
      lng: 2.3522,
    },
  });

  const onSubmit = async (data: InsertVehicle) => {
    try {
      if (isEditing && vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" /> Ajouter un Véhicule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le Véhicule" : "Ajouter un Nouveau Véhicule"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Véhicule</FormLabel>
                  <FormControl>
                    <Input placeholder="Camion #1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle</FormLabel>
                    <FormControl>
                      <Input placeholder="Ford Transit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plaque d'Immatriculation</FormLabel>
                    <FormControl>
                      <Input placeholder="AB-123-CD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuelLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau de Carburant (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer le Véhicule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
