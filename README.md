# Travessia Segura — NITTRANS

Jogo educativo de trânsito em que o jogador atravessa ruas de Niterói
respeitando a sinalização. Feito para a NITTRANS pela equipe de Gestão e
Modernização.

A pista é infinita: o objetivo é somar pontos atravessando com segurança até
chegar à praia, aos 200 pontos.

## Como rodar

Requer Node.js 20 ou superior.

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
| `npm run lint` | ESLint |
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

Em dispositivos de toque: segurar a tela anda para frente, e aparecem botões
laterais para os lados.

## Regras do jogo

**Semáforo.** Só dá para entrar na rua quando o sinal abre para o pedestre.
No verde e no amarelo os carros ainda estão passando, então tentar entrar
bloqueia o movimento e custa uma vida.

**Faixa de pedestres.** Atravessar fora da faixa vale metade dos pontos. A
exceção é quando há um carro parado bloqueando a faixa: aí o desvio foi
forçado e não há punição.

**Pontuação.** Os pontos só são creditados ao completar a travessia, ao
chegar na calçada seguinte. Ficar preso na rua quando o sinal abre custa
pontos — ou uma vida, se não houver pontos a descontar.

**Chamar o guarda.** Quando um veículo para em cima da faixa, o botão
"Chamar Guarda" (ou `E`) aciona um agente que multa o infrator e libera a
passagem, com um pequeno bônus de pontos. Cada faixa só pode ser atendida
uma vez.

**Vidas.** São três. Ao perder uma, o jogador volta para a calçada com uma
janela curta de invulnerabilidade, piscando.

**Dificuldade.** Conforme a pontuação sobe, os sinais fecham mais cedo e o
trânsito fica mais rápido, até um teto que mantém a travessia possível.

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
    components/                 Pedestre, veículos, semáforo, agente, menus
    hooks/
      usePlayerMovement.js      Movimento, colisão e respawn
      useGuardSystem.js         Detecção de carro na faixa e acionamento
      useResponsiveScale.js     Escala da arena conforme a tela
test/                           Testes unitários (Vitest)
e2e/                            Testes de ponta a ponta (Playwright)
```

O jogo trabalha num sistema de coordenadas fixo de 600×400 px; a arena é
escalada por CSS para preencher a tela sem alterar a lógica.

`gameGrid.js` é a fonte única sobre o tabuleiro — em que tipo de piso o
jogador está, onde ficam as faixas e a partir de onde ele já está seguro na
calçada. Regras que dependem disso devem consultá-lo em vez de recalcular:
duas contas diferentes para "está na calçada" já causaram punição indevida
no passado.

## Testes

Os unitários cobrem a lógica pura (tabuleiro e dificuldade) e rodam em
milissegundos. Os de ponta a ponta cobrem o que só existe com o jogo em
execução: colisão, semáforo, faixa, guarda e pausa.

O Playwright sobe o servidor de desenvolvimento sozinho. Na primeira vez
pode ser necessário instalar o navegador:

```bash
npx playwright install chromium
```

Testes que medem pontuação afastam os veículos antes de medir: quando o
sinal fecha, cada carro para onde estiver, e um carro parado em cima da
faixa atropela o jogador no meio da medição.

## Publicação

`npm run build` gera arquivos estáticos em `dist/`, que podem ser servidos
por qualquer servidor web ou hospedagem estática.
