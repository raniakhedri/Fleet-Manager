import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMissionSchema } from "@shared/schema";
import { useCreateMission, useUpdateMission } from "@/hooks/use-missions";
import { useVehicles } from "@/hooks/use-vehicles";
import { useDrivers } from "@/hooks/use-drivers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/location-picker";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Local form type to avoid complex type inference issues
type MissionFormData = z.infer<typeof insertMissionSchema>;

type Mission = {
  id: number;
  vehicleId: number;
  driverId: number;
  title: string;
  description: string | null;
  endLocation: string;
  status: string;
  priority: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  [key: string]: any;
};

interface MissionFormProps {
  mission?: Mission;
  trigger?: React.ReactNode;
}

export function MissionForm({ mission, trigger }: MissionFormProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateMission();
  const updateMutation = useUpdateMission();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const isEditing = !!mission;

  const form = useForm<MissionFormData>({
    resolver: zodResolver(insertMissionSchema) as any,
    defaultValues: mission ? {
      vehicleId: mission.vehicleId,
      driverId: mission.driverId,
      title: mission.title,
      description: mission.description || "",
      endLocation: mission.endLocation,
      status: mission.status as any,
      priority: mission.priority as any,
      scheduledStart: mission.scheduledStart ? new Date(mission.scheduledStart).toISOString().slice(0, 16) : null,
      scheduledEnd: mission.scheduledEnd ? new Date(mission.scheduledEnd).toISOString().slice(0, 16) : null,
    } : {
      vehicleId: 0,
      driverId: 0,
      title: "",
      description: "",
      endLocation: "",
      status: "pending",
      priority: "normal",
      scheduledStart: null,
      scheduledEnd: null,
    },
  });

  const onSubmit = async (data: MissionFormData) => {
    try {
      // Clean up the data - remove fields that aren't needed or are empty strings
      const submitData: any = {
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        title: data.title,
        endLocation: data.endLocation,
        status: data.status,
        priority: data.priority,
      };

      // Add optional fields only if they have values
      if (data.description) submitData.description = data.description;
      if (data.scheduledStart) submitData.scheduledStart = data.scheduledStart;
      if (data.scheduledEnd) submitData.scheduledEnd = data.scheduledEnd;

      if (isEditing && mission) {
        await updateMutation.mutateAsync({ id: mission.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
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
        {trigger || <Button>Ajouter une Mission</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la Mission" : "Créer une Nouvelle Mission"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Mettez à jour les détails de la mission ci-dessous." : "Remplissez les détails pour créer une nouvelle mission."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de la Mission</FormLabel>
                  <FormControl>
                    <Input placeholder="Livraison à Paris" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optionnel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Détails de la mission..." 
                      {...field} 
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Véhicule</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un véhicule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.name} ({vehicle.licensePlate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chauffeur</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un chauffeur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>
                            {driver.firstName} {driver.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <LocationPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Sélectionner la destination"
                      label="Choisir la destination"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la priorité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="pending">En Attente</SelectItem>
                        <SelectItem value="in_progress">En Cours</SelectItem>
                        <SelectItem value="completed">Terminée</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début Prévu (Optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        value={
                          field.value 
                            ? (typeof field.value === 'string' 
                                ? field.value 
                                : new Date(field.value).toISOString().slice(0, 16))
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin Prévue (Optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        value={
                          field.value 
                            ? (typeof field.value === 'string' 
                                ? field.value 
                                : new Date(field.value).toISOString().slice(0, 16))
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending}
              >
                {isPending ? "Enregistrement..." : isEditing ? "Mettre à Jour la Mission" : "Créer la Mission"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
