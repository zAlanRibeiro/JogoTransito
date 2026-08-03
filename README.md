# Travessia Segura — NITTRANS

Jogo educativo de trânsito em que o jogador atravessa ruas de Niterói
respeitando a sinalização. Feito para a NITTRANS pela equipe de Gestão e
Modernização.

A pista é infinita: o objetivo é somar pontos atravessando com segurança até
chegar à praia, aos 200 pontos.

**No ar:** <https://zalanribeiro.github.io/JogoTransito/>

## Como rodar

Requer Node.js 20 ou superior (a publicação usa a 22).

```bash
npm install
npm run dev
```

O jogo sobe em `http://localhost:5173`.

Também é possível subir via Docker, sem instalar Node na máquina:

```bash
docker compose up
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve o `dist/` para conferir o build |
| `npm run lint` | ESLint — trava a publicação se acusar algo |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:watch` | Testes unitários em modo observação |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) |

## Controles

| Tecla | Ação |
| --- | --- |
| `W` ou `↑` | Andar para frente |
| `S` ou `↓` | Andar para trás (só dentro da cena atual) |
| `A` `D` ou `←` `→` | Mover para os lados |
| `E` | Chamar o guarda |
| `Esc` | Pausar |

Em dispositivos de toque aparece um **joystick virtual** no canto inferior
esquerdo, com as quatro direções e uma zona morta no centro — sem ela,
encostar o polegar já empurraria o boneco, e ele nunca conseguiria ficar
parado na calçada esperando o sinal, que é justamente o que o jogo ensina.

O joystick substituiu um esquema anterior de zonas invisíveis (segurar a tela
andava para frente, os cantos de baixo andavam para os lados). Aquele esquema
tinha dois defeitos de fundo: as fronteiras não apareciam na tela, e não havia
como andar para trás.

## Regras do jogo

**Semáforo.** Só dá para entrar na rua quando o sinal abre para o pedestre.
No verde e no amarelo os carros ainda estão passando, então tentar entrar
bloqueia o movimento e custa uma vida.

**Carro que fura o sinal.** De vez em quando um veículo avança o vermelho.
Existe um intervalo mínimo entre uma furada e a próxima (`furarSinal.js`):
sem ele a exceção viraria rotina e a lição se perderia. O jogo ensina a olhar
antes de pisar na rua **mesmo com o sinal a favor**, e isso só funciona se o
normal continuar sendo o carro que para.

**Faixa de pedestres.** Atravessar fora da faixa vale metade dos pontos. A
exceção é quando há um carro parado bloqueando a faixa: aí o desvio foi
forçado e não há punição.

**Pontuação.** Os pontos só são creditados ao completar a travessia, ao
chegar na calçada seguinte. Ficar preso na rua quando o sinal abre custa
pontos — ou uma vida, se não houver pontos a descontar.

**Chamar o guarda.** Quando um veículo para em cima da faixa, o botão
"Chamar Guarda" (ou `E`) aciona um agente que multa o infrator e libera a
passagem, com um pequeno bônus de pontos. Cada faixa só pode ser atendida
uma vez. O bônus é próximo do que vale uma travessia completa, de propósito:
com um valor alto compensava mais caçar carro parado do que praticar a
travessia segura — o oposto da lição.

**Vidas.** São três. Ao perder uma, o jogador volta para a calçada com uma
janela curta de invulnerabilidade, piscando.

**Dificuldade.** Conforme a pontuação sobe, os sinais fecham mais cedo e o
trânsito fica mais rápido, até um teto que mantém a travessia possível.

**Resumo de infrações.** O fim de partida mostra quantas vezes e de que tipo
o jogador errou, separado entre leves (só custaram pontos) e pesadas
(custaram vida). É reforço pedagógico: o aviso durante o jogo passa rápido, o
resumo fica.

**Som.** Efeitos sintetizados na hora com a Web Audio API — não há arquivo de
áudio no projeto. Dá para silenciar pelo botão do HUD, e a escolha fica salva.

**Recorde.** Fica salvo no navegador (`localStorage`). Se o armazenamento
estiver bloqueado, o jogo funciona normalmente e o recorde vale só para a
sessão.

## Estrutura

```
src/
  App.jsx, App.css              Casca da aplicação e estilos
  assets/                       Sprites e imagens
  features/TravessiaSegura/
    GameArena.jsx               Orquestra estado, HUD, modais e cena
    gameGrid.js                 Fonte única do tabuleiro (segmentos e faixas)
    difficulty.js               Progressão de dificuldade
    furarSinal.js               Regra do carro que avança o vermelho
    infracoes.js                Catálogo de infrações e agrupamento
    audio/
      motorDeAudio.js           Tijolos de síntese (tom, ruído, envelope, mudo)
      sons.js                   Receitas de cada efeito
    components/                 Pedestre, veículos, semáforo, agente, menus,
                                joystick, resumo e ícones do HUD
    hooks/
      usePlayerMovement.js      Movimento, colisão e respawn
      useGuardSystem.js         Detecção de carro na faixa e acionamento
      useArenaResponsiva.js     Largura e escala da arena conforme a tela
      useOrientacao.js          Aviso e pedido de tela deitada
      useSom.js                 Estado do botão de som
test/                           Testes unitários (Vitest)
e2e/                            Testes de ponta a ponta (Playwright)
```

