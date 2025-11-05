import { PrismaClient, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      hourlyRate: 150,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      name: "Manager",
      passwordHash: await bcrypt.hash("manager123", 10),
      role: "MANAGER",
      hourlyRate: 120,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: {
      email: "member@example.com",
      name: "Member",
      passwordHash: await bcrypt.hash("member123", 10),
      role: "MEMBER",
      hourlyRate: 100,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Projeto A",
      description: "Implantação do sistema",
      defaultHourlyRate: 120,
      ownerId: admin.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprint1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1",
      goal: "MVP - Autenticação e Configuração",
      projectId: project.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 86400000),
    },
  });

  const sprint2 = await prisma.sprint.create({
    data: {
      name: "Sprint 2",
      goal: "Features Principais",
      projectId: project.id,
      startDate: new Date(Date.now() + 15 * 86400000),
      endDate: new Date(Date.now() + 28 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      sprintId: sprint1.id,
      title: "Configurar autenticação JWT",
      description: "Implementar login e refresh token",
      status: "IN_PROGRESS",
      estimateHours: 8,
      assigneeId: admin.id,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 3 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      sprintId: sprint1.id,
      title: "Criar schema Prisma",
      description: "Definir modelos de dados",
      status: "DONE",
      estimateHours: 4,
      actualHours: 3.5,
      assigneeId: manager.id,
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      sprintId: sprint2.id,
      title: "Implementar Kanban Board",
      description: "Board com drag and drop",
      status: "TODO",
      estimateHours: 12,
      assigneeId: member.id,
      order: 0,
    },
  });

  await prisma.resource.create({
    data: {
      name: "Servidor Cloud",
      type: "infrastructure",
      unitCost: 500,
      unit: "month",
      notes: "AWS EC2 instance",
    },
  });

  await prisma.resource.create({
    data: {
      name: "Licença de Software",
      type: "license",
      unitCost: 200,
      unit: "month",
      notes: "Licença de desenvolvimento",
    },
  });

  // PROJETO 2: E-commerce Platform
  const project2 = await prisma.project.create({
    data: {
      name: "Plataforma E-commerce",
      description: "Sistema completo de vendas online com gestão de estoque e pagamentos",
      defaultHourlyRate: 130,
      ownerId: manager.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintEcommerce1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Base",
      goal: "Autenticação e catálogo de produtos",
      projectId: project2.id,
      startDate: new Date(Date.now() - 7 * 86400000),
      endDate: new Date(Date.now() + 7 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project2.id,
      sprintId: sprintEcommerce1.id,
      title: "Sistema de autenticação de clientes",
      description: "Login, registro e recuperação de senha",
      status: "DONE",
      estimateHours: 16,
      actualHours: 14,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 7 * 86400000),
      dueDate: new Date(Date.now() - 4 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project2.id,
      sprintId: sprintEcommerce1.id,
      title: "CRUD de produtos",
      description: "Cadastro, edição e exclusão de produtos com imagens",
      status: "IN_PROGRESS",
      estimateHours: 20,
      actualHours: 12,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 5 * 86400000),
      dueDate: new Date(Date.now() + 2 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project2.id,
      sprintId: sprintEcommerce1.id,
      title: "Carrinho de compras",
      description: "Adicionar, remover e calcular total do carrinho",
      status: "TODO",
      estimateHours: 12,
      assigneeId: member.id,
      order: 2,
    },
  });

  // PROJETO 3: Mobile App
  const project3 = await prisma.project.create({
    data: {
      name: "App Mobile - Delivery",
      description: "Aplicativo mobile para delivery de comida com geolocalização",
      defaultHourlyRate: 140,
      ownerId: admin.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintMobile1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - MVP",
      goal: "Versão mínima funcional",
      projectId: project3.id,
      startDate: new Date(Date.now() - 10 * 86400000),
      endDate: new Date(Date.now() + 4 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project3.id,
      sprintId: sprintMobile1.id,
      title: "Integração com mapas",
      description: "Google Maps API para localização",
      status: "DONE",
      estimateHours: 10,
      actualHours: 8,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 10 * 86400000),
      dueDate: new Date(Date.now() - 6 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project3.id,
      sprintId: sprintMobile1.id,
      title: "Sistema de notificações push",
      description: "Notificações em tempo real para pedidos",
      status: "IN_PROGRESS",
      estimateHours: 15,
      actualHours: 9,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 5 * 86400000),
      dueDate: new Date(Date.now() + 1 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project3.id,
      sprintId: sprintMobile1.id,
      title: "Tela de perfil do usuário",
      description: "Edição de dados pessoais e histórico",
      status: "REVIEW",
      estimateHours: 8,
      actualHours: 8,
      assigneeId: member.id,
      startDate: new Date(Date.now() - 3 * 86400000),
      dueDate: new Date(Date.now() - 1 * 86400000),
      order: 2,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project3.id,
      title: "Testes automatizados",
      description: "Configurar Jest e escrever testes unitários",
      status: "BACKLOG",
      estimateHours: 20,
      assigneeId: member.id,
      order: 0,
    },
  });

  // PROJETO 4: Sistema de Gestão
  const project4 = await prisma.project.create({
    data: {
      name: "Sistema de Gestão Escolar",
      description: "Plataforma completa para gestão de escolas, alunos e professores",
      defaultHourlyRate: 110,
      ownerId: manager.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintGestao1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Cadastros",
      goal: "Módulos de cadastro de alunos e professores",
      projectId: project4.id,
      startDate: new Date(Date.now() - 14 * 86400000),
      endDate: new Date(Date.now()),
    },
  });

  const sprintGestao2 = await prisma.sprint.create({
    data: {
      name: "Sprint 2 - Notas",
      goal: "Sistema de lançamento de notas e boletim",
      projectId: project4.id,
      startDate: new Date(Date.now() + 1 * 86400000),
      endDate: new Date(Date.now() + 15 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project4.id,
      sprintId: sprintGestao1.id,
      title: "CRUD de alunos",
      description: "Cadastro completo com documentos e responsáveis",
      status: "DONE",
      estimateHours: 18,
      actualHours: 16,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 14 * 86400000),
      dueDate: new Date(Date.now() - 8 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project4.id,
      sprintId: sprintGestao1.id,
      title: "CRUD de professores",
      description: "Cadastro de professores com disciplinas",
      status: "DONE",
      estimateHours: 12,
      actualHours: 11,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 12 * 86400000),
      dueDate: new Date(Date.now() - 6 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project4.id,
      sprintId: sprintGestao2.id,
      title: "Sistema de lançamento de notas",
      description: "Interface para professores lançarem notas",
      status: "IN_PROGRESS",
      estimateHours: 16,
      actualHours: 6,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 2 * 86400000),
      dueDate: new Date(Date.now() + 12 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project4.id,
      sprintId: sprintGestao2.id,
      title: "Geração de boletim",
      description: "Relatório PDF com notas e frequência",
      status: "TODO",
      estimateHours: 14,
      assigneeId: member.id,
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project4.id,
      title: "Dashboard de métricas",
      description: "Gráficos e estatísticas da escola",
      status: "BLOCKED",
      estimateHours: 20,
      assigneeId: manager.id,
      order: 0,
    },
  });

  // PROJETO 5: API REST
  const project5 = await prisma.project.create({
    data: {
      name: "API REST - Microserviços",
      description: "Arquitetura de microserviços para sistema de pagamentos",
      defaultHourlyRate: 150,
      ownerId: admin.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintAPI1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Arquitetura",
      goal: "Definir estrutura e serviços base",
      projectId: project5.id,
      startDate: new Date(Date.now() - 20 * 86400000),
      endDate: new Date(Date.now() - 6 * 86400000),
    },
  });

  const sprintAPI2 = await prisma.sprint.create({
    data: {
      name: "Sprint 2 - Integração",
      goal: "Integração entre serviços e comunicação",
      projectId: project5.id,
      startDate: new Date(Date.now() - 5 * 86400000),
      endDate: new Date(Date.now() + 9 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project5.id,
      sprintId: sprintAPI1.id,
      title: "Configurar Docker Compose",
      description: "Orquestração de containers para todos os serviços",
      status: "DONE",
      estimateHours: 8,
      actualHours: 7,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 20 * 86400000),
      dueDate: new Date(Date.now() - 16 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project5.id,
      sprintId: sprintAPI1.id,
      title: "Serviço de autenticação",
      description: "JWT e OAuth2 para autenticação distribuída",
      status: "DONE",
      estimateHours: 24,
      actualHours: 22,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 18 * 86400000),
      dueDate: new Date(Date.now() - 8 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project5.id,
      sprintId: sprintAPI2.id,
      title: "Message Broker (RabbitMQ)",
      description: "Configurar filas para comunicação assíncrona",
      status: "IN_PROGRESS",
      estimateHours: 16,
      actualHours: 10,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 5 * 86400000),
      dueDate: new Date(Date.now() + 5 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project5.id,
      sprintId: sprintAPI2.id,
      title: "API Gateway",
      description: "Gateway centralizado para roteamento",
      status: "REVIEW",
      estimateHours: 12,
      actualHours: 12,
      assigneeId: member.id,
      startDate: new Date(Date.now() - 7 * 86400000),
      dueDate: new Date(Date.now() - 2 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project5.id,
      title: "Monitoramento e logs",
      description: "Prometheus, Grafana e ELK stack",
      status: "TODO",
      estimateHours: 20,
      assigneeId: admin.id,
      order: 0,
    },
  });

  // PROJETO 6: Dashboard Analytics
  const project6 = await prisma.project.create({
    data: {
      name: "Dashboard de Analytics",
      description: "Plataforma de análise de dados com visualizações interativas",
      defaultHourlyRate: 135,
      ownerId: manager.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintAnalytics1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Visualizações",
      goal: "Criar gráficos e dashboards básicos",
      projectId: project6.id,
      startDate: new Date(Date.now() - 12 * 86400000),
      endDate: new Date(Date.now() + 2 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project6.id,
      sprintId: sprintAnalytics1.id,
      title: "Integração com Chart.js",
      description: "Configurar biblioteca de gráficos",
      status: "DONE",
      estimateHours: 6,
      actualHours: 5,
      assigneeId: member.id,
      startDate: new Date(Date.now() - 12 * 86400000),
      dueDate: new Date(Date.now() - 9 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project6.id,
      sprintId: sprintAnalytics1.id,
      title: "Gráfico de vendas por período",
      description: "Gráfico de linha com dados históricos",
      status: "DONE",
      estimateHours: 10,
      actualHours: 9,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 10 * 86400000),
      dueDate: new Date(Date.now() - 5 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project6.id,
      sprintId: sprintAnalytics1.id,
      title: "Filtros por data e categoria",
      description: "Permitir filtrar dados por período e categoria",
      status: "IN_PROGRESS",
      estimateHours: 12,
      actualHours: 7,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 4 * 86400000),
      dueDate: new Date(Date.now() + 6 * 86400000),
      order: 2,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project6.id,
      title: "Exportação de relatórios",
      description: "Exportar dashboards em PDF e Excel",
      status: "TODO",
      estimateHours: 16,
      assigneeId: member.id,
      order: 0,
    },
  });

  // PROJETO 7: Sistema de Gestão de RH
  const project7 = await prisma.project.create({
    data: {
      name: "Sistema de Recursos Humanos",
      description: "Plataforma completa para gestão de funcionários, folha de pagamento e benefícios",
      defaultHourlyRate: 125,
      ownerId: admin.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintRH1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Cadastros",
      goal: "Módulo de cadastro de funcionários",
      projectId: project7.id,
      startDate: new Date(Date.now() - 18 * 86400000),
      endDate: new Date(Date.now() - 4 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project7.id,
      sprintId: sprintRH1.id,
      title: "CRUD de funcionários",
      description: "Cadastro completo com dados pessoais e profissionais",
      status: "DONE",
      estimateHours: 20,
      actualHours: 18,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 18 * 86400000),
      dueDate: new Date(Date.now() - 10 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project7.id,
      sprintId: sprintRH1.id,
      title: "Sistema de folha de pagamento",
      description: "Cálculo de salários e descontos",
      status: "IN_PROGRESS",
      estimateHours: 24,
      actualHours: 15,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 8 * 86400000),
      dueDate: new Date(Date.now() + 6 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project7.id,
      title: "Gestão de férias e afastamentos",
      description: "Controle de solicitações e aprovações",
      status: "TODO",
      estimateHours: 16,
      assigneeId: member.id,
      order: 0,
    },
  });

  // PROJETO 8: Marketplace B2B
  const project8 = await prisma.project.create({
    data: {
      name: "Marketplace B2B",
      description: "Plataforma de marketplace para empresas comprarem entre si",
      defaultHourlyRate: 145,
      ownerId: manager.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintMarketplace1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - MVP",
      goal: "Funcionalidades básicas do marketplace",
      projectId: project8.id,
      startDate: new Date(Date.now() - 15 * 86400000),
      endDate: new Date(Date.now() + 1 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project8.id,
      sprintId: sprintMarketplace1.id,
      title: "Cadastro de empresas vendedoras",
      description: "Sistema de verificação e aprovação de empresas",
      status: "DONE",
      estimateHours: 14,
      actualHours: 13,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 15 * 86400000),
      dueDate: new Date(Date.now() - 9 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project8.id,
      sprintId: sprintMarketplace1.id,
      title: "Sistema de cotações",
      description: "Empresas podem solicitar e receber cotações",
      status: "IN_PROGRESS",
      estimateHours: 18,
      actualHours: 11,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 7 * 86400000),
      dueDate: new Date(Date.now() + 3 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project8.id,
      title: "Integração com gateway de pagamento",
      description: "Pagamentos B2B com condições especiais",
      status: "REVIEW",
      estimateHours: 20,
      actualHours: 20,
      assigneeId: member.id,
      order: 0,
    },
  });

  // PROJETO 9: Plataforma de Cursos Online
  const project9 = await prisma.project.create({
    data: {
      name: "Plataforma de Educação Online",
      description: "Sistema EAD completo com vídeos, quizzes e certificados",
      defaultHourlyRate: 115,
      ownerId: admin.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintEAD1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Vídeos",
      goal: "Sistema de upload e streaming de vídeos",
      projectId: project9.id,
      startDate: new Date(Date.now() - 22 * 86400000),
      endDate: new Date(Date.now() - 8 * 86400000),
    },
  });

  const sprintEAD2 = await prisma.sprint.create({
    data: {
      name: "Sprint 2 - Conteúdo",
      goal: "Criação e gestão de cursos",
      projectId: project9.id,
      startDate: new Date(Date.now() - 7 * 86400000),
      endDate: new Date(Date.now() + 7 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project9.id,
      sprintId: sprintEAD1.id,
      title: "Player de vídeo personalizado",
      description: "Player com controles e progresso",
      status: "DONE",
      estimateHours: 12,
      actualHours: 10,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 22 * 86400000),
      dueDate: new Date(Date.now() - 16 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project9.id,
      sprintId: sprintEAD1.id,
      title: "Sistema de upload de vídeos",
      description: "Upload com progresso e compressão",
      status: "DONE",
      estimateHours: 16,
      actualHours: 14,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 18 * 86400000),
      dueDate: new Date(Date.now() - 10 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project9.id,
      sprintId: sprintEAD2.id,
      title: "Criação de quizzes",
      description: "Criar perguntas e respostas com feedback",
      status: "IN_PROGRESS",
      estimateHours: 14,
      actualHours: 8,
      assigneeId: member.id,
      startDate: new Date(Date.now() - 5 * 86400000),
      dueDate: new Date(Date.now() + 5 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project9.id,
      sprintId: sprintEAD2.id,
      title: "Sistema de certificados",
      description: "Geração automática de certificados em PDF",
      status: "TODO",
      estimateHours: 12,
      assigneeId: admin.id,
      order: 1,
    },
  });

  // PROJETO 10: Sistema de Gestão de Estoque
  const project10 = await prisma.project.create({
    data: {
      name: "Gestão de Estoque Inteligente",
      description: "Sistema completo de controle de estoque com previsão de demanda",
      defaultHourlyRate: 120,
      ownerId: manager.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintEstoque1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Cadastros",
      goal: "Módulo básico de produtos e estoque",
      projectId: project10.id,
      startDate: new Date(Date.now() - 16 * 86400000),
      endDate: new Date(Date.now() - 2 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project10.id,
      sprintId: sprintEstoque1.id,
      title: "CRUD de produtos",
      description: "Cadastro com categorias, fornecedores e preços",
      status: "DONE",
      estimateHours: 18,
      actualHours: 16,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 16 * 86400000),
      dueDate: new Date(Date.now() - 8 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project10.id,
      sprintId: sprintEstoque1.id,
      title: "Controle de entrada e saída",
      description: "Registro de movimentações de estoque",
      status: "DONE",
      estimateHours: 14,
      actualHours: 12,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 10 * 86400000),
      dueDate: new Date(Date.now() - 4 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project10.id,
      title: "Alertas de estoque mínimo",
      description: "Notificações quando produtos estão abaixo do mínimo",
      status: "IN_PROGRESS",
      estimateHours: 10,
      actualHours: 5,
      assigneeId: member.id,
      startDate: new Date(Date.now() - 3 * 86400000),
      dueDate: new Date(Date.now() + 5 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project10.id,
      title: "Previsão de demanda com IA",
      description: "Machine learning para prever necessidades de estoque",
      status: "BLOCKED",
      estimateHours: 30,
      assigneeId: admin.id,
      order: 1,
    },
  });

  // PROJETO 11: Sistema de Agendamento
  const project11 = await prisma.project.create({
    data: {
      name: "Sistema de Agendamento Online",
      description: "Plataforma para agendamento de serviços com calendário integrado",
      defaultHourlyRate: 105,
      ownerId: admin.id,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
    },
  });

  const sprintAgendamento1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1 - Calendário",
      goal: "Interface de calendário e disponibilidade",
      projectId: project11.id,
      startDate: new Date(Date.now() - 13 * 86400000),
      endDate: new Date(Date.now() + 1 * 86400000),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project11.id,
      sprintId: sprintAgendamento1.id,
      title: "Calendário interativo",
      description: "Visualização mensal e semanal de agendamentos",
      status: "DONE",
      estimateHours: 16,
      actualHours: 14,
      assigneeId: admin.id,
      startDate: new Date(Date.now() - 13 * 86400000),
      dueDate: new Date(Date.now() - 5 * 86400000),
      order: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project11.id,
      sprintId: sprintAgendamento1.id,
      title: "Gestão de horários disponíveis",
      description: "Definir horários de funcionamento e bloqueios",
      status: "IN_PROGRESS",
      estimateHours: 12,
      actualHours: 7,
      assigneeId: manager.id,
      startDate: new Date(Date.now() - 4 * 86400000),
      dueDate: new Date(Date.now() + 4 * 86400000),
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project11.id,
      sprintId: sprintAgendamento1.id,
      title: "Sistema de confirmação",
      description: "E-mail e SMS de confirmação de agendamentos",
      status: "REVIEW",
      estimateHours: 10,
      actualHours: 10,
      assigneeId: member.id,
      startDate: new Date(Date.now() - 6 * 86400000),
      dueDate: new Date(Date.now() - 1 * 86400000),
      order: 2,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project11.id,
      title: "App mobile para clientes",
      description: "Aplicativo para agendamento rápido",
      status: "TODO",
      estimateHours: 25,
      assigneeId: admin.id,
      order: 0,
    },
  });

  // Adicionar mais recursos
  await prisma.resource.create({
    data: {
      name: "Banco de Dados Cloud",
      type: "infrastructure",
      unitCost: 300,
      unit: "month",
      notes: "PostgreSQL gerenciado",
    },
  });

  await prisma.resource.create({
    data: {
      name: "CDN",
      type: "service",
      unitCost: 50,
      unit: "month",
      notes: "CloudFlare CDN",
    },
  });

  console.log("Seed completed successfully!");
  console.log(`Created ${await prisma.project.count()} projects`);
  console.log(`Created ${await prisma.task.count()} tasks`);
  console.log(`Created ${await prisma.sprint.count()} sprints`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

