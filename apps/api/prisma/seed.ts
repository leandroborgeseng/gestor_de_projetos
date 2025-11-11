import { PrismaClient, CompanyPlan, CompanyUserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createUserWithMembership({
  email,
  name,
  globalRole,
  password,
  companyId,
  companyRole,
}: {
  email: string;
  name: string;
  globalRole: "SUPERADMIN" | "ADMIN" | "MANAGER" | "MEMBER";
  password: string;
  companyId: string;
  companyRole: CompanyUserRole;
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: globalRole,
      passwordHash,
    },
    create: {
      email,
      name,
      role: globalRole,
      passwordHash,
    },
  });

  await prisma.companyUser.upsert({
    where: {
      companyId_userId: {
        companyId,
        userId: user.id,
      },
    },
    update: {
      role: companyRole,
    },
    create: {
      companyId,
      userId: user.id,
      role: companyRole,
    },
  });

  return user;
}

async function createProjectWithData(params: {
  companyId: string;
  ownerId: string;
  name: string;
  description: string;
  defaultHourlyRate: number;
  members: string[];
  sprints: Array<{
    name: string;
    goal: string;
    startOffsetDays: number;
    durationDays: number;
    tasks: Array<{
      title: string;
      description: string;
      status:
        | "BACKLOG"
        | "TODO"
        | "IN_PROGRESS"
        | "REVIEW"
        | "DONE"
        | "BLOCKED";
      estimateHours: number;
      actualHours?: number;
      assigneeIndex: number;
      order: number;
      startOffsetDays?: number;
      endOffsetDays?: number;
    }>;
  }>;
}) {
  const { companyId, ownerId, name, description, defaultHourlyRate, members, sprints } = params;

  const project = await prisma.project.create({
    data: {
      companyId,
      ownerId,
      name,
      description,
      defaultHourlyRate,
      columns: {
        create: [
          { title: "Backlog", status: "BACKLOG", order: 0 },
          { title: "To Do", status: "TODO", order: 1 },
          { title: "In Progress", status: "IN_PROGRESS", order: 2 },
          { title: "Review", status: "REVIEW", order: 3 },
          { title: "Done", status: "DONE", order: 4 },
        ],
      },
      members: {
        createMany: {
          data: members.map((userId) => ({ userId, role: "MEMBER" as const })),
          skipDuplicates: true,
        },
      },
    },
  });

  for (const sprintConfig of sprints) {
    const sprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
        name: sprintConfig.name,
        goal: sprintConfig.goal,
        startDate: new Date(Date.now() + sprintConfig.startOffsetDays * 86400000),
        endDate: new Date(
          Date.now() + (sprintConfig.startOffsetDays + sprintConfig.durationDays) * 86400000
        ),
    },
  });

    for (const task of sprintConfig.tasks) {
      const startDate =
        task.startOffsetDays !== undefined
          ? new Date(Date.now() + task.startOffsetDays * 86400000)
          : undefined;
      const dueDate =
        task.endOffsetDays !== undefined
          ? new Date(Date.now() + task.endOffsetDays * 86400000)
          : undefined;

  await prisma.task.create({
    data: {
      projectId: project.id,
          sprintId: sprint.id,
          title: task.title,
          description: task.description,
          status: task.status,
          estimateHours: task.estimateHours,
          actualHours: task.actualHours,
          assigneeId: members[task.assigneeIndex] ?? ownerId,
          order: task.order,
          startDate,
          dueDate,
    },
  });
    }
  }

  return project;
}

async function createResources(companyId: string) {
  await prisma.resource.createMany({
    data: [
      {
        companyId,
        name: "Servidor Cloud Essentials",
      type: "infrastructure",
        unitCost: 450,
      unit: "month",
        notes: "Cluster Kubernetes gerenciado",
      },
      {
        companyId,
        name: "Licença Figma Team",
      type: "license",
        unitCost: 25,
        unit: "user/month",
        notes: "Ferramenta de design colaborativo",
      },
      {
        companyId,
        name: "Consultoria QA",
        type: "service",
        unitCost: 80,
        unit: "hour",
        notes: "Horas de consultoria especializada em QA",
      },
    ],
    skipDuplicates: true,
  });
}

