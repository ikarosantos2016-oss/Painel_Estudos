// Recupera os dados salvos no navegador. Se for a primeira execução, cria a estrutura vazia.
// `bd` mantém os concursos e os registros de estudo durante toda a execução do script.
const bd = JSON.parse(localStorage.getItem('concursos_app')) || { concursos: [], logs: [] };
let concursoAtual = null;

// Aguarda o HTML estar pronto antes de procurar elementos e registrar os eventos da interface.
document.addEventListener('DOMContentLoaded', () => {
    // Ao trocar o concurso selecionado, atualiza os dados exibidos no painel.
    document.getElementById('concursoSelect').addEventListener('change', mudarConcurso);
    // Usa delegação de eventos para detectar alterações nos campos de data do painel.
    document.getElementById('dashboard').addEventListener('change', event => {
        if (event.target.matches('[data-date-field]')) salvarDatas();
    });
    // Um único listener trata os botões atuais e também os criados dinamicamente depois.
    document.addEventListener('click', event => {
        // Ignora cliques que não tenham um elemento HTML como alvo.
        if (!(event.target instanceof Element)) return;

        // Procura o botão (ou ancestral) que declara uma ação por meio de data-action.
        const button = event.target.closest('[data-action]');
        if (!button) return;

        // Encaminha cada ação da interface para a função responsável.
        switch (button.dataset.action) {
            case 'novo-concurso':
                novoConcurso();
                break;
            case 'excluir-concurso':
                excluirConcurso();
                break;
            case 'nova-disciplina':
                novaDisciplina();
                break;
            case 'registrar-estudo':
                registrarEstudo(button.dataset.disciplinaId);
                break;
            case 'apagar-log':
                apagarLog(button.dataset.logId);
                break;
            case 'salvar-meta-semanal':
                salvarMetaSemanal();
                break;
        }
    });

    // Prepara o seletor e carrega o primeiro concurso, se houver algum salvo.
    init();
});

// Inicializa a tela com os dados que já existem no navegador.
function init() {
    atualizarSelectConcursos();
    if (bd.concursos.length > 0) {
        document.getElementById('concursoSelect').value = bd.concursos[0].id;
        mudarConcurso();
    }
}

// Serializa o objeto de dados para JSON e o persiste no armazenamento local do navegador.
function salvarBD() {
    localStorage.setItem('concursos_app', JSON.stringify(bd));
}

// Converte uma duração em minutos para o formato legível "Xh Ym".
function formatarTempo(minutosTotais) {
    const h = Math.floor(minutosTotais / 60);
    const m = minutosTotais % 60;
    return `${h}h ${m}m`;
}

// Formata uma data usando o fuso local, evitando que conversões UTC mudem o dia exibido.
function formatarDataLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Codifica caracteres especiais antes de inserir valores em HTML, reduzindo risco de injeção.
function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// Solicita o nome de um concurso, cria sua estrutura inicial e salva/seleciona o novo item.
function novoConcurso() {
    const nome = prompt("Qual o nome do concurso? (ex: IFCE - Técnico TI)");
    if (!nome) return;

    const novo = {
        id: Date.now().toString(),
        nome: nome,
        datas: { prova: '', resultado: '', homologacao: '' },
        metaSemanalHoras: null,
        disciplinas: []
    };

    bd.concursos.push(novo);
    salvarBD();
    atualizarSelectConcursos();
    document.getElementById('concursoSelect').value = novo.id;
    mudarConcurso();
}

// Reconstrói as opções do seletor com os concursos atualmente armazenados.
function atualizarSelectConcursos() {
    const select = document.getElementById('concursoSelect');
    select.innerHTML = '<option value="">Selecione...</option>';
    bd.concursos.forEach(concurso => {
        select.innerHTML += `<option value="${escaparHTML(concurso.id)}">${escaparHTML(concurso.nome)}</option>`;
    });
}

