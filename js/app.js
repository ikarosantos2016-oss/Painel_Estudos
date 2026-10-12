const bd = JSON.parse(localStorage.getItem('concursos_app')) || { concursos: [], logs: [] };
let concursoAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('concursoSelect').addEventListener('change', mudarConcurso);
    document.getElementById('dashboard').addEventListener('change', event => {
        if (event.target.matches('[data-date-field]')) salvarDatas();
    });
    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;

        const button = event.target.closest('[data-action]');
        if (!button) return;

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
        }
    });

    init();
});

function init() {
    atualizarSelectConcursos();
    if (bd.concursos.length > 0) {
        document.getElementById('concursoSelect').value = bd.concursos[0].id;
        mudarConcurso();
    }
}

function salvarBD() {
    localStorage.setItem('concursos_app', JSON.stringify(bd));
}

function formatarTempo(minutosTotais) {
    const h = Math.floor(minutosTotais / 60);
    const m = minutosTotais % 60;
    return `${h}h ${m}m`;
}

function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function novoConcurso() {
    const nome = prompt("Qual o nome do concurso? (ex: IFCE - Técnico TI)");
    if (!nome) return;

    const novo = {
        id: Date.now().toString(),
        nome: nome,
        datas: { prova: '', resultado: '', homologacao: '' },
        disciplinas: []
    };

    bd.concursos.push(novo);
    salvarBD();
    atualizarSelectConcursos();
    document.getElementById('concursoSelect').value = novo.id;
    mudarConcurso();
}

function atualizarSelectConcursos() {
    const select = document.getElementById('concursoSelect');
    select.innerHTML = '<option value="">Selecione...</option>';
    bd.concursos.forEach(concurso => {
        select.innerHTML += `<option value="${escaparHTML(concurso.id)}">${escaparHTML(concurso.nome)}</option>`;
    });
}

function mudarConcurso() {
    const id = document.getElementById('concursoSelect').value;
    const btnExcluir = document.getElementById('btnExcluirEdital');

    if (!id) {
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

    renderizarDisciplinas();
    renderizarHistoricoEStats();
}

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

function salvarDatas() {
    if (!concursoAtual) return;
    concursoAtual.datas.prova = document.getElementById('dataProva').value;
    concursoAtual.datas.resultado = document.getElementById('dataResultado').value;
    concursoAtual.datas.homologacao = document.getElementById('dataHomologacao').value;
    salvarBD();
}

function novaDisciplina() {
    if (!concursoAtual) return;

    const nome = prompt("Nome da disciplina: (ex: Redes de Computadores, Lei 8.112)");
    if (!nome) return;

    concursoAtual.disciplinas.push({ id: Date.now().toString(), nome: nome });
    salvarBD();
    renderizarDisciplinas();
}

function renderizarDisciplinas() {
    const div = document.getElementById('listaDisciplinas');
    div.innerHTML = '';

    if (concursoAtual.disciplinas.length === 0) {
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

function registrarEstudo(idDisciplina) {
    if (!concursoAtual) return;

    const input = document.getElementById(`minutos-${idDisciplina}`);
    const minutos = parseInt(input.value, 10);

    if (isNaN(minutos) || minutos <= 0) {
        alert("Informe uma quantidade válida de minutos.");
        return;
    }

    const dataAtual = new Date().toISOString().split('T')[0];
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

function apagarLog(idLog) {
    if (!concursoAtual) return;

    bd.logs = bd.logs.filter(log => log.id !== idLog);
    salvarBD();
    renderizarHistoricoEStats();
}

function renderizarHistoricoEStats() {
    const logsConcurso = bd.logs.filter(log => log.idConcurso === concursoAtual.id);
    const hoje = new Date().toISOString().split('T')[0];
    let minHoje = 0;
    let minSemana = 0;
    let minMes = 0;
    const msPorDia = 86400000;
    const agora = Date.now();
    const tbody = document.getElementById('tabelaHistorico');
    tbody.innerHTML = '';

    const logsOrdenados = [...logsConcurso].sort((a, b) => b.timestamp - a.timestamp);
    logsOrdenados.forEach(log => {
        if (log.data === hoje) minHoje += log.minutos;
        if ((agora - log.timestamp) <= (7 * msPorDia)) minSemana += log.minutos;
        if ((agora - log.timestamp) <= (30 * msPorDia)) minMes += log.minutos;

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
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-sm text-muted">Nenhum registro encontrado por enquanto.</td></tr>';
    }

    document.getElementById('statsHoje').innerText = formatarTempo(minHoje);
    document.getElementById('statsSemana').innerText = formatarTempo(minSemana);
    document.getElementById('statsMes').innerText = formatarTempo(minMes);
}
