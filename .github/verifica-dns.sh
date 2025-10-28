#!/bin/bash

# Script di verifica DNS per dashboard.imment.it
# Uso: ./verifica-dns.sh

DOMAIN="dashboard.imment.it"
EXPECTED_CNAME="giusdeveloper.github.io"

echo "🔍 Verifica DNS per $DOMAIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verifica CNAME
echo "📋 Verifica record CNAME:"
CNAME_RESULT=$(dig $DOMAIN CNAME +short)
if [ -z "$CNAME_RESULT" ]; then
    echo "❌ ERRORE: Nessun record CNAME trovato!"
    echo "   Configura un record CNAME per 'dashboard' -> 'giusdeveloper.github.io'"
else
    echo "✅ Record CNAME trovato: $CNAME_RESULT"
    if [[ "$CNAME_RESULT" == *"$EXPECTED_CNAME"* ]]; then
        echo "✅ Il CNAME punta correttamente a $EXPECTED_CNAME"
    else
        echo "⚠️  ATTENZIONE: Il CNAME punta a: $CNAME_RESULT"
        echo "   Dovrebbe puntare a: $EXPECTED_CNAME"
    fi
fi

echo ""
echo "🌍 Verifica propagazione globale:"
echo "   Visita: https://www.whatsmydns.net/#CNAME/$DOMAIN"
echo ""

# Verifica risoluzione A record (non dovrebbe esistere per un sottodominio CNAME)
echo "📋 Verifica record A (non dovrebbe esistere):"
A_RESULT=$(dig $DOMAIN A +short)
if [ -z "$A_RESULT" ]; then
    echo "✅ Nessun record A trovato (corretto per CNAME)"
else
    echo "⚠️  ATTENZIONE: Trovato record A: $A_RESULT"
    echo "   Per un sottodominio, dovresti usare CNAME, non A"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verifica HTTP
echo "🌐 Test connessione HTTP:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN")
if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ Sito accessibile via HTTP (codice: $HTTP_STATUS)"
elif [ "$HTTP_STATUS" == "301" ] || [ "$HTTP_STATUS" == "302" ]; then
    echo "ℹ️  Reindirizzamento HTTP (codice: $HTTP_STATUS) - probabilmente HTTPS"
else
    echo "⚠️  Sito non accessibile (codice: $HTTP_STATUS)"
fi

# Verifica HTTPS
echo "🔒 Test connessione HTTPS:"
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 10)
if [ "$HTTPS_STATUS" == "200" ]; then
    echo "✅ Sito accessibile via HTTPS (codice: $HTTPS_STATUS)"
    CERT_INFO=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
    if [ ! -z "$CERT_INFO" ]; then
        echo "✅ Certificato SSL presente"
    fi
elif [ "$HTTPS_STATUS" == "000" ]; then
    echo "⚠️  HTTPS non ancora disponibile (certificato SSL in fase di generazione?)"
else
    echo "⚠️  HTTPS non accessibile (codice: $HTTPS_STATUS)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Verifica completata!"
echo ""
echo "📚 Per maggiori informazioni, vedi: .github/RISOLUZIONE_DNS_IMMENT.md"
