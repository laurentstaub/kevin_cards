#!/usr/bin/env node
/**
 * Sauvegarde complète du pool de questions.
 *
 * Produit deux artefacts horodatés dans backups/ :
 *   - pool-<horodatage>.json : export exhaustif et lisible de toutes les
 *     tables de contenu. Les tags y sont référencés par NOM en plus de leur
 *     identifiant, pour que l'export reste réimportable même si les
 *     identifiants sont renumérotés.
 *   - flashpharma-<horodatage>.db : copie binaire de la base.
 *
 * La base est ouverte en LECTURE SEULE : la sauvegarde ne peut pas altérer
 * les données, et fonctionne serveur allumé.
 *
 * Usage :
 *   node tools/backup_pool.js
 *   node tools/backup_pool.js --out /chemin/vers/dossier
 *   npm run db:backup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(ROOT, process.env.SQLITE_DB_PATH)
  : path.join(ROOT, 'database', 'flashpharma.db');

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const OUT_DIR = outIndex !== -1 && args[outIndex + 1]
  ? path.resolve(args[outIndex + 1])
  : path.join(ROOT, 'backups');

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

// Les colonnes JSON sont stockées en TEXT ; on les redonne sous forme
// d'objets pour que l'export soit exploitable tel quel.
const parseJsonColumns = (row, columns) => {
  for (const col of columns) {
    if (typeof row[col] === 'string') {
      try { row[col] = JSON.parse(row[col]); } catch { /* laisser la chaîne brute */ }
    }
  }
  return row;
};

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Base introuvable : ${DB_PATH}`);
    process.exit(1);
  }

  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const all = (sql) => db.prepare(sql).all();

  const integrity = db.prepare('PRAGMA integrity_check').get();
  const integrityResult = Object.values(integrity)[0];
  if (integrityResult !== 'ok') {
    console.error(`Contrôle d'intégrité en échec : ${integrityResult}`);
    console.error('Sauvegarde interrompue, la base est endommagée.');
    process.exit(1);
  }

  const tags = all('SELECT * FROM tags ORDER BY id');
  const tagName = new Map(tags.map((t) => [t.id, t.name]));

  const links = all('SELECT * FROM question_tags ORDER BY question_id, tag_id');
  const tagsByQuestion = new Map();
  for (const link of links) {
    if (!tagsByQuestion.has(link.question_id)) tagsByQuestion.set(link.question_id, []);
    tagsByQuestion.get(link.question_id).push(tagName.get(link.tag_id) ?? `#${link.tag_id}`);
  }

  const questions = all('SELECT * FROM questions ORDER BY id').map((q) => {
    parseJsonColumns(q, ['sources', 'metadata', 'review_history']);
    q.tag_names = tagsByQuestion.get(q.id) ?? [];
    return q;
  });

  const optional = (sql) => { try { return all(sql); } catch { return []; } };

  const payload = {
    meta: {
      genere_le: new Date().toISOString(),
      source: path.relative(ROOT, DB_PATH),
      integrite: integrityResult,
      totaux: {
        questions: questions.length,
        questions_actives: questions.filter((q) => q.is_active === 1).length,
        questions_supprimees: questions.filter((q) => q.deleted_at).length,
        tags: tags.length,
        associations: links.length
      }
    },
    questions,
    tags,
    question_tags: links,
    question_versions: optional('SELECT * FROM question_versions ORDER BY id'),
    study_sessions: optional('SELECT * FROM study_sessions ORDER BY id'),
    users: optional('SELECT id, email, name, role, is_active, created_at FROM users ORDER BY id')
  };

  db.close();

  const ko = (p) => `${Math.round(fs.statSync(p).size / 1024)} Ko`;
  const t = payload.meta.totaux;
  const resume = () => {
    console.log(`  ${t.questions} questions (${t.questions_actives} actives, ${t.questions_supprimees} supprimees)`);
    console.log(`  ${t.tags} tags, ${t.associations} associations`);
  };

  // Mode --master : un fichier unique et suivi en version, ecrase a chaque
  // export. L'historique git tient lieu de rotation, sans gonfler le depot.
  if (args.includes('--master')) {
    const masterPath = path.join(ROOT, 'zz_questions', 'questions_master.json');
    fs.mkdirSync(path.dirname(masterPath), { recursive: true });
    fs.writeFileSync(masterPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log('Export de reference mis a jour');
    resume();
    console.log(`  ${path.relative(ROOT, masterPath)}  (${ko(masterPath)})`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const s = stamp();
  const jsonPath = path.join(OUT_DIR, `pool-${s}.json`);
  const dbCopyPath = path.join(OUT_DIR, `flashpharma-${s}.db`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.copyFileSync(DB_PATH, dbCopyPath);

  console.log('Sauvegarde du pool terminee');
  resume();
  console.log(`  ${path.relative(ROOT, jsonPath)}  (${ko(jsonPath)})`);
  console.log(`  ${path.relative(ROOT, dbCopyPath)}  (${ko(dbCopyPath)})`);
}

main();