// Sincroniza o concurso selecionado com o painel e seus campos, listas e estatísticas.
function mudarConcurso() {
    const id = document.getElementById('concursoSelect').value;
    const btnExcluir = document.getElementById('btnExcluirEdital');

    if (!id) {
        // Sem seleção, esconde o painel e remove a referência ao concurso ativo.
        document.getElementById('dashboard').classList.add('hidden');
        btnExcluir.classList.add('hidden');
        concursoAtual = null;
        return;
    }

    concursoAtual = bd.concursos.find(concurso => concurso.id === id);
    if (!concursoAtual) return;

    document.getElementById('dashboard').classList.remove('hidden');
    btnExcluir.classList.remove('hidden');
    document.getElementById('dataProva').value = concursoAtual.datas.prova;
    document.getElementById('dataResultado').value = concursoAtual.datas.resultado;
    document.getElementById('dataHomologacao').value = concursoAtual.datas.homologacao;
    document.getElementById('metaSemanalHoras').value = Number.isFinite(concursoAtual.metaSemanalHoras) && concursoAtual.metaSemanalHoras > 0
        ? concursoAtual.metaSemanalHoras
        : '';

    renderizarDisciplinas();
    renderizarHistoricoEStats();
}

// Exclui o concurso e todos os registros de estudo associados, após confirmação explícita.
function excluirConcurso() {
    if (!concursoAtual) return;

    const confirmacao = confirm(`Tem certeza que deseja excluir o edital "${concursoAtual.nome}"? \n\nIsso apagará permanentemente TODAS as disciplinas e o histórico de estudos (logs) vinculados a este concurso.`);
    if (!confirmacao) return;

    bd.concursos = bd.concursos.filter(concurso => concurso.id !== concursoAtual.id);
    bd.logs = bd.logs.filter(log => log.idConcurso !== concursoAtual.id);
    salvarBD();

    atualizarSelectConcursos();
    document.getElementById('concursoSelect').value = "";
    mudarConcurso();
    alert("Edital e histórico excluídos com sucesso!");
}

// Lê as datas dos campos do formulário e as salva no concurso selecionado.
function salvarDatas() {
    if (!concursoAtual) return;
    concursoAtual.datas.prova = document.getElementById('dataProva').value;
    concursoAtual.datas.resultado = document.getElementById('dataResultado').value;
    concursoAtual.datas.homologacao = document.getElementById('dataHomologacao').value;
    salvarBD();
}

// Valida e salva uma meta semanal; a validação do próprio input também é respeitada.
function salvarMetaSemanal() {
    if (!concursoAtual) return;

    const input = document.getElementById('metaSemanalHoras');
    const metaHoras = input.valueAsNumber;
    if (!input.value || !input.checkValidity() || !Number.isFinite(metaHoras) || metaHoras <= 0 || metaHoras > 168) {
        alert("Informe uma meta entre 0,5 e 168 horas, em incrementos de 0,5 hora.");
        return;
    }

    concursoAtual.metaSemanalHoras = metaHoras;
    salvarBD();
    renderizarHistoricoEStats();
}

// Adiciona uma disciplina ao concurso atual e atualiza a lista visível.
function novaDisciplina() {
    if (!concursoAtual) return;

    const nome = prompt("Nome da disciplina: (ex: Redes de Computadores, Lei 8.112)");
    if (!nome) return;

    concursoAtual.disciplinas.push({ id: Date.now().toString(), nome: nome });
    salvarBD();
    renderizarDisciplinas();
}

