//Aqui estou dizendo ao TS qual a forma exata dos dados.
interface DatasConcurso{
    prova: string;
    resultado: string;
    homologacao: string;
}

interface Disciplina {
    id: string;
    nome: string;
}

interface Concurso {
    id: string;
    nome: string;
    datas: DatasConcurso;
    metaSemanalHoras: number | null;
    disciplinas: Disciplina[];
}

interface LogEstudo {
    id: string;
    idConcurso: string;
    idDisciplina: string;
    minutos: number;
    data: string;
    timestamp: number;
}

interface BancoDeDados {
    concursos: Concurso[];
    logs: LogEstudo[];
}

//Recupera os dados com segurança, checando antes se veio string ou null
const dadosSalvos = localStorage.getItem('concursos_app');
const bd: BancoDeDados = dadosSalvos ? JSON.parse(dadosSalvos) : { concursos: [], logs: [] };
let concursoAtual: Concurso | null = null;

// Auxiliar para buscar elementos do DOM garantindo que existem e têm o tipo HTML exato.
function obterElemento<T extends HTMLElement>(id: string, construtor: new () => T): T {
    const elemento = document.getElementById(id);
    if (!(elemento instanceof construtor)) {
        throw new Error(`Elemento #${id} não encontrado ou não corresponde ao tipo esperado.`);
    }
    return elemento;
}

