# Soberana Obras — Sistema de Gestão de Obras

React (Vite) + Supabase. Funciona no computador e no celular.

## O que o sistema faz

- **Obras** separadas, cada uma com cliente, valor do contrato, orçamento previsto e situação
- **Entradas e saídas** de cada obra (compras, serviços, recebimentos), com comprovante anexado
- **Notas**: anexa a foto ou o PDF da nota com o valor, e ela já entra como gasto da obra
- **Funcionários**: cadastro geral, vínculo com as obras e registro de pagamentos, que são descontados da obra
- **Documentos**: planta, escritura, matrícula, contrato, documento pessoal, memorial descritivo, carta de entrega, alvará
- **Painel** por obra e geral: saldo, lucro previsto, gastos por categoria, gráfico mensal, contas pendentes
- **Extrato** com filtros (período, tipo, categoria, situação, funcionário, busca) e **download em PDF**

## Como colocar para rodar

### 1. Supabase
1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**
   (cria as tabelas, as regras de segurança e o bucket `arquivos` para os anexos)
3. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**
4. Em **Authentication → Users → Add user**, crie o login do seu pai (e de quem mais for usar)

### 2. Projeto
```bash
npm install
cp .env.example .env      # preencha com Project URL e anon key (Project Settings → API)
npm run dev               # abre em http://localhost:5173
```

### 3. Publicar (Cloudflare Pages — gratuito, permite uso comercial)
1. Em https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**, escolha este repositório
2. Configuração de build: **Framework preset** `React (Vite)` · **Build command** `npm run build` · **Output directory** `dist`
3. Em **Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. **Save and Deploy**. A cada Merge na `main` o site atualiza sozinho.

O Cloudflare Pages já devolve o `index.html` para qualquer rota (sistema de página única), então atualizar a página dentro de uma obra funciona sem configuração extra.

## Anexos
Fotos (JPG/PNG/WEBP) são reduzidas automaticamente antes do envio (lado maior até 2000 px, JPEG 80%), o que costuma levar uma foto de 3 MB para menos de 500 KB. PDFs são enviados como estão. Limite de 50 MB por arquivo (plano gratuito do Supabase).

## Estrutura

```
supabase/schema.sql        banco de dados completo
src/lib/                   supabase, formatação, upload de arquivos, PDF, constantes (categorias, tipos de documento)
src/components/            layout, modais, listas, gráficos
src/pages/                 Painel, Obras, Funcionários, Clientes, Login
src/pages/obra/            abas da obra: Resumo, Entradas e saídas, Notas, Funcionários, Documentos, Extrato
```

Para mudar categorias de gasto, tipos de documento ou formas de pagamento: `src/lib/constants.js`.
