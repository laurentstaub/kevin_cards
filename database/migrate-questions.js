import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getClient } from '../api/config/database.js';
import TurndownService from 'turndown';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**'
});

// Custom rules for pharmacy-specific HTML patterns
turndownService.addRule('drugName', {
  filter: function(node, options) {
    return (
      node.nodeName === 'SPAN' && 
      node.className === 'drug-name'
    );
  },
  replacement: function(content, node, options) {
    // Drug names use special ## syntax to preserve semantic meaning
    return `##${content}##`;
  }
});

turndownService.addRule('effectType', {
  filter: function(node, options) {
    return (
      node.nodeName === 'SPAN' && 
      node.className === 'effect-type'
    );
  },
  replacement: function(content, node, options) {
    // Effect types converted to plain text (no formatting)
    return content;
  }
});

turndownService.addRule('warning', {
  filter: function(node, options) {
    return (
      node.nodeName === 'SPAN' && 
      node.className === 'warning'
    );
  },
  replacement: function(content, node, options) {
    // Warnings should be highlighted
    return `[!WARNING] ${content}`;
  }
});

turndownService.addRule('highlight', {
  filter: function(node, options) {
    return (
      node.nodeName === 'SPAN' && 
      node.className === 'highlight'
    );
  },
  replacement: function(content, node, options) {
    // Important highlights
    return `**${content}**`;
  }
});

turndownService.addRule('dosage', {
  filter: function(node, options) {
    return (
      node.nodeName === 'SPAN' && 
      node.className === 'dosage'
    );
  },
  replacement: function(content, node, options) {
    // Dosage information should be bold
    return `**${content}**`;
  }
});

// Remove wrapper divs
turndownService.addRule('removeWrappers', {
  filter: function(node, options) {
    return (
      node.nodeName === 'DIV' && 
      (node.className === 'card-content' || 
       node.id === 'questionContent' || 
       node.id === 'answerContent')
    );
  },
  replacement: function(content, node, options) {
    // Just return the content without the wrapper
    return content;
  }
});

// Handle lists with special classes
turndownService.addRule('specialLists', {
  filter: function(node, options) {
    return (
      (node.nodeName === 'UL' || node.nodeName === 'OL') && 
      node.className
    );
  },
  replacement: function(content, node, options) {
    const listType = node.nodeName === 'UL' ? '-' : '1.';
    const className = node.className;
    
    // Add a descriptive prefix based on class
    let prefix = '';
    if (className === 'bacteria-list') {
      prefix = 'Bactéries concernées :\n';
    } else if (className === 'mechanism-list') {
      prefix = 'Mécanismes :\n';
    }
    
    return prefix + content;
  }
});

// Extract tags and map them properly
function mapTags(tags) {
  const tagMapping = {
    // Therapeutic areas
    'Antibiotiques': 'therapeutic_area',
    'Antalgiques': 'therapeutic_area',
    'Cardiovasculaire': 'therapeutic_area',
    'Psychotropes': 'therapeutic_area',
    'Gastro-entérologie': 'therapeutic_area',
    
    // Drug classes
    'Beta-lactamines': 'drug_class',
    'Macrolides': 'drug_class',
    'Fluoroquinolones': 'drug_class',
    'Aminosides': 'drug_class',
    'Tétracyclines': 'drug_class',
    'Pénicillines': 'drug_class',
    'Céphalosporines': 'drug_class',
    'Carbapénèmes': 'drug_class',
    'AINS': 'drug_class',
    'Opioïdes': 'drug_class',
    'IEC': 'drug_class',
    'ARA2': 'drug_class',
    'Beta-bloquants': 'drug_class',
    'Diurétiques': 'drug_class',
    'Statines': 'drug_class',
    'ISRS': 'drug_class',
    'Benzodiazépines': 'drug_class',
    'IPP': 'drug_class',
    
    // Topics
    'Mécanisme-action': 'topic',
    'Pharmacocinétique': 'topic',
    'Interactions-majeures': 'topic',
    'Contre-indications-absolues': 'topic',
    'Effets-indésirables-graves': 'topic',
    'Surveillance': 'topic',
    'Résistances': 'topic',
    'Spectre-activité': 'topic',
    'Classification': 'topic',
    
    // Special populations
    'Grossesse': 'special_population',
    'Pédiatrie': 'special_population',
    'Insuffisance-rénale': 'special_population',
    
    // Toxicity
    'Hépatotoxicité': 'toxicity',
    'Néphrotoxicité': 'toxicity',
    'Syndrome-sérotoninergique': 'toxicity',
    'Hyperkaliémie': 'toxicity',
    'Surdosage': 'toxicity',
    
    // Other
    'Urgences': 'situation',
    'Cytochromes': 'metabolism'
  };
  
  return tags.map(tag => ({
    name: tag,
    category: tagMapping[tag] || 'topic'
  }));
}

// Convert HTML to Markdown
function htmlToMarkdown(html) {
  if (!html) return '';
  
  // Pre-process HTML to handle common patterns
  let processedHtml = html
    // Fix drug names in bold tags that might not have classes
    .replace(/<strong>([A-Z][a-zé]+(?:ine|ol|ide|ate|amine|azole|pam))<\/strong>/g, '<span class="drug-name">$1</span>')
    // Fix italic drug classes
    .replace(/<em>((?:bêta|béta|beta)[-\s]?lactamines?|pénicillines?|macrolides?|fluoroquinolones?)<\/em>/gi, '<span class="drug-class">$1</span>')
    // Fix bacteria names in italics
    .replace(/<em>([A-Z]\.\s*[a-z]+|Staphylococcus|Streptococcus|Klebsiella|Escherichia)<\/em>/g, '_$1_');
  
  // Convert to markdown
  let markdown = turndownService.turndown(processedHtml);
  
  // Post-process markdown
  markdown = markdown
    // Clean up extra newlines
    .replace(/\n{3,}/g, '\n\n')
    // Fix spacing around lists
    .replace(/\n\n-/g, '\n-')
    // Ensure proper formatting for drug classes
    .replace(/\*\*(bêta|béta|beta)[-\s]?lactamines?\*\*/gi, '*$1-lactamines*')
    // Fix bacteria italic markers (ensure proper formatting)
    .replace(/\\_/g, '_')
    // Clean up list prefixes that might be duplicated
    .replace(/(Bactéries concernées :\n)+/g, 'Bactéries concernées :\n')
    .replace(/(Mécanismes :\n)+/g, 'Mécanismes :\n')
    // Trim whitespace
    .trim();
  
  return markdown;
}

