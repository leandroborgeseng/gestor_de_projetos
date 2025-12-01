#!/bin/bash

# Script completo para corrigir login do superadmin
# Uso: ./scripts/fix-superadmin-login.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMAIL="superadmin@agilepm.com"
PASSWORD="superadmin123"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Corrigindo login do superadmin${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se o container da API está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    echo -e "${YELLOW}💡 Tentando iniciar containers...${NC}"
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    sleep 10
    if ! docker ps | grep -q agilepm-api; then
        echo -e "${RED}❌ Falha ao iniciar containers${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}1️⃣ Verificando se o usuário existe...${NC}"

# Criar script de diagnóstico e correção
cat > /tmp/fix-superadmin.ts << 'EOF'
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "superadmin@agilepm.com";
  const password = process.argv[3] || "superadmin123";

  console.log(`\n📋 Verificando usuário: ${email}\n`);

  // 1. Verificar se o usuário existe
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      companyMemberships: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!user) {
    console.log("❌ Usuário não existe. Criando...");
    
    // Criar usuário
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        name: "Superadmin",
        passwordHash: hashedPassword,
        role: "SUPERADMIN",
        active: true,
      },
      include: {
        companyMemberships: true,
      },
    });
    console.log("✅ Usuário criado!");
  } else {
    console.log("✅ Usuário existe");
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Ativo: ${user.active}`);
  }

  // 2. Atualizar senha
  console.log("\n🔐 Atualizando senha...");
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashedPassword,
      role: "SUPERADMIN",
      active: true,
    },
  });
  console.log("✅ Senha atualizada!");

  // 3. Verificar empresas
  console.log("\n🏢 Verificando empresas...");
  const companies = await prisma.company.findMany({
    where: { isActive: true },
  });

  if (companies.length === 0) {
    console.log("⚠️ Nenhuma empresa ativa encontrada. Criando empresa padrão...");
    const defaultCompany = await prisma.company.create({
      data: {
        name: "Empresa Padrão",
        slug: "empresa-padrao",
        plan: "PRO",
        maxUsers: 100,
        maxProjects: 200,
        isActive: true,
      },
    });
    companies.push(defaultCompany);
    console.log("✅ Empresa padrão criada!");
  }

  console.log(`✅ ${companies.length} empresa(s) encontrada(s):`);
  companies.forEach((company) => {
    console.log(`   - ${company.name} (${company.id})`);
  });

  // 4. Garantir membership em todas as empresas
  console.log("\n👥 Garantindo membership em todas as empresas...");
  for (const company of companies) {
    const existing = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId: company.id,
          userId: user.id,
        },
      },
    });

    if (!existing) {
      await prisma.companyUser.create({
        data: {
          companyId: company.id,
          userId: user.id,
          role: "ADMIN",
        },
      });
      console.log(`✅ Membership criada em: ${company.name}`);
    } else {
      // Atualizar para ADMIN se não for
      if (existing.role !== "ADMIN") {
        await prisma.companyUser.update({
          where: {
            companyId_userId: {
              companyId: company.id,
              userId: user.id,
            },
          },
          data: {
            role: "ADMIN",
          },
        });
        console.log(`✅ Membership atualizada para ADMIN em: ${company.name}`);
      } else {
        console.log(`✅ Membership já existe em: ${company.name}`);
      }
    }
  }

  // 5. Adicionar superadmin a todos os projetos
  console.log("\n📁 Adicionando superadmin a todos os projetos...");
  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  console.log(`   Encontrados ${allProjects.length} projeto(s)`);
  
  for (const project of allProjects) {
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: user.id,
        },
      },
    });

    if (!existingMember) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: "PROJECT_MANAGER",
        },
      });
      console.log(`   ✅ Adicionado ao projeto: ${project.name}`);
    } else {
      // Atualizar para PROJECT_MANAGER se não for
      if (existingMember.role !== "PROJECT_MANAGER") {
        await prisma.projectMember.update({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId: user.id,
            },
          },
          data: {
            role: "PROJECT_MANAGER",
          },
        });
        console.log(`   ✅ Atualizado para PROJECT_MANAGER em: ${project.name}`);
      } else {
        console.log(`   ✅ Já é membro do projeto: ${project.name}`);
      }
    }
  }

  // 6. Verificar senha
  console.log("\n🔍 Testando senha...");
  const testUser = await prisma.user.findUnique({
    where: { email },
  });

  if (testUser) {
    const passwordMatch = await bcrypt.compare(password, testUser.passwordHash);
    if (passwordMatch) {
      console.log("✅ Senha está correta!");
    } else {
      console.log("❌ Senha não confere! Isso não deveria acontecer...");
    }
  }

  console.log("\n✅ Configuração concluída!");
  console.log("\n📝 Credenciais:");
  console.log(`   Email: ${email}`);
  console.log(`   Senha: ${password}`);
  console.log(`   Role: SUPERADMIN`);
  console.log(`   Projetos: ${allProjects.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Copiar script para o container
echo -e "${YELLOW}2️⃣ Copiando script para o container...${NC}"
docker cp /tmp/fix-superadmin.ts agilepm-api:/app/prisma/fix-superadmin.ts

# Obter DATABASE_URL
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar script
echo -e "${YELLOW}3️⃣ Executando correção...${NC}"
docker exec agilepm-api sh -c "cd /app/prisma && DATABASE_URL='$DB_URL' tsx fix-superadmin.ts '$EMAIL' '$PASSWORD'"

EXIT_CODE=$?

# Limpar
docker exec agilepm-api rm -f /app/prisma/fix-superadmin.ts
rm -f /tmp/fix-superadmin.ts

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Correção concluída com sucesso!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📝 Credenciais de acesso:"
    echo "   Email: $EMAIL"
    echo "   Senha: $PASSWORD"
    echo ""
    echo "💡 Você pode fazer login agora!"
else
    echo ""
    echo -e "${RED}❌ Falha na correção${NC}"
    exit 1
fi

