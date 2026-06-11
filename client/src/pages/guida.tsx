import type { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info, Lightbulb, AlertTriangle } from "lucide-react";

function GuideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-imm-blue-dark underline decoration-imm-signal-teal/50 underline-offset-2 hover:text-imm-signal-teal"
    >
      {children}
    </Link>
  );
}

function GuideCallout({
  variant = "tip",
  children,
}: {
  variant?: "tip" | "info" | "warning";
  children: ReactNode;
}) {
  const styles = {
    tip: "bg-imm-yellow/15 border-imm-yellow/40 text-imm-blue-dark",
    info: "bg-imm-signal-teal/10 border-imm-signal-teal/25 text-imm-blue-dark",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  };
  const Icon = variant === "warning" ? AlertTriangle : variant === "info" ? Info : Lightbulb;

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles[variant]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

const QUICK_STEPS = [
  { step: 1, label: "Seleziona azienda e periodo", href: "/editor/dashboard" },
  { step: 2, label: "Importa il bilancino mensile", href: "/import" },
  { step: 3, label: "Correggi saldi e mapping", href: "/editor/ledger-balances" },
  { step: 4, label: "Ricalcola e verifica il CE", href: "/editor/ce-dettaglio" },
  { step: 5, label: "Salva bozza e pubblica", href: "/editor/dashboard" },
] as const;

interface GuideSection {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "primi-passi",
    title: "Primi passi",
    description: "Selezione azienda e periodo di lavoro",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          La dashboard è pensata per amministratori che gestiscono bilanci mensili di più società.
          Ogni operazione (import, modifica, pubblicazione) è legata all&apos;azienda selezionata.
        </p>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">1. Accedi come amministratore</p>
          <p>
            Solo gli utenti con profilo <strong>ADMINISTRATOR</strong> vedono il selettore azienda,
            l&apos;hub <GuideLink href="/editor/dashboard">Editor bilancio</GuideLink>, le voci di
            consultazione e questa guida. Gli altri utenti consultano solo dashboard e report pubblicati.
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">2. Seleziona l&apos;azienda</p>
          <p>
            In alto nella pagina compare la card <strong>Seleziona Azienda</strong>: scegli la società
            su cui lavorare. La scelta resta memorizzata tra una sessione e l&apos;altra. Senza azienda
            selezionata l&apos;editor non si apre e mostra il messaggio «Seleziona un&apos;azienda».
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">3. Sezione Amministrazione</p>
          <p className="mb-2">Nella sidebar, sotto <strong>Amministrazione</strong> trovi:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <GuideLink href="/ledger-balances">Saldi contabili</GuideLink> e{" "}
              <GuideLink href="/ledger-mappings">Mapping conti</GuideLink> — consultazione in sola
              lettura sui dati già pubblicati, senza bozza né pulsanti di pubblicazione.
            </li>
            <li>
              <strong>Editor bilancio</strong> (<GuideLink href="/editor/dashboard">/editor/…</GuideLink>)
              — area operativa con tab gialle per modificare saldi, mapping e pubblicare un periodo.
              La voce resta evidenziata in giallo su tutte le pagine dell&apos;editor.
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">4. Imposta anno e mese</p>
          <p>
            Dentro l&apos;editor, nel pannello <strong>Periodo</strong>, scegli anno e mese di riferimento.
            I mesi disponibili dipendono dai saldi già presenti per quell&apos;anno. Se esiste una bozza
            aperta per il periodo, compare un badge con lo stato (es. «Bozza»).
          </p>
        </div>

        <GuideCallout variant="tip">
          La tab attiva nell&apos;editor ha sfondo <strong>giallo</strong> (Dashboard, CE Dettaglio, Saldi,
          Mapping, Bozze). Da qualsiasi tab puoi aprire la{" "}
          <GuideLink href="/guida">Guida</GuideLink> con il link in alto a destra nella barra di navigazione.
        </GuideCallout>
      </div>
    ),
  },
  {
    id: "import-bilancino",
    title: "Import bilancino",
    description: "Flusso di importazione del bilancino mensile",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          L&apos;import carica i saldi contabili mensili dalla pipeline ETL su Supabase. È il punto di
          partenza prima di correggere valori o mapping in editor.
        </p>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Procedura passo passo</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Vai su <GuideLink href="/import">Importa Dati</GuideLink> dalla sidebar.
            </li>
            <li>
              Seleziona l&apos;azienda (deve coincidere con quella dell&apos;editor) e il tipo file:
              <ul className="mt-1 list-disc pl-5">
                <li><strong>Rilevamento automatico</strong> — consigliato per Excel analisi CE o bilancino</li>
                <li><strong>Bilancino mensile</strong> — file contabile (.xlsx, .xls)</li>
                <li><strong>Excel analisi CE</strong> — layout analisi annuale</li>
                <li><strong>Export partitario</strong> — CSV/XLSX dal gestionale (flusso separato)</li>
              </ul>
            </li>
            <li>Trascina o clicca per caricare il file. Parte l&apos;anteprima (dry-run) con KPI e avvisi.</li>
            <li>
              Controlla che <strong>anno e mese</strong> rilevati corrispondano al periodo che intendi
              gestire. In anteprima vedi ricavi, costi, risultato, eventuali conti non mappati e check di quadratura.
            </li>
            <li>
              Se mancano mapping, puoi creare <strong>stub</strong> dall&apos;anteprima e completarli
              poi in <GuideLink href="/editor/ledger-mappings">Mapping</GuideLink> o in consultazione.
            </li>
            <li>Conferma l&apos;import: i saldi vengono scritti in <code className="text-xs">account_balances</code> senza sovrascrivere i dati CE già pubblicati.</li>
          </ol>
        </div>

        <GuideCallout variant="warning">
          Se esiste già una <strong>bozza aperta</strong> per lo stesso periodo, compare un avviso giallo:
          un nuovo import potrebbe sovrascrivere i dati pubblicati. Valuta se riaprire la bozza dall&apos;{" "}
          <GuideLink href="/editor/bozze">elenco bozze</GuideLink> invece di reimportare.
        </GuideCallout>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Dopo l&apos;import</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>I saldi sono visibili in consultazione (<GuideLink href="/ledger-balances">Saldi contabili</GuideLink>).</li>
            <li>In editor, seleziona lo stesso anno/mese e usa le tab Saldi o Mapping per le correzioni.</li>
            <li>Mapping incompleti generano avvisi in anteprima import, ma non impediscono il salvataggio saldi se la quadratura è ok.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "modifica-saldi",
    title: "Modifica saldi",
    description: "Editor saldi contabili",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          La tab <GuideLink href="/editor/ledger-balances">Saldi</GuideLink> mostra tutti i conti del
          bilancino per il periodo selezionato. Puoi correggere i valori normalizzati prima della pubblicazione.
        </p>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Come modificare</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Imposta anno e mese nel pannello Periodo.</li>
            <li>Cerca il conto per codice, descrizione o analitica CE con la barra di ricerca.</li>
            <li>
              Nella colonna <strong>Saldo bozza</strong> digita il nuovo valore (input numerico inline).
              La colonna <strong>Saldo pubblicato</strong> resta il riferimento attuale in produzione.
            </li>
            <li>
              Le righe modificate hanno sfondo ambra chiaro. Il contatore accanto a «Salva bozza» indica
              quanti saldi (e mapping) sono cambiati in memoria.
            </li>
          </ol>
        </div>

        <GuideCallout variant="tip">
          Da <GuideLink href="/editor/ce-dettaglio">CE Dettaglio (editor)</GuideLink>, sulle righe foglia
          del conto economico usa il pulsante <strong>Saldi</strong>: apre la tab Saldi con il conto
          evidenziato in <strong>giallo/arancio</strong> (<code className="text-xs">?account=…</code>).
        </GuideCallout>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Modifiche in memoria</p>
          <p>
            I cambiamenti restano solo in memoria finché non premi <strong>Salva bozza</strong> o{" "}
            <strong>Pubblica periodo</strong>. Cambiando tab (Dashboard, Mapping, CE…) le modifiche non
            perse finché non ricarichi la pagina. Per riprendere un lavoro sospeso apri la bozza da{" "}
            <GuideLink href="/editor/bozze">Bozze</GuideLink>.
          </p>
        </div>

        <GuideCallout variant="info">
          Se non ci sono saldi per il periodo («Nessun saldo pubblicato»), importa prima il bilancino da{" "}
          <GuideLink href="/import">Importa Dati</GuideLink>.
        </GuideCallout>
      </div>
    ),
  },
  {
    id: "mapping-conti",
    title: "Mapping conti",
    description: "Famiglia analitica e classificazione",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Ogni conto del bilancino va collegato a <strong>famiglia</strong>, <strong>analitica CE</strong> e{" "}
          <strong>segno</strong> per alimentare correttamente dashboard e conto economico. La tab{" "}
          <GuideLink href="/editor/ledger-mappings">Mapping</GuideLink> consente di correggerli in bozza.
        </p>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Due modi di lavorare</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Griglia inline</strong> — modifica famiglia (select), analitica (input) e segno
              direttamente in tabella. Le righe cambiate hanno sfondo ambra; gli stub incompleti mostrano un badge di avviso.
            </li>
            <li>
              <strong>Dialog «Aggiungi mapping»</strong> — pulsante giallo in alto per creare o aprire
              il form completo (utile per conti nuovi o descrizioni lunghe). Stesso dialog usabile anche
              durante l&apos;import per mappare un conto non riconosciuto.
            </li>
          </ul>
        </div>

        <GuideCallout variant="tip">
          Da CE Dettaglio (editor), sulle voci foglia clicca <strong>Mapping</strong>: si apre la tab
          con il conto evidenziato o filtrato per categoria CE (<code className="text-xs">?category=…</code>).
        </GuideCallout>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Mapping incompleti</p>
          <p>
            Conti con analitica stub o famiglia mancante sono segnalati in anteprima import e in
            consultazione (<GuideLink href="/ledger-mappings">Mapping conti</GuideLink>, filtro incompleti).
            In editor generano avvisi nel pannello anteprima KPI dopo <strong>Ricalcola</strong>, ma{" "}
            <strong>non bloccano</strong> la pubblicazione se la quadratura KPI è valida.
          </p>
        </div>

        <GuideCallout variant="info">
          Le pagine in <strong>Amministrazione → Mapping conti</strong> mostrano i mapping pubblicati
          senza possibilità di salvare bozze. Per modifiche operative usa sempre l&apos;editor.
        </GuideCallout>
      </div>
    ),
  },
  {
    id: "anteprima-pubblicazione",
    title: "Anteprima e pubblicazione",
    description: "Ricalcola, bozza e pubblica periodo",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          La barra azioni sopra ogni tab editor governa il ciclo di revisione: anteprima, persistenza
          bozza e messa in produzione del periodo.
        </p>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">I tre pulsanti principali</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong>Ricalcola</strong> — ricalcola KPI (ricavi, costi, risultato, EBITDA…) e il CE
              di anteprima a partire da saldi e mapping in bozza. Disabilitato se non ci sono saldi per
              il periodo. Dopo il ricalcolo compare il pannello <strong>Anteprima KPI</strong> con eventuali avvisi.
            </li>
            <li>
              <strong>Salva bozza</strong> — scrive su database le modifiche a saldi e mapping senza
              toccare i dati pubblicati. Attivo solo se hai almeno una modifica in memoria. Consigliato
              prima di uscire dall&apos;editor o tra sessioni di lavoro.
            </li>
            <li>
              <strong>Pubblica periodo</strong> — applica saldi, mapping e facts CE ai dati ufficiali
              visibili in dashboard e report consultazione. Richiede anteprima valida e assenza di blocchi.
            </li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Verifica sul CE Dettaglio</p>
          <p>
            In <GuideLink href="/editor/ce-dettaglio">CE Dettaglio (editor)</GuideLink> confronta colonne{" "}
            <strong>Pubblicato</strong>, <strong>Anteprima</strong> e <strong>Delta</strong> per ogni voce.
            Serve un ricalcolo precedente: altrimenti compare l&apos;avviso «Ricalcola l&apos;anteprima…».
            Le righe con differenze hanno sfondo ambra.
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-imm-blue-dark">Quando la pubblicazione è bloccata</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Quadratura KPI non valida</strong> — messaggio rosso «Pubblicazione bloccata» nel
              pannello anteprima. Correggi saldi/mapping e ricalcola.
            </li>
            <li>
              <strong>Avvisi lock periodo</strong> — banner giallo/rosso in cima all&apos;editor, ad esempio
              import ancora in coda per l&apos;azienda o altra bozza in revisione sullo stesso mese.
              Attendi il completamento dell&apos;import o risolvi il conflitto bozze.
            </li>
            <li>
              <strong>Nessuna modifica e nessuna bozza</strong> — il pulsante Pubblica resta disabilitato
              se non c&apos;è nulla da applicare.
            </li>
          </ul>
        </div>

        <GuideCallout variant="warning">
          Dopo la pubblicazione i dati compaiono nelle pagine consultazione (Dashboard, CE Dettaglio,
          Saldi…) per tutti gli utenti autorizzati. L&apos;operazione non è annullabile dall&apos;interfaccia:
          per correzioni successive crea una nuova bozza sullo stesso periodo.
        </GuideCallout>
      </div>
    ),
  },
  {
    id: "faq",
    title: "Domande frequenti",
    description: "Risposte rapide ai dubbi più comuni",
    content: (
      <div className="space-y-5 text-sm leading-relaxed">
        <div>
          <p className="font-semibold text-imm-blue-dark">
            Qual è la differenza tra consultazione e Editor bilancio?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            In <strong>Amministrazione</strong>,{" "}
            <GuideLink href="/ledger-balances">Saldi</GuideLink> e{" "}
            <GuideLink href="/ledger-mappings">Mapping</GuideLink> mostrano solo dati già pubblicati, in
            lettura. <strong>Editor bilancio</strong> (
            <GuideLink href="/editor/dashboard">/editor/…</GuideLink>) permette modifiche in bozza,
            ricalcolo anteprima e pubblicazione del periodo.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Devo salvare la bozza prima di pubblicare?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            Consigliato sì, per non perdere il lavoro. Se pubblichi con modifiche ancora in memoria, il
            sistema salva automaticamente la bozza prima di applicarla. Senza modifiche serve una bozza
            già esistente da pubblicare.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Cosa succede se il periodo è già pubblicato?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            I saldi pubblicati restano visibili in consultazione. In editor puoi aprire una nuova bozza,
            modificare saldi/mapping, ricalcolare e ripubblicare: la pubblicazione sovrascrive i valori
            ufficiali di quel mese.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Posso pubblicare con mapping incompleti?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            Spesso sì, se la quadratura KPI è valida: gli stub incompleti generano avvisi ma non sempre
            bloccano il publish gate. Completare comunque i mapping migliora la qualità del CE e riduce
            warning in anteprima.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Perché non posso modificare il CE direttamente in tabella?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            Il conto economico è calcolato da saldi contabili e mapping, non editabile cella per cella.
            Correggi la fonte in <GuideLink href="/editor/ledger-balances">Saldi</GuideLink> o{" "}
            <GuideLink href="/editor/ledger-mappings">Mapping</GuideLink>, poi usa{" "}
            <strong>Ricalcola</strong> e verifica il diff in CE Dettaglio.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Ho perso le modifiche: dove le recupero?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            Apri <GuideLink href="/editor/bozze">Bozze</GuideLink>, individua il periodo e clicca{" "}
            <strong>Riapri periodo</strong>. Le bozze salvate ripristinano saldi e mapping modificati.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Import bloccato per conti non mappati: cosa faccio?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            Dall&apos;anteprima import crea gli stub mapping, completa famiglia e analitica (dialog o tab
            Mapping), poi ricarica l&apos;anteprima del file. In alternativa mappa i conti in consultazione
            prima di reimportare.
          </p>
        </div>

        <div>
          <p className="font-semibold text-imm-blue-dark">
            Cosa significa il badge giallo sulla tab attiva?
          </p>
          <p className="mt-1 text-imm-blue-dark/80">
            Indica la sezione dell&apos;editor in cui ti trovi (stesso stile giallo sulla voce «Editor
            bilancio» in sidebar). Non segnala errori: per avvisi operativi guarda i banner ambra/rossi
            sotto la barra di navigazione.
          </p>
        </div>
      </div>
    ),
  },
];