// Gera o HTML da lista de disciplinas, incluindo um campo de minutos e botão por disciplina.
function renderizarDisciplinas() {
    const div = document.getElementById('listaDisciplinas');
    div.innerHTML = '';

    if (concursoAtual.disciplinas.length === 0) {
        // Exibe uma mensagem de estado vazio em vez de deixar a área sem conteúdo.
        div.innerHTML = '<p class="rounded-2xl border border-dashed border-line bg-canvas px-4 py-6 text-center text-sm text-muted">Nenhuma disciplina adicionada. Clique em “+ Adicionar disciplina” para começar.</p>';
        return;
    }

    concursoAtual.disciplinas.forEach(disciplina => {
        div.innerHTML += `
            <div class="flex flex-col gap-3 rounded-2xl border border-line bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
                <span class="font-semibold text-ink">${escaparHTML(disciplina.nome)}</span>
                <div class="flex items-center gap-2">
                    <label for="minutos-${escaparHTML(disciplina.id)}" class="sr-only">Minutos estudados</label>
                    <input type="number" min="1" id="minutos-${escaparHTML(disciplina.id)}" placeholder="Minutos" class="min-h-10 w-28 rounded-xl border border-line bg-white px-3 text-center text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-sage-strong focus:ring-4 focus:ring-sage">
                    <button type="button" data-action="registrar-estudo" data-disciplina-id="${escaparHTML(disciplina.id)}" class="min-h-10 rounded-xl bg-sage px-4 text-sm font-bold text-sage-strong transition hover:bg-sage-strong hover:text-white focus-visible:ring-4 focus-visible:ring-sage">
                        Salvar
                    </button>
                </div>
            </div>
        `;
    });
}

// Valida os minutos informados e registra uma sessão de estudo com data e horário exatos.
function registrarEstudo(idDisciplina) {
    if (!concursoAtual) return;

    const input = document.getElementById(`minutos-${idDisciplina}`);
    const minutos = parseInt(input.value, 10);

    if (isNaN(minutos) || minutos <= 0) {
        alert("Informe uma quantidade válida de minutos.");
        return;
    }

    const dataAtual = formatarDataLocal(new Date());
    // O timestamp permite ordenar e agrupar os registros com precisão, além da data legível.
    bd.logs.push({
        id: Date.now().toString(),
        idConcurso: concursoAtual.id,
        idDisciplina: idDisciplina,
        minutos: minutos,
        data: dataAtual,
        timestamp: Date.now()
    });

    input.value = '';
    salvarBD();
    renderizarHistoricoEStats();
}

// Remove um registro de estudo pelo identificador e atualiza o histórico e os totais.
function apagarLog(idLog) {
    if (!concursoAtual) return;

    bd.logs = bd.logs.filter(log => log.id !== idLog);
    salvarBD();
    renderizarHistoricoEStats();
}

// Retorna a segunda-feira da semana que contém a data recebida (sem alterar a data original).
function obterInicioSemana(data) {
    const inicioSemana = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const diasDesdeSegunda = (inicioSemana.getDay() + 6) % 7;
    inicioSemana.setDate(inicioSemana.getDate() - diasDesdeSegunda);
    return inicioSemana;
}

// Atualiza os números, a barra de progresso e a mensagem referentes à meta semanal.
function renderizarProgressoMetaSemanal(minutosEstudados) {
    const metaHoras = concursoAtual.metaSemanalHoras;
    const metaDefinida = Number.isFinite(metaHoras) && metaHoras > 0;
    const minutosMeta = metaDefinida ? metaHoras * 60 : 0;
    const percentual = metaDefinida ? Math.round((minutosEstudados / minutosMeta) * 100) : 0;
    // O texto pode ultrapassar 100%, mas a largura visual da barra fica limitada a 100%.
    const percentualBarra = Math.min(percentual, 100);

    document.getElementById('estudadoMetaSemanal').innerText = formatarTempo(minutosEstudados);
    document.getElementById('objetivoMetaSemanal').innerText = metaDefinida ? formatarTempo(minutosMeta) : 'Não definida';
    document.getElementById('restanteMetaSemanal').innerText = metaDefinida
        ? formatarTempo(Math.max(minutosMeta - minutosEstudados, 0))
        : '—';
    document.getElementById('percentualMetaSemanal').innerText = `${percentual}%`;
    document.getElementById('preenchimentoMetaSemanal').style.width = `${percentualBarra}%`;
    document.getElementById('barraMetaSemanal').setAttribute('aria-valuenow', percentualBarra);
    document.getElementById('statusMetaSemanal').innerText = metaDefinida
        ? percentual >= 100
            ? `Meta alcançada! Você completou ${percentual}% do objetivo semanal.`
            : `Você completou ${percentual}% da meta. Continue no seu ritmo.`
        : 'Defina uma meta para acompanhar seu progresso nesta semana.';
}

