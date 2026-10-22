# Laboratório de Estudos

Aplicação web para organizar a preparação para concursos: acompanhe editais, datas importantes, disciplinas, sessões de estudo e metas semanais em um painel único.

## Funcionalidades

- Criar, selecionar e excluir editais de concurso.
- Registrar as datas da prova, do resultado preliminar e do resultado definitivo.
- Cadastrar disciplinas por concurso.
- Registrar sessões de estudo em minutos, associadas a uma disciplina e à data do registro.
- Consultar o histórico de estudos e excluir registros individuais.
- Acompanhar o tempo estudado hoje, nesta semana e nos últimos 30 dias.
- Definir uma meta semanal de 0,5 a 168 horas, em incrementos de 0,5 hora, e visualizar o progresso.

## Tecnologias

- HTML, CSS e JavaScript.
- Tailwind CSS 4 para gerar os estilos da interface.
- Nginx para servir a aplicação na configuração Docker.
- Docker Compose para executar a aplicação e observar alterações nos arquivos CSS de entrada durante o desenvolvimento.

## Requisitos

Para executar com Docker:

- Docker com suporte ao comando `docker compose`.

Para desenvolver sem Docker:

- Node.js e npm.
- Python 3 ou outro servidor HTTP estático local.

## Executar com Docker Compose

Na raiz do repositório, execute:

```bash
docker compose up --build
```

Abra [http://localhost:8080](http://localhost:8080) no navegador. O serviço `painel-estudos` entrega os arquivos pelo Nginx; o serviço `css-watch` recompila o CSS quando os arquivos de origem mudam.

Para encerrar os serviços, use `Ctrl+C` e, se necessário, remova os contêineres com:

```bash
docker compose down
```

## Executar localmente sem Docker

Instale as dependências e gere o CSS:

```bash
npm ci
npm run build:css
```

Inicie um servidor HTTP estático a partir da raiz do repositório:

```bash
python -m http.server 8000
```

Em seguida, acesse [http://localhost:8000/src/](http://localhost:8000/src/). O servidor precisa publicar também a pasta `imagens/`, pois a página referencia esse diretório.

Durante o desenvolvimento, `npm run watch:css` observa os arquivos de entrada e atualiza `src/output.css`. Execute esse comando em outro terminal, mantendo o servidor HTTP ativo.

## Dados e privacidade

A aplicação não possui backend ou banco de dados remoto. Os editais, disciplinas, metas e registros de estudo são guardados no `localStorage` do navegador, sob a chave `concursos_app`.

Isso significa que os dados ficam associados ao navegador e à origem usados para abrir o painel. Eles não são sincronizados automaticamente entre navegadores ou dispositivos. Limpar os dados do site no navegador pode apagá-los. Excluir um edital também remove os registros de estudo vinculados a ele.

Para consultar os registros de estudo no navegador:

1. Abra o painel na mesma origem em que os dados foram cadastrados.
2. Abra as ferramentas de desenvolvedor (geralmente com **F12**) e selecione a aba **Console**.
3. Execute:

```js
JSON.parse(localStorage.getItem('concursos_app')).logs
```

Para consultar todo o conteúdo armazenado pelo painel:

```js
JSON.parse(localStorage.getItem('concursos_app'))
```

## Estrutura do projeto

```text
.
├── imagens/
│   └── calendar-sparkle.svg   # Ícone usado no painel
├── src/
│   ├── index.html             # Estrutura da interface
│   ├── input.css              # Entrada do Tailwind CSS e estilos do projeto
│   ├── output.css             # CSS gerado pelo build
│   └── script.js              # Lógica da aplicação e persistência local
├── compose.yaml               # Serviços da aplicação e do observador de CSS
├── Dockerfile                 # Build do CSS e imagem final com Nginx
├── nginx.default.conf         # Configuração do servidor Nginx
├── package.json               # Scripts e dependências de desenvolvimento
└── package-lock.json          # Versões travadas das dependências npm
```

## Como o código funciona

A lógica da aplicação está em `src/script.js` e é executada no próprio navegador. O objeto `bd` representa os dados carregados da chave `concursos_app` no `localStorage`. Ele tem duas listas principais:

- `concursos`: cada concurso guarda seu identificador, nome, datas importantes, meta semanal e disciplinas.
- `logs`: cada sessão de estudo guarda seu identificador, o concurso e a disciplina associados, a duração em minutos, a data e um timestamp.

Quando uma alteração é feita, `salvarBD()` converte o objeto para JSON com `JSON.stringify()` e atualiza o `localStorage`. Na inicialização, `JSON.parse()` recupera o conteúdo salvo. Assim, os dados continuam disponíveis depois que a página é fechada, mas permanecem somente naquele navegador e naquela origem.

### Fluxo da interface

1. `init()` preenche o seletor de concursos e abre o primeiro concurso salvo, se houver.
2. `mudarConcurso()` atualiza o concurso ativo, mostra ou esconde o painel e chama as funções de renderização.
3. Ações como criar concurso, adicionar disciplina, registrar estudo ou excluir um registro modificam `bd`, salvam os dados e atualizam as partes correspondentes da tela.
4. `renderizarDisciplinas()` monta os campos para lançar minutos. `renderizarHistoricoEStats()` filtra os registros do concurso ativo, atualiza o histórico e calcula os totais de estudo.

Os botões usam atributos `data-action`. Um listener de clique no documento identifica a ação e encaminha a chamada para a função correspondente. Essa delegação de eventos também funciona para botões criados dinamicamente quando a lista de disciplinas ou o histórico são renderizados.

### Funções e cálculos importantes

- `formatarTempo(minutos)` converte um total de minutos para o formato `Xh Ym`, usado nas estatísticas e na meta.
- `formatarDataLocal(data)` produz uma data no formato `AAAA-MM-DD` com os valores locais, evitando que uma conversão para UTC altere o dia registrado.
- `obterInicioSemana(data)` calcula a segunda-feira da semana da data recebida. As estatísticas semanais consideram o período de segunda a domingo.
- `renderizarHistoricoEStats()` ordena uma cópia dos registros mais recentes primeiro e calcula os totais de hoje, da semana e dos últimos 30 dias. Os registros armazenados não são reordenados.
- `renderizarProgressoMetaSemanal(minutos)` compara o total semanal com a meta em horas convertida para minutos. O percentual pode passar de 100%, mas a largura da barra visual é limitada a 100%.
- `escaparHTML(valor)` codifica caracteres especiais antes de inserir nomes e identificadores em trechos de HTML gerados pelo JavaScript.

As renderizações usam elementos do DOM como `innerHTML`, `innerText` e `classList` para atualizar o conteúdo, os textos e a visibilidade das áreas do painel sem recarregar a página.

## Scripts npm

| Comando | Descrição |
| --- | --- |
| `npm run build:css` | Compila e minifica o CSS em `src/output.css`. |
| `npm run watch:css` | Observa os arquivos de entrada e recompila o CSS quando necessário. |