export default function GuidaUtilizzo() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="p-6 animate-in fade-in duration-500 font-sans">
        <PageHeader
          title="Guida utilizzo"
          subtitle="Accesso riservato agli amministratori"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 font-sans">
      <PageHeader
        title="Guida utilizzo"
        subtitle="Tutorial e riferimenti per l'editor bilancio"
      />

      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-imm-blue-dark text-lg">
            Percorso rapido
          </CardTitle>
          <CardDescription className="text-imm-blue-dark/70">
            Cinque passi dall&apos;import alla pubblicazione del periodo mensile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-5">
            {QUICK_STEPS.map(({ step, label, href }) => (
              <li key={step}>
                <GuideLink href={href}>
                  <div className="flex h-full flex-col rounded-lg border border-imm-blue-dark/10 bg-white/80 p-3 transition-colors hover:border-imm-yellow hover:bg-imm-yellow/10">
                    <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-imm-yellow text-sm font-bold text-imm-blue-dark">
                      {step}
                    </span>
                    <span className="text-sm font-medium text-imm-blue-dark">{label}</span>
                  </div>
                </GuideLink>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-imm-blue-dark text-lg">
            Tutorial dettagliato
          </CardTitle>
          <CardDescription className="text-imm-blue-dark/70">
            Segui le sezioni in ordine o apri solo l&apos;argomento che ti serve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {GUIDE_SECTIONS.map((section, index) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-imm-blue-dark font-heading hover:no-underline">
                  <span className="flex items-center gap-3 text-left">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-imm-yellow text-sm font-bold text-imm-blue-dark">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block font-semibold">{section.title}</span>
                      <span className="block text-sm font-normal text-imm-blue-dark/60">
                        {section.description}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-10 text-imm-blue-dark/80">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
