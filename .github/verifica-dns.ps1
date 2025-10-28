# Script PowerShell per verifica DNS su Windows
# Uso: .\verifica-dns.ps1

$Domain = "dashboard.imment.it"
$ExpectedCNAME = "giusdeveloper.github.io"

Write-Host "🔍 Verifica DNS per $Domain" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Verifica CNAME
Write-Host "📋 Verifica record CNAME:" -ForegroundColor Yellow
try {
    $CNAMEResult = (Resolve-DnsName -Name $Domain -Type CNAME -ErrorAction SilentlyContinue)
    if ($CNAMEResult) {
        $CNAMEValue = $CNAMEResult.NameHost
        Write-Host "✅ Record CNAME trovato: $CNAMEValue" -ForegroundColor Green
        if ($CNAMEValue -like "*$ExpectedCNAME*") {
            Write-Host "✅ Il CNAME punta correttamente a $ExpectedCNAME" -ForegroundColor Green
        } else {
            Write-Host "⚠️  ATTENZIONE: Il CNAME punta a: $CNAMEValue" -ForegroundColor Yellow
            Write-Host "   Dovrebbe puntare a: $ExpectedCNAME" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ ERRORE: Nessun record CNAME trovato!" -ForegroundColor Red
        Write-Host "   Configura un record CNAME per 'dashboard' -> 'giusdeveloper.github.io'" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Errore durante la verifica CNAME: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌍 Verifica propagazione globale:" -ForegroundColor Yellow
Write-Host "   Visita: https://www.whatsmydns.net/#CNAME/$Domain" -ForegroundColor Cyan
Write-Host ""

# Verifica A record
Write-Host "📋 Verifica record A (non dovrebbe esistere per CNAME):" -ForegroundColor Yellow
try {
    $AResult = (Resolve-DnsName -Name $Domain -Type A -ErrorAction SilentlyContinue)
    if ($AResult) {
        Write-Host "⚠️  ATTENZIONE: Trovato record A:" -ForegroundColor Yellow
        $AResult | ForEach-Object { Write-Host "   - $($_.IPAddress)" -ForegroundColor Yellow }
        Write-Host "   Per un sottodominio, dovresti usare CNAME, non A" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Nessun record A trovato (corretto per CNAME)" -ForegroundColor Green
    }
} catch {
    Write-Host "✅ Nessun record A trovato (corretto per CNAME)" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Test HTTP
Write-Host "🌐 Test connessione HTTP:" -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "http://$Domain" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($Response.StatusCode -eq 200) {
        Write-Host "✅ Sito accessibile via HTTP (codice: $($Response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Risposta HTTP: $($Response.StatusCode)" -ForegroundColor Cyan
    }
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if ($StatusCode -eq 301 -or $StatusCode -eq 302) {
        Write-Host "ℹ️  Reindirizzamento HTTP (codice: $StatusCode) - probabilmente HTTPS" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Sito non accessibile via HTTP" -ForegroundColor Yellow
    }
}

# Test HTTPS
Write-Host "🔒 Test connessione HTTPS:" -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "https://$Domain" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($Response.StatusCode -eq 200) {
        Write-Host "✅ Sito accessibile via HTTPS (codice: $($Response.StatusCode))" -ForegroundColor Green
        
        # Verifica certificato
        try {
            $Certificate = [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
            $Request = [System.Net.HttpWebRequest]::Create("https://$Domain")
            $Request.GetResponse() | Out-Null
            Write-Host "✅ Certificato SSL presente e valido" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Impossibile verificare il certificato SSL" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️  Risposta HTTPS: $($Response.StatusCode)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  HTTPS non ancora disponibile (certificato SSL in fase di generazione?)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "✅ Verifica completata!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Per maggiori informazioni, vedi: .github/RISOLUZIONE_DNS_IMMENT.md" -ForegroundColor Cyan
