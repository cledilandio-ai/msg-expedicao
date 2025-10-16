// ===================================================================
// SCRIPT COMPARTILHADO (shared.js)
// Funções usadas por ambas as páginas para evitar repetição.
// ===================================================================

/**
 * Função: parseCSV
 * Objetivo: Converte o texto da planilha (TSV) em uma matriz de dados.
 * @param {string} text - O conteúdo de texto da planilha.
 * @returns {Array<Array<string>>} - Uma matriz de linhas e colunas.
 */
function parseCSV(text) {
    // Quebra o texto em linhas e remove linhas vazias.
    const rows = text.split('\n').filter(row => row.trim() !== '');
    // Para cada linha, quebra em colunas usando a tabulação (\t) e limpa os espaços.
    return rows.map(row => row.split('\t').map(cell => cell.trim().replace(/"/g, '')));
}

/**
 * Função: cleanNumber
 * Objetivo: Pega um texto (ex: "1.250,75") e o converte para um número que o JavaScript entende (1250.75).
 * @param {string} str - O texto do número a ser limpo.
 * @returns {number} - O número convertido.
 */
function cleanNumber(str) {
    if (!str) return 0;
    // Remove os pontos de milhar, troca a vírgula por ponto decimal, e converte para número.
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}