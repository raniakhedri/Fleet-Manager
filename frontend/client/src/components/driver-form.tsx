import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDriverSchema } from "@shared/schema";
import { useCreateDriver, useUpdateDriver } from "@/hooks/use-drivers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { z } from "zod";

// Local form type to avoid complex type inference issues
type DriverFormData = z.infer<typeof insertDriverSchema>;

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

  const isEditing = !!driver;

  const form = useForm<DriverFormData>({
    resolver: zodResolver(insertDriverSchema) as any,
    defaultValues: driver ? {
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : null,
      status: driver.status as "active" | "inactive" | "on_leave",
      assignedVehicleId: driver.assignedVehicleId || null,
    } : {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      licenseNumber: "",
      status: "active",
      licenseExpiry: null,
      assignedVehicleId: null,
    },
  });

  const onSubmit = async (data: DriverFormData) => {
    try {
      if (isEditing && driver) {
        await updateMutation.mutateAsync({ id: driver.id, ...data });
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
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="+33 6 12 34 56 78" 
                      {...field} 
                      autoComplete="tel"
                      minLength={8}
                    />
                  </FormControl>
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
                  <FormLabel>Date d'Expiration du Permis (Optionnel)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={
                        field.value 
                          ? (typeof field.value === 'string' 
                              ? field.value 
                              : new Date(field.value).toISOString().split('T')[0])
                          : ''
                      }
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
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
