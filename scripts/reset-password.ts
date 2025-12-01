import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  try {
    console.log(`🔍 Procurando usuário: ${email}...`);

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      throw new Error(`Usuário com email ${email} não encontrado!`);
    }

    console.log(`✅ Usuário encontrado: ${existingUser.name}`);
    console.log(`   Role atual: ${existingUser.role}`);

    // Gerar hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
      },
    });

    console.log(`✅ Senha resetada com sucesso!`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Nome: ${updatedUser.name}`);
    console.log(`   Role: ${updatedUser.role}`);

    return updatedUser;
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

if (!email || !password) {
  console.error("❌ Uso: tsx scripts/reset-password.ts <email> <nova_senha>");
  process.exit(1);
}

resetPassword(email, password)
  .then(() => {
    console.log("\n✅ Concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Falha:", error.message);
    process.exit(1);
  });

