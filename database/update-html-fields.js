#!/usr/bin/env node

/**
 * Script to update existing questions with rendered HTML
 * This processes markdown to HTML for all questions in the database
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { processMarkdown } from '../api/utils/markdown.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'flashpharma',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || ''
});

async function updateQuestionsWithHTML() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting HTML field update for existing questions...\n');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get all questions - force regeneration of HTML to add card-content wrappers
    const result = await client.query(`
      SELECT id, question_text, answer_text, metadata
      FROM questions
      WHERE question_html IS NOT NULL AND answer_html IS NOT NULL
      AND (question_html NOT LIKE '%card-content%' OR answer_html NOT LIKE '%card-content%')
      ORDER BY id
    `);
    
    console.log(`📊 Found ${result.rows.length} questions to update\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of result.rows) {
      try {
        // Process markdown to HTML with proper wrappers
        const questionProcessed = processMarkdown(row.question_text, 'question');
        const answerProcessed = processMarkdown(row.answer_text, 'answer');
        
        // Update metadata with entities if not already present
        const existingMetadata = row.metadata || {};
        const combinedEntities = {
          drugs: [...new Set([
            ...(questionProcessed.entities.drugs || []),
            ...(answerProcessed.entities.drugs || [])
          ])],
          drug_classes: [...new Set([
            ...(questionProcessed.entities.drug_classes || []),
            ...(answerProcessed.entities.drug_classes || [])
          ])],
          conditions: [...new Set([
            ...(questionProcessed.entities.conditions || []),
            ...(answerProcessed.entities.conditions || [])
          ])],
          dosages: [...new Set([
            ...(questionProcessed.entities.dosages || []),
            ...(answerProcessed.entities.dosages || [])
          ])],
          routes: [...new Set([
            ...(questionProcessed.entities.routes || []),
            ...(answerProcessed.entities.routes || [])
          ])]
        };
        
        const updatedMetadata = {
          ...existingMetadata,
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
          JSON.stringify(updatedMetadata),
          row.id
        ]);
        
        successCount++;
        process.stdout.write(`✅ Updated question ${row.id} (${successCount}/${result.rows.length})\r`);
        
      } catch (error) {
        errorCount++;
        console.error(`\n❌ Error updating question ${row.id}:`, error.message);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n\n📈 Update Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} questions`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed updates: ${errorCount} questions`);
    }
    
    // Verify the update
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(question_html) as with_html,
        COUNT(CASE WHEN question_html IS NULL THEN 1 END) as without_html
      FROM questions
    `);
    
    const stats = verifyResult.rows[0];
    console.log('\n📊 Database Statistics:');
    console.log(`   Total questions: ${stats.total}`);
    console.log(`   With HTML: ${stats.with_html}`);
    console.log(`   Without HTML: ${stats.without_html}`);
    
    if (stats.without_html === '0') {
      console.log('\n✨ All questions now have HTML content!');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateQuestionsWithHTML()
  .then(() => {
    console.log('\n✅ HTML field update completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });