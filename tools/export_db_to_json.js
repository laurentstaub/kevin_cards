import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'database/flashpharma.db');
const OUTPUT_PATH = path.join(ROOT_DIR, 'zz_questions/questions_master.json');

async function exportDbToJson() {
  console.log('📦 Starting export from SQLite to JSON...');
  
  let db;
  try {
    // Open database
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    console.log(`✅ Connected to database at ${DB_PATH}`);

    // 1. Fetch all questions
    const questions = await db.all(`
      SELECT 
        id, 
        question_text, 
        answer_text, 
        is_active, 
        admin_notes, 
        sources, 
        metadata, 
        created_at, 
        updated_at 
      FROM questions 
      ORDER BY id ASC
    `);
    
    console.log(`📊 Found ${questions.length} questions.`);

    // 2. Fetch all tags for each question
    // We'll do it efficiently by fetching all tags and mapping them
    const allTags = await db.all(`
      SELECT 
        qt.question_id, 
        t.name as tag_name 
      FROM question_tags qt
      JOIN tags t ON qt.tag_id = t.id
    `);

    // Create a map of question_id -> tags array
    const tagsMap = {};
    allTags.forEach(row => {
      if (!tagsMap[row.question_id]) {
        tagsMap[row.question_id] = [];
      }
      tagsMap[row.question_id].push(row.tag_name);
    });

    // 3. Assemble the JSON object
    const formattedQuestions = questions.map(q => {
      let sources = [];
      try {
        sources = q.sources ? JSON.parse(q.sources) : [];
      } catch (e) {
        console.warn(`⚠️ Warning: Could not parse sources for question ${q.id}`);
      }

      let metadata = {};
      try {
        metadata = q.metadata ? JSON.parse(q.metadata) : {};
      } catch (e) {
        // Ignore empty metadata errors
      }

      return {
        id: q.id,
        question: q.question_text,
        answer: q.answer_text,
        tags: tagsMap[q.id] || [], // Use tag names, simpler for JSON editing
        isActive: Boolean(q.is_active),
        adminNotes: q.admin_notes,
        sources: sources,
        metadata: metadata,
        createdAt: q.created_at,
        updatedAt: q.updated_at
      };
    });

    // 4. Write to file
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(formattedQuestions, null, 2));
    
    console.log(`✅ Export successful!`);
    console.log(`📄 File created at: ${OUTPUT_PATH}`);
    console.log(`📝 Total questions exported: ${formattedQuestions.length}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

exportDbToJson();

