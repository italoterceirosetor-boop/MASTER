// Gera PDF, Word e Excel profissionais
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// ====== PDF PROFISSIONAL ======
export async function generatePDF({ title, content, author = 'Master IA' }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
          Title: title,
          Author: author,
          Subject: 'Gerado por Master IA',
          Creator: 'Master IA'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc.fillColor('#1E5BAA')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('Master IA', { align: 'left' });

      doc.fontSize(10)
         .fillColor('#666')
         .font('Helvetica')
         .text('Master Contabilidade & Consultoria', { align: 'left' });

      doc.moveDown(0.5);

      // Linha divisória
      doc.strokeColor('#1E5BAA')
         .lineWidth(2)
         .moveTo(60, doc.y)
         .lineTo(535, doc.y)
         .stroke();

      doc.moveDown(1);

      // Título do documento
      doc.fillColor('#000')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(title);

      doc.moveDown(0.5);

      // Data
      doc.fontSize(9)
         .fillColor('#888')
         .font('Helvetica')
         .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);

      doc.moveDown(1.5);

      // Conteúdo — processa markdown básico
      doc.fillColor('#000').fontSize(11).font('Helvetica');

      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('# ')) {
          doc.moveDown(0.5);
          doc.fontSize(15).font('Helvetica-Bold').fillColor('#1E5BAA');
          doc.text(line.substring(2));
          doc.fontSize(11).font('Helvetica').fillColor('#000');
          doc.moveDown(0.5);
        } else if (line.startsWith('## ')) {
          doc.moveDown(0.5);
          doc.fontSize(13).font('Helvetica-Bold').fillColor('#1E5BAA');
          doc.text(line.substring(3));
          doc.fontSize(11).font('Helvetica').fillColor('#000');
          doc.moveDown(0.3);
        } else if (line.startsWith('### ')) {
          doc.moveDown(0.3);
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#333');
          doc.text(line.substring(4));
          doc.fontSize(11).font('Helvetica').fillColor('#000');
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          doc.text(`• ${line.substring(2)}`, { indent: 20 });
        } else if (/^\d+\.\s/.test(line)) {
          doc.text(line, { indent: 20 });
        } else if (line.trim() === '') {
          doc.moveDown(0.5);
        } else if (line.startsWith('|')) {
          // Tabela markdown simples
          doc.font('Courier').fontSize(9).text(line);
          doc.font('Helvetica').fontSize(11);
        } else {
          // Negrito inline
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          for (const part of parts) {
            if (part.startsWith('**') && part.endsWith('**')) {
              doc.font('Helvetica-Bold').text(part.slice(2, -2), { continued: true });
              doc.font('Helvetica');
            } else {
              doc.text(part, { continued: true });
            }
          }
          doc.text('');
        }
      }

      // Rodapé
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Linha do rodapé
        doc.strokeColor('#ddd').lineWidth(0.5)
           .moveTo(60, doc.page.height - 50)
           .lineTo(535, doc.page.height - 50)
           .stroke();

        doc.fontSize(8)
           .fillColor('#888')
           .font('Helvetica')
           .text('Master IA — Master Contabilidade & Consultoria', 60, doc.page.height - 40, { align: 'left' });

        doc.text(`Página ${i - range.start + 1} de ${range.count}`, 60, doc.page.height - 40, { align: 'right', width: 475 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ====== WORD (DOCX) ======
export async function generateDOCX({ title, content }) {
  const lines = content.split('\n');
  const children = [];

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString('pt-BR')}`, italics: true, size: 18 })],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' }) // espaço
  );

  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.substring(2), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.substring(3), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({ text: line.substring(4), heading: HeadingLevel.HEADING_3 }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({ text: line.substring(2), bullet: { level: 0 } }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      // Processa negrito inline
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.slice(2, -2), bold: true });
        }
        return new TextRun({ text: part });
      });
      children.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({
    creator: 'Master IA',
    title: title,
    sections: [{ properties: {}, children }]
  });

  return await Packer.toBuffer(doc);
}

// ====== EXCEL ======
export async function generateXLSX({ title, content }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master IA';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.substring(0, 30));

  // Estilo do título
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Data
  sheet.mergeCells('A2:D2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = `Gerado em ${new Date().toLocaleString('pt-BR')}`;
  dateCell.font = { size: 10, italic: true, color: { argb: 'FF666666' } };
  dateCell.alignment = { horizontal: 'center' };

  let row = 4;

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
      const cleanText = line.replace(/^#+\s/, '');
      sheet.mergeCells(`A${row}:D${row}`);
      const cell = sheet.getCell(`A${row}`);
      cell.value = cleanText;
      cell.font = { size: 13, bold: true, color: { argb: 'FF1E5BAA' } };
      sheet.getRow(row).height = 22;
      row++;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      sheet.getCell(`A${row}`).value = '• ' + line.substring(2);
      row++;
    } else if (line.trim() !== '') {
      sheet.getCell(`A${row}`).value = line.replace(/\*\*/g, '');
      row++;
    } else {
      row++;
    }
  }

  // Largura das colunas
  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 20;

  return await workbook.xlsx.writeBuffer();
}

// ====== TXT ======
export function generateTXT({ title, content }) {
  const header = `${title}\n${'='.repeat(title.length)}\nGerado em ${new Date().toLocaleString('pt-BR')}\n\n`;
  return Buffer.from(header + content, 'utf-8');
}

// Detecta marcadores de geração na resposta da IA
// Formato: [GERAR_PDF:nome-do-arquivo] conteúdo aqui
export function parseGenerationMarkers(text) {
  const markers = [];
  const cleanedText = text;

  const patterns = [
    { regex: /\[GERAR_PDF:([^\]]+)\]([\s\S]*?)\[FIM_PDF\]/g, type: 'pdf' },
    { regex: /\[GERAR_DOCX:([^\]]+)\]([\s\S]*?)\[FIM_DOCX\]/g, type: 'docx' },
    { regex: /\[GERAR_XLSX:([^\]]+)\]([\s\S]*?)\[FIM_XLSX\]/g, type: 'xlsx' },
    { regex: /\[GERAR_TXT:([^\]]+)\]([\s\S]*?)\[FIM_TXT\]/g, type: 'txt' }
  ];

  let cleanText = text;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      markers.push({
        type: pattern.type,
        filename: match[1].trim(),
        content: match[2].trim()
      });
    }
    cleanText = cleanText.replace(pattern.regex, '');
  }

  return { cleanText: cleanText.trim(), markers };
}
