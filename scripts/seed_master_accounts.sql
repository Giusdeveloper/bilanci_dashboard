-- Inserimento Voci Master Standard (Minimo indispensabile per la Dashboard)

INSERT INTO master_chart_of_accounts (code, label, type) VALUES
('RICAVI', 'Ricavi Totali', 'economic'),
('COSTI', 'Costi Totali', 'economic'),
('EBITDA', 'EBITDA', 'economic'),
('RISULTATO', 'Risultato d''Esercizio', 'economic')
ON CONFLICT (code) DO NOTHING;

-- Nota: Queste sono le voci "Target" su cui mapperemo le voci specifiche di Sherpa e Awentia.
