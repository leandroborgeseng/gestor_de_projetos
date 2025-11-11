# Guia de Migração para Multiempresa

Este guia descreve como migrar dados do modelo antigo (single-tenant) para o novo modelo multiempresa.

## 1. Pré-requisitos

- Banco de dados atualizado com as migrations de multiempresa:
  ```bash
  cd apps/api
  pnpm prisma migrate deploy
  ```
- Backup recente do banco de dados (obrigatório em produção).
- `ts-node` disponível para executar o script de migração (`pnpm ts-node`).

## 2. Verificando o estado atual

Após aplicar as migrations, todos os registros existentes passam a pertencer à empresa padrão `company_default`. Valide com as consultas abaixo:

```sql
SELECT * FROM "Company";
SELECT "companyId", COUNT(*) FROM "Project" GROUP BY 1;
SELECT "companyId", COUNT(*) FROM "CompanyUser" GROUP BY 1;
```

## 3. Planejando a redistribuição

Crie um arquivo JSON descrevendo as novas empresas e os artefatos que devem ser associados a cada uma. Há um exemplo em `apps/api/prisma/scripts/migrate_companies.example.json`.

Campos aceitos em cada entrada de empresa:

| Campo              | Descrição                                                                                |
|--------------------|------------------------------------------------------------------------------------------|
| `name`             | Nome da nova empresa                                                                     |
| `slug`             | Identificador URL-friendly único                                                         |
| `plan`             | Plano (`FREE`, `PRO`, `ENTERPRISE`)                                                       |
| `projectIds`       | Projetos que devem migrar para a empresa                                                 |
| `resourceIds`      | Recursos (`Resource`) que pertencem à empresa                                            |
| `skillIds`         | Habilidades (`Skill`) que pertencem à empresa                                            |
| `templateIds`      | Templates de projeto (`ProjectTemplate`)                                                 |
| `savedFilterIds`   | Filtros salvos (`SavedFilter`)                                                            |
| `webhookIds`       | Webhooks desacoplados de projeto                                                         |
| `users`            | Usuários que participarão da empresa (com papel opcional: `OWNER`, `ADMIN`, `MEMBER`)    |
| `detachFromDefault`| Remove associações à empresa padrão para os artefatos migrados                          |

Estrutura para usuários:

```json
{
  "userId": "usuario123",
  "role": "OWNER",       // opcional (default MEMBER)
  "makeActive": true      // reservado para uso futuro
}
```

## 4. Executando o script de migração

1. Gere o arquivo `migration-config.json` com as empresas desejadas.
2. Execute o script:
   ```bash
   cd apps/api
   pnpm ts-node prisma/scripts/migrate_companies.ts ../prisma/scripts/migration-config.json
   ```
3. O script registrará no console cada empresa processada e os recursos atualizados.

## 5. Validação pós-migração

- Verifique as contagens por empresa:
  ```sql
  SELECT "companyId", COUNT(*) FROM "Project" GROUP BY 1;
  SELECT "companyId", COUNT(*) FROM "CompanyUser" GROUP BY 1;
  ```
- Confirme que usuários têm papéis corretos:
  ```sql
  SELECT c."name", cu."userId", cu."role"
  FROM "CompanyUser" cu
  JOIN "Company" c ON c."id" = cu."companyId";
  ```
- Faça login na aplicação e valide a troca de empresa via seletor no topo.

## 6. Opção rápida: recriar dados fictícios

Se você prefere descartar o conteúdo atual e iniciar com dados mock multiempresa:

1. Na raiz do projeto, execute:
   ```bash
   cd apps/api
   pnpm prisma migrate reset
   ```
   Esse comando irá **dropar o banco, aplicar migrations e rodar o seed**.

2. O seed cria duas empresas (`Alpha Tech Solutions` e `Beta Logistics`), com usuários e projetos de demonstração. As credenciais padrão são:
   - Alpha: `ceo@alpha.com`, `pm@alpha.com`, `dev@alpha.com` (senha `alpha123`)
   - Beta: `diretoria@beta.com`, `operacoes@beta.com`, `analista@beta.com` (senha `beta123`)

3. Faça login com uma das credenciais e utilize o seletor de empresas no topo para alternar entre os ambientes mock.

> Observação: esse procedimento remove qualquer dado anterior. Utilize apenas em ambientes de teste ou após garantir que backups foram realizados.

## 7. Pós-migração

- Crie novas empresas (quando necessário) via API `/companies` em vez de seeds.
- Se a empresa padrão não for mais necessária, desative-a (`isActive = false`) ou remova-a após garantir que não há dados remanescentes.
- Atualize documentações internas e scripts de provisionamento para refletir o novo fluxo multiempresa.

## 8. Rollback

Em caso de problemas:

1. Restaure o backup realizado antes da migração.
2. Reaplique as migrations (`pnpm prisma migrate deploy`) se necessário.
3. Revise o arquivo de configuração e repita a execução.

---

Para cenários customizados (ex.: regras diferentes por cliente), adapte o arquivo JSON e/ou o script `migrate_companies.ts` conforme necessário.
