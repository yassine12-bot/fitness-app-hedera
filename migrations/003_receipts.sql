-- Migration: Système de reçus avec QR codes (VERSION CORRIGÉE SQLite)
-- Date: 2024-11-15

-- Étape 1: Ajouter colonnes SANS contrainte UNIQUE (SQLite limitation)
-- Vérifier d'abord si les colonnes existent déjà pour éviter les erreurs

-- On ne peut pas faire "ALTER TABLE ... ADD COLUMN IF NOT EXISTS" en SQLite
-- Donc on ignore l'erreur si la colonne existe déjà

-- Ajouter receiptCode
ALTER TABLE purchases ADD COLUMN receiptCode TEXT;

-- Ajouter qrCodeData  
ALTER TABLE purchases ADD COLUMN qrCodeData TEXT;

-- Étape 2: Créer index UNIQUE sur receiptCode (si pas déjà existant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_receiptCode ON purchases(receiptCode);