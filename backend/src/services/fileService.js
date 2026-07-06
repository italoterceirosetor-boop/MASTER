// Serviço pra extrair texto de diferentes tipos de arquivo
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
];

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.xlsx', '.xls', '.csv', '.txt', '.docx'];

// Extrai texto de um arquivo baseado no tipo
export async function extractFileContent(filePath, mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  try {
    // PDF
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return {
        type: 'pdf',
        text: data.text,
        pages: data.numpages,
        name: originalName
      };
    }

    // Excel (xlsx, xls)
    if (['.xlsx', '.xls'].includes(ext)) {
      const buffer = await fs.readFile(filePath);
      const workbook = XLSX.read(buffer);
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += `\n=== Aba: ${sheetName} ===\n`;
        text += XLSX.utils.sheet_to_csv(sheet);
      });
      return {
        type: 'excel',
        text,
        sheets: workbook.SheetNames,
        name: originalName
      };
    }

    // CSV
    if (ext === '.csv' || mimetype === 'text/csv') {
      const text = await fs.readFile(filePath, 'utf-8');
      return {
        type: 'csv',
        text,
        name: originalName
      };
    }

    // TXT
    if (ext === '.txt' || mimetype === 'text/plain') {
      const text = await fs.readFile(filePath, 'utf-8');
      return {
        type: 'text',
        text,
        name: originalName
      };
    }

    // Word (docx)
    if (ext === '.docx') {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return {
        type: 'docx',
        text: result.value,
        name: originalName
      };
    }

    // Imagens — não extrai texto, mas marca pra IA ver
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
      return {
        type: 'image',
        text: `[Imagem: ${originalName}]`,
        name: originalName,
        isImage: true
      };
    }

    throw new Error(`Tipo de arquivo não suportado: ${ext}`);
  } catch (err) {
    throw new Error(`Erro ao processar ${originalName}: ${err.message}`);
  }
}

// Valida o arquivo
export function validateFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Tipo não suportado: ${ext}. Use: PDF, imagens, Excel, CSV, TXT ou DOCX`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: 10MB`);
  }

  return true;
}

// Formata conteúdo dos arquivos pra enviar pra IA
export function formatFilesForAI(files) {
  if (!files || files.length === 0) return '';

  let context = '\n\n=== ARQUIVOS ANEXADOS ===\n';

  files.forEach((file, i) => {
    context += `\n[Arquivo ${i + 1}: ${file.name}]\n`;
    context += `Tipo: ${file.type}\n`;

    if (file.isImage) {
      context += `(Esta é uma imagem. Descreva o que vê se relevante.)\n`;
    } else {
      // Limita tamanho do texto pra não estourar tokens
      const maxChars = 15000;
      const text = file.text.length > maxChars
        ? file.text.substring(0, maxChars) + '\n\n[... texto truncado ...]'
        : file.text;
      context += `Conteúdo:\n${text}\n`;
    }
    context += '---\n';
  });

  return context;
}