// Recalcula os totais de estudo, redesenha o histórico e atualiza a meta semanal.
function renderizarHistoricoEStats() {
    // Mantém neste painel apenas registros ligados ao concurso atualmente selecionado.
    const logsConcurso = bd.logs.filter(log => log.idConcurso === concursoAtual.id);
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioAmanha = new Date(inicioHoje);
    inicioAmanha.setDate(inicioAmanha.getDate() + 1);
    // Define limites de tempo: hoje, esta semana e os últimos 30 dias.
    const inicioSemana = obterInicioSemana(agora);
    const inicioProximaSemana = new Date(inicioSemana);
    inicioProximaSemana.setDate(inicioProximaSemana.getDate() + 7);
    let minHoje = 0;
    let minSemana = 0;
    let minMes = 0;
    const msPorDia = 86400000;
    const timestampAgora = agora.getTime();
    const tbody = document.getElementById('tabelaHistorico');
    tbody.innerHTML = '';

    // Ordena uma cópia para mostrar os registros mais recentes primeiro sem reordenar `bd.logs`.
    const logsOrdenados = [...logsConcurso].sort((a, b) => b.timestamp - a.timestamp);
    logsOrdenados.forEach(log => {
        // Soma cada registro aos períodos aplicáveis. A semana começa na segunda-feira.
        if (log.timestamp >= inicioHoje.getTime() && log.timestamp < inicioAmanha.getTime()) minHoje += log.minutos;
        if (log.timestamp >= inicioSemana.getTime() && log.timestamp < inicioProximaSemana.getTime()) minSemana += log.minutos;
        if ((timestampAgora - log.timestamp) <= (30 * msPorDia)) minMes += log.minutos;

        // Se a disciplina não existir mais, mantém o registro e informa isso no histórico.
        const disciplina = concursoAtual.disciplinas.find(item => item.id === log.idDisciplina);
        const nomeDisciplina = disciplina ? disciplina.nome : 'Disciplina Removida';
        const dataBR = new Date(log.data + "T00:00:00").toLocaleDateString('pt-BR');

        tbody.innerHTML += `
            <tr class="border-b border-line transition-colors hover:bg-canvas">
                <td class="p-3">${dataBR}</td>
                <td class="p-3">${escaparHTML(nomeDisciplina)}</td>
                <td class="p-3">${log.minutos} min (${formatarTempo(log.minutos)})</td>
                <td class="p-3">
                    <button type="button" data-action="apagar-log" data-log-id="${escaparHTML(log.id)}" class="rounded-lg px-2 py-1 text-xs font-semibold text-blush-strong transition hover:bg-blush focus-visible:ring-4 focus-visible:ring-blush">Excluir</button>
                </td>
            </tr>
        `;
    });

    if (logsOrdenados.length === 0) {
        // Estado vazio da tabela quando ainda não há sessões de estudo registradas.
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-sm text-muted">Nenhum registro encontrado por enquanto.</td></tr>';
    }

    document.getElementById('statsHoje').innerText = formatarTempo(minHoje);
    document.getElementById('statsSemana').innerText = formatarTempo(minSemana);
    document.getElementById('statsMes').innerText = formatarTempo(minMes);
    // A meta semanal usa o mesmo total calculado para a estatística da semana.
    renderizarProgressoMetaSemanal(minSemana);
}