// Preview conversion for a few questions
async function previewConversion(dryRun = true) {
  console.log('========================================');
  console.log('MIGRATION PREVIEW - HTML to Markdown');
  console.log('========================================\n');
  
  // Load the JSON file
  const jsonPath = path.join(__dirname, '../zz_questions/00_questions.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  console.log(`Total questions to migrate: ${jsonData.flashcards.length}\n`);
  
  // Preview first 5 questions
  const previewCount = 5;
  console.log(`Showing conversion for first ${previewCount} questions:\n`);
  
  for (let i = 0; i < Math.min(previewCount, jsonData.flashcards.length); i++) {
    const card = jsonData.flashcards[i];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`QUESTION #${card.id}`);
    console.log(`${'='.repeat(60)}`);
    
    console.log('\nTAGS:');
    const mappedTags = mapTags(card.tags);
    mappedTags.forEach(tag => {
      console.log(`  - ${tag.name} (${tag.category})`);
    });
    
    console.log('\nORIGINAL QUESTION (HTML):');
    console.log(card.question);
    
    console.log('\nCONVERTED QUESTION (Markdown):');
    const questionMd = htmlToMarkdown(card.question);
    console.log(questionMd);
    
    console.log('\nORIGINAL ANSWER (HTML):');
    console.log(card.answer);
    
    console.log('\nCONVERTED ANSWER (Markdown):');
    const answerMd = htmlToMarkdown(card.answer);
    console.log(answerMd);
  }
  
  if (dryRun) {
    console.log('\n' + '='.repeat(60));
    console.log('DRY RUN MODE - No database changes made');
    console.log('To perform actual migration, run with --execute flag');
    console.log('='.repeat(60));
  }
  
  return jsonData;
}

// Main migration function
async function migrateQuestions(execute = false) {
  const jsonData = await previewConversion(!execute);
  
  if (!execute) {
    console.log('\nMigration script ready. Review the conversions above.');
    console.log('Run with --execute flag to perform actual migration.');
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('STARTING ACTUAL MIGRATION');
  console.log('='.repeat(60) + '\n');
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create default user for migration
    const userResult = await client.query(`
      INSERT INTO users (email, name, role) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name 
      RETURNING id
    `, ['migration@flashpharma.fr', 'Migration Script', 'admin']);
    
    const userId = userResult.rows[0].id;
    console.log(`Using user ID ${userId} for migration\n`);
    
    // 2. Create all unique tags
    const allTags = new Set();
    jsonData.flashcards.forEach(card => {
      card.tags?.forEach(tag => allTags.add(tag));
    });
    
    const tagIdMap = {};
    for (const tagName of allTags) {
      const mappedTag = mapTags([tagName])[0];
      
      const tagResult = await client.query(`
        INSERT INTO tags (name, category, created_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE
        SET category = COALESCE(tags.category, EXCLUDED.category)
        RETURNING id
      `, [mappedTag.name, mappedTag.category, userId]);
      
      tagIdMap[tagName] = tagResult.rows[0].id;
      console.log(`  Tag: ${tagName} -> ID ${tagIdMap[tagName]} (${mappedTag.category})`);
    }
    
    console.log(`\nCreated/updated ${allTags.size} tags\n`);
    
    // 3. Migrate questions
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const card of jsonData.flashcards) {
      try {
        // Convert HTML to Markdown
        const questionMd = htmlToMarkdown(card.question);
        const answerMd = htmlToMarkdown(card.answer);
        
        // Default sources for migrated content
        const sources = [{
          type: 'internal',
          title: 'Questions de pharmacologie - Version originale',
          year: 2025
        }];
        
        // Insert question
        const questionResult = await client.query(`
          INSERT INTO questions (
            question_text, 
            answer_text, 
            sources, 
            status, 
            created_by,
            validated_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          questionMd,
          answerMd,
          JSON.stringify(sources),
          'published', // All migrated questions start as published
          userId,
          userId // Same user validates the migrated content
        ]);
        
        const questionId = questionResult.rows[0].id;
        
        // Add tags
        for (const tagName of card.tags || []) {
          const tagId = tagIdMap[tagName];
          if (tagId) {
            await client.query(`
              INSERT INTO question_tags (question_id, tag_id, assigned_by)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [questionId, tagId, userId]);
          }
        }
        
        successCount++;
        console.log(`  Question #${card.id} -> DB ID ${questionId}`);
        
      } catch (error) {
        errorCount++;
        errors.push({ card: card.id, error: error.message });
        console.error(`  Failed to migrate question #${card.id}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Successfully migrated: ${successCount} questions`);
    console.log(`Failed: ${errorCount} questions`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  - Question ${e.card}: ${e.error}`));
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nMigration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
const args = process.argv.slice(2);
const execute = args.includes('--execute');

if (execute) {
  console.log('WARNING: This will modify your database!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  setTimeout(() => {
    migrateQuestions(true).catch(console.error);
  }, 5000);
} else {
  previewConversion(true).catch(console.error);
}