### Coordenadas

A **altura** do jogo é fixa em 400px, e é dela que sai o sistema de
coordenadas: segmentos de 100px, posição da câmera e as margens de colisão
calibradas em `usePlayerMovement`.

A **largura** é elástica, entre 600 e 1000px, acompanhando a proporção da
tela. Ela já foi fixa em 600, e isso desperdiçava até 42% da tela de um
celular deitado em tarjas laterais vazias — celular em paisagem é largo e
baixo, então quem mandava na escala era sempre a altura. O piso de 600 garante
que nenhuma tela fique com menos jogo do que tinha antes; o teto evita que um
monitor ultralargo transforme a arena numa fita.

Por cima disso a arena é escalada por CSS (`zoom`, não `transform`, para o
pixel art não borrar). Nada disso muda a lógica do jogo — mas **qualquer
código que dependa da largura precisa lê-la, nunca supor 600**. Três bugs já
nasceram disso: a checagem da faixa de pedestre comparava com o centro fixo em
300 e marcava como fora da faixa quem atravessava em cima dela; o jogador
nascia a 30% da tela; e o poste do semáforo se soltava da faixa.

### Fonte única do tabuleiro

`gameGrid.js` é a fonte única sobre o tabuleiro — em que tipo de piso o
jogador está, onde ficam as faixas e a partir de onde ele já está seguro na
calçada. Regras que dependem disso devem consultá-lo em vez de recalcular:
duas contas diferentes para "está na calçada" já causaram punição indevida
no passado.

## Testes

Os unitários cobrem a lógica pura (tabuleiro, dificuldade, regra da furada e
resumo de infrações) e rodam em milissegundos. Os de ponta a ponta cobrem o
que só existe com o jogo em execução: colisão, semáforo, faixa, guarda, pausa,
joystick, som, recorde e **velocidade**.

O Playwright sobe o servidor de desenvolvimento sozinho. Na primeira vez
pode ser necessário instalar o navegador:

```bash
npx playwright install chromium
```

Duas armadilhas que os testes já pagaram para aprender:

**Testes que medem pontuação afastam os veículos antes de medir.** Quando o
sinal fecha, cada carro para onde estiver, e um carro parado em cima da faixa
atropela o jogador no meio da medição.

**A posição do jogador se lê pelo tabuleiro, não pelo elemento na tela.** O
boneco fica fixo na tela e quem anda é a câmera, então o `style` dele não muda
ao caminhar para frente. Use `lerPosicaoY` dos helpers.

Os testes de `velocidade.spec.js` existem por causa de dois defeitos que
**não aparecem numa máquina de desenvolvimento** e só apareceram na mão de
quem jogava no celular:

- a velocidade do jogador era contada por quadro de `requestAnimationFrame`,
  então numa tela de 120Hz ele corria o dobro do previsto enquanto os carros e
  o semáforo seguiam o relógio;
- a duração da animação dos carros não acompanhava a largura elástica, então
  numa arena de 999px o trânsito andava 42% mais rápido em relação a quem
  atravessa.

Por isso aqueles testes forçam uma taxa de quadros alta e comparam as
velocidades em duas larguras de tela, em vez de confiar no ambiente.

## Publicação

O push na `main` publica sozinho. O workflow
[`.github/workflows/publicar.yml`](.github/workflows/publicar.yml) roda os
testes, o lint e o build, e envia o `dist/` para o GitHub Pages. Se qualquer
etapa falhar, a publicação para e o site continua servindo a última versão boa.

Dois detalhes que já quebraram o site e é bom não desfazer:

**`base: './'` no `vite.config.js`.** Sem isso o build gera caminhos absolutos
(`/assets/...`), que dão 404 quando o jogo é servido de uma subpasta — e a
tela fica em branco, sem erro visível.

**Imagens entram por `import`, nunca por caminho montado em texto.** O Vite só
reescreve o caminho de um asset quando ele é importado. Montar o caminho numa
string funciona no desenvolvimento e quebra em produção — o sprite do guarda
já sumiu assim:

```jsx
// Quebra em produção: o Vite não vê este caminho e não o reescreve.
<img src={`/agente_${frame}.png`} />

// Certo: cada quadro é importado e o caminho final vem do bundler.
import agente1 from '../../../assets/agente_1.png';
const QUADROS = { 1: agente1, /* ... */ };
<img src={QUADROS[frame]} />
```

O workflow apaga o `package-lock.json` antes de instalar. É proposital: o lock
gerado no Windows não registra os binários específicos de Linux
([npm/cli#4828](https://github.com/npm/cli/issues/4828)), e sem isso a
instalação no CI falha. O arquivo explica o contexto e como recuperar o
`npm ci`.

Para hospedar em outro lugar, `npm run build` gera arquivos estáticos em
`dist/` que servem em qualquer servidor web.
