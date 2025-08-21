import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

// Custom renderer for pharmacy-specific content
class PharmacyRenderer extends marked.Renderer {
  constructor(options) {
    super(options);
  }

  // Drug names: **drug** → <strong class="drug-name">drug</strong>
  strong(text) {
    // Check if this looks like a drug name (starts with capital, contains typical drug patterns)
    if (this.isDrugName(text)) {
      return `<strong class="drug-name">${text}</strong>`;
    }
    return `<strong>${text}</strong>`;
  }

  // Drug classes: *class* → <em class="drug-class">class</em>
  em(text) {
    // Check if this looks like a drug class (ends with common suffixes)
    if (this.isDrugClass(text)) {
      return `<em class="drug-class">${text}</em>`;
    }
    return `<em>${text}</em>`;
  }

  // Custom alert syntax: [!TYPE] content → <div class="alert alert-type">content</div>
  paragraph(text) {
    // First handle ##drug## syntax from migrated content
    text = text.replace(/##([^#]+)##/g, '<strong class="drug-name">$1</strong>');
    
    const alertMatch = text.match(/^\[!(WARNING|INFO|DANGER|SUCCESS)\]\s*(.*)$/i);
    if (alertMatch) {
      const type = alertMatch[1].toLowerCase();
      const content = alertMatch[2];
      return `<div class="alert alert-${type}">
        <i class="fas fa-${this.getAlertIcon(type)}"></i>
        <span>${content}</span>
      </div>`;
    }

    // Check for dosage patterns and add special styling
    if (this.containsDosage(text)) {
      return `<p class="dosage-info">${text}</p>`;
    }

    return `<p>${text}</p>`;
  }

  // Lists with special pharmacy formatting
  list(body, ordered, start) {
    const type = ordered ? 'ol' : 'ul';
    const startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
    
    // Add special classes for common pharmacy list types
    let className = '';
    if (body.includes('mg/kg') || body.includes('Posologie')) {
      className = ' class="dosage-list"';
    } else if (body.includes('Contre-indication') || body.includes('CI')) {
      className = ' class="contraindication-list"';
    } else if (body.includes('Effet') || body.includes('indésirable')) {
      className = ' class="side-effects-list"';
    }

    return `<${type}${startatt}${className}>\n${body}</${type}>\n`;
  }

  // Code blocks for drug formulas or chemical structures
  code(code, infostring, escaped) {
    const lang = (infostring || '').match(/\S*/)?.[0];
    
    if (lang === 'formula' || lang === 'chemical') {
      return `<div class="chemical-formula">${escaped ? code : this.escape(code)}</div>`;
    }
    
    if (lang === 'dosage') {
      return `<div class="dosage-calculation">${escaped ? code : this.escape(code)}</div>`;
    }

    return `<code class="inline-code">${escaped ? code : this.escape(code)}</code>`;
  }

  // Helper methods for drug identification
  isDrugName(text) {
    // Common drug name patterns
    const drugPatterns = [
      /^[A-Z][a-z]+ine$/,        // -ine suffix (pénicilline, morphine)
      /^[A-Z][a-z]+ol$/,         // -ol suffix (paracétamol)
      /^[A-Z][a-z]+ide$/,        // -ide suffix
      /^[A-Z][a-z]+ate$/,        // -ate suffix
      /^[A-Z][a-z]+cilline$/,    // -cilline suffix
      /^[A-Z][a-z]+mycine$/,     // -mycine suffix
      /^[A-Z][a-z]+flurane$/,    // anesthetics
      /\d+\s*mg|\d+\s*g/,        // Contains dosage
    ];
    
    return drugPatterns.some(pattern => pattern.test(text)) || 
           this.isKnownDrug(text);
  }

  isDrugClass(text) {
    const classPatterns = [
      /béta?-lactamines?/i,
      /pénicillines?/i,
      /céphalosporines?/i,
      /quinolones?/i,
      /macrolides?/i,
      /antibiotiques?/i,
      /anti-inflammatoires?/i,
      /antalgiques?/i,
      /antihistaminiques?/i,
      /corticoïdes?/i,
      /diurétiques?/i,
      /bêtabloquants?/i
    ];
    
    return classPatterns.some(pattern => pattern.test(text));
  }

  isKnownDrug(text) {
    // List of common pharmacy drugs for exact matching
    const knownDrugs = [
      'Amoxicilline', 'Paracétamol', 'Ibuprofène', 'Aspirine',
      'Morphine', 'Codéine', 'Tramadol', 'Oméprazole',
      'Simvastatine', 'Metformine', 'Warfarine', 'Héparine',
      'Furosémide', 'Aténolol', 'Métoprolol', 'Amlodipine',
      'Lisinopril', 'Losartan', 'Prednisolone', 'Hydrocortisone'
    ];
    
    return knownDrugs.includes(text);
  }

  containsDosage(text) {
    const dosagePatterns = [
      /\d+\s*(mg|g|ml|µg)/i,
      /\d+\s*fois?\s*par\s*jour/i,
      /matin\s*et\s*soir/i,
      /toutes?\s*les?\s*\d+\s*heures?/i,
      /\d+\s*mg\/kg/i
    ];
    
    return dosagePatterns.some(pattern => pattern.test(text));
  }

  getAlertIcon(type) {
    const icons = {
      warning: 'exclamation-triangle',
      info: 'info-circle',
      danger: 'times-circle',
      success: 'check-circle'
    };
    return icons[type] || 'info-circle';
  }

  escape(html) {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Configure marked with custom renderer and options
const renderer = new PharmacyRenderer();

marked.setOptions({
  renderer: renderer,
  gfm: true,                    // GitHub Flavored Markdown
  breaks: false,                // Don't convert \n to <br>
  pedantic: false,              // Don't be overly strict
  sanitize: false,              // We'll handle sanitization elsewhere
  smartypants: true,            // Use smart quotes and dashes
});

// Entity extraction for metadata
export const extractEntities = (text) => {
  const entities = {
    drugs: [],
    drug_classes: [],
    conditions: [],
    dosages: [],
    routes: []
  };

  // Extract drug names (words in **bold** that match patterns or ##drug## syntax)
  const boldMatches = text.match(/\*\*(.*?)\*\*/g) || [];
  const drugMatches = text.match(/##([^#]+)##/g) || [];
  
  boldMatches.forEach(match => {
    const drug = match.replace(/\*\*/g, '');
    if (renderer.isDrugName(drug)) {
      entities.drugs.push(drug);
    }
  });
  
  // Handle ##drug## syntax from migrated content
  drugMatches.forEach(match => {
    const drug = match.replace(/##/g, '');
    entities.drugs.push(drug);
  });

  // Extract drug classes (words in *italics* that match patterns)
  const italicMatches = text.match(/\*(.*?)\*/g) || [];
  italicMatches.forEach(match => {
    const drugClass = match.replace(/\*/g, '');
    if (renderer.isDrugClass(drugClass)) {
      entities.drug_classes.push(drugClass);
    }
  });

  // Extract conditions and symptoms
  const conditionPatterns = [
    /infection/gi, /allergie/gi, /douleur/gi, /fièvre/gi,
    /hypertension/gi, /diabète/gi, /asthme/gi, /épilepsie/gi,
    /dépression/gi, /anxiété/gi, /insomnie/gi, /migraine/gi
  ];
  
  conditionPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      if (!entities.conditions.includes(match.toLowerCase())) {
        entities.conditions.push(match.toLowerCase());
      }
    });
  });

  // Extract dosages
  const dosagePattern = /\d+\s*(mg|g|ml|µg|UI)/gi;
  const dosageMatches = text.match(dosagePattern) || [];
  entities.dosages = [...new Set(dosageMatches.map(d => d.toLowerCase()))];

  // Extract routes of administration
  const routePatterns = [
    /per os/gi, /IV/gi, /IM/gi, /SC/gi, /topique/gi,
    /oral/gi, /injectable/gi, /perfusion/gi, /suppositoire/gi
  ];
  
  routePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      if (!entities.routes.includes(match.toLowerCase())) {
        entities.routes.push(match.toLowerCase());
      }
    });
  });

  // Remove duplicates and empty values
  Object.keys(entities).forEach(key => {
    entities[key] = [...new Set(entities[key].filter(Boolean))];
  });

  return entities;
};

