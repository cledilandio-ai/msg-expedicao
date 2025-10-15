// ===================================================================
// SCRIPT COMPLETO PARA A PÁGINA DE CAFÉ (cafe.html)
// ===================================================================

const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShhn4owra2uDPiFvdJQ4YnVE3tfvqEksVPK8aYl81IyYWMI-N2h6cr_nfXrv-6Y7uPNMRAkWIhARyC/pub?gid=862076930&single=true&output=tsv',
    saldoTrabalho: { linha: 13, coluna: 0 },
    produtos: {
        'sg-250':   { nome: 'SG 250g', estoque: { linha: 4, coluna: 2 }, vendido: { linha: 4, coluna: 1 } },
        'sg-500':   { nome: 'SG 500g', estoque: { linha: 6, coluna: 2 }, vendido: { linha: 6, coluna: 1 } },
        'sg-vacuo': { nome: 'SG Vácuo', estoque: { linha: 5, coluna: 2 }, vendido: { linha: 5, coluna: 1 } },
        'ibiapaba': { nome: 'Ibiapaba', estoque: { linha: 9, coluna: 2 }, vendido: { linha: 9, coluna: 1 } }
    },
    blend: {
        'ibiapaba': { peso: { linha: 71, coluna: 1 }, qtd:  { linha: 73, coluna: 1 } },
        'arabico':  { peso: { linha: 71, coluna: 2 }, qtd:  { linha: 73, coluna: 2 } },
        'conilon':  { peso: { linha: 71, coluna: 3 }, qtd:  { linha: 73, coluna: 3 } }
    }
};

const updateButton = document.getElementById('update-btn');
const updateButtonText = updateButton.querySelector('.btn-text');
let estoqueChart = null;

function parseCSV(text) {
    const rows = text.split('\n').map(row => row.trim());
    return rows.map(row => row.split('\t').map(cell => cell.trim().replace(/"/g, '')));
}
function cleanNumber(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function createOrUpdateChart(labels, estoqueData, vendidoData) {
    const ctx = document.getElementById('estoqueChart').getContext('2d');
    const data = {
        labels: labels,
        datasets: [
            { label: 'Estoque Atual', data: estoqueData, backgroundColor: 'rgba(93, 64, 55, 0.7)' },
            { label: 'Total Vendido', data: vendidoData, backgroundColor: 'rgba(52, 152, 219, 0.7)' }
        ]
    };
    if (estoqueChart) {
        estoqueChart.data = data;
        estoqueChart.update();
    } else {
        estoqueChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

async function fetchAndUpdateDashboard() {
    updateButton.disabled = true;
    updateButton.classList.add('updating');
    updateButtonText.textContent = 'Atualizando...';
    document.querySelectorAll('.loading').forEach(el => el.classList.add('loading'));
    try {
        const response = await fetch(CONFIG.csvUrl);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        if (data.length < 1) throw new Error("A planilha parece estar vazia.");

        const saldoTrabalhoEl = document.getElementById('saldo-trabalho');
        if (saldoTrabalhoEl) {
            const { linha, coluna } = CONFIG.saldoTrabalho;
            const saldoValue = cleanNumber(data[linha]?.[coluna]);
            saldoTrabalhoEl.classList.remove('status-positivo', 'status-negativo');
            if (saldoValue >= 0) {
                saldoTrabalhoEl.classList.add('status-positivo');
            } else {
                saldoTrabalhoEl.classList.add('status-negativo');
            }
            saldoTrabalhoEl.textContent = saldoValue.toLocaleString('pt-BR');
            saldoTrabalhoEl.classList.remove('loading');
        }

        const chartLabels = [];
        const chartEstoqueData = [];
        const chartVendidoData = [];

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

            chartLabels.push(produto.nome);
            chartEstoqueData.push(estoqueValue);
            chartVendidoData.push(vendidoValue);

            produzirEl.classList.remove('status-ok', 'status-warn');
            if (aProduzir <= 0) {
                produzirEl.textContent = 'Não precisa produzir';
                produzirEl.classList.add('status-ok');
            } else {
                produzirEl.textContent = aProduzir.toLocaleString('pt-BR');
                produzirEl.classList.add('status-warn');
            }
        }
        createOrUpdateChart(chartLabels, chartEstoqueData, chartVendidoData);

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
        document.querySelectorAll('.loading').forEach(el => el.classList.remove('loading'));
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert(`Falha ao carregar dados: ${error.message}`);
    } finally {
        updateButton.disabled = false;
        updateButton.classList.remove('updating');
        updateButtonText.textContent = 'Atualizar Dados';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateButton.addEventListener('click', fetchAndUpdateDashboard);
    fetchAndUpdateDashboard();
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('Service Worker registrado.'))
          .catch(err => console.error('Falha ao registrar Service Worker:', err));
      });
    }
});