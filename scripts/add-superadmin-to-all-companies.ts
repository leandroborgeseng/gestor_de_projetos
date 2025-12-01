import { PrismaClient, CompanyUserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function addSuperAdminToAllCompanies(email: string) {
  try {
    console.log(`🔍 Procurando usuário: ${email}...`);

    // Verificar se o usuário existe e é superadmin
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`Usuário com email ${email} não encontrado!`);
    }

    if (user.role !== "SUPERADMIN") {
      throw new Error(`Usuário ${email} não é SUPERADMIN!`);
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.role})`);

    // Buscar todas as empresas
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });

    console.log(`📋 Encontradas ${companies.length} empresa(s)`);

    if (companies.length === 0) {
      console.log("⚠️  Nenhuma empresa encontrada no sistema");
      return;
    }

    // Adicionar superadmin a todas as empresas
    let added = 0;
    let alreadyExists = 0;

    for (const company of companies) {
      const existing = await prisma.companyUser.findUnique({
        where: {
          companyId_userId: {
            companyId: company.id,
            userId: user.id,
          },
        },
      });

      if (existing) {
        // Atualizar para ADMIN se já existir
        await prisma.companyUser.update({
          where: {
            companyId_userId: {
              companyId: company.id,
              userId: user.id,
            },
          },
          data: {
            role: CompanyUserRole.ADMIN,
          },
        });
        console.log(`  ✓ ${company.name}: já era membro, atualizado para ADMIN`);
        alreadyExists++;
      } else {
        // Criar membership
        await prisma.companyUser.create({
          data: {
            companyId: company.id,
            userId: user.id,
            role: CompanyUserRole.ADMIN,
          },
        });
        console.log(`  ✅ ${company.name}: adicionado como ADMIN`);
        added++;
      }
    }

    console.log("");
    console.log(`✅ Concluído!`);
    console.log(`  • ${added} empresa(s) adicionada(s)`);
    console.log(`  • ${alreadyExists} empresa(s) já existia(m) e foi(ram) atualizada(s)`);
    console.log(`  • Total: ${companies.length} empresa(s)`);
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
const email = process.argv[2] || "superadmin@agilepm.com";

addSuperAdminToAllCompanies(email)
  .then(() => {
    console.log("\n✅ Concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Falha:", error.message);
    process.exit(1);
  });

