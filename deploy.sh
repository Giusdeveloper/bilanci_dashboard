#!/bin/bash
# Script per deploy rapido

echo "📝 Preparazione commit..."
git add .

echo "💬 Inserisci il messaggio di commit:"
read commit_message

git commit -m "$commit_message"

echo "🚀 Push su GitHub..."
git push origin main

echo "✅ Push completato! Vai su Replit per fare il deploy."
