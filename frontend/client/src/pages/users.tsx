import { useUsers, useUpdateUserRole, useDeleteUser } from "@/hooks/use-users";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, UserCircle, Users, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "superadmin" | "operateur" | "chauffeur";

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Super Admin",
  operateur: "Opérateur",
  chauffeur: "Chauffeur",
};

const ROLE_COLORS: Record<AppRole, string> = {
  superadmin: "bg-purple-500/15 text-purple-700 hover:bg-purple-500/25",
  operateur: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25",
  chauffeur: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
};

function normalizeRole(role?: string): AppRole {
  if (!role) return "chauffeur";
  if (role === "admin") return "superadmin";
  if (role === "user" || role === "driver") return "chauffeur";
  return role as AppRole;
}

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUser();

  // Get current user id to prevent self-modification
  const currentUserStr = localStorage.getItem("user");
  const currentUserId = currentUserStr ? JSON.parse(currentUserStr).id : null;

  const handleRoleChange = (userId: number, newRole: AppRole) => {
    updateRoleMutation.mutate({ id: userId, role: newRole });
  };

  const handleDelete = (userId: number) => {
    deleteMutation.mutate(userId);
  };

  const getRoleBadge = (role: string) => {
    const normalized = normalizeRole(role);
    return (
      <Badge className={`border-0 font-medium ${ROLE_COLORS[normalized]}`}>
        <Shield className="w-3 h-3 mr-1" />
        {ROLE_LABELS[normalized]}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Gestion des Utilisateurs</h1>
          <p className="text-slate-500 mt-2">
            Gérez les rôles et les accès de tous les utilisateurs du système.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="w-5 h-5" />
          <span>{users?.length || 0} utilisateur(s)</span>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-crimson-500" />
            Liste des Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun utilisateur trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Utilisateur</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Rôle actuel</TableHead>
                    <TableHead className="font-semibold">Changer le rôle</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => {
                    const isSelf = user.id === currentUserId;
                    const role = normalizeRole(user.role);
                    return (
                      <TableRow key={user.id} className={isSelf ? "bg-gold-50/50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-crimson-500 to-crimson-600 flex items-center justify-center border-2 border-gold-300/50 shadow">
                              <span className="font-bold text-white text-sm">
                                {user.username?.[0]?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.username}</p>
                              {isSelf && (
                                <span className="text-xs text-gold-600 font-medium">Vous</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {isSelf ? (
                            <span className="text-xs text-slate-400 italic">Non modifiable</span>
                          ) : (
                            <Select
                              value={role}
                              onValueChange={(val) => handleRoleChange(user.id, val as AppRole)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[160px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                                <SelectItem value="operateur">Opérateur</SelectItem>
                                <SelectItem value="chauffeur">Chauffeur</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Confirmer la suppression
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{user.username}</strong> ?
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDelete(user.id)}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
