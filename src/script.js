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
            case 'salvar-meta-semanal':
                salvarMetaSemanal();
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

function formatarDataLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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
        metaSemanalHoras: null,
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
    document.getElementById('metaSemanalHoras').value = Number.isFinite(concursoAtual.metaSemanalHoras) && concursoAtual.metaSemanalHoras > 0
        ? concursoAtual.metaSemanalHoras
        : '';

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

    const dataAtual = formatarDataLocal(new Date());
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

function obterInicioSemana(data) {
    const inicioSemana = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const diasDesdeSegunda = (inicioSemana.getDay() + 6) % 7;
    inicioSemana.setDate(inicioSemana.getDate() - diasDesdeSegunda);
    return inicioSemana;
}

function renderizarProgressoMetaSemanal(minutosEstudados) {
    const metaHoras = concursoAtual.metaSemanalHoras;
    const metaDefinida = Number.isFinite(metaHoras) && metaHoras > 0;
    const minutosMeta = metaDefinida ? metaHoras * 60 : 0;
    const percentual = metaDefinida ? Math.round((minutosEstudados / minutosMeta) * 100) : 0;
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

function renderizarHistoricoEStats() {
    const logsConcurso = bd.logs.filter(log => log.idConcurso === concursoAtual.id);
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioAmanha = new Date(inicioHoje);
    inicioAmanha.setDate(inicioAmanha.getDate() + 1);
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

    const logsOrdenados = [...logsConcurso].sort((a, b) => b.timestamp - a.timestamp);
    logsOrdenados.forEach(log => {
        if (log.timestamp >= inicioHoje.getTime() && log.timestamp < inicioAmanha.getTime()) minHoje += log.minutos;
        if (log.timestamp >= inicioSemana.getTime() && log.timestamp < inicioProximaSemana.getTime()) minSemana += log.minutos;
        if ((timestampAgora - log.timestamp) <= (30 * msPorDia)) minMes += log.minutos;

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
    renderizarProgressoMetaSemanal(minSemana);
}
