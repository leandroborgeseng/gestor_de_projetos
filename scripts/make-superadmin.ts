import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function makeSuperAdmin(email: string, password?: string) {
  try {
    console.log(`🔍 Procurando usuário: ${email}...`);

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        companyMemberships: {
          include: {
            company: true,
          },
        },
      },
    });

    if (existingUser) {
      console.log(`✅ Usuário encontrado: ${existingUser.name}`);
      console.log(`   Role atual: ${existingUser.role}`);

      // Atualizar para SUPERADMIN
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: "SUPERADMIN",
          ...(password && {
            passwordHash: await bcrypt.hash(password, 10),
          }),
        },
      });

      console.log(`✅ Usuário atualizado para SUPERADMIN!`);

      // Verificar se está vinculado a alguma empresa
      if (existingUser.companyMemberships.length === 0) {
        console.log(`⚠️  Usuário não está vinculado a nenhuma empresa.`);
        
        // Pegar a primeira empresa disponível ou criar uma padrão
        let company = await prisma.company.findFirst();
        
        if (!company) {
          console.log(`📦 Criando empresa padrão...`);
          company = await prisma.company.create({
            data: {
              name: "Aion Engineering",
              slug: "aion-engineering",
              plan: "ENTERPRISE",
              maxUsers: 1000,
              maxProjects: 1000,
            },
          });
        }

        // Vincular usuário à empresa como ADMIN
        await prisma.companyUser.create({
          data: {
            companyId: company.id,
            userId: updatedUser.id,
            role: "ADMIN",
          },
        });

        console.log(`✅ Usuário vinculado à empresa: ${company.name}`);
      } else {
        console.log(`✅ Usuário já está vinculado a ${existingUser.companyMemberships.length} empresa(s)`);
      }

      return updatedUser;
    } else {
      // Criar novo usuário como SUPERADMIN
      if (!password) {
        throw new Error("Senha é obrigatória para criar novo usuário. Use: tsx scripts/make-superadmin.ts <email> <senha>");
      }

      console.log(`📝 Criando novo usuário como SUPERADMIN...`);

      const passwordHash = await bcrypt.hash(password, 10);

      // Pegar ou criar empresa padrão
      let company = await prisma.company.findFirst();
      
      if (!company) {
        console.log(`📦 Criando empresa padrão...`);
        company = await prisma.company.create({
          data: {
            name: "Aion Engineering",
            slug: "aion-engineering",
            plan: "ENTERPRISE",
            maxUsers: 1000,
            maxProjects: 1000,
          },
        });
      }

      // Criar usuário
      const newUser = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          role: "SUPERADMIN",
          passwordHash,
          companyMemberships: {
            create: {
              companyId: company.id,
              role: "ADMIN",
            },
          },
        },
      });

      console.log(`✅ Usuário criado como SUPERADMIN!`);
      console.log(`✅ Usuário vinculado à empresa: ${company.name}`);

      return newUser;
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
const email = process.argv[2];
const password = process.argv[3];

if (!email) {
  console.error("❌ Uso: tsx scripts/make-superadmin.ts <email> [senha]");
  console.error("   Se o usuário já existe, a senha é opcional.");
  console.error("   Se o usuário não existe, a senha é obrigatória.");
  process.exit(1);
}

makeSuperAdmin(email, password)
  .then(() => {
    console.log("\n✅ Concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Falha:", error.message);
    process.exit(1);
  });

