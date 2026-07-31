// Motor de áudio do jogo. Todo som é sintetizado na hora com a Web Audio
// API — não há um único .mp3/.wav no projeto. Os motivos:
//
//  - nada pra baixar: o bundle não cresce e o jogo continua funcionando
//    offline, o que importa numa sala de aula com internet ruim;
//  - nenhuma licença de banco de sons pra rastrear numa peça institucional;
//  - o timbre quadrado/ruído combina com a arte em pixel.
//
// Este arquivo tem só os tijolos (tom, ruído, envelope, mudo). As receitas
// de cada som ficam em sons.js, e o resto do jogo só conhece `tocar('nome')`.

const CHAVE_MUDO = 'travessiaSegura_mudo';

// Teto de volume do jogo inteiro. Baixo de propósito: são sons sintéticos,
// que cansam muito mais rápido que gravações, e o jogo roda em sala.
const VOLUME_MESTRE = 0.28;

let contexto = null;
let ganhoMestre = null;
let bufferDeRuido = null;

// O acesso ao localStorage pode LANÇAR (aba anônima restrita, iframe com
// sandbox, política corporativa) — mesmo cuidado que o recorde na GameArena.
function lerMudoSalvo() {
  try {
    return localStorage.getItem(CHAVE_MUDO) === '1';
  } catch {
    return false;
  }
}

let mudo = lerMudoSalvo();
const ouvintes = new Set();

// O AudioContext só nasce na primeira tentativa de tocar algo. Criar antes
// disso não adianta: sem um gesto do usuário o navegador o entrega
// suspenso, e alguns ainda registram um aviso no console.
function garantirContexto() {
  if (contexto) return contexto;

  const Construtor = window.AudioContext || window.webkitAudioContext;
  if (!Construtor) return null; // navegador sem Web Audio: o jogo segue mudo

  try {
    contexto = new Construtor();
    ganhoMestre = contexto.createGain();
    ganhoMestre.gain.value = mudo ? 0 : VOLUME_MESTRE;
    ganhoMestre.connect(contexto.destination);
  } catch {
    contexto = null; // nada de áudio, mas nada quebra
  }
  return contexto;
}

// Um segundo de ruído branco, gerado uma vez e reaproveitado por todos os
// sons percussivos (passo, batida, apito). Recriar o buffer a cada passo
// custaria bem mais que reproduzi-lo.
function obterRuido(ctx) {
  if (bufferDeRuido) return bufferDeRuido;
  const amostras = ctx.sampleRate;
  bufferDeRuido = ctx.createBuffer(1, amostras, ctx.sampleRate);
  const dados = bufferDeRuido.getChannelData(0);
  for (let i = 0; i < amostras; i++) {
    dados[i] = Math.random() * 2 - 1;
  }
  return bufferDeRuido;
}

// Envelope curto de ataque e decaimento. O piso 0.0001 não é estética: a
// rampa exponencial da Web Audio não aceita chegar a zero (nem partir dele),
// e um corte seco no lugar dela estala.
function aplicarEnvelope(ganho, inicio, duracao, volume, ataque) {
  const t = Math.max(ataque, 0.001);
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), inicio + t);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
}

// Uma nota. `freqFinal` faz a altura deslizar até lá ao longo da duração —
// é o que dá o tombo da derrota.
export function tocarTom({
  freq,
  freqFinal,
  tipo = 'square',
  atraso = 0,
  duracao = 0.15,
  volume = 0.5,
  ataque = 0.005,
}) {
  if (mudo) return;
  const ctx = garantirContexto();
  if (!ctx) return;

  const inicio = ctx.currentTime + atraso;
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();

  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, inicio);
  if (freqFinal && freqFinal !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqFinal, 1), inicio + duracao);
  }

  aplicarEnvelope(ganho, inicio, duracao, volume, ataque);

  osc.connect(ganho);
  ganho.connect(ganhoMestre);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
}

// Um estouro de ruído filtrado: a base de passo, batida, cantada de pneu e
// do chiado do apito.
export function tocarRuido({
  atraso = 0,
  duracao = 0.2,
  volume = 0.5,
  filtro = 'lowpass',
  freqFiltro = 1000,
  freqFinalFiltro,
  q = 1,
  ataque = 0.005,
}) {
  if (mudo) return;
  const ctx = garantirContexto();
  if (!ctx) return;

  const inicio = ctx.currentTime + atraso;
  const fonte = ctx.createBufferSource();
  fonte.buffer = obterRuido(ctx);
  // Começa num ponto aleatório do buffer: sem isso todo passo reproduz
  // exatamente a mesma sequência de amostras e o ouvido percebe o loop.
  const deslocamento = Math.random() * 0.8;

  const bq = ctx.createBiquadFilter();
  bq.type = filtro;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(freqFiltro, inicio);
  if (freqFinalFiltro && freqFinalFiltro !== freqFiltro) {
    bq.frequency.exponentialRampToValueAtTime(Math.max(freqFinalFiltro, 1), inicio + duracao);
  }

  const ganho = ctx.createGain();
  aplicarEnvelope(ganho, inicio, duracao, volume, ataque);

  fonte.connect(bq);
  bq.connect(ganho);
  ganho.connect(ganhoMestre);
  fonte.start(inicio, deslocamento, duracao + 0.05);
  fonte.stop(inicio + duracao + 0.02);
}

// Chamado a cada gesto do usuário (toque na arena, clique em botão). Os
// navegadores só liberam áudio dentro de um gesto, e uma aba que volta do
// segundo plano pode devolver o contexto suspenso — por isso não basta
// destravar uma vez só.
export function destravarAudio() {
  const ctx = garantirContexto();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function estaMudo() {
  return mudo;
}

export function alternarMudo() {
  mudo = !mudo;
  try {
    localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0');
  } catch {
    // Sem persistência: vale para a sessão.
  }
  if (ganhoMestre && contexto) {
    // Rampa curtíssima em vez de corte seco — mudar o ganho no meio de uma
    // onda estala no alto-falante. O setValueAtTime antes da rampa não é
    // redundante: sem um evento anterior na agenda, de onde a rampa parte
    // fica a critério da implementação.
    const agora = contexto.currentTime;
    ganhoMestre.gain.setValueAtTime(ganhoMestre.gain.value, agora);
    ganhoMestre.gain.linearRampToValueAtTime(mudo ? 0 : VOLUME_MESTRE, agora + 0.05);
  }
  ouvintes.forEach((fn) => fn());
  return mudo;
}

// Assinatura no formato que o useSyncExternalStore espera.
export function assinarMudo(aoMudar) {
  ouvintes.add(aoMudar);
  return () => ouvintes.delete(aoMudar);
}
