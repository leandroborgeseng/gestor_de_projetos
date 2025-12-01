import multer from "multer";
import { Request } from "express";
import path from "path";
import fs from "fs";

// Criar diretório de uploads se não existir
// Usar caminho absoluto no Docker, relativo em desenvolvimento
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Garantir que o diretório existe com permissões corretas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
} else {
  // Ajustar permissões se o diretório já existir
  try {
    fs.chmodSync(uploadDir, 0o755);
  } catch (error) {
    console.warn("⚠️ Não foi possível ajustar permissões do diretório uploads:", error);
  }
}

console.log(`📁 Diretório de uploads: ${uploadDir}`);

// Configuração de storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp + nome original
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

// Tipos MIME permitidos
const allowedMimeTypes = [
  // Imagens
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  // Texto
  "text/plain",
  "text/csv",
  // Arquivos
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

// Validação de arquivo
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}. Tipos permitidos: imagens, PDF, documentos Office, arquivos compactados.`));
  }
};

// Configuração do multer
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

// Função para obter URL do arquivo
export function getFileUrl(fileName: string): string {
  return `/uploads/${fileName}`;
}

// Função para obter caminho completo do arquivo
export function getFilePath(fileName: string): string {
  return path.join(uploadDir, fileName);
}

// Função para deletar arquivo
export function deleteFile(fileName: string): void {
  const filePath = getFilePath(fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

