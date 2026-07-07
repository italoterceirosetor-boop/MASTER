// Gera PDF, Word e Excel profissionais
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';

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
          doc.text(`• ${line.substring(2)}`, { indent: 20, align: 'left' });
        } else if (/^\d+\.\s/.test(line)) {
          doc.text(line, { indent: 20, align: 'left' });
        } else if (line.trim() === '---') {
          doc.moveDown(0.3);
          doc.strokeColor('#CCCCCC').lineWidth(0.5)
             .moveTo(100, doc.y).lineTo(495, doc.y).stroke();
          doc.moveDown(0.3);
        } else if (line.startsWith('> ')) {
          doc.fillColor('#555').font('Helvetica-Oblique')
             .text(line.substring(2), { indent: 40, align: 'left' });
          doc.fillColor('#000').font('Helvetica');
        } else if (line.trim() === '') {
          doc.moveDown(0.5);
        } else if (line.startsWith('|')) {
          doc.font('Courier').fontSize(9).fillColor('#444').text(line, { align: 'left' });
          doc.font('Helvetica').fontSize(11).fillColor('#000');
        } else {
          // Negrito inline
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          let isFirst = true;
          for (const part of parts) {
            if (part.startsWith('**') && part.endsWith('**')) {
              doc.font('Helvetica-Bold').fillColor('#000').text(part.slice(2, -2), { continued: !isFirst, align: 'left' });
            } else if (part) {
              doc.font('Helvetica').fillColor('#000').text(part, { continued: !isFirst, align: 'left' });
            }
            isFirst = false;
          }
          doc.text('', { align: 'left' });
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

  // Capa com título centralizado
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: 'Master IA', size: 28, bold: true, color: '1E5BAA' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Master Contabilidade & Consultoria', size: 18, italics: true, color: '666666' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: '—'.repeat(30), color: '1E5BAA' })
      ]
    }),
    // Título do documento
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: title, size: 32, bold: true })
      ]
    }),
    // Data
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: `Gerado em ${new Date().toLocaleString('pt-BR')}`, size: 18, italics: true, color: '888888' })
      ]
    }),
    new Paragraph({ text: '' }) // espaço
  );

  // Processa cada linha do conteúdo
  for (const line of lines) {
    const trimmed = line.trim();

    // Linha vazia
    if (trimmed === '') {
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }

    // Títulos
    if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.substring(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.substring(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 }
      }));
    } else if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.substring(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 150 }
      }));
    }
    // Tabela markdown
    else if (line.startsWith('|') && line.endsWith('|') && !line.includes('---')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      const tableRows = [];

      tableRows.push(new TableRow({
        children: cells.map(cellText => new TableCell({
          shading: { fill: '1E5BAA' },
          children: [new Paragraph({
            children: [new TextRun({ text: cellText, bold: true, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER
          })]
        }))
      }));

      children.push(new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }));
      children.push(new Paragraph({ text: '' }));
    }
    // Lista com bullet
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({
        text: line.substring(2),
        bullet: { level: 0 },
        spacing: { after: 60 }
      }));
    }
    // Linha separadora
    else if (line.trim() === '---') {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: '—'.repeat(40), color: 'CCCCCC' })]
      }));
    }
    // Citação
    else if (line.startsWith('> ')) {
      children.push(new Paragraph({
        text: line.substring(2),
        spacing: { before: 100, after: 100, left: 400 },
        indent: { left: 400 },
        children: [new TextRun({ text: line.substring(2), italics: true, color: '555555' })]
      }));
    }
    // Linha normal com markdown inline (negrito)
    else {
      const runs = parseInlineMarkdown(line);
      children.push(new Paragraph({
        children: runs,
        spacing: { after: 120 }
      }));
    }
  }

  const doc = new Document({
    creator: 'Master IA',
    title: title,
    description: 'Documento gerado por Master IA',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 } // 11pt
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } // margens em twips
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

