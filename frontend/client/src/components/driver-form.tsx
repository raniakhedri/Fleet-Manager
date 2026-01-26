import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDriver, useUpdateDriver } from "@/hooks/use-drivers";
import { useVehicles } from "@/hooks/use-vehicles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Loader2, Car, AlertTriangle } from "lucide-react";
import { z } from "zod";

// Custom form schema with strict validation
const driverFormSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(50, "Prénom trop long"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50, "Nom trop long"),
  email: z.string().email("Adresse email invalide"),
  phoneNumber: z.string().regex(/^\d{8}$/, "Le numéro de téléphone doit contenir exactement 8 chiffres"),
  licenseNumber: z.string().min(5, "Numéro de permis doit contenir au moins 5 caractères").max(30, "Numéro de permis trop long"),
  licenseExpiry: z.string().min(1, "La date d'expiration du permis est requise").refine((date) => {
    const expiryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate >= today;
  }, "Le permis ne peut pas être expiré"),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  assignedVehicleId: z.number({ required_error: "Le véhicule assigné est requis" }).min(1, "Vous devez assigner un véhicule"),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

type Driver = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  licenseExpiry?: Date | null;
  status: string;
  assignedVehicleId?: number | null;
};

interface DriverFormProps {
  driver?: Driver;
  trigger?: React.ReactNode;
}

export function DriverForm({ driver, trigger }: DriverFormProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const { data: vehicles = [] } = useVehicles();

  // Filter available vehicles (active and not already assigned to another driver)
  const availableVehicles = vehicles.filter(v => 
    v.status === "active" || v.status === "maintenance" || 
    (driver && v.currentDriverId === driver.id) // Include current driver's vehicle when editing
  );

  const isEditing = !!driver;

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: driver ? {
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : "",
      status: driver.status as "active" | "inactive" | "on_leave",
      assignedVehicleId: driver.assignedVehicleId || undefined,
    } : {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      licenseNumber: "",
      status: "active",
      licenseExpiry: "",
      assignedVehicleId: undefined,
    },
  });

  const onSubmit = async (data: DriverFormData) => {
    try {
      const submitData = {
        ...data,
        licenseExpiry: data.licenseExpiry || null,
      };
      
      if (isEditing && driver) {
        await updateMutation.mutateAsync({ id: driver.id, ...submitData });
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
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800 shadow-lg shadow-crimson-200">
            <Plus className="w-4 h-4" /> Ajouter un Chauffeur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le Chauffeur" : "Ajouter un Nouveau Chauffeur"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Jean" 
                        {...field} 
                        autoComplete="given-name"
                        minLength={2}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Dupont" 
                        {...field} 
                        autoComplete="family-name"
                        minLength={2}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="jean.dupont@exemple.com" 
                      {...field} 
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone *</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="12345678" 
                      {...field} 
                      autoComplete="tel"
                      maxLength={8}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-slate-500">8 chiffres requis</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de Permis</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="P123456" 
                        {...field}
                        minLength={5}
                        maxLength={30}
                      />
                    </FormControl>
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
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="on_leave">En Congé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="licenseExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Date d'Expiration du Permis *
                    {field.value && new Date(field.value) < new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) && (
                      <AlertTriangle className="w-4 h-4 text-gold-600" />
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </FormControl>
                  {field.value && new Date(field.value) < new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) && (
                    <p className="text-xs text-gold-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Le permis expire bientôt!
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedVehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-crimson-600" />
                    Véhicule Assigné *
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un véhicule (requis)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableVehicles.length === 0 ? (
                        <SelectItem value="none" disabled>Aucun véhicule disponible</SelectItem>
                      ) : (
                        availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.name} - {vehicle.licensePlate} ({vehicle.model})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Le véhicule assigné par défaut au chauffeur
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>{isEditing ? "Mettre à Jour le Chauffeur" : "Créer le Chauffeur"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
