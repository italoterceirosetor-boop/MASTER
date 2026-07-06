// Lê arquivos compactados (ZIP, RAR) e XMLs (NFe, NFSe, etc)
import fs from 'fs/promises';
import AdmZip from 'adm-zip';
import xml2js from 'xml2js';

// Lê arquivo ZIP e retorna conteúdo de todos os arquivos internos
export async function readZip(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    let combinedText = '';
    const fileList = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const fileName = entry.entryName;
      fileList.push(fileName);

      // Limita tamanho individual
      if (entry.header.size > 5 * 1024 * 1024) {
        combinedText += `\n[Arquivo: ${fileName} - muito grande, ignorado]\n`;
        continue;
      }

      const content = entry.getData().toString('utf-8');

      // Se for XML dentro do ZIP, formata bonitinho
      if (fileName.toLowerCase().endsWith('.xml')) {
        const formatted = await formatXML(content);
        combinedText += `\n=== ${fileName} (XML) ===\n${formatted}\n`;
      } else if (fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.csv')) {
        combinedText += `\n=== ${fileName} ===\n${content}\n`;
      } else if (fileName.toLowerCase().endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          combinedText += `\n=== ${fileName} (JSON) ===\n${JSON.stringify(json, null, 2)}\n`;
        } catch {
          combinedText += `\n=== ${fileName} ===\n${content}\n`;
        }
      } else {
        combinedText += `\n=== ${fileName} (binário, ${entry.header.size} bytes) ===\n`;
      }
    }

    return {
      type: 'zip',
      text: combinedText,
      files: fileList,
      name: 'arquivo.zip'
    };
  } catch (err) {
    throw new Error(`Erro ao ler ZIP: ${err.message}`);
  }
}

// Lê arquivo RAR
export async function readRar(filePath) {
  try {
    // node-unrar-js precisa ser importado dinamicamente por causa de bindings nativos
    const { createExtractorFromFile } = await import('node-unrar-js');
    const extractor = await createExtractorFromFile(filePath);
    const extracted = extractor.extract();

    let combinedText = '';
    const fileList = [];

    for (const file of extracted.files) {
      if (file.fileHeader.flags.directory) continue;

      const fileName = file.fileHeader.name;
      fileList.push(fileName);

      if (file.fileHeader.unpSize > 5 * 1024 * 1024) {
        combinedText += `\n[Arquivo: ${fileName} - muito grande, ignorado]\n`;
        continue;
      }

      const content = file.extraction.toString('utf-8');

      if (fileName.toLowerCase().endsWith('.xml')) {
        const formatted = await formatXML(content);
        combinedText += `\n=== ${fileName} (XML) ===\n${formatted}\n`;
      } else {
        combinedText += `\n=== ${fileName} ===\n${content}\n`;
      }
    }

    return {
      type: 'rar',
      text: combinedText,
      files: fileList,
      name: 'arquivo.rar'
    };
  } catch (err) {
    throw new Error(`Erro ao ler RAR: ${err.message}. Verifique se o RAR não está corrompido.`);
  }
}

// Lê e formata XML (NFe, NFSe, etc)
export async function readXML(filePath, originalName) {
  try {
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const formatted = await formatXML(xmlContent);

    return {
      type: 'xml',
      text: formatted,
      name: originalName,
      raw: xmlContent
    };
  } catch (err) {
    throw new Error(`Erro ao ler XML: ${err.message}`);
  }
}

// Formata XML de forma legível (parseia e reconstrói)
async function formatXML(xmlContent) {
  try {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    const result = await parser.parseStringPromise(xmlContent);
    const jsonStr = JSON.stringify(result, null, 2);

    // Limita tamanho
    const maxChars = 12000;
    if (jsonStr.length > maxChars) {
      return jsonStr.substring(0, maxChars) + '\n\n[... XML truncado por tamanho ...]';
    }
    return jsonStr;
  } catch (err) {
    // Se não conseguir parsear, retorna texto bruto
    return xmlContent.substring(0, 12000);
  }
}
