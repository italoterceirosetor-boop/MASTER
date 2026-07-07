// Serviço pra extrair texto de diferentes tipos de arquivo
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { readZip, readXML } from './archiveService.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.xlsx', '.xls', '.csv', '.txt', '.docx',
  '.xml', '.zip'
];

export async function extractFileContent(filePath, mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  try {
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

    if (ext === '.csv' || mimetype === 'text/csv') {
      const text = await fs.readFile(filePath, 'utf-8');
      return { type: 'csv', text, name: originalName };
    }

    if (ext === '.txt' || mimetype === 'text/plain') {
      const text = await fs.readFile(filePath, 'utf-8');
      return { type: 'text', text, name: originalName };
    }

    if (ext === '.docx') {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return { type: 'docx', text: result.value, name: originalName };
    }

    if (ext === '.xml' || mimetype === 'application/xml' || mimetype === 'text/xml') {
      return await readXML(filePath, originalName);
    }

    if (ext === '.zip') {
      return await readZip(filePath);
    }

    // Imagens
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

export function validateFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Tipo não suportado: ${ext}. Use: PDF, imagens, Excel, CSV, TXT, DOCX, XML ou ZIP`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: 10MB`);
  }
  return true;
}

export function formatFilesForAI(files) {
  if (!files || files.length === 0) return '';

  let context = '\n\n=== ARQUIVOS ANEXADOS ===\n';

  files.forEach((file, i) => {
    context += `\n[Arquivo ${i + 1}: ${file.name}]\n`;
    context += `Tipo: ${file.type}\n`;

    if (file.isImage) {
      context += `(Esta é uma imagem.)\n`;
    } else {
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