// Parseia markdown inline (negrito, itálico, código) e retorna array de TextRun
function parseInlineMarkdown(text) {
  const runs = [];
  // Regex pra capturar **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        font: 'Consolas',
        color: 'C7254E',
        shading: { fill: 'F9F2F4' }
      }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }

  return runs;
}

// ====== EXCEL ======
export async function generateXLSX({ title, content, structuredData }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master IA';
  workbook.created = new Date();

  // Se tiver dados estruturados (tabela), cria planilha profissional
  if (structuredData && structuredData.headers && structuredData.rows) {
    const sheet = workbook.addWorksheet(title.substring(0, 30));

    // Título
    sheet.mergeCells('A1:' + String.fromCharCode(64 + structuredData.headers.length) + '1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    sheet.getRow(1).height = 35;

    // Data de geração
    sheet.mergeCells('A2:' + String.fromCharCode(64 + structuredData.headers.length) + '2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Gerado em ${new Date().toLocaleString('pt-BR')}`;
    dateCell.font = { size: 9, italic: true, color: { argb: 'FF888888' } };
    dateCell.alignment = { horizontal: 'center' };

    // Cabeçalhos (linha 4)
    const headerRow = sheet.getRow(4);
    structuredData.headers.forEach((header, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = header;
      cell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5BAA' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E5BAA' } },
        bottom: { style: 'thin', color: { argb: 'FF1E5BAA' } },
        left: { style: 'thin', color: { argb: 'FF1E5BAA' } },
        right: { style: 'thin', color: { argb: 'FF1E5BAA' } }
      };
    });
    headerRow.height = 25;

    // Dados
    structuredData.rows.forEach((row, rowIdx) => {
      const dataRow = sheet.getRow(5 + rowIdx);
      const bgColor = rowIdx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';

      row.forEach((value, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        cell.value = value;
        cell.font = { size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { horizontal: colIdx === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
      dataRow.height = 22;
    });

    // Auto-ajustar largura das colunas
    structuredData.headers.forEach((header, i) => {
      const col = sheet.getColumn(i + 1);
      const maxLength = Math.max(
        header.length,
        ...structuredData.rows.map(row => String(row[i] || '').length)
      );
      col.width = Math.min(Math.max(maxLength + 4, 15), 50);
    });

    // Filtro automático
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + structuredData.rows.length, column: structuredData.headers.length }
    };

    // Congelar cabeçalho
    sheet.views = [{ state: 'frozen', ySplit: 4 }];

    return await workbook.xlsx.writeBuffer();
  }

  // Fallback: planilha simples baseada em texto/markdown
  return await generateSimpleXLSX(workbook, title, content);
}

async function generateSimpleXLSX(workbook, title, content) {
  const sheet = workbook.addWorksheet(title.substring(0, 30));

  // Título
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Tenta parsear tabelas markdown do conteúdo
  const lines = content.split('\n');
  let row = 3;

  for (const line of lines) {
    // Detecta linha de tabela markdown (começa com |)
    if (line.startsWith('|') && line.endsWith('|') && !line.includes('---')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      cells.forEach((cellText, i) => {
        const cell = sheet.getCell(row, i + 1);
        cell.value = cellText;
        cell.font = { size: 11, bold: row === 3 };
        if (row === 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5BAA' } };
          cell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
      sheet.getRow(row).height = 22;
      row++;
    } else if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
      const cleanText = line.replace(/^#+\s/, '');
      sheet.mergeCells(`A${row}:D${row}`);
      const cell = sheet.getCell(`A${row}`);
      cell.value = cleanText;
      cell.font = { size: 14, bold: true, color: { argb: 'FF1E5BAA' } };
      sheet.getRow(row).height = 24;
      row++;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      sheet.getCell(`A${row}`).value = '• ' + line.substring(2);
      sheet.getCell(`A${row}`).font = { size: 11 };
      row++;
    } else if (line.trim() !== '') {
      sheet.mergeCells(`A${row}:D${row}`);
      sheet.getCell(`A${row}`).value = line.replace(/\*\*/g, '');
      sheet.getCell(`A${row}`).font = { size: 11 };
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
