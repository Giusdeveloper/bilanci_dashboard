import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PageHeader from "@/components/PageHeader";
import { Github, Copy, CheckCircle2 } from "lucide-react";

interface GitHubUser {
  username: string;
  name: string;
  avatar: string;
}

export default function GitHubSync() {
  const { toast } = useToast();
  const [repoName, setRepoName] = useState("awentia-bilanci");
  const [description, setDescription] = useState("Awentia Bilanci - Financial Dashboard Application");
  const [isPrivate, setIsPrivate] = useState(false);
  const [createdRepo, setCreatedRepo] = useState<any>(null);

  const { data: user, isLoading: userLoading } = useQuery<GitHubUser>({
    queryKey: ['/api/github/user'],
  });

  const createRepoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/github/create-repo', { name: repoName, description, isPrivate });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedRepo(data);
      toast({
        title: "Repository creato!",
        description: `Il repository ${repoName} è stato creato con successo su GitHub.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/github/repos'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare il repository",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiato!",
      description: "Comando copiato negli appunti",
    });
  };

  const gitCommands = createdRepo ? [
    "# Inizializza git (se non già fatto)",
    "git init",
    "",
    "# Aggiungi tutti i file",
    "git add .",
    "",
    "# Crea il primo commit",
    'git commit -m "Initial commit: Awentia Bilanci Dashboard"',
    "",
    "# Collega al repository GitHub",
    `git remote add origin ${createdRepo.cloneUrl}`,
    "",
    "# Pusha il codice",
    "git branch -M main",
    "git push -u origin main",
  ].join('\n') : '';

  return (
    <div data-testid="page-github-sync">
      <PageHeader 
        title="Sincronizza con GitHub" 
        subtitle="Trasferisci l'applicazione su un repository GitHub"
      />

      <div className="space-y-6">
        {/* User Info Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Github className="w-12 h-12 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Account GitHub Connesso</h3>
              {userLoading ? (
                <p className="text-sm text-muted-foreground">Caricamento...</p>
              ) : user ? (
                <p className="text-sm text-muted-foreground">
                  Connesso come <span className="font-medium text-foreground">@{user.username}</span>
                </p>
              ) : (
                <p className="text-sm text-destructive">Non connesso</p>
              )}
            </div>
          </div>
        </Card>

        {/* Create Repository Card */}
        {!createdRepo ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Crea Nuovo Repository</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="repo-name">Nome Repository</Label>
                <Input
                  id="repo-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="awentia-bilanci"
                  data-testid="input-repo-name"
                />
              </div>

              <div>
                <Label htmlFor="repo-description">Descrizione</Label>
                <Input
                  id="repo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrizione del repository"
                  data-testid="input-repo-description"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-private"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                  data-testid="checkbox-private"
                />
                <Label
                  htmlFor="is-private"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Repository privato
                </Label>
              </div>

              <Button
                onClick={() => createRepoMutation.mutate()}
                disabled={createRepoMutation.isPending || !repoName}
                className="w-full"
                data-testid="button-create-repo"
              >
                {createRepoMutation.isPending ? "Creazione..." : "Crea Repository"}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Success Card */}
            <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    Repository Creato!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Il repository è stato creato con successo su GitHub
                  </p>
                  <a
                    href={createdRepo.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    {createdRepo.repoUrl} →
                  </a>
                </div>
              </div>
            </Card>

            {/* Git Commands Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Comandi Git</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(gitCommands)}
                  data-testid="button-copy-commands"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copia Tutto
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{gitCommands}</pre>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">📝 Istruzioni:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Apri il terminale di Replit (Shell)</li>
                  <li>Copia e incolla i comandi qui sopra</li>
                  <li>Esegui ogni comando in sequenza</li>
                  <li>Il tuo codice sarà caricato su GitHub!</li>
                </ol>
              </div>
            </Card>

            <Button
              variant="outline"
              onClick={() => {
                setCreatedRepo(null);
                setRepoName("awentia-bilanci");
              }}
              className="w-full"
            >
              Crea un Altro Repository
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