async function seed() {
  console.log("Limpando dados anteriores...");
  await prisma.company.deleteMany({});

  console.log("Criando empresas mock...");

  const alphaCompany = await prisma.company.create({
    data: {
      id: "company_alpha",
      name: "Alpha Tech Solutions",
      slug: "alpha-tech",
      plan: CompanyPlan.PRO,
      maxUsers: 25,
      maxProjects: 40,
      primaryColor: "#4F46E5",
      secondaryColor: "#4338CA",
      accentColor: "#22D3EE",
      backgroundColor: "#0F172A",
      lightPrimaryColor: "#4338CA",
      lightSecondaryColor: "#6366F1",
      lightAccentColor: "#22D3EE",
      lightBackgroundColor: "#F8FAFC",
    },
  });

  const betaCompany = await prisma.company.create({
    data: {
      id: "company_beta",
      name: "Beta Logistics",
      slug: "beta-logistics",
      plan: CompanyPlan.ENTERPRISE,
      maxUsers: 100,
      maxProjects: 120,
      primaryColor: "#0EA5E9",
      secondaryColor: "#0369A1",
      accentColor: "#FACC15",
      backgroundColor: "#0B1120",
      lightPrimaryColor: "#38BDF8",
      lightSecondaryColor: "#0EA5E9",
      lightAccentColor: "#FACC15",
      lightBackgroundColor: "#F8FAFC",
    },
  });

  const gammaCompany = await prisma.company.create({
    data: {
      id: "company_gamma",
      name: "Gamma Design Studio",
      slug: "gamma-design",
      plan: CompanyPlan.PRO,
      maxUsers: 15,
      maxProjects: 30,
      primaryColor: "#EC4899",
      secondaryColor: "#BE185D",
      accentColor: "#FBBF24",
      backgroundColor: "#1F1F1F",
      lightPrimaryColor: "#F472B6",
      lightSecondaryColor: "#EC4899",
      lightAccentColor: "#FBBF24",
      lightBackgroundColor: "#FFFFFF",
    },
  });

  const deltaCompany = await prisma.company.create({
    data: {
      id: "company_delta",
      name: "Delta Consultoria",
      slug: "delta-consultoria",
      plan: CompanyPlan.FREE,
      maxUsers: 5,
      maxProjects: 10,
      primaryColor: "#10B981",
      secondaryColor: "#059669",
      accentColor: "#3B82F6",
      backgroundColor: "#111827",
      lightPrimaryColor: "#34D399",
      lightSecondaryColor: "#10B981",
      lightAccentColor: "#60A5FA",
      lightBackgroundColor: "#F9FAFB",
    },
  });

  console.log("Criando super administrador global...");

  await createUserWithMembership({
    email: "superadmin@agilepm.com",
    name: "Super Admin",
    globalRole: "SUPERADMIN",
    password: "superadmin123",
    companyId: alphaCompany.id,
    companyRole: CompanyUserRole.ADMIN,
  });

  console.log("Criando usuários e vínculos da Alpha...");

  const alphaOwner = await createUserWithMembership({
    email: "ceo@alpha.com",
    name: "Laura Ribeiro",
    globalRole: "ADMIN",
    password: "alpha123",
    companyId: alphaCompany.id,
    companyRole: CompanyUserRole.OWNER,
  });

  const alphaManager = await createUserWithMembership({
    email: "pm@alpha.com",
    name: "Marcelo Tavares",
    globalRole: "MANAGER",
    password: "alpha123",
    companyId: alphaCompany.id,
    companyRole: CompanyUserRole.ADMIN,
  });

  const alphaDev = await createUserWithMembership({
    email: "dev@alpha.com",
    name: "Camila Duarte",
    globalRole: "MEMBER",
    password: "alpha123",
    companyId: alphaCompany.id,
    companyRole: CompanyUserRole.MEMBER,
  });

  console.log("Criando usuários e vínculos da Beta...");

  const betaOwner = await createUserWithMembership({
    email: "diretoria@beta.com",
    name: "Pedro Martins",
    globalRole: "ADMIN",
    password: "beta123",
    companyId: betaCompany.id,
    companyRole: CompanyUserRole.OWNER,
  });

  const betaManager = await createUserWithMembership({
    email: "operacoes@beta.com",
    name: "Bianca Costa",
    globalRole: "MANAGER",
    password: "beta123",
    companyId: betaCompany.id,
    companyRole: CompanyUserRole.ADMIN,
  });

  const betaAnalyst = await createUserWithMembership({
    email: "analista@beta.com",
    name: "João Henrique",
    globalRole: "MEMBER",
    password: "beta123",
    companyId: betaCompany.id,
    companyRole: CompanyUserRole.MEMBER,
  });

  const betaDev1 = await createUserWithMembership({
    email: "dev1@beta.com",
    name: "Ana Paula Silva",
    globalRole: "MEMBER",
    password: "beta123",
    companyId: betaCompany.id,
    companyRole: CompanyUserRole.MEMBER,
  });

  const betaDev2 = await createUserWithMembership({
    email: "dev2@beta.com",
    name: "Ricardo Alves",
    globalRole: "MEMBER",
    password: "beta123",
    companyId: betaCompany.id,
    companyRole: CompanyUserRole.MEMBER,
  });

  console.log("Criando usuários e vínculos da Gamma...");

  const gammaOwner = await createUserWithMembership({
    email: "diretor@gamma.com",
    name: "Isabella Santos",
    globalRole: "ADMIN",
    password: "gamma123",
    companyId: gammaCompany.id,
    companyRole: CompanyUserRole.OWNER,
  });

  const gammaDesigner1 = await createUserWithMembership({
    email: "designer1@gamma.com",
    name: "Lucas Ferreira",
    globalRole: "MEMBER",
    password: "gamma123",
    companyId: gammaCompany.id,
    companyRole: CompanyUserRole.ADMIN,
  });

  const gammaDesigner2 = await createUserWithMembership({
    email: "designer2@gamma.com",
    name: "Mariana Oliveira",
    globalRole: "MEMBER",
    password: "gamma123",
    companyId: gammaCompany.id,
    companyRole: CompanyUserRole.MEMBER,
  });

  console.log("Criando usuários e vínculos da Delta...");

  const deltaOwner = await createUserWithMembership({
    email: "socio@delta.com",
    name: "Carlos Eduardo",
    globalRole: "ADMIN",
    password: "delta123",
    companyId: deltaCompany.id,
    companyRole: CompanyUserRole.OWNER,
  });

  const deltaConsultant1 = await createUserWithMembership({
    email: "consultor1@delta.com",
    name: "Fernanda Lima",
    globalRole: "MANAGER",
    password: "delta123",
    companyId: deltaCompany.id,
    companyRole: CompanyUserRole.ADMIN,
  });

  const deltaConsultant2 = await createUserWithMembership({
    email: "consultor2@delta.com",
    name: "Roberto Souza",
    globalRole: "MEMBER",
    password: "delta123",
    companyId: deltaCompany.id,
    companyRole: CompanyUserRole.MEMBER,
  });

  console.log("Populando projetos Alpha...");

  await createProjectWithData({
    companyId: alphaCompany.id,
    ownerId: alphaOwner.id,
    name: "Plataforma SaaS de Gestão",
    description: "Solução SaaS multiempresa para gestão financeira",
    defaultHourlyRate: 140,
    members: [alphaOwner.id, alphaManager.id, alphaDev.id],
    sprints: [
      {
        name: "Sprint 1 - Fundamentos",
        goal: "Autenticação, configuração inicial e protótipo",
        startOffsetDays: -7,
        durationDays: 14,
        tasks: [
          {
            title: "Configurar autenticação multi-tenant",
            description: "JWT com escopo de empresa e seleção por header",
      status: "IN_PROGRESS",
      estimateHours: 12,
            actualHours: 6,
            assigneeIndex: 0,
      order: 0,
            startOffsetDays: -7,
            endOffsetDays: 2,
          },
          {
            title: "Protótipo UI",
            description: "Design inicial das telas principais",
            status: "REVIEW",
      estimateHours: 10,
      actualHours: 9,
            assigneeIndex: 1,
      order: 1,
            startOffsetDays: -6,
            endOffsetDays: -1,
          },
          {
            title: "Configuração CI/CD",
            description: "Pipeline de deploy com preview environments",
            status: "TODO",
            estimateHours: 8,
            assigneeIndex: 2,
      order: 2,
            startOffsetDays: 0,
            endOffsetDays: 6,
          },
        ],
      },
      {
        name: "Sprint 2 - Relatórios",
        goal: "Geração de relatórios e exportações",
        startOffsetDays: 8,
        durationDays: 14,
        tasks: [
          {
            title: "Relatório financeiro consolidado",
            description: "Sumário por centro de custo",
            status: "BACKLOG",
            estimateHours: 14,
            assigneeIndex: 1,
      order: 0,
    },
          {
            title: "Exportação para Excel",
            description: "Exportar dashboards para planilhas",
            status: "BACKLOG",
            estimateHours: 10,
            assigneeIndex: 2,
      order: 1,
    },
        ],
      },
    ],
  });

  await createProjectWithData({
    companyId: alphaCompany.id,
    ownerId: alphaManager.id,
    name: "App Mobile Clientes",
    description: "Aplicativo mobile para acompanhamento em tempo real",
    defaultHourlyRate: 120,
    members: [alphaOwner.id, alphaManager.id, alphaDev.id],
    sprints: [
      {
      name: "Sprint 1 - MVP",
        goal: "Fluxo de login e dashboard",
        startOffsetDays: -3,
        durationDays: 10,
        tasks: [
          {
            title: "Implementar login social",
            description: "Suporte a Apple/Google",
      status: "DONE",
            estimateHours: 6,
            actualHours: 5,
            assigneeIndex: 2,
      order: 0,
            startOffsetDays: -3,
            endOffsetDays: -1,
          },
          {
            title: "Dashboard com métricas",
            description: "KPIs principais para o cliente",
      status: "IN_PROGRESS",
      estimateHours: 12,
            actualHours: 4,
            assigneeIndex: 1,
      order: 1,
    },
        ],
      },
    ],
  });

  console.log("Populando projetos Beta...");

  await createProjectWithData({
    companyId: betaCompany.id,
    ownerId: betaOwner.id,
    name: "Gestão de Entregas",
    description: "Plataforma para roteirização e monitoramento de entregas",
    defaultHourlyRate: 130,
    members: [betaOwner.id, betaManager.id, betaAnalyst.id],
    sprints: [
      {
        name: "Sprint 1 - Operação",
        goal: "Cadastro de frota e motoristas",
        startOffsetDays: -10,
        durationDays: 14,
        tasks: [
          {
            title: "Cadastro de veículos",
            description: "Registro de frota com manutenção",
      status: "DONE",
      estimateHours: 10,
            actualHours: 9,
            assigneeIndex: 2,
      order: 0,
    },
          {
            title: "Painel de motoristas",
            description: "Disponibilidade e escala",
      status: "IN_PROGRESS",
      estimateHours: 12,
            actualHours: 6,
            assigneeIndex: 1,
      order: 1,
    },
        ],
      },
      {
        name: "Sprint 2 - Monitoramento",
        goal: "Rastreamento em tempo real",
        startOffsetDays: 5,
        durationDays: 12,
          tasks: [
            {
            title: "Integração com telemetria",
            description: "Streaming de localização",
            status: "TODO",
            estimateHours: 16,
            assigneeIndex: 0,
              order: 0,
            },
            {
            title: "Alertas de atraso",
            description: "Notificações por push e SMS",
            status: "TODO",
            estimateHours: 8,
            assigneeIndex: 2,
              order: 1,
            },
        ],
      },
    ],
  });

  await createProjectWithData({
    companyId: betaCompany.id,
    ownerId: betaManager.id,
    name: "Analytics Operacional",
    description: "Dashboards para indicadores logísticos",
    defaultHourlyRate: 115,
    members: [betaOwner.id, betaManager.id, betaAnalyst.id],
          sprints: [
            {
        name: "Sprint 1 - KPIs",
        goal: "Construção do data mart",
        startOffsetDays: -4,
        durationDays: 12,
          tasks: [
            {
            title: "Modelo dimensional",
            description: "Definição de fatos e dimensões",
            status: "IN_PROGRESS",
            estimateHours: 14,
            actualHours: 7,
            assigneeIndex: 2,
              order: 0,
            },
            {
            title: "Dashboards PowerBI",
            description: "Visão de SLA e produtividade",
            status: "TODO",
            estimateHours: 10,
            assigneeIndex: 1,
              order: 1,
            },
        ],
      },
    ],
  });

  // Projeto adicional Beta com mais tarefas
  await createProjectWithData({
    companyId: betaCompany.id,
    ownerId: betaOwner.id,
    name: "Sistema de Rastreamento",
    description: "Aplicativo para rastreamento de pacotes em tempo real",
    defaultHourlyRate: 125,
    members: [betaOwner.id, betaManager.id, betaAnalyst.id, betaDev1.id, betaDev2.id],
    sprints: [
      {
        name: "Sprint 1 - Backend",
        goal: "API e banco de dados",
        startOffsetDays: -14,
        durationDays: 14,
        tasks: [
          {
            title: "Modelagem do banco de dados",
            description: "Schema para rastreamento de pacotes",
            status: "DONE",
            estimateHours: 8,
            actualHours: 7,
            assigneeIndex: 2,
            order: 0,
            startOffsetDays: -14,
            endOffsetDays: -10,
          },
          {
            title: "API REST para rastreamento",
            description: "Endpoints para consulta de status",
            status: "DONE",
            estimateHours: 12,
            actualHours: 11,
            assigneeIndex: 3,
            order: 1,
            startOffsetDays: -12,
            endOffsetDays: -5,
          },
          {
            title: "Integração com transportadoras",
            description: "Webhooks para atualização automática",
            status: "IN_PROGRESS",
            estimateHours: 16,
            actualHours: 8,
            assigneeIndex: 4,
            order: 2,
            startOffsetDays: -8,
            endOffsetDays: 3,
          },
        ],
      },
      {
        name: "Sprint 2 - Frontend",
        goal: "Interface do usuário",
        startOffsetDays: 1,
        durationDays: 14,
        tasks: [
          {
            title: "Tela de rastreamento",
            description: "Busca por código de rastreamento",
            status: "IN_PROGRESS",
            estimateHours: 10,
            actualHours: 3,
            assigneeIndex: 3,
            order: 0,
            startOffsetDays: 1,
            endOffsetDays: 8,
          },
          {
            title: "Mapa de localização",
            description: "Visualização em tempo real no mapa",
            status: "TODO",
            estimateHours: 14,
            assigneeIndex: 4,
            order: 1,
            startOffsetDays: 5,
            endOffsetDays: 12,
          },
          {
            title: "Notificações push",
            description: "Alertas de atualização de status",
            status: "BACKLOG",
            estimateHours: 8,
            assigneeIndex: 2,
            order: 2,
          },
        ],
      },
    ],
  });

  console.log("Populando projetos Gamma...");

  await createProjectWithData({
    companyId: gammaCompany.id,
    ownerId: gammaOwner.id,
    name: "Redesign Website Corporativo",
    description: "Modernização completa do site institucional",
    defaultHourlyRate: 100,
    members: [gammaOwner.id, gammaDesigner1.id, gammaDesigner2.id],
    sprints: [
      {
        name: "Sprint 1 - Design System",
        goal: "Criação do design system e componentes",
        startOffsetDays: -5,
        durationDays: 10,
        tasks: [
          {
            title: "Paleta de cores e tipografia",
            description: "Definição da identidade visual",
            status: "DONE",
            estimateHours: 6,
            actualHours: 5,
            assigneeIndex: 1,
            order: 0,
            startOffsetDays: -5,
            endOffsetDays: -3,
          },
          {
            title: "Componentes base",
            description: "Botões, inputs, cards, etc",
            status: "IN_PROGRESS",
            estimateHours: 12,
            actualHours: 7,
            assigneeIndex: 2,
            order: 1,
            startOffsetDays: -4,
            endOffsetDays: 2,
          },
          {
            title: "Prototipação no Figma",
            description: "Telas principais do site",
            status: "REVIEW",
            estimateHours: 16,
            actualHours: 14,
            assigneeIndex: 1,
            order: 2,
            startOffsetDays: -3,
            endOffsetDays: 1,
          },
        ],
      },
      {
        name: "Sprint 2 - Desenvolvimento",
        goal: "Implementação das telas",
        startOffsetDays: 6,
        durationDays: 12,
        tasks: [
          {
            title: "Homepage responsiva",
            description: "Layout adaptativo mobile-first",
            status: "TODO",
            estimateHours: 10,
            assigneeIndex: 2,
            order: 0,
            startOffsetDays: 6,
            endOffsetDays: 12,
          },
          {
            title: "Página de produtos",
            description: "Catálogo com filtros",
            status: "BACKLOG",
            estimateHours: 12,
            assigneeIndex: 1,
            order: 1,
          },
        ],
      },
    ],
  });

  await createProjectWithData({
    companyId: gammaCompany.id,
    ownerId: gammaDesigner1.id,
    name: "App Mobile de Portfólio",
    description: "Aplicativo para exibir portfólio de trabalhos",
    defaultHourlyRate: 95,
    members: [gammaOwner.id, gammaDesigner1.id, gammaDesigner2.id],
    sprints: [
      {
        name: "Sprint 1 - MVP",
        goal: "Versão inicial funcional",
        startOffsetDays: -2,
        durationDays: 10,
        tasks: [
          {
            title: "Design das telas principais",
            description: "Home, galeria, detalhes do projeto",
            status: "DONE",
            estimateHours: 8,
            actualHours: 7,
            assigneeIndex: 1,
            order: 0,
            startOffsetDays: -2,
            endOffsetDays: 0,
          },
          {
            title: "Implementação React Native",
            description: "Desenvolvimento do app",
            status: "IN_PROGRESS",
            estimateHours: 20,
            actualHours: 10,
            assigneeIndex: 2,
            order: 1,
            startOffsetDays: 0,
            endOffsetDays: 8,
          },
        ],
      },
    ],
  });

  console.log("Populando projetos Delta...");

  await createProjectWithData({
    companyId: deltaCompany.id,
    ownerId: deltaOwner.id,
    name: "Consultoria Estratégica Tech",
    description: "Projeto de consultoria para transformação digital",
    defaultHourlyRate: 200,
    members: [deltaOwner.id, deltaConsultant1.id, deltaConsultant2.id],
    sprints: [
      {
        name: "Fase 1 - Análise",
        goal: "Diagnóstico e levantamento de necessidades",
        startOffsetDays: -20,
        durationDays: 14,
        tasks: [
          {
            title: "Entrevistas com stakeholders",
            description: "Mapeamento de processos atuais",
            status: "DONE",
            estimateHours: 16,
            actualHours: 14,
            assigneeIndex: 1,
            order: 0,
            startOffsetDays: -20,
            endOffsetDays: -12,
          },
          {
            title: "Análise de gap tecnológico",
            description: "Identificação de oportunidades",
            status: "DONE",
            estimateHours: 12,
            actualHours: 10,
            assigneeIndex: 2,
            order: 1,
            startOffsetDays: -15,
            endOffsetDays: -8,
          },
          {
            title: "Relatório executivo",
            description: "Documentação de recomendações",
            status: "REVIEW",
            estimateHours: 8,
            actualHours: 6,
            assigneeIndex: 0,
            order: 2,
            startOffsetDays: -8,
            endOffsetDays: -3,
          },
        ],
      },
      {
        name: "Fase 2 - Implementação",
        goal: "Execução das recomendações",
        startOffsetDays: -2,
        durationDays: 21,
        tasks: [
          {
            title: "Plano de ação detalhado",
            description: "Roadmap de implementação",
            status: "IN_PROGRESS",
            estimateHours: 10,
            actualHours: 4,
            assigneeIndex: 1,
            order: 0,
            startOffsetDays: -2,
            endOffsetDays: 5,
          },
          {
            title: "Workshops de capacitação",
            description: "Treinamento da equipe",
            status: "TODO",
            estimateHours: 12,
            assigneeIndex: 2,
            order: 1,
            startOffsetDays: 5,
            endOffsetDays: 12,
          },
        ],
      },
    ],
  });

  console.log("Criando recursos e filtros...");
  await createResources(alphaCompany.id);
  await createResources(betaCompany.id);
  await createResources(gammaCompany.id);
  await createResources(deltaCompany.id);

    await prisma.savedFilter.createMany({
      data: [
        {
        userId: alphaOwner.id,
        name: "Tarefas da equipe Alpha",
        description: "Tarefas atribuídas ao time Alpha",
          type: "tasks",
          isQuick: true,
        companyId: alphaCompany.id,
        filters: { projectCompanyId: alphaCompany.id },
      },
      {
        userId: betaOwner.id,
        name: "Entregas em andamento",
        description: "Tarefas da Beta Logistics em progresso",
          type: "tasks",
          isQuick: true,
        companyId: betaCompany.id,
        filters: { status: ["IN_PROGRESS"], projectCompanyId: betaCompany.id },
        },
        {
          userId: gammaOwner.id,
          name: "Design em revisão",
          description: "Tarefas de design aguardando aprovação",
          type: "tasks",
          isQuick: true,
          companyId: gammaCompany.id,
          filters: { status: ["REVIEW"], projectCompanyId: gammaCompany.id },
        },
        {
          userId: deltaOwner.id,
          name: "Consultorias ativas",
          description: "Projetos de consultoria em andamento",
          type: "projects",
          isQuick: true,
          companyId: deltaCompany.id,
          filters: { companyId: deltaCompany.id },
        },
      ],
      skipDuplicates: true,
    });

  console.log("Criando tags e associando a tarefas...");
  
  // Criar tags para cada empresa
  const alphaTags = await Promise.all([
    prisma.tag.create({
      data: {
        companyId: alphaCompany.id,
        name: "Frontend",
        color: "#3B82F6",
      },
    }),
    prisma.tag.create({
      data: {
        companyId: alphaCompany.id,
        name: "Backend",
        color: "#10B981",
      },
    }),
    prisma.tag.create({
      data: {
        companyId: alphaCompany.id,
        name: "Urgente",
        color: "#EF4444",
      },
    }),
  ]);

  const betaTags = await Promise.all([
    prisma.tag.create({
      data: {
        companyId: betaCompany.id,
        name: "Logística",
        color: "#F59E0B",
      },
    }),
    prisma.tag.create({
      data: {
        companyId: betaCompany.id,
        name: "Rastreamento",
        color: "#8B5CF6",
      },
    }),
  ]);

  const gammaTags = await Promise.all([
    prisma.tag.create({
      data: {
        companyId: gammaCompany.id,
        name: "UI/UX",
        color: "#EC4899",
      },
    }),
    prisma.tag.create({
      data: {
        companyId: gammaCompany.id,
        name: "Branding",
        color: "#FBBF24",
      },
    }),
  ]);

  // Associar tags a algumas tarefas
  const alphaTasks = await prisma.task.findMany({
    where: { project: { companyId: alphaCompany.id } },
    take: 3,
  });

  if (alphaTasks.length > 0) {
    await prisma.taskTag.createMany({
      data: [
        { taskId: alphaTasks[0].id, tagId: alphaTags[0].id },
        { taskId: alphaTasks[1]?.id, tagId: alphaTags[1].id },
        { taskId: alphaTasks[2]?.id, tagId: alphaTags[2].id },
      ],
      skipDuplicates: true,
    });
  }

  const betaTasks = await prisma.task.findMany({
    where: { project: { companyId: betaCompany.id } },
    take: 2,
  });

  if (betaTasks.length > 0) {
    await prisma.taskTag.createMany({
      data: [
        { taskId: betaTasks[0].id, tagId: betaTags[0].id },
        { taskId: betaTasks[1]?.id, tagId: betaTags[1].id },
      ],
      skipDuplicates: true,
    });
  }

  const gammaTasks = await prisma.task.findMany({
    where: { project: { companyId: gammaCompany.id } },
    take: 2,
  });

  if (gammaTasks.length > 0) {
    await prisma.taskTag.createMany({
      data: [
        { taskId: gammaTasks[0].id, tagId: gammaTags[0].id },
        { taskId: gammaTasks[1]?.id, tagId: gammaTags[1].id },
      ],
      skipDuplicates: true,
    });
  }

  console.log("Criando comentários em algumas tarefas...");
  
  if (alphaTasks.length > 0) {
    await prisma.comment.create({
      data: {
        taskId: alphaTasks[0].id,
        userId: alphaManager.id,
        content: "Ótimo progresso! Vamos revisar na próxima reunião.",
      },
    });
  }

  if (betaTasks.length > 0) {
    await prisma.comment.create({
      data: {
        taskId: betaTasks[0].id,
        userId: betaManager.id,
        content: "Precisamos validar com o cliente antes de prosseguir.",
      },
    });
  }

  console.log("Criando registros de horas...");
  
  // Criar alguns time entries
  if (alphaTasks.length > 0) {
    await prisma.timeEntry.createMany({
      data: [
        {
          taskId: alphaTasks[0].id,
          userId: alphaDev.id,
          hours: 4,
          date: new Date(Date.now() - 2 * 86400000),
          notes: "Desenvolvimento da funcionalidade",
        },
        {
          taskId: alphaTasks[0].id,
          userId: alphaDev.id,
          hours: 2,
          date: new Date(Date.now() - 1 * 86400000),
          notes: "Correção de bugs",
        },
      ],
      skipDuplicates: true,
    });
  }

  if (betaTasks.length > 0) {
    await prisma.timeEntry.createMany({
      data: [
        {
          taskId: betaTasks[0].id,
          userId: betaDev1.id,
          hours: 6,
          date: new Date(Date.now() - 3 * 86400000),
          notes: "Implementação inicial",
        },
        {
          taskId: betaTasks[0].id,
          userId: betaDev2.id,
          hours: 3,
          date: new Date(Date.now() - 2 * 86400000),
          notes: "Testes e validação",
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log("Criando notificações de exemplo...");
  
  await prisma.notification.createMany({
    data: [
      {
        userId: alphaOwner.id,
        companyId: alphaCompany.id,
        type: "TASK_ASSIGNED",
        title: "Nova tarefa atribuída",
        message: "Você foi atribuído à tarefa: Configurar autenticação multi-tenant",
        entityType: "Task",
        entityId: alphaTasks[0]?.id || "",
      },
      {
        userId: betaManager.id,
        companyId: betaCompany.id,
        type: "TASK_UPDATED",
        title: "Tarefa atualizada",
        message: "A tarefa 'Cadastro de veículos' foi atualizada",
        entityType: "Task",
        entityId: betaTasks[0]?.id || "",
      },
      {
        userId: gammaDesigner1.id,
        companyId: gammaCompany.id,
        type: "COMMENT_ADDED",
        title: "Novo comentário",
        message: "Lucas Ferreira comentou na tarefa",
        entityType: "Task",
        entityId: gammaTasks[0]?.id || "",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed concluído! Resumo:");
  console.log(`• Empresas: ${await prisma.company.count()}`);
  console.log(`• Usuários: ${await prisma.user.count()}`);
  console.log(`• Projetos: ${await prisma.project.count()}`);
  console.log(`• Sprints: ${await prisma.sprint.count()}`);
  console.log(`• Tarefas: ${await prisma.task.count()}`);
  console.log(`• Recursos: ${await prisma.resource.count()}`);
  console.log(`• Tags: ${await prisma.tag.count()}`);
  console.log(`• Comentários: ${await prisma.comment.count()}`);
  console.log(`• Registros de Horas: ${await prisma.timeEntry.count()}`);
  console.log(`• Notificações: ${await prisma.notification.count()}`);
  console.log(`• Filtros Salvos: ${await prisma.savedFilter.count()}`);
  
  console.log("\n📋 Credenciais de Teste:");
  console.log("\n🔴 SUPERADMIN:");
  console.log("   superadmin@agilepm.com / superadmin123");
  console.log("\n🟢 Alpha Tech Solutions:");
  console.log("   ceo@alpha.com / alpha123 (OWNER)");
  console.log("   pm@alpha.com / alpha123 (ADMIN)");
  console.log("   dev@alpha.com / alpha123 (MEMBER)");
  console.log("\n🔵 Beta Logistics:");
  console.log("   diretoria@beta.com / beta123 (OWNER)");
  console.log("   operacoes@beta.com / beta123 (ADMIN)");
  console.log("   analista@beta.com / beta123 (MEMBER)");
  console.log("   dev1@beta.com / beta123 (MEMBER)");
  console.log("   dev2@beta.com / beta123 (MEMBER)");
  console.log("\n🟣 Gamma Design Studio:");
  console.log("   diretor@gamma.com / gamma123 (OWNER)");
  console.log("   designer1@gamma.com / gamma123 (ADMIN)");
  console.log("   designer2@gamma.com / gamma123 (MEMBER)");
  console.log("\n🟢 Delta Consultoria:");
  console.log("   socio@delta.com / delta123 (OWNER)");
  console.log("   consultor1@delta.com / delta123 (ADMIN)");
  console.log("   consultor2@delta.com / delta123 (MEMBER)");
}

async function main() {
  await seed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

