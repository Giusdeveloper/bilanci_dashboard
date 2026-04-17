import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { supabase, Company, User as AppUser } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Building2, Shield, Trash2, Key, RefreshCw } from "lucide-react";

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const { companies, createCompany, loadCompanies } = useFinancialData();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const { toast } = useToast();

  // Form states
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "client">("client");
  const [newUserCompany, setNewUserCompany] = useState<string>("");
  const [newCompanyName, setNewCompanyName] = useState("");

  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("bilanci_users")
        .select("*")
        .order("email");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Errore nel caricamento utenti",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName) return;

    setIsSubmittingCompany(true);
    try {
      const company = await createCompany(newCompanyName);
      if (company) {
        toast({
          title: "Azienda creata",
          description: `L'azienda ${newCompanyName} è stata creata con successo.`,
        });
        setNewCompanyName("");
        setIsAddingCompany(false);
        await loadCompanies();
      }
    } catch (error: any) {
      toast({
        title: "Errore creazione azienda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;

    setIsSubmittingUser(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: userError } = await supabase
          .from("bilanci_users")
          .insert({
            id: authData.user.id,
            email: newUserEmail,
            role: newUserRole,
            company_id: newUserRole === "client" ? newUserCompany : null,
          });

        if (userError) throw userError;

        toast({
          title: "Utente creato",
          description: `L'utente ${newUserEmail} è stato creato con successo.`,
        });

        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("client");
        setNewUserCompany("");
        setIsAddingUser(false);
        fetchUsers();
      }
    } catch (error: any) {
      toast({
        title: "Errore creazione utente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${email}?`)) return;

    try {
      const { error } = await supabase
        .from("bilanci_users")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Utente eliminato",
        description: `Il record dell'utente ${email} è stato rimosso.`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Errore eliminazione utente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Accesso Negato</h2>
          <p className="text-muted-foreground">Solo gli amministratori possono accedere a questa pagina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni Piattaforma</h1>
          <p className="text-muted-foreground">Gestisci le aziende e gli accessi degli utenti.</p>
        </div>
        <Button variant="outline" onClick={() => { fetchUsers(); loadCompanies(); }} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Aggiorna
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Utenti
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Aziende
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestione Utenti</CardTitle>
                <CardDescription>Crea nuovi account e assegnali alle aziende.</CardDescription>
              </div>
              <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuovo Utente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                    <DialogDescription>
                      Inserisci le credenziali e assegna un ruolo all'utente.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@esempio.it"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimo 6 caratteri"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Ruolo</Label>
                      <Select 
                        value={newUserRole} 
                        onValueChange={(val: any) => setNewUserRole(val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona ruolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente (Azienda Specifica)</SelectItem>
                          <SelectItem value="admin">Amministratore (Tutto)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newUserRole === "client" && (
                      <div className="space-y-2">
                        <Label htmlFor="company">Azienda</Label>
                        <Select 
                          value={newUserCompany} 
                          onValueChange={setNewUserCompany}
                          required={newUserRole === "client"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona azienda" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmittingUser} className="w-full">
                        {isSubmittingUser ? "Creazione..." : "Crea Utente"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Azienda Assegnata</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Caricamento utenti...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nessun utente trovato.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            u.role === "admin" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {u.role === "admin" ? "ADMIN" : "CLIENT"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {u.role === "admin" 
                            ? "Tutte le aziende" 
                            : (companies.find(c => c.id === u.company_id)?.name || "Nessuna")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={u.email === user?.email}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestione Aziende</CardTitle>
                <CardDescription>Visualizza e aggiungi nuove aziende alla piattaforma.</CardDescription>
              </div>
              <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuova Azienda
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aggiungi Nuova Azienda</DialogTitle>
                    <DialogDescription>
                      Inserisci il nome della società. Lo slug verrà generato automaticamente.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCompany} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Azienda</Label>
                      <Input
                        id="name"
                        placeholder="Es. Nuova Azienda Srl"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmittingCompany} className="w-full">
                        {isSubmittingCompany ? "Creazione..." : "Crea Azienda"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Data Creazione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.slug}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                      <TableCell className="text-right text-xs">
                        {new Date(c.created_at).toLocaleDateString('it-IT')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
            <Key className="w-4 h-4" /> Nota Operativa
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700 space-y-2">
          <p>
            Per configurare un nuovo cliente:
          </p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Crea prima l'azienda nella scheda <strong>Aziende</strong>.</li>
            <li>Crea l'utente nella scheda <strong>Utenti</strong> e assegnalo all'azienda appena creata.</li>
            <li>Invia le credenziali al cliente.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
