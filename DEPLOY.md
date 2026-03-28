# Deploy - Siga Bem

Guia completo para deploy da plataforma Siga Bem em producao.

---

## 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (ou faca login)
2. Clique em **New Project**
3. Escolha a organizacao e preencha:
   - **Name:** `siga-bem`
   - **Database Password:** (anote em local seguro)
   - **Region:** South America (Sao Paulo) — `sa-east-1`
4. Aguarde o projeto ser provisionado (~2 minutos)

---

## 2. Rodar Migrations

As migrations devem ser executadas **na ordem sequencial** (Supabase faz isso automaticamente pelo timestamp).

### Opcao A: Via Supabase CLI (recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplicar todas as migrations
supabase db push
```

### Opcao B: Via SQL Editor (manual)

Execute cada arquivo na ordem no SQL Editor do Supabase Dashboard:

| Ordem | Migration | Descricao |
|-------|-----------|-----------|
| 1 | `20260328180000_create_empresa.sql` | Tabela empresa (tenant) |
| 2 | `20260328180100_create_usuario_table.sql` | Tabela usuarios com roles |
| 3 | `20260328180200_create_motorista_table.sql` | Tabela motoristas |
| 4 | `20260328180300_create_caminhao.sql` | Tabela caminhoes |
| 5 | `20260328180400_create_motorista_caminhao.sql` | Vinculos motorista-caminhao |
| 6 | `20260328180500_create_categoria_gasto_and_gasto.sql` | Categorias e gastos |
| 7 | `20260328180600_create_foto_comprovante.sql` | Fotos de comprovantes |
| 8 | `20260328180700_create_viagem.sql` | Tabela viagens |
| 9 | `20260328180800_add_km_estimado_and_combustivel_preco.sql` | Campos km estimado e preco combustivel |
| 10 | `20260328180850_create_viagem_veiculo.sql` | Veiculos por viagem |
| 11 | `20260328180900_create_fechamento.sql` | Fechamentos mensais |

**IMPORTANTE:** Todas as migrations incluem RLS (Row Level Security) policies. NAO desative o RLS.

---

## 3. Criar Bucket Storage

1. No Supabase Dashboard, va em **Storage**
2. Clique em **New Bucket**
3. Nome: `comprovantes`
4. Marque como **Public** (as fotos de comprovantes precisam ser acessiveis via URL)
5. Configure a policy de upload:
   - Permitir INSERT para usuarios autenticados
   - Permitir SELECT para usuarios autenticados
   - Permitir DELETE para usuarios autenticados

### Via SQL (alternativa):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true);

-- Policy: usuarios autenticados podem fazer upload
CREATE POLICY "Users can upload comprovantes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes');

-- Policy: usuarios autenticados podem ver comprovantes
CREATE POLICY "Users can view comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes');

-- Policy: usuarios autenticados podem deletar comprovantes
CREATE POLICY "Users can delete comprovantes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes');
```

---

## 4. Deploy na Vercel

### 4.1 Conectar Repositorio

1. Acesse [vercel.com](https://vercel.com) e faca login
2. Clique em **Add New Project**
3. Importe o repositorio `guibertolo/siga-bem`
4. Framework: **Next.js** (detectado automaticamente)
5. Root Directory: `.` (raiz)

### 4.2 Configurar Variaveis de Ambiente

No painel do projeto Vercel, va em **Settings > Environment Variables** e adicione:

| Variavel | Valor | Onde Encontrar |
|----------|-------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU_REF.supabase.co` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase > Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase > Settings > API > service_role (SECRETO) |
| `NEXT_PUBLIC_SITE_URL` | `https://siga-bem.vercel.app` | URL do deploy Vercel |

**ATENCAO:** O `SUPABASE_SERVICE_ROLE_KEY` e secreto e NUNCA deve ser exposto no frontend. Ele e usado apenas em Server Actions e API Routes.

### 4.3 Deploy

1. Clique em **Deploy**
2. Aguarde o build completar (~2-3 minutos)
3. Acesse a URL gerada para verificar

---

## 5. Pos-Deploy

### 5.1 Criar Primeiro Usuario

1. Acesse `https://SEU_DOMINIO/login`
2. Crie uma conta via Supabase Auth (email/password)
3. No Supabase Dashboard > Authentication, confirme o email do usuario
4. No SQL Editor, promova para admin:

```sql
UPDATE usuarios
SET role = 'admin'
WHERE email = 'seu@email.com';
```

### 5.2 Cadastrar Empresa

1. Faca login na plataforma
2. Acesse a pagina de Empresa
3. Cadastre os dados da transportadora

### 5.3 Verificacao Final

- [ ] Login funciona
- [ ] Dashboard carrega com cards de resumo
- [ ] Cadastro de motoristas funciona
- [ ] Cadastro de caminhoes funciona
- [ ] Vinculacao motorista-caminhao funciona
- [ ] CRUD de gastos funciona (incluindo upload de comprovantes)
- [ ] CRUD de viagens funciona
- [ ] Fechamentos mensais funcionam
- [ ] Painel financeiro carrega historico

---

## 6. Dominio Personalizado (Opcional)

1. Na Vercel, va em **Settings > Domains**
2. Adicione seu dominio (ex: `app.sigabem.com.br`)
3. Configure os DNS conforme instrucoes da Vercel
4. Atualize `NEXT_PUBLIC_SITE_URL` para o novo dominio

---

## Troubleshooting

| Problema | Solucao |
|----------|---------|
| Build falha na Vercel | Verifique se todas as env vars estao configuradas |
| Erro de RLS | Verifique se o usuario esta autenticado e pertence a uma empresa |
| Upload de comprovante falha | Verifique se o bucket `comprovantes` existe e esta publico |
| Migrations falham | Execute na ordem sequencial, uma por uma |
| Erro 500 em Server Actions | Verifique `SUPABASE_SERVICE_ROLE_KEY` nas env vars |
