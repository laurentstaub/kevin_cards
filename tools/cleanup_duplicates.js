#!/usr/bin/env node
/**
 * Nettoyage du stock de questions : doublons et corrections factuelles.
 *
 * Usage :
 *   node tools/cleanup_duplicates.js --dry-run   # affiche le plan, n'ecrit rien
 *   node tools/cleanup_duplicates.js             # applique (sauvegarde automatique)
 *
 * Idempotent : une operation deja appliquee est signalee "deja OK" et ignoree.
 * Les suppressions sont logiques (deleted_at + is_active = 0), donc reversibles
 * via PATCH /api/questions/:id/restore.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { markdownToHtml } from '../api/utils/markdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(ROOT, 'database', 'flashpharma.db');
const DRY_RUN = process.argv.includes('--dry-run');

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// ---------------------------------------------------------------------------
// Corrections de contenu
// ---------------------------------------------------------------------------

const CORRECTIONS = [
  {
    id: 190,
    motif: "Inipomp est du pantoprazole, pas de l'omeprazole ; ce n'est pas un generique du Mopral",
    question: "Quelle est la DCI de la molécule active de l'**Inipomp®** ?",
    answer: [
      '**Pantoprazole**',
      '',
      'Inhibiteur de la pompe à protons.',
      '',
      '*Schéma de prise* : une prise par jour, le matin, 30 minutes avant le petit-déjeuner.',
      '',
      "Le pantoprazole est l'IPP dont le potentiel d'interaction est le plus faible de sa classe : son métabolisme dépend peu du CYP2C19, contrairement à l'oméprazole."
    ].join('\n')
  },
  {
    id: 194,
    motif: 'Orthographe (naphazoline) et composition incomplete : la prednisolone manquait',
    answer: [
      '**Naphazoline + prednisolone**',
      '',
      "Association d'un vasoconstricteur nasal sympathomimétique alpha et d'un corticoïde.",
      '',
      'La durée de traitement ne doit pas dépasser 5 jours, en raison du risque de rhinite médicamenteuse par effet rebond.',
      '',
      'Les contre-indications sont les suivantes :',
      '',
      "- l'âge inférieur à 15 ans ;",
      "- le glaucome par fermeture de l'angle ;",
      '- les troubles urétro-prostatiques avec rétention urinaire.'
    ].join('\n')
  },
  {
    id: 200,
    motif: 'Carbocisteine est une DCI, pas une specialite : carte tautologique. Remplacee par Rhinathiol',
    question: 'Quelle est la DCI de la molécule active du **Rhinathiol®** ?',
    answer: [
      '**Carbocistéine**',
      '',
      'Mucomodificateur à visée bronchique, elle fluidifie les sécrétions en modifiant la structure du mucus.',
      '',
      "Elle est contre-indiquée avant 2 ans, en raison du risque d'encombrement bronchique et d'aggravation respiratoire chez le nourrisson."
    ].join('\n')
  },
  {
    id: 202,
    motif: 'Mebeverine est une DCI, pas une specialite : carte tautologique. Remplacee par Duspatalin',
    question: 'Quelle est la DCI de la molécule active du **Duspatalin®** ?',
    answer: [
      '**Mébévérine**',
      '',
      "Antispasmodique musculotrope, elle agit directement sur la fibre musculaire lisse intestinale, sans effet anticholinergique.",
      '',
      "Elle est indiquée dans le traitement symptomatique des douleurs et des troubles du transit liés au syndrome de l'intestin irritable."
    ].join('\n')
  },
  {
    id: 136,
    motif: 'Tramadol est une DCI, pas une specialite : carte tautologique. Remplacee par Contramal',
    question: 'Quelle est la DCI de la molécule active du **Contramal®** ?',
    reactiver: true,
    answer: [
      '**Tramadol**',
      '',
      "Analgésique opioïde de palier 2, à double mécanisme : agoniste faible des récepteurs mu et inhibiteur de la recapture de la sérotonine et de la noradrénaline.",
      '',
      "Cette composante monoaminergique explique le risque de syndrome sérotoninergique en association aux antidépresseurs, ainsi que l'abaissement du seuil épileptogène."
    ].join('\n')
  }
];

// ---------------------------------------------------------------------------
// Doublons : `perdant` est supprime logiquement, ses tags passent sur `gagnant`
// ---------------------------------------------------------------------------

const DOUBLONS = [
  { gagnant: 268, perdant: 128, motif: 'Humira en double, la fiche 268 est la plus complete' },
  { gagnant: 209, perdant: 274, motif: 'Aricept en double, la fiche 274 ne contient pas la DCI' },
  { gagnant: 191, perdant: 248, motif: 'Tiorfan / Tiorfanor, meme DCI et meme reponse' },
  { gagnant: 212, perdant: 179, motif: 'Requip / Ropinirole, la fiche 179 est tautologique' }
];

// ---------------------------------------------------------------------------

function sauvegarde() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
  const dest = `${DB_PATH}.bak-${stamp}`;
  fs.copyFileSync(DB_PATH, dest);
  return dest;
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Base introuvable : ${DB_PATH}`);
    process.exit(1);
  }
  if (!DRY_RUN) console.log(`Sauvegarde : ${sauvegarde()}`);
  else console.log('Mode simulation, aucune ecriture.');

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('BEGIN');

  const journal = [];

  try {
    for (const c of CORRECTIONS) {
      const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(c.id);
      if (!row) { journal.push(`#${c.id} : introuvable, ignore`); continue; }

      const dejaFait = row.answer_text.trim() === c.answer.trim()
        && (!c.question || row.question_text.trim() === c.question.trim());
      if (dejaFait) { journal.push(`#${c.id} : deja OK`); continue; }

      const champs = {
        answer_text: c.answer,
        answer_html: markdownToHtml(c.answer),
        updated_at: now()
      };
      if (c.question) {
        champs.question_text = c.question;
        champs.question_html = markdownToHtml(c.question);
      }
      if (c.reactiver) { champs.is_active = 1; champs.deleted_at = null; }

      const cols = Object.keys(champs);
      db.prepare(`UPDATE questions SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
        .run(...cols.map((k) => champs[k]), c.id);

      journal.push(`#${c.id} : corrige - ${c.motif}`);
      journal.push(`      avant : ${row.answer_text.split('\n')[0]}`);
      journal.push(`      apres : ${c.answer.split('\n')[0]}`);
    }

    for (const d of DOUBLONS) {
      const perdant = db.prepare('SELECT * FROM questions WHERE id = ?').get(d.perdant);
      const gagnant = db.prepare('SELECT * FROM questions WHERE id = ?').get(d.gagnant);
      if (!perdant || !gagnant) { journal.push(`#${d.perdant} : introuvable, ignore`); continue; }
      if (perdant.deleted_at) { journal.push(`#${d.perdant} : deja supprime`); continue; }

      const aReporter = db.prepare(
        `SELECT tag_id FROM question_tags WHERE question_id = ?
           AND tag_id NOT IN (SELECT tag_id FROM question_tags WHERE question_id = ?)`
      ).all(d.perdant, d.gagnant);

      const ins = db.prepare('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)');
      for (const { tag_id } of aReporter) ins.run(d.gagnant, tag_id);

      db.prepare(
        `UPDATE questions
            SET deleted_at = ?, is_active = 0,
                admin_notes = CASE WHEN admin_notes IS NULL OR admin_notes = ''
                                   THEN ? ELSE admin_notes || ' | ' || ? END,
                updated_at = ?
          WHERE id = ?`
      ).run(now(), `Doublon de #${d.gagnant}`, `Doublon de #${d.gagnant}`, now(), d.perdant);

      journal.push(`#${d.perdant} : supprime, doublon de #${d.gagnant} - ${d.motif}`);
      if (aReporter.length) journal.push(`      ${aReporter.length} tag(s) reporte(s) sur #${d.gagnant}`);
    }

    db.exec(DRY_RUN ? 'ROLLBACK' : 'COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Echec, aucune modification appliquee :', err.message);
    db.close();
    process.exit(1);
  }

  console.log(journal.join('\n'));

  const s = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN deleted_at IS NULL AND is_active = 1 THEN 1 ELSE 0 END) AS actives,
           SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS supprimees
      FROM questions`).get();
  console.log(`\nTotal ${s.total} | actives ${s.actives} | supprimees ${s.supprimees}`);

  db.close();
}

main();
