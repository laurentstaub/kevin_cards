#!/usr/bin/env node
/**
 * Import d'un lot de questions depuis un fichier JSON.
 *
 * Remplace tools/load_questions_to_db.js, resté sur des chemins d'import et
 * des placeholders PostgreSQL ($1) incompatibles avec SQLite.
 *
 * Format attendu :
 *   {
 *     "metadata": { "tag_categories": { "Comptoir": "situation" } },   // optionnel
 *     "questions": [ { "question": "...", "answer": "...", "tags": ["A","B"] } ]
 *   }
 * Les textes sont en Markdown ; le HTML de cache est généré à l'import.
 *
 * Usage :
 *   node tools/import_questions_json.js zz_questions/questions/mon_lot.json --dry-run
 *   node tools/import_questions_json.js zz_questions/questions/mon_lot.json
 *
 * Idempotent : une question dont le texte existe déjà en base est ignorée.
 * Les tags absents de la table tags sont créés.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { markdownToHtml } from '../api/utils/markdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(ROOT, 'database', 'flashpharma.db');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ACTIVER = !args.includes('--inactif');
const fichier = args.find((a) => !a.startsWith('--'));

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function sauvegarde() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
  const dest = `${DB_PATH}.bak-${stamp}`;
  fs.copyFileSync(DB_PATH, dest);
  return dest;
}

function main() {
  if (!fichier) {
    console.error('Usage : node tools/import_questions_json.js <fichier.json> [--dry-run] [--inactif]');
    process.exit(1);
  }
  const chemin = path.resolve(process.cwd(), fichier);
  if (!fs.existsSync(chemin)) {
    console.error(`Fichier introuvable : ${chemin}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  const lot = data.questions || data.flashcards || [];
  const categories = data.metadata?.tag_categories || {};
  if (!lot.length) {
    console.error('Aucune question dans le fichier.');
    process.exit(1);
  }

  if (!DRY_RUN) console.log(`Sauvegarde : ${sauvegarde()}`);
  else console.log('Mode simulation, aucune ecriture.');

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON');

  const auteur = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  if (!auteur) {
    console.error('Aucun utilisateur en base : la colonne created_by ne peut pas etre renseignee.');
    process.exit(1);
  }

  const trouverQuestion = db.prepare('SELECT id FROM questions WHERE question_text = ?');
  const trouverTag = db.prepare('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)');
  const creerTag = db.prepare('INSERT INTO tags (name, category, created_by) VALUES (?, ?, ?)');
  const creerQuestion = db.prepare(`
    INSERT INTO questions
      (question_text, answer_text, question_html, answer_html,
       status, is_active, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`);
  const lierTag = db.prepare(
    'INSERT INTO question_tags (question_id, tag_id, assigned_by) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
  );

  let importees = 0;
  let ignorees = 0;
  const tagsCrees = [];

  db.exec('BEGIN');
  try {
    for (const q of lot) {
      const texte = (q.question || '').trim();
      const reponse = (q.answer || '').trim();
      if (!texte || !reponse) { ignorees++; continue; }

      if (trouverQuestion.get(texte)) {
        console.log(`ignoree (deja en base) : ${texte.slice(0, 70)}`);
        ignorees++;
        continue;
      }

      const horodatage = now();
      const res = creerQuestion.run(
        texte, reponse,
        markdownToHtml(texte), markdownToHtml(reponse),
        ACTIVER ? 1 : 0, auteur.id, horodatage, horodatage
      );
      const questionId = Number(res.lastInsertRowid);

      for (const nom of q.tags || []) {
        let tag = trouverTag.get(nom);
        if (!tag) {
          creerTag.run(nom, categories[nom] || null, auteur.id);
          tag = trouverTag.get(nom);
          tagsCrees.push(nom);
        }
        lierTag.run(questionId, tag.id, auteur.id);
      }

      importees++;
      console.log(`#${questionId} : ${texte.slice(0, 70)}`);
    }

    db.exec(DRY_RUN ? 'ROLLBACK' : 'COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Echec, aucune modification appliquee :', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`\nImportees ${importees} | ignorees ${ignorees} | tags crees : ${tagsCrees.join(', ') || 'aucun'}`);

  const s = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN deleted_at IS NULL AND is_active = 1 THEN 1 ELSE 0 END) AS actives
      FROM questions`).get();
  console.log(`Base : ${s.total} cartes, ${s.actives} actives`);

  db.close();
}

main();