// Aguarda o HTML estar pronto antes de procurar elementos e registrar os eventos da interface.
document.addEventListener('DOMContentLoaded', () => {
    // Ao trocar o concurso selecionado, atualiza os dados exibidos no painel.
    obterElemento('concursoSelect', HTMLSelectElement).addEventListener('change', mudarConcurso);

    // Usa delegação de eventos para detectar alterações nos campos de data do painel.
    obterElemento('dashboard', HTMLElement).addEventListener('change', event => {
        if (event.target instanceof Element && event.target.matches('[data-date-field]')) {
            salvarDatas();
        }
    });

    // Um único listener trata os botões atuais e também os criados dinamicamente depois.
    document.addEventListener('click', event => {
        // Ignora cliques que não tenham um elemento HTML como alvo.
        if (!(event.target instanceof Element)) return;

        // Procura o botão (ou ancestral) que declara uma ação por meio de data-action.
        const button = event.target.closest<HTMLElement>('[data-action]');
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
                if (button.dataset.disciplinaId) {
                    registrarEstudo(button.dataset.disciplinaId);
                }
                break;
            case 'apagar-log':
                if (button.dataset.logId) {
                    apagarLog(button.dataset.logId);
                }
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
const MAPA_HTML: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

// Inicializa a tela com os dados que já existem no navegador.
function init(): void {
    atualizarSelectConcursos();
    if (bd.concursos.length > 0) {
        obterElemento('concursoSelect', HTMLSelectElement).value = bd.concursos[0].id;
        mudarConcurso();
    }
}

// Serializa o objeto de dados para JSON e o persiste no armazenamento local do navegador.
function salvarBD(): void {
    localStorage.setItem('concursos_app', JSON.stringify(bd));
}

// Converte uma duração em minutos para o formato legível "Xh Ym".
function formatarTempo(minutosTotais: number): string {
    const h = Math.floor(minutosTotais / 60);
    const m = minutosTotais % 60;
    return `${h}h ${m}m`;
}

// Formata uma data usando o fuso local, evitando que conversões UTC mudem o dia exibido.
function formatarDataLocal(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Codifica caracteres especiais antes de inserir valores em HTML, reduzindo risco de injeção.
function escaparHTML(valor: unknown): string {
    return String(valor).replace(/[&<>"']/g, caractere => MAPA_HTML[caractere] ?? caractere);
}

// Solicita o nome de um concurso, cria sua estrutura inicial e salva/seleciona o novo item.
function novoConcurso(): void {
    const nome = prompt("Qual o nome do concurso? (ex: IFCE - Técnico TI)");
    if (!nome) return;

    const novo: Concurso = {
        id: Date.now().toString(),
        nome: nome,
        datas: { prova: '', resultado: '', homologacao: '' },
        metaSemanalHoras: null,
        disciplinas: []
    };

    bd.concursos.push(novo);
    salvarBD();
    atualizarSelectConcursos();
    obterElemento('concursoSelect', HTMLSelectElement).value = novo.id;
    mudarConcurso();
}

// Reconstrói as opções do seletor com os concursos atualmente armazenados.
function atualizarSelectConcursos(): void {
    const select = obterElemento('concursoSelect', HTMLSelectElement);
    select.innerHTML = '<option value="">Selecione...</option>';
    bd.concursos.forEach(concurso => {
        select.innerHTML += `<option value="${escaparHTML(concurso.id)}">${escaparHTML(concurso.nome)}</option>`;
    });
}

// Sincroniza o concurso selecionado com o painel e seus campos, listas e estatísticas.
function mudarConcurso(): void {
    const id = obterElemento('concursoSelect', HTMLSelectElement).value;
    const btnExcluir = obterElemento('btnExcluirEdital', HTMLElement);
    const dashboard = obterElemento('dashboard', HTMLElement);

    if (!id) {
        // Sem seleção, esconde o painel e remove a referência ao concurso ativo.
        dashboard.classList.add('hidden');
        btnExcluir.classList.add('hidden');
        concursoAtual = null;
        return;
    }

    concursoAtual = bd.concursos.find(concurso => concurso.id === id) ?? null;
    if (!concursoAtual) return;

    dashboard.classList.remove('hidden');
    btnExcluir.classList.remove('hidden');
    obterElemento('dataProva', HTMLInputElement).value = concursoAtual.datas.prova;
    obterElemento('dataResultado', HTMLInputElement).value = concursoAtual.datas.resultado;
    obterElemento('dataHomologacao', HTMLInputElement).value = concursoAtual.datas.homologacao;

    const meta = concursoAtual.metaSemanalHoras;
    obterElemento('metaSemanalHoras', HTMLInputElement).value =
        meta !== null && Number.isFinite(meta) && meta > 0 ? String(meta) : '';

    renderizarDisciplinas();
    renderizarHistoricoEStats();
}

// Exclui o concurso e todos os registros de estudo associados, após confirmação explícita.
function excluirConcurso(): void {
    if (!concursoAtual) return;
    const atual = concursoAtual;

    const confirmacao = confirm(`Tem certeza que deseja excluir o edital "${atual.nome}"? \n\nIsso apagará permanentemente TODAS as disciplinas e o histórico de estudos (logs) vinculados a este concurso.`);
    if (!confirmacao) return;

    bd.concursos = bd.concursos.filter(concurso => concurso.id !== atual.id);
    bd.logs = bd.logs.filter(log => log.idConcurso !== atual.id);
    salvarBD();

    atualizarSelectConcursos();
    obterElemento('concursoSelect', HTMLSelectElement).value = "";
    mudarConcurso();
    alert("Edital e histórico excluídos com sucesso!");
}

// Lê as datas dos campos do formulário e as salva no concurso selecionado.
function salvarDatas(): void {
    if (!concursoAtual) return;
    concursoAtual.datas.prova = obterElemento('dataProva', HTMLInputElement).value;
    concursoAtual.datas.resultado = obterElemento('dataResultado', HTMLInputElement).value;
    concursoAtual.datas.homologacao = obterElemento('dataHomologacao', HTMLInputElement).value;
    salvarBD();
}

// Valida e salva uma meta semanal; a validação do próprio input também é respeitada.
function salvarMetaSemanal(): void {
    if (!concursoAtual) return;

    const input = obterElemento('metaSemanalHoras', HTMLInputElement);
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
function novaDisciplina(): void {
    if (!concursoAtual) return;

    const nome = prompt("Nome da disciplina: (ex: Redes de Computadores, Lei 8.112)");
    if (!nome) return;

    concursoAtual.disciplinas.push({ id: Date.now().toString(), nome: nome });
    salvarBD();
    renderizarDisciplinas();
}

// Gera o HTML da lista de disciplinas, incluindo um campo de minutos e botão por disciplina.
function renderizarDisciplinas(): void {
    if (!concursoAtual) return;
    const concurso = concursoAtual;
    const div = obterElemento('listaDisciplinas', HTMLElement);
    div.innerHTML = '';

    if (concurso.disciplinas.length === 0) {
        // Exibe uma mensagem de estado vazio em vez de deixar a área sem conteúdo.
        div.innerHTML = '<p class="rounded-2xl border border-dashed border-line bg-canvas px-4 py-6 text-center text-sm text-muted">Nenhuma disciplina adicionada. Clique em “+ Adicionar disciplina” para começar.</p>';
        return;
    }

    concurso.disciplinas.forEach(disciplina => {
        div.innerHTML += `
            <div class="flex flex-col gap-3 rounded-2xl border border-line bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
                <span class="font-semibold text-ink">${escaparHTML(disciplina.nome)}</span>
                <div class="flex flex-wrap items-center gap-2">
                    <label for="minutos-${escaparHTML(disciplina.id)}" class="sr-only">Minutos estudados</label>
                    <input type="number" min="1" id="minutos-${escaparHTML(disciplina.id)}" placeholder="Minutos" class="min-h-10 w-28 rounded-xl border border-line bg-white px-3 text-center text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-sage-strong focus:ring-4 focus:ring-sage">
                    <button type="button" data-action="registrar-estudo" data-disciplina-id="${escaparHTML(disciplina.id)}" class="min-h-10 rounded-xl bg-sage px-4 text-sm font-bold text-sage-strong transition hover:bg-sage-strong hover:text-white focus-visible:ring-4 focus-visible:ring-sage">
                        Salvar
                    </button>
                    <div data-daily-total data-disciplina-id="${escaparHTML(disciplina.id)}" aria-label="Total estudado hoje nesta disciplina" class="min-w-24 rounded-xl border border-line bg-white px-3 py-2 text-center">
                        <span class="block text-xs font-bold uppercase tracking-wide text-muted">Hoje</span>
                        <span data-daily-total-value class="block text-sm font-bold text-ink">0h 0m</span>
                    </div>
                </div>
            </div>
        `;
    });

    atualizarTotaisDiariosDisciplinas();
}

// Atualiza os pequenos totais diários sem reconstruir os campos de entrada das disciplinas.
function atualizarTotaisDiariosDisciplinas(): void {
    if (!concursoAtual) return;

    const dataHoje = formatarDataLocal(new Date());
    const totaisPorDisciplina = new Map<string, number>();
    bd.logs.forEach(log => {
        if (log.idConcurso === concursoAtual?.id && log.data === dataHoje) {
            totaisPorDisciplina.set(
                log.idDisciplina,
                (totaisPorDisciplina.get(log.idDisciplina) ?? 0) + log.minutos
            );
        }
    });

    obterElemento('listaDisciplinas', HTMLElement)
        .querySelectorAll<HTMLElement>('[data-daily-total]')
        .forEach(card => {
            const idDisciplina = card.dataset.disciplinaId;
            const valor = card.querySelector<HTMLElement>('[data-daily-total-value]');
            if (idDisciplina && valor) {
                valor.innerText = formatarTempo(totaisPorDisciplina.get(idDisciplina) ?? 0);
            }
        });
}

// Valida os minutos informados e registra uma sessão de estudo com data e horário exatos.
function registrarEstudo(idDisciplina: string): void {
    if (!concursoAtual) return;

    const input = obterElemento(`minutos-${idDisciplina}`, HTMLInputElement);
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
    atualizarTotaisDiariosDisciplinas();
    renderizarHistoricoEStats();
}

// Remove um registro de estudo pelo identificador e atualiza o histórico e os totais.
function apagarLog(idLog: string): void {
    if (!concursoAtual) return;

    bd.logs = bd.logs.filter(log => log.id !== idLog);
    salvarBD();
    atualizarTotaisDiariosDisciplinas();
    renderizarHistoricoEStats();
}

// Retorna a segunda-feira da semana que contém a data recebida (sem alterar a data original).
function obterInicioSemana(data: Date): Date {
    const inicioSemana = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const diasDesdeSegunda = (inicioSemana.getDay() + 6) % 7;
    inicioSemana.setDate(inicioSemana.getDate() - diasDesdeSegunda);
    return inicioSemana;
}

// Atualiza os números, a barra de progresso e a mensagem referentes à meta semanal.
function renderizarProgressoMetaSemanal(minutosEstudados: number): void {
    if (!concursoAtual) return;

    const metaHoras = concursoAtual.metaSemanalHoras;
    const metaDefinida = metaHoras !== null && Number.isFinite(metaHoras) && metaHoras > 0;
    const minutosMeta = metaDefinida ? metaHoras * 60 : 0;
    const percentual = metaDefinida ? Math.round((minutosEstudados / minutosMeta) * 100) : 0;
    // O texto pode ultrapassar 100%, mas a largura visual da barra fica limitada a 100%.
    const percentualBarra = Math.min(percentual, 100);

    obterElemento('estudadoMetaSemanal', HTMLElement).innerText = formatarTempo(minutosEstudados);
    obterElemento('objetivoMetaSemanal', HTMLElement).innerText = metaDefinida ? formatarTempo(minutosMeta) : 'Não definida';
    obterElemento('restanteMetaSemanal', HTMLElement).innerText = metaDefinida
        ? formatarTempo(Math.max(minutosMeta - minutosEstudados, 0))
        : '—';
    obterElemento('percentualMetaSemanal', HTMLElement).innerText = `${percentual}%`;
    obterElemento('preenchimentoMetaSemanal', HTMLElement).style.width = `${percentualBarra}%`;
    obterElemento('barraMetaSemanal', HTMLElement).setAttribute('aria-valuenow', String(percentualBarra));
    obterElemento('statusMetaSemanal', HTMLElement).innerText = metaDefinida
        ? percentual >= 100
            ? `Meta alcançada! Você completou ${percentual}% do objetivo semanal.`
            : `Você completou ${percentual}% da meta. Continue no seu ritmo.`
        : 'Defina uma meta para acompanhar seu progresso nesta semana.';
}

// Recalcula os totais de estudo, redesenha o histórico e atualiza a meta semanal.
function renderizarHistoricoEStats(): void {
    if (!concursoAtual) return;
    const concurso = concursoAtual;
    // Mantém neste painel apenas registros ligados ao concurso atualmente selecionado.
    const logsConcurso = bd.logs.filter(log => log.idConcurso === concurso.id);
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
    const tbody = obterElemento('tabelaHistorico', HTMLTableSectionElement);
    tbody.innerHTML = '';

    // Ordena uma cópia para mostrar os registros mais recentes primeiro sem reordenar `bd.logs`.
    const logsOrdenados = [...logsConcurso].sort((a, b) => b.timestamp - a.timestamp);
    logsOrdenados.forEach(log => {
        // Soma cada registro aos períodos aplicáveis. A semana começa na segunda-feira.
        if (log.timestamp >= inicioHoje.getTime() && log.timestamp < inicioAmanha.getTime()) minHoje += log.minutos;
        if (log.timestamp >= inicioSemana.getTime() && log.timestamp < inicioProximaSemana.getTime()) minSemana += log.minutos;
        if ((timestampAgora - log.timestamp) <= (30 * msPorDia)) minMes += log.minutos;

        // Se a disciplina não existir mais, mantém o registro e informa isso no histórico.
        const disciplina = concurso.disciplinas.find(item => item.id === log.idDisciplina);
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

    obterElemento('statsHoje', HTMLElement).innerText = formatarTempo(minHoje);
    obterElemento('statsSemana', HTMLElement).innerText = formatarTempo(minSemana);
    obterElemento('statsMes', HTMLElement).innerText = formatarTempo(minMes);
    // A meta semanal usa o mesmo total calculado para a estatística da semana.
    renderizarProgressoMetaSemanal(minSemana);
}
