document.addEventListener('DOMContentLoaded', () => {
    // 1. CHAMA A FUNÇÃO DE CARREGAMENTO INICIAL (Preenche os campos ao carregar a página)
    carregarDadosIniciais();

    // 2. Adiciona o listener para o formulário de cálculo
    // O evento chama a função que usa APENAS os dados do formulário
    document.getElementById('calculadoraForm').addEventListener('submit', handleFormSubmitLocal);

    // 3. NOVO LISTENER: Rodar a API ao mudar o Ticker no campo (#ativo)
    const ativoInput = document.getElementById('ativo');
    ativoInput.addEventListener('change', () => {
        // Verifica se o campo não está vazio antes de tentar buscar dados
        if (ativoInput.value.trim() !== '') {
            console.log(`Ticker alterado para ${ativoInput.value}. Buscando novos dados...`);
            carregarDadosIniciais();
        }
    });
});

// --- CONFIGURAÇÃO DE API ---
// Token do brapi.dev para uso (usamos apenas este, já que o Alpha Vantage estava instável)
const BRAPI_TOKEN = '79Ue5ZHtUjAV8fUmKJSoGr';

// Função para buscar dados da API e preencher os campos ao carregar a página
async function carregarDadosIniciais() {
    // Usa 'BBAS3' como fallback de ticker, caso o campo esteja vazio
    const ativoInicial = document.getElementById('ativo').value.toUpperCase() || 'BBAS3';

    // URL da API brapi.dev
    const API_URL = `https://brapi.dev/api/quote/${ativoInicial}?modules=summaryProfile&token=${BRAPI_TOKEN}`;

    const campos = ['cotacaoAtual', 'lpa', 'vpa'];
    
    // 1. Preenche com zero como fallback imediato
    campos.forEach(id => {
        document.getElementById(id).value = 0.00.toFixed(2);
    });
    // O Dividendo Médio e o Yield Desejado são preenchidos
    document.getElementById('dividendoMedio').value = 0.00.toFixed(2);
    document.getElementById('yieldDesejado').value = 6.00.toFixed(2);

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            console.warn(`Erro HTTP ${response.status}: Falha ao conectar com a API. Mantendo valores zerados.`);
            return; // Sai da função, mantendo os zeros
        }

        const data = await response.json();
        const results = data.results && data.results.length > 0 ? data.results[0] : null;

        if (!results) {
            console.warn("Nenhum resultado encontrado para o Ticker inicial. Mantendo valores zerados.");
            return;
        }

        // 2. Mapeamento e Preenchimento dos campos com dados da API (usando earningsPerShare)
        if (results.regularMarketPrice && !isNaN(results.regularMarketPrice)) {
            document.getElementById('cotacaoAtual').value = results.regularMarketPrice.toFixed(2);
        }
        // CORREÇÃO: Usando earningsPerShare para Lucro Por Ação
        if (results.earningsPerShare && !isNaN(results.earningsPerShare)) { 
            document.getElementById('lpa').value = results.earningsPerShare.toFixed(2);
        }
        if (results.bookValue && !isNaN(results.bookValue)) {
            document.getElementById('vpa').value = results.bookValue.toFixed(2);
        }
        
        console.log(`Dados carregados com sucesso da API brapi.dev para ${ativoInicial}.`);
        
    } catch (error) {
        console.error('Erro de rede ao carregar dados iniciais:', error);
        // Em caso de falha de rede, os campos permanecerão zerados
    }
}

// ----------------------------------------------------------------------
// FUNÇÃO PRINCIPAL DE CÁLCULO (USA APENAS DADOS DO FORMULÁRIO)
// ----------------------------------------------------------------------
function handleFormSubmitLocal(e) {
    e.preventDefault();

    // 1. Coletar Dados de Entrada
    const ativo = document.getElementById('ativo').value.toUpperCase();
    const yieldDesejado = parseFloat(document.getElementById('yieldDesejado').value) / 100;

    // Coleta dos valores ATUAIS dos campos do formulário
    let cotacaoAtual = parseFloat(document.getElementById('cotacaoAtual').value);
    let lpa = parseFloat(document.getElementById('lpa').value);
    let vpa = parseFloat(document.getElementById('vpa').value);
    let dividendoMedio = parseFloat(document.getElementById('dividendoMedio').value);

    // 2. Validação (Impede divisão por zero ou dados inválidos)
    if (isNaN(lpa) || isNaN(vpa) || isNaN(dividendoMedio) || isNaN(cotacaoAtual) || yieldDesejado <= 0 || lpa === 0 || vpa === 0) {
        alert("Erro: Preencha Cotação, LPA, VPA e Yield com valores válidos. (LPA e VPA não podem ser zero).");
        document.getElementById('resultado').style.display = 'none';
        return;
    }

    // 3. Executar Cálculos
    
    // P/L (Preço / Lucro)
    const pl = cotacaoAtual / lpa;

    // P/VPA (Preço / VPA)
    const pvpa = cotacaoAtual / vpa;

    // Preço Teto Bazin (Dividendo Médio / Yield Desejado)
    const precoTetoBazin = dividendoMedio / yieldDesejado;
    
    // Status Bazin
    let statusBazin = (cotacaoAtual < precoTetoBazin) ? "✅ COMPRA" : "❌ AGUARDAR";

    // Cálculo de Graham
    const constanteGraham = 22.5;
    const valorIntrinsecoGraham = Math.sqrt(constanteGraham * lpa * vpa);

    // Margem de Segurança: (VI - Cotação) / VI
    const margemSeguranca = (valorIntrinsecoGraham - cotacaoAtual) / valorIntrinsecoGraham;

    // 4. Mostrar Resultados
    
    document.getElementById('resultadoAtivo').textContent = ativo + " (Calculado com dados da tela)";
    document.getElementById('precoTetoBazin').textContent = precoTetoBazin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('valorIntrinsecoGraham').textContent = valorIntrinsecoGraham.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('margemSeguranca').textContent = margemSeguranca.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });
    document.getElementById('pl').textContent = pl.toFixed(2);
    document.getElementById('pvpa').textContent = pvpa.toFixed(2);

    const statusElement = document.getElementById('statusBazin');
    statusElement.textContent = statusBazin;
    
    statusElement.className = statusBazin.includes('COMPRA') ? 'valor status-comprar' : 'valor status-aguardar';

    document.getElementById('resultado').style.display = 'block';
}