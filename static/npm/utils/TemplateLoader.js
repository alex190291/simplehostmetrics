/**
 * Loads an HTML template file from the server
 * @param {string} templatePath - Path to the template file
 * @returns {Promise<string>} - The template HTML as a string
 */
export async function loadTemplate(templatePath) {
  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error loading template from ${templatePath}:`, error);
    throw error;
  }
}

/**
 * Processes a template by replacing placeholders with actual values
 * @param {string} template - The template string with {{placeholders}}
 * @param {Object} data - Object containing values to replace placeholders with
 * @returns {string} - The processed template
 */
export function processTemplate(template, data = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : '';
  });
}