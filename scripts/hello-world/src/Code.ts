/**
 * @NApiVersion 2.x
 * @NScriptType UserScript
 * @Description Exemple de script Google Apps Script pour Territoire Saône et Collines
 */

/**
 * Fonction principale exécutée par Google Apps Script
 */
function myFunction(): void {
  Logger.log("Hello from Territoire Saône et Collines!");
}

/**
 * Exemple de fonction qui retourne une valeur
 * @returns {string} Un message de salutation
 */
function getGreeting(): string {
  return "Bonjour depuis le territoire Saône et Collines!";
}

/**
 * Exemple de fonction avec paramètres
 * @param {string} name - Le nom à saluer
 * @returns {string} Message de salutation personnalisé
 */
function greet(name: string): string {
  return `Bonjour, ${name}! Bienvenue sur le territoire Saône et Collines.`;
}
