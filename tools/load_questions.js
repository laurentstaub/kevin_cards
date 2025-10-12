#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..'); // <-- AJOUT: Remonter d'un niveau pour trouver la racine

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Function to get all JSON files from questions folder
function getQuestionFiles() {
  const questionsDir = path.join(projectRoot, 'zz_questions', 'questions'); // <-- MODIFIÉ: Utilise projectRoot
  const archiveDir = path.join(questionsDir, 'zz_questions_archive');

  const files = [];

  // Get files from main questions directory
  const mainFiles = fs.readdirSync(questionsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(questionsDir, file),
      directory: 'questions'
    }));

  // Get files from archive directory if it exists
  if (fs.existsSync(archiveDir)) {
    const archiveFiles = fs.readdirSync(archiveDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(archiveDir, file),
        directory: 'questions/archive'
      }));
    files.push(...mainFiles, ...archiveFiles);
  } else {
    files.push(...mainFiles);
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
    const questionCount = data.flashcards ? data.flashcards.length :
      data.questions ? data.questions.length : 'N/A';

    return {
      size: fileSize,
      modified: modifiedDate,
      questions: questionCount,
      title: data.metadata?.title || 'Sans titre'
    };
  } catch (error) {
    return {
      size: 'N/A',
      modified: 'N/A',
      questions: 'N/A',
      title: 'Erreur de lecture'
    };
  }
}

// Function to copy selected file to API directory
async function loadToDatabase(selectedFile) {
  const targetDir = path.join(projectRoot, 'api', 'data'); // <-- MODIFIÉ: Utilise projectRoot
  const targetPath = path.join(targetDir, '00.questions.json');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Dossier 'api/data' créé`);
  }

  try {
    // Copy the file
    fs.copyFileSync(selectedFile.path, targetPath);
    console.log(`${colors.green}✓${colors.reset} Fichier copié vers: ${colors.cyan}api/data/00.questions.json${colors.reset}`);

    // Verify the copy
    if (fs.existsSync(targetPath)) {
      const info = getFileInfo(targetPath);
      console.log(`${colors.green}✓${colors.reset} Vérification réussie:`);
      console.log(`  - ${info.questions} questions chargées`);
      console.log(`  - Titre: ${info.title}`);
      return true;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Erreur lors de la copie:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log(`\n${colors.bright}${colors.blue}=== Chargement des Questions dans la Base de Données ===${colors.reset}\n`);

  // Get all available JSON files
  const files = getQuestionFiles();

  if (files.length === 0) {
    console.log(`${colors.red}Aucun fichier JSON trouvé dans le dossier questions.${colors.reset}`);
    process.exit(1);
  }

  // Display available files
  console.log(`${colors.yellow}Fichiers disponibles:${colors.reset}\n`);

  files.forEach((file, index) => {
    const info = getFileInfo(file.path);
    console.log(`${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}${file.name}${colors.reset}`);
    console.log(`    📁 ${file.directory}`);
    console.log(`    📊 ${info.questions} questions | 📏 ${info.size} | 📅 ${info.modified}`);
    console.log(`    📝 ${info.title}`);
    console.log('');
  });

  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Prompt user for selection
  const question = `${colors.yellow}Sélectionnez un fichier à charger (1-${files.length}) ou 'q' pour quitter: ${colors.reset}`;

  rl.question(question, async (answer) => {
    if (answer.toLowerCase() === 'q') {
      console.log(`${colors.yellow}Opération annulée.${colors.reset}`);
      rl.close();
      process.exit(0);
    }

    const selection = parseInt(answer);

    if (isNaN(selection) || selection < 1 || selection > files.length) {
      console.log(`${colors.red}✗ Sélection invalide. Veuillez choisir un nombre entre 1 et ${files.length}.${colors.reset}`);
      rl.close();
      process.exit(1);
    }

    const selectedFile = files[selection - 1];
    console.log(`\n${colors.green}Vous avez sélectionné:${colors.reset} ${colors.bright}${selectedFile.name}${colors.reset}\n`);

    // Confirm the selection
    rl.question(`${colors.yellow}Confirmer le chargement? (o/n): ${colors.reset}`, async (confirm) => {
      if (confirm.toLowerCase() === 'o' || confirm.toLowerCase() === 'oui') {
        console.log(`\n${colors.blue}Chargement en cours...${colors.reset}`);

        const success = await loadToDatabase(selectedFile);

        if (success) {
          console.log(`\n${colors.green}${colors.bright}✓ Chargement terminé avec succès!${colors.reset}`);
          console.log(`${colors.cyan}Les questions sont maintenant disponibles dans l'API.${colors.reset}`);
          console.log(`${colors.yellow}Note: Redémarrez l'API si nécessaire pour prendre en compte les changements.${colors.reset}`);
        } else {
          console.log(`\n${colors.red}✗ Le chargement a échoué.${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}Opération annulée.${colors.reset}`);
      }

      rl.close();
    });
  });
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Erreur fatale:${colors.reset}`, error);
  process.exit(1);
});