// Main markdown processing function
export const processMarkdown = (markdownText) => {
  if (!markdownText || typeof markdownText !== 'string') {
    return { html: '', entities: {}, stats: {} };
  }

  try {
    // Generate HTML
    const html = marked.parse(markdownText);
    
    // Extract entities for metadata
    const entities = extractEntities(markdownText);
    
    // Calculate basic statistics
    const stats = {
      word_count: markdownText.split(/\s+/).length,
      character_count: markdownText.length,
      estimated_read_time: Math.ceil(markdownText.split(/\s+/).length / 200), // Words per minute
      has_alerts: /\[!(WARNING|INFO|DANGER|SUCCESS)\]/i.test(markdownText),
      has_dosage: renderer.containsDosage(markdownText),
      processed_at: new Date().toISOString()
    };

    return { html, entities, stats };
  } catch (error) {
    console.error('Markdown processing error:', error);
    return {
      html: `<p class="error">Error processing markdown: ${error.message}</p>`,
      entities: {},
      stats: { error: error.message }
    };
  }
};

// Quick HTML generation without metadata (for preview)
export const markdownToHtml = (markdownText) => {
  if (!markdownText) return '';
  try {
    return marked.parse(markdownText);
  } catch (error) {
    return `<p class="error">Error: ${error.message}</p>`;
  }
};

export default { processMarkdown, markdownToHtml, extractEntities };