# Nimb — Preparatório IFRH/ANAC

App de estudo estático (HTML/CSS/JS puro, sem build) para a habilitação de **Voo por Instrumentos em Helicóptero (IFRH)** da ANAC — exame teórico **IFR** dividido em 3 provas: REG, MET e NAV.

## Rodando localmente

Não precisa de instalação. Abra `index.html` no navegador, ou sirva a pasta com qualquer servidor estático:

```bash
python -m http.server 8080
```

## Estrutura

- `index.html` — landing page / onboarding (hero, proposta de valor, formulário de 2 perguntas que personaliza o painel, "como funciona", matérias, metodologia/fontes, FAQ)
- `painel.html` — painel do app com contagem regressiva e progresso por matéria (destino após o onboarding)
- `regulamento.html`, `meteorologia.html`, `navegacao.html` — conteúdo de estudo por matéria
- `calculadoras.html` — triângulo de velocidades, tempo/distância/combustível, altitude densidade, razão de descida, conversões
- `quiz.html` — simulados por matéria (nota de corte 70%, igual à ANAC)
- `flashcards.html` — revisão espaçada (SM-2 simplificado)
- `plano.html` — cronograma de 15 dias
- `recursos.html` — normas oficiais, bancos de questões e comunidades
- `data/` — bancos de questões, flashcards e plano em JSON
- `js/app.js` — utilidades compartilhadas (localStorage, progresso, contagem regressiva)
- `js/onboarding.js` — animação de entrada (scroll-reveal) e lógica do formulário de onboarding da landing page
- `robots.txt`, `sitemap.xml` — SEO básico

## Fontes normativas usadas

- RBAC 61 (Subparte L — habilitação por instrumentos), RBAC 91 (regras de operação)
- IS 00-003H (estrutura do exame teórico ANAC)
- ICA 100-12 (regras do ar) e ICA 105-xx (meteorologia aeronáutica) — DECEA

Todo o conteúdo é material de apoio não-oficial. Sempre confira a norma vigente em [anac.gov.br](https://www.anac.gov.br) e [publicacoes.decea.mil.br](https://publicacoes.decea.mil.br). Pontos ainda não confirmados contra a norma primária estão sinalizados no próprio conteúdo (caixas "⚠").
