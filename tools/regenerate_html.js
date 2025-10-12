#!/usr/bin/env node

import { getClient } from '../api/config/database.js';
import { processMarkdown } from '../api/utils/markdown.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function regenerateHtmlForQuestions() {
  const client = await getClient();

  try {
    console.log(`\n${colors.bright}${colors.magenta}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║   Régénération HTML et Métadonnées pour Questions ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Find questions without HTML or metadata
    const result = await client.query(`
      SELECT id, question_text, answer_text
      FROM questions
      WHERE question_html IS NULL
         OR answer_html IS NULL
         OR metadata = '{}'::jsonb
      ORDER BY id
    `);

    const questions = result.rows;
    console.log(`${colors.cyan}Trouvé ${questions.length} questions à traiter${colors.reset}\n`);

    if (questions.length === 0) {
      console.log(`${colors.green}Toutes les questions ont déjà leur HTML et métadonnées générés.${colors.reset}`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    await client.query('BEGIN');

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      try {
        // Process markdown for both question and answer
        const questionProcessed = processMarkdown(question.question_text, 'question');
        const answerProcessed = processMarkdown(question.answer_text, 'answer');

        // Combine entities from both question and answer
        const combinedEntities = {
          drugs: [...new Set([...questionProcessed.entities.drugs, ...answerProcessed.entities.drugs])],
          drug_classes: [...new Set([...questionProcessed.entities.drug_classes, ...answerProcessed.entities.drug_classes])],
          conditions: [...new Set([...questionProcessed.entities.conditions, ...answerProcessed.entities.conditions])],
          dosages: [...new Set([...questionProcessed.entities.dosages, ...answerProcessed.entities.dosages])],
          routes: [...new Set([...questionProcessed.entities.routes, ...answerProcessed.entities.routes])]
        };

        const metadata = {
          entities: combinedEntities,
          question_stats: questionProcessed.stats,
          answer_stats: answerProcessed.stats,
          total_word_count: questionProcessed.stats.word_count + answerProcessed.stats.word_count,
          last_processed: new Date().toISOString()
        };

        // Update the question with HTML and metadata
        await client.query(`
          UPDATE questions
          SET question_html = $1,
              answer_html = $2,
              metadata = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [
          questionProcessed.html,
          answerProcessed.html,
          JSON.stringify(metadata),
          question.id
        ]);

        successCount++;

        // Show progress
        if ((i + 1) % 10 === 0 || i === questions.length - 1) {
          process.stdout.write(`\r${colors.green}Progression: ${i + 1}/${questions.length} questions traitées${colors.reset}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`\n${colors.red}Erreur pour la question ID ${question.id}:${colors.reset}`, error.message);
      }
    }

    await client.query('COMMIT');

    console.log(`\n\n${colors.bright}${colors.green}Résultats de la régénération:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Traitées avec succès: ${colors.bright}${successCount}${colors.reset} questions`);
    if (errorCount > 0) {
      console.log(`  ${colors.red}✗${colors.reset} Erreurs: ${colors.bright}${errorCount}${colors.reset} questions`);
    }

    console.log(`\n${colors.cyan}HTML et métadonnées régénérés avec succès !${colors.reset}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`\n${colors.red}Erreur fatale:${colors.reset}`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
regenerateHtmlForQuestions().catch(error => {
  console.error(`\n${colors.red}Erreur fatale:${colors.reset}`, error.message);
  process.exit(1);
});