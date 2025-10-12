#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { query, getClient } from './api/config/database.js';
import { processMarkdown } from './api/utils/markdown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for better terminal output
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

// Function to get all JSON files from questions folder
function getQuestionFiles() {
  const questionsDir = path.join(__dirname, 'zz_questions', 'questions');
  const archiveDir = path.join(questionsDir, 'zz_questions_archive');
  
  const files = [];
  
  // Get files from main questions directory
  if (fs.existsSync(questionsDir)) {
    const mainFiles = fs.readdirSync(questionsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(questionsDir, file),
        directory: 'questions'
      }));
    files.push(...mainFiles);
  }
  
  // Get files from archive directory if it exists
  if (fs.existsSync(archiveDir)) {
    const archiveFiles = fs.readdirSync(archiveDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(archiveDir, file),
        directory: 'questions/archive'
      }));
    files.push(...archiveFiles);
  }
  
  return files;
}

// Function to display file information
function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const fileSize = (stats.size / 1024).toFixed(2) + ' KB';
    const modifiedDate = stats.mtime.toLocaleDateString('fr-FR');
    
    // Handle different JSON structures
    let questionCount = 0;
    let format = 'unknown';
    
    if (data.flashcards && Array.isArray(data.flashcards)) {
      questionCount = data.flashcards.length;
      format = 'flashcards';
    } else if (data.questions && Array.isArray(data.questions)) {
      questionCount = data.questions.length;
      format = 'questions';
    }
    
    return {
      size: fileSize,
      modified: modifiedDate,
      questions: questionCount,
      title: data.metadata?.title || data.title || 'Sans titre',
      format: format,
      tags: data.metadata?.available_tags || data.available_tags || []
    };
  } catch (error) {
    return {
      size: 'N/A',
      modified: 'N/A',
      questions: 'N/A',
      title: 'Erreur de lecture',
      format: 'error',
      tags: []
    };
  }
}

// Convert HTML to markdown-like format for database
function htmlToMarkdown(html) {
  if (!html) return '';
  
  return html
    .replace(/<strong>/g, '**')
    .replace(/<\/strong>/g, '**')
    .replace(/<b>/g, '**')
    .replace(/<\/b>/g, '**')
    .replace(/<em>/g, '*')
    .replace(/<\/em>/g, '*')
    .replace(/<i>/g, '*')
    .replace(/<\/i>/g, '*')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>\s*<p>/g, '\n\n')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Load questions into database
