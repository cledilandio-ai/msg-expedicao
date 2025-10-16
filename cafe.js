// ===================================================================
// SCRIPT COMPLETO PARA A PÁGINA DE CAFÉ (cafe.html)
// ===================================================================

// --- Configuração dos Índices da Planilha ---
// Esta seção centraliza todos os "endereços" das células que o dashboard lê.
// Se a sua planilha mudar, você só precisa ajustar os números de linha e coluna aqui.
const CONFIG = {
    // URL da planilha de dados do café, já no formato TSV.
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShhn4owra2uDPiFvdJQ4YnVE3tfvqEksVPK8aYl81IyYWMI-N2h6cr_nfXrv-6Y7uPNMRAkWIhARyC/pub?gid=862076930&single=true&output=tsv',

    // Célula do KPI principal no cabeçalho.
    saldoTrabalho: { linha: 13, coluna: 0 },

    // Mapeamento dos produtos para os cards de Estoque, Vendido e para o gráfico.
    produtos: {
        'sg-250':   { nome: 'SG 250g', estoque: { linha: 4, coluna: 2 }, vendido: { linha: 4, coluna: 1 } },
        'sg-500':   { nome: 'SG 500g', estoque: { linha: 6, coluna: 2 }, vendido: { linha: 6, coluna: 1 } },
        'sg-vacuo': { nome: 'SG Vácuo', estoque: { linha: 5, coluna: 2 }, vendido: { linha: 5, coluna: 1 } },
        'ibiapaba': { nome: 'Ibiapaba', estoque: { linha: 9, coluna: 2 }, vendido: { linha: 9, coluna: 1 } }
    },

    // Mapeamento para os cards de Blend.
    blend: {
        'ibiapaba': { peso: { linha: 52, coluna: 1 }, qtd:  { linha: 54, coluna: 1 } },
        'arabico':  { peso: { linha: 52, coluna: 2 }, qtd:  { linha: 54, coluna: 2 } },
        'conilon':  { peso: { linha: 52, coluna: 3 }, qtd:  { linha: 54, coluna: 3 } }
    }
};

// --- Seletores de Elementos ---
// Pega as referências dos elementos HTML que serão manipulados pelo script.
const updateButton = document.getElementById('update-btn');
const updateButtonText = updateButton.querySelector('.btn-text');
let estoqueChart = null; // Variável global para o gráfico.

// --- Funções Específicas da Página ---

/**
 * Função: createOrUpdateChart
 * Objetivo: Cria o gráfico de barras pela primeira vez ou apenas atualiza os dados se ele já existir.
 * @param {Array<string>} labels - Os nomes dos produtos para o eixo X.
 * @param {Array<number>} estoqueData - Os valores de estoque para as barras.
 * @param {Array<number>} vendidoData - Os valores de vendidos para as barras.
 */
function createOrUpdateChart(labels, estoqueData, vendidoData) {
    const ctx = document.getElementById('estoqueChart').getContext('2d');
    const data = {
        labels: labels,
        datasets: [
            { label: 'Estoque Atual', data: estoqueData, backgroundColor: 'rgba(93, 64, 55, 0.7)' }, // Cor de café
            { label: 'Total Vendido', data: vendidoData, backgroundColor: 'rgba(52, 152, 219, 0.7)' } // Cor azul
        ]
    };

    if (estoqueChart) {
        // Se o gráfico já foi criado, apenas atualiza os dados para uma animação suave.
        estoqueChart.data = data;
        estoqueChart.update();
    } else {
        // Se for a primeira vez, cria um novo objeto de gráfico.
        estoqueChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}


// --- Função Principal de Execução ---

/**
 * Função: fetchAndUpdateDashboard
 * Objetivo: É o coração do dashboard. Orquestra todo o processo de buscar, processar e exibir os dados.
 */
async function fetchAndUpdateDashboard() {
    // 1. Atualiza a interface para mostrar que o carregamento começou.
    updateButton.disabled = true;
    updateButton.classList.add('updating');
    updateButtonText.textContent = 'Atualizando...';
    document.querySelectorAll('.loading').forEach(el => el.classList.add('loading'));

    try {
        // 2. Busca os dados da planilha.
        const response = await fetch(CONFIG.csvUrl);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        const csvText = await response.text();
        const data = parseCSV(csvText); // Usa a função do 'shared.js'

        // ✅ LINHA DE DIAGNÓSTICO: Descomente esta linha para ver os dados brutos da planilha no console (F12).
        //console.log('🔬 Dados da Planilha de Café:', data);

        if (data.length < 1) throw new Error("A planilha parece estar vazia.");

        // 3. Preenche o KPI do cabeçalho.
        const saldoTrabalhoEl = document.getElementById('saldo-trabalho');
        if (saldoTrabalhoEl) {
            const { linha, coluna } = CONFIG.saldoTrabalho;
            const saldoValue = cleanNumber(data[linha]?.[coluna]); // Usa a função do 'shared.js'
            saldoTrabalhoEl.classList.remove('status-positivo', 'status-negativo');
            if (saldoValue >= 0) {
                saldoTrabalhoEl.classList.add('status-positivo');
            } else {
                saldoTrabalhoEl.classList.add('status-negativo');
            }
            saldoTrabalhoEl.textContent = saldoValue.toLocaleString('pt-BR');
            saldoTrabalhoEl.classList.remove('loading');
        }

        // 4. Prepara os dados para o gráfico.
        const chartLabels = [];
        const chartEstoqueData = [];
        const chartVendidoData = [];

        // 5. Preenche os cards de cada produto.
        for (const id in CONFIG.produtos) {
            const produto = CONFIG.produtos[id];
            const estoqueEl = document.getElementById(`estoque-${id}`);
            const vendidoEl = document.getElementById(`vendido-${id}`);
            const produzirEl = document.getElementById(`produzir-${id}`);
            const estoqueValue = cleanNumber(data[produto.estoque.linha]?.[produto.estoque.coluna]);
            const vendidoValue = cleanNumber(data[produto.vendido.linha]?.[produto.vendido.coluna]);
            const aProduzir = vendidoValue - estoqueValue;

            estoqueEl.textContent = estoqueValue.toLocaleString('pt-BR');
            vendidoEl.textContent = vendidoValue.toLocaleString('pt-BR');

            // Coleta dados para o gráfico.
            chartLabels.push(produto.nome);
            chartEstoqueData.push(estoqueValue);
            chartVendidoData.push(vendidoValue);

            // Atualiza o card de "Necessidade de Produção".
            produzirEl.classList.remove('status-ok', 'status-warn');
            if (aProduzir <= 0) {
                produzirEl.textContent = 'Não precisa produzir';
                produzirEl.classList.add('status-ok');
            } else {
                produzirEl.textContent = aProduzir.toLocaleString('pt-BR');
                produzirEl.classList.add('status-warn');
            }
        }
        // 6. Desenha ou atualiza o gráfico com os dados coletados.
        createOrUpdateChart(chartLabels, chartEstoqueData, chartVendidoData);

        // 7. Preenche os cards de blend.
        for (const id in CONFIG.blend) {
            const blendConfig = CONFIG.blend[id];
            const pesoEl = document.getElementById(`blend-${id}-peso`);
            const qtdEl = document.getElementById(`blend-${id}-qtd`);
            if (pesoEl && qtdEl) {
                const pesoValue = cleanNumber(data[blendConfig.peso.linha]?.[blendConfig.peso.coluna]);
                pesoEl.textContent = pesoValue.toLocaleString('pt-BR');
                const qtdValue = cleanNumber(data[blendConfig.qtd.linha]?.[blendConfig.qtd.coluna]);
                qtdEl.textContent = qtdValue.toLocaleString('pt-BR');
                pesoEl.classList.remove('loading');
                qtdEl.classList.remove('loading');
            }
        }
        // Limpa qualquer 'loading' remanescente.
        document.querySelectorAll('.loading').forEach(el => el.classList.remove('loading'));
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert(`Falha ao carregar dados: ${error.message}`);
    } finally {
        // 8. Restaura o estado do botão, independentemente de sucesso ou erro.
        updateButton.disabled = false;
        updateButton.classList.remove('updating');
        updateButtonText.textContent = 'Atualizar Dados';
    }
}


// --- Ponto de Entrada do Aplicativo ---
// Garante que o código só rode depois que a página estiver totalmente carregada.
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o evento de clique ao botão.
    updateButton.addEventListener('click', fetchAndUpdateDashboard);
    
    // Roda a atualização pela primeira vez ao carregar a página.
    fetchAndUpdateDashboard();
    
    // Registra o Service Worker para a funcionalidade PWA.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker registrado.'))
          .catch(err => console.error('Falha ao registrar Service Worker:', err));
      });
    }
});