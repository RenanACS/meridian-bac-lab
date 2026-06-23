*Read this in [English](README.en.md).*

# Meridian Lab — treino de Broken Access Control & IDOR

Um app web deliberadamente vulnerável e **com domínio plugável**, feito para
treinar Broken Access Control (OWASP A01) e IDOR do jeito que eles realmente
aparecem em aplicações reais — UUIDs, referências de negócio sequenciais,
tokens reversíveis, peculiaridades de header, GraphQL, mass assignment —
em vez do clássico `/user/123` de manual.

> ⚠️ **Intencionalmente inseguro. Rode só em localhost.** Nunca implante isso
> ou exponha numa rede. É um alvo de prática, não código de produção.

## O que significa "domínio plugável"

Um único motor, três skins. As falhas de controle de acesso são idênticas;
só os objetos de negócio mudam — assim você aprende a *técnica* (o que
realmente transfere para alvos reais), não um app específico.

```bash
npm install

npm run fintech      # NeoBank Console  — extratos, titulares de conta
npm run health       # MedPort Portal   — atendimentos, pacientes (PHI)
npm run ecommerce    # ShopLab Seller   — pedidos, clientes
# ou: MERIDIAN_DOMAIN=health PORT=4000 node server.js
```

Depois abra **http://localhost:4000** e faça login. O login de demonstração
exato é impresso no console do servidor ao iniciar:

| Domínio     | Marca           | E-mail de login        | Senha           |
|-------------|-----------------|-------------------------|-----------------|
| `fintech`   | NeoBank Console | `alice@northwind.test`  | `Sunshine2026!` |
| `health`    | MedPort Portal  | `alice@cedar.test`      | `Sunshine2026!` |
| `ecommerce` | ShopLab Seller  | `alice@acme.test`       | `Sunshine2026!` |

Você começa como **Alice**, uma `member` de baixo privilégio do *primeiro*
tenant. Existem outros dois tenants (um deles, "Globex", guarda os dados
suculentos cross-tenant).

O vocabulário dos objetos muda por domínio:

| Conceito do motor    | fintech         | health            | ecommerce        |
|-----------------------|-----------------|-------------------|-------------------|
| registro de cobrança  | Extrato (STM)   | Atendimento (ENC) | Pedido (ORD)      |
| conta / pessoa        | Titular de conta| Paciente          | Cliente           |
| documento compartilhado | Documento     | Laudo             | Fatura            |

## Como jogar

1. Navegue pelo app normalmente — ele só chama os endpoints *pretendidos*.
2. Coloque um proxy na frente do seu navegador (**Burp**) e manipule as requisições.
3. Cada falha, ao ser explorada, gera uma flag `MW{...}`.
4. Submeta as flags na página **★ Missões** (ou via `POST /api/scoreboard/submit`).
5. Objetivos + dicas estão em **`MISSIONS.md`**. Sem walkthrough lá.

> As flags resolvidas persistem entre reinicializações (salvas em
> `.progress.json`, fora do git). Todo o resto — registros, mutações que você
> faz (ex: se promover), sessões — fica em memória e reseta ao reiniciar o
> servidor.

## Travou?

Existe um **`SOLUTIONS.md`** selado com os walkthroughs completos. É spoiler —
abra só quando quiser a resposta. (No modo tutor eu não colo o conteúdo dele
no chat a menos que você peça explicitamente.)

## Estrutura

```
server.js              fiação da app + middleware do gateway de borda
core/
  store.js             dados de seed em memória (montados a partir do domínio ativo)
  auth.js              JWT de sessão, cookie de contexto não assinado, middlewares
  challenges.js        catálogo flag <-> falha
  progress.js          persistência das flags resolvidas (.progress.json)
  routes/              auth, resources (IDOR), admin (vertical/BFLA), graphql, scoreboard
domains/               fintech.js · health.js · ecommerce.js  (as skins)
public/                login + UI single-page
lab-fs/                filesystem falso isolado (alvo de path traversal)
```

## Reset / reinício

```bash
# Ctrl-C no servidor, depois inicie de novo — dados de seed novos, scoreboard mantido.
# Para zerar o scoreboard também, apague o .progress.json antes de reiniciar.
```