async function loadToDatabase(selectedFile, options = {}) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Read and parse the file
    const content = fs.readFileSync(selectedFile.path, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`\n${colors.blue}Chargement depuis: ${colors.cyan}${selectedFile.name}${colors.reset}`);
    
    // Determine the format and extract questions
    let questions = [];
    if (data.flashcards && Array.isArray(data.flashcards)) {
      questions = data.flashcards;
    } else if (data.questions && Array.isArray(data.questions)) {
      questions = data.questions;
    } else {
      throw new Error('Format de fichier non reconnu');
    }
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      
      try {
        // Extract question and answer based on format
        let questionText = '';
        let answerText = '';
        let tags = [];
        let sources = [];
        let difficulty = null;
        
        // Handle different field names
        questionText = item.question || item.question_text || '';
        answerText = item.answer || item.answer_text || '';
        tags = item.tags || [];
        sources = item.sources || [];
        difficulty = item.difficulty || null;
        
        // Convert HTML to markdown if needed
        if (questionText.includes('<') && questionText.includes('>')) {
          questionText = htmlToMarkdown(questionText);
        }
        if (answerText.includes('<') && answerText.includes('>')) {
          answerText = htmlToMarkdown(answerText);
        }
        
        // Skip if question already exists (avoid duplicates by default)
        if (!options.allowDuplicates) {
          const existingQuestion = await client.query(
            'SELECT id FROM questions WHERE question_text = $1',
            [questionText]
          );
          
          if (existingQuestion.rows.length > 0) {
            if (options.verbose) {
              console.log(`${colors.yellow}⊘${colors.reset} Ignoré (existe déjà): ${questionText.substring(0, 50)}...`);
            }
            skipCount++;
            continue;
          }
        }
        
        // Process markdown to generate HTML and metadata
        const questionProcessed = processMarkdown(questionText, 'question');
        const answerProcessed = processMarkdown(answerText, 'answer');

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

        // Insert the question with HTML and metadata
        const questionResult = await client.query(
          `INSERT INTO questions (
            question_text,
            answer_text,
            question_html,
            answer_html,
            is_active,
            sources,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            questionText,
            answerText,
            questionProcessed.html,
            answerProcessed.html,
            true, // Set as active by default
            JSON.stringify(sources || []), // Store sources as JSONB
            JSON.stringify(metadata) // Store metadata as JSONB
          ]
        );
        
        const questionId = questionResult.rows[0].id;
        
        // Process tags
        for (const tagName of tags) {
          if (!tagName || tagName.trim() === '') continue;
          
          // Get or create the tag
          let tagResult = await client.query(
            'SELECT id FROM tags WHERE LOWER(name) = LOWER($1)',
            [tagName.trim()]
          );
          
          let tagId;
          if (tagResult.rows.length === 0) {
            // Determine category based on tag name
            let category = 'general';
            if (tagName.toLowerCase() === 'fondamental') {
              category = 'topic';
            } else if (['Antibiotiques', 'Cardiologie', 'Neurologie', 'Psychiatrie', 'Diabétologie'].some(cat => 
              tagName.toLowerCase().includes(cat.toLowerCase())
            )) {
              category = 'therapeutic_class';
            }
            
            const createTagResult = await client.query(
              'INSERT INTO tags (name, category) VALUES ($1, $2) RETURNING id',
              [tagName.trim(), category]
            );
            tagId = createTagResult.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }
          
          // Link question to tag
          await client.query(
            'INSERT INTO question_tags (question_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [questionId, tagId]
          );
        }
        
        // Sources are already stored in the sources JSONB column
        // No need for separate question_sources table
        
        successCount++;
        
        // Show progress
        if ((i + 1) % 10 === 0 || i === questions.length - 1) {
          process.stdout.write(`\r${colors.green}Progression: ${i + 1}/${questions.length} questions traitées${colors.reset}`);
        }
        
      } catch (error) {
        errorCount++;
        if (options.verbose) {
          console.error(`\n${colors.red}✗${colors.reset} Erreur pour la question ${i + 1}:`, error.message);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n\n${colors.bright}${colors.green}Résultats du chargement:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Ajoutées: ${colors.bright}${successCount}${colors.reset} questions`);
    console.log(`  ${colors.yellow}⊘${colors.reset} Ignorées: ${colors.bright}${skipCount}${colors.reset} questions (doublons)`);
    if (errorCount > 0) {
      console.log(`  ${colors.red}✗${colors.reset} Erreurs: ${colors.bright}${errorCount}${colors.reset} questions`);
    }
    
    return { success: true, added: successCount, skipped: skipCount, errors: errorCount };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Main interactive function
async function main() {
  console.log(`\n${colors.bright}${colors.magenta}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║   Chargement des Questions dans PostgreSQL        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚════════════════════════════════════════════════════╝${colors.reset}\n`);


  // Get all available JSON files
  const files = getQuestionFiles();
  
  if (files.length === 0) {
    console.log(`${colors.red}Aucun fichier JSON trouvé dans le dossier questions.${colors.reset}`);
    process.exit(1);
  }
  
  // Display available files
  console.log(`${colors.yellow}📁 Fichiers disponibles:${colors.reset}\n`);
  
  files.forEach((file, index) => {
    const info = getFileInfo(file.path);
    const statusIcon = info.format === 'error' ? '❌' : '📄';
    
    console.log(`${colors.bright}[${index + 1}]${colors.reset} ${statusIcon} ${colors.cyan}${file.name}${colors.reset}`);
    console.log(`    📂 ${file.directory}`);
    console.log(`    📊 ${info.questions} questions | 💾 ${info.size} | 📅 ${info.modified}`);
    console.log(`    📝 ${info.title}`);
    if (info.tags.length > 0) {
      console.log(`    🏷️  ${info.tags.slice(0, 5).join(', ')}${info.tags.length > 5 ? '...' : ''}`);
    }
    console.log('');
  });
  
  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Prompt user for selection
  const question = `${colors.yellow}Sélectionnez un fichier à charger (1-${files.length}), 'all' pour tout charger, ou 'q' pour quitter: ${colors.reset}`;
  
  rl.question(question, async (answer) => {
    if (answer.toLowerCase() === 'q') {
      console.log(`${colors.yellow}Opération annulée.${colors.reset}`);
      rl.close();
      process.exit(0);
    }
    
    let filesToLoad = [];
    
    if (answer.toLowerCase() === 'all') {
      filesToLoad = files;
      console.log(`\n${colors.magenta}Chargement de tous les fichiers (${files.length} fichiers)${colors.reset}\n`);
    } else {
      const selection = parseInt(answer);
      
      if (isNaN(selection) || selection < 1 || selection > files.length) {
        console.log(`${colors.red}✗ Sélection invalide. Veuillez choisir un nombre entre 1 et ${files.length}.${colors.reset}`);
        rl.close();
        process.exit(1);
      }
      
      filesToLoad = [files[selection - 1]];
      console.log(`\n${colors.green}Fichier sélectionné:${colors.reset} ${colors.bright}${filesToLoad[0].name}${colors.reset}\n`);
    }
    
    // Ask for additional options
    rl.question(`${colors.yellow}Autoriser les doublons? (o/n, défaut: n): ${colors.reset}`, async (allowDuplicates) => {
      const options = {
        allowDuplicates: allowDuplicates.toLowerCase() === 'o' || allowDuplicates.toLowerCase() === 'oui',
        verbose: true,
        status: 'published'
      };
      
      rl.question(`${colors.yellow}Statut des questions (published/draft, défaut: published): ${colors.reset}`, async (status) => {
        if (status === 'draft') {
          options.status = 'draft';
        }
        
        // Confirm the selection
        const totalQuestions = filesToLoad.reduce((sum, file) => {
          const info = getFileInfo(file.path);
          return sum + (info.questions === 'N/A' ? 0 : info.questions);
        }, 0);
        
        console.log(`\n${colors.cyan}Récapitulatif:${colors.reset}`);
        console.log(`  - Fichiers à charger: ${filesToLoad.length}`);
        console.log(`  - Questions totales: ~${totalQuestions}`);
        console.log(`  - Doublons: ${options.allowDuplicates ? 'Autorisés' : 'Ignorés'}`);
        console.log(`  - Statut: ${options.status}`);
        
        rl.question(`\n${colors.yellow}Confirmer le chargement? (o/n): ${colors.reset}`, async (confirm) => {
          if (confirm.toLowerCase() === 'o' || confirm.toLowerCase() === 'oui') {
            console.log(`\n${colors.blue}🔄 Chargement en cours...${colors.reset}\n`);
            
            let totalStats = { added: 0, skipped: 0, errors: 0 };
            
            for (const file of filesToLoad) {
              try {
                console.log(`\n${colors.cyan}📁 Traitement: ${file.name}${colors.reset}`);
                const stats = await loadToDatabase(file, options);
                totalStats.added += stats.added;
                totalStats.skipped += stats.skipped;
                totalStats.errors += stats.errors;
              } catch (error) {
                console.error(`\n${colors.red}✗ Erreur lors du chargement de ${file.name}:${colors.reset}`, error.message);
                totalStats.errors++;
              }
            }
            
            console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════════${colors.reset}`);
            console.log(`${colors.bright}${colors.green}✓ Chargement terminé!${colors.reset}`);
            console.log(`${colors.bright}${colors.green}═══════════════════════════════════════${colors.reset}`);
            console.log(`\nRésumé total:`);
            console.log(`  ${colors.green}✓${colors.reset} Questions ajoutées: ${colors.bright}${totalStats.added}${colors.reset}`);
            console.log(`  ${colors.yellow}⊘${colors.reset} Questions ignorées: ${colors.bright}${totalStats.skipped}${colors.reset}`);
            if (totalStats.errors > 0) {
              console.log(`  ${colors.red}✗${colors.reset} Erreurs rencontrées: ${colors.bright}${totalStats.errors}${colors.reset}`);
            }
            
            console.log(`\n${colors.cyan}Les questions sont maintenant disponibles dans la base de données PostgreSQL.${colors.reset}`);
            
          } else {
            console.log(`${colors.yellow}Opération annulée.${colors.reset}`);
          }
          
          rl.close();
          process.exit(0);
        });
      });
    });
  });
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}Erreur non gérée:${colors.reset}`, error);
  process.exit(1);
});

// Run the script
main().catch(error => {
  console.error(`\n${colors.red}Erreur fatale:${colors.reset}`, error.message);
  if (error.message.includes('ECONNREFUSED')) {
    console.error(`${colors.yellow}Vérifiez que PostgreSQL est démarré et accessible.${colors.reset}`);
  }
  process.exit(1);
});