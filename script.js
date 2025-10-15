const CSV_URL_KPI = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShhn4owra2uDPiFvdJQ4YnVE3tfvqEksVPK8aYl81IyYWMI-N2h6cr_nfXrv-6Y7uPNMRAkWIhARyC/pub?gid=669209740&single=true&output=tsv';
const CSV_URL_LOGISTICA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShhn4owra2uDPiFvdJQ4YnVE3tfvqEksVPK8aYl81IyYWMI-N2h6cr_nfXrv-6Y7uPNMRAkWIhARyC/pub?gid=861790825&single=true&output=tsv'; 
const updateButton = document.getElementById('update-btn');
const updateButtonText = updateButton.querySelector('.btn-text');
let producaoChart = null; 

function parseCSV(text) {
    const rows = text.split('\n').filter(row => row.trim() !== '');
    return rows.map(row => row.split('\t').map(cell => cell.trim().replace(/"/g, '')));
}
function cleanNumber(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}
function checkUpdateStatus(dateString) {
    const dateElement = document.getElementById('last-update-date');
    const statusContainer = document.getElementById('update-status-bar');
    const oldIndicator = statusContainer.querySelector('.status-indicator');
    if (oldIndicator) oldIndicator.remove();
    if (!dateString) { dateElement.textContent = "Data não encontrada."; return; }
    const parts = dateString.split('/');
    if (parts.length < 2) { dateElement.textContent = `Formato inválido: ${dateString}`; return; }
    const year = parts.length === 3 ? parts[2] : new Date().getFullYear();
    const updateDate = new Date(year, parts[1] - 1, parts[0]);
    const today = new Date();
    updateDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    dateElement.textContent = dateString; 
    const statusIndicator = document.createElement('span');
    statusIndicator.className = 'status-indicator';
    if (updateDate.getTime() === today.getTime()) {
        statusIndicator.textContent = 'Atualizada';
        statusIndicator.classList.add('status-updated');
    } else {
        statusIndicator.textContent = 'Desatualizada';
        statusIndicator.classList.add('status-outdated');
    }
    statusContainer.appendChild(statusIndicator);
}
function calculateDaysRemaining(dateString) {
    if (!dateString || typeof dateString !== 'string' || dateString.length < 3) return "N/D";
    const currentYear = new Date().getFullYear();
    let vencimento;
    const parts = dateString.split('/');
    if (parts.length === 2) {
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[0], 10);
        vencimento = new Date(currentYear, month, day);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (vencimento < hoje) vencimento.setFullYear(currentYear + 1);
    } else if (parts.length === 3) {
        vencimento = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
        const hyphenParts = dateString.split('-');
        if (hyphenParts.length === 3) vencimento = new Date(hyphenParts[0], hyphenParts[1] - 1, hyphenParts[2]);
        else return "Inválida";
    }
    if (isNaN(vencimento) || vencimento.toString() === 'Invalid Date') return "Inválida"; 
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 
    vencimento.setHours(0, 0, 0, 0);
    const diffTime = vencimento - hoje;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function createOrUpdateChart(labels, liberadoData, faltaProduzirData) {
    const ctx = document.getElementById('producaoChart').getContext('2d');
    const data = {
        labels: labels,
        datasets: [{
            label: 'Total Liberado',
            data: liberadoData,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
        }, {
            label: 'Falta Produzir (Negativo)',
            data: faltaProduzirData,
            backgroundColor: 'rgba(231, 76, 60, 0.7)',
        }]
    };
    if (producaoChart) {
        producaoChart.data = data;
        producaoChart.update();
    } else {
        producaoChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

async function fetchAndUpdateDashboard() {
    updateButton.disabled = true;
    updateButton.classList.add('updating');
    updateButtonText.textContent = 'Atualizando...';
    try {
        const [responseKPI, responseLogistica] = await Promise.all([ fetch(CSV_URL_KPI), fetch(CSV_URL_LOGISTICA) ]);
        const dataKPI = parseCSV(await responseKPI.text()); 
        const dataLogistica = parseCSV(await responseLogistica.text()); 
        if (dataKPI.length < 2) throw new Error("CSV de KPIs vazio.");
        const lastUpdateDateString = dataKPI[0]?.[0] || null;
        checkUpdateStatus(lastUpdateDateString);
        
        const data = dataKPI; 
        const liberadoSerramil = cleanNumber(data[2][3]);
        const liberadoFlocao = cleanNumber(data[2][4]);
        const estoqueSerramil = cleanNumber(data[17][0]);
        const estoqueFlocao = cleanNumber(data[17][1]);
        const estoqueMilho = cleanNumber(data[19][0]);
        const estoqueCafe = cleanNumber(data[35][0]);
        const liberadoCafe = cleanNumber(data[35][1]);
        const necessidadeMilhoCell = cleanNumber(data[33][3]); 
        const faltaProduzirSerramil = estoqueSerramil - liberadoSerramil; 
        const faltaProduzirFlocao = estoqueFlocao - liberadoFlocao; 
        const saldoCafe = estoqueCafe - liberadoCafe;
        
        document.getElementById('kpiValue1').textContent = Math.round(liberadoSerramil).toLocaleString('pt-BR');
        document.getElementById('kpiValue2').textContent = Math.round(liberadoFlocao).toLocaleString('pt-BR');
        document.getElementById('kpiValue3').textContent = Math.round(estoqueSerramil).toLocaleString('pt-BR');
        document.getElementById('kpiValue4').textContent = Math.round(estoqueFlocao).toLocaleString('pt-BR');
        document.getElementById('kpiValue5').textContent = Math.round(estoqueMilho).toLocaleString('pt-BR');
        updateCalculatedKpi('kpiValue6', faltaProduzirSerramil);
        updateCalculatedKpi('kpiValue7', faltaProduzirFlocao);
        updateKpiComprarMilho('kpiValue8', necessidadeMilhoCell); 
        document.getElementById('kpiValue10').textContent = Math.round(estoqueCafe).toLocaleString('pt-BR');
        document.getElementById('kpiValue11').textContent = Math.round(liberadoCafe).toLocaleString('pt-BR');
        updateCalculatedKpi('kpiValue12', saldoCafe);

        createOrUpdateChart( ['Serramil', 'Flocão'], [liberadoSerramil, liberadoFlocao], [Math.abs(faltaProduzirSerramil), Math.abs(faltaProduzirFlocao)] );
        
        document.querySelectorAll('.loading').forEach(el => el.classList.remove('loading'));
        if (dataLogistica.length > 1) updateLogisticsTable(dataLogistica, 2, 30);
    } catch (error) {
        console.error("Erro fatal:", error);
        const allKpiIds = ['kpiValue1', 'kpiValue2', 'kpiValue3', 'kpiValue4', 'kpiValue5', 'kpiValue6', 'kpiValue7', 'kpiValue8', 'kpiValue10', 'kpiValue11', 'kpiValue12'];
        allKpiIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = "ERRO"; });
        document.getElementById('logisticaTableBody').innerHTML = `<tr><td colspan="6" class="status-low">Falha na conexão ou nos índices.</td></tr>`;
    } finally {
        updateButton.disabled = false;
        updateButton.classList.remove('updating');
        updateButtonText.textContent = 'Atualizar';
    }
}
function updateKpiComprarMilho(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = Math.round(value).toLocaleString('pt-BR');
    el.classList.remove('status-low', 'status-ok');
    if (value > 1) el.classList.add('status-ok'); 
    else el.classList.add('status-low'); 
}
function updateCalculatedKpi(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('status-low', 'status-ok');
    el.textContent = `${Math.round(value).toLocaleString('pt-BR')} kg`;
    if (value < 0) el.classList.add('status-low');
    else el.classList.add('status-ok'); 
}

// ✅ FUNÇÃO ATUALIZADA COM AS NOVAS REGRAS
function updateLogisticsTable(data, startRowIndex, maxRows) {
    const tbody = document.getElementById('logisticaTableBody');
    tbody.innerHTML = ''; 
    const endIndex = Math.min(startRowIndex + maxRows, data.length);
    for (let i = startRowIndex; i < endIndex; i++) {
        const row = data[i];
        if (!row || row.length < 1) continue;
        
        const dataPrevista = row[5] || 'N/D';
        
        // Regra do Motorista
        let motorista = row[11] || 'N/D';
        let motoristaClass = '';
        if (motorista === 'N/D') {
            motorista = 'Ainda não designado';
            motoristaClass = 'status-low'; // Classe vermelha
        }
        
        const rota = row[6] || 'N/D';
        const pesoValue = row[8] ? cleanNumber(row[8]) : 0;
        const peso = pesoValue ? `${Math.round(pesoValue).toLocaleString('pt-BR')} kg` : 'N/D';
        const dataVencimento = row[13] || 'N/D';
        const diasRestantes = calculateDaysRemaining(dataVencimento);
        
        let diasTexto, diasClass;
        if (diasRestantes === "N/D" || diasRestantes === "Inválida") {
             diasTexto = diasRestantes;
             diasClass = '';
        } else if (diasRestantes < 0) { 
            diasTexto = Math.abs(diasRestantes) + " dias ATRASO";
            diasClass = 'status-low';
        // Regra dos Dias Restantes
        } else if (diasRestantes < 30) { // Alterado de 3 para 30
            diasTexto = diasRestantes + " dias";
            diasClass = 'status-low';
        } else {
            diasTexto = diasRestantes + " dias";
            diasClass = 'status-ok';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Data Prevista">${dataPrevista}</td>
            <td data-label="Motorista" class="${motoristaClass}">${motorista}</td>
            <td data-label="Rota">${rota}</td>
            <td data-label="Peso">${peso}</td>
            <td data-label="Vencimento">${dataVencimento}</td>
            <td data-label="Dias Restantes" class="${diasClass}">${diasTexto}</td>
        `;
        tbody.appendChild(tr);
    }
    if (tbody.innerHTML === '') {
         tbody.innerHTML = `<tr><td colspan="6" data-label="Aviso" class="status-low">Não há dados de Logística.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateButton.addEventListener('click', fetchAndUpdateDashboard);
    fetchAndUpdateDashboard();
    setInterval(fetchAndUpdateDashboard, 300000); 
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('Service Worker registrado.'))
          .catch(err => console.error('Falha ao registrar SW:', err));
      });
    }
});