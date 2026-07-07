// Gera PDF, Word e Excel profissionais
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType
} from 'docx';

// ====== PDF PROFISSIONAL (REESCRITO DO ZERO) ======
export async function generatePDF({ title, content }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 70, bottom: 70, left: 70, right: 70 },
        bufferPages: true,
        info: {
          Title: title,
          Author: 'Master IA',
          Subject: 'Documento gerado por Master IA',
          Creator: 'Master IA'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = 70;
      const marginRight = 70;
      const contentWidth = pageWidth - marginLeft - marginRight;
      const marginTop = 70;
      const marginBottom = 70;

      // Função pra adicionar header em cada página
      function addHeader() {
        doc.save();
        doc.fillColor('#1E5BAA')
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Master IA', marginLeft, 30);

        doc.fontSize(8)
           .fillColor('#888')
           .font('Helvetica')
           .text('Master Contabilidade & Consultoria', marginLeft, 45);

        // Linha
        doc.strokeColor('#1E5BAA')
           .lineWidth(1)
           .moveTo(marginLeft, 60)
           .lineTo(pageWidth - marginRight, 60)
           .stroke();
        doc.restore();
      }

      // Função pra adicionar footer com numeração
      function addFooter(pageNum, totalPages) {
        const footerY = pageHeight - 40;
        doc.save();
        doc.fontSize(8)
           .fillColor('#888')
           .font('Helvetica')
           .text('Master IA — Documento gerado automaticamente', marginLeft, footerY);

        doc.text(`Página ${pageNum} de ${totalPages}`, marginLeft, footerY, {
          width: contentWidth,
          align: 'right'
        });
        doc.restore();
      }

      // CAPA
      doc.fillColor('#1E5BAA')
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('Master IA', marginLeft, 200);

      doc.fontSize(14)
         .fillColor('#666')
         .font('Helvetica')
         .text('Master Contabilidade & Consultoria', marginLeft, 245);

      doc.strokeColor('#1E5BAA')
         .lineWidth(3)
         .moveTo(marginLeft, 280)
         .lineTo(pageWidth - marginRight, 280)
         .stroke();

      // Título do documento
      doc.fillColor('#000')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text(title, marginLeft, 350, { width: contentWidth, align: 'center' });

      // Data
      doc.fontSize(11)
         .fillColor('#666')
         .font('Helvetica-Oblique')
         .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, marginLeft, 450, {
           width: contentWidth,
           align: 'center'
         });

      // Nova página pro conteúdo
      doc.addPage();
      addHeader();

      // Margem Y inicial (depois do header)
      let cursorY = 80;

      // ===== PROCESSA CONTEÚDO =====
      const lines = content.split('\n');
      let inCodeBlock = false;
      let codeBuffer = [];
      let tableBuffer = [];
      let inTable = false;

      function ensureSpace(neededHeight) {
        if (cursorY + neededHeight > pageHeight - marginBottom) {
          doc.addPage();
          addHeader();
          cursorY = 80;
        }
      }

      function drawTable(rows) {
        if (rows.length === 0) return;

        // Parseia linhas markdown de tabela
        const parsed = rows
          .filter(r => !r.includes('---'))
          .map(r => r.split('|').slice(1, -1).map(c => c.trim()));

        if (parsed.length === 0) return;

        const colCount = parsed[0].length;
        const colWidth = contentWidth / colCount;
        const rowHeight = 24;
        const cellPadding = 6;

        // Cabeçalho com fundo azul
        const header = parsed[0];

        ensureSpace(rowHeight);

        // Fundo do cabeçalho
        doc.save();
        doc.rect(marginLeft, cursorY, contentWidth, rowHeight)
           .fillColor('#1E5BAA')
           .fill();
        doc.restore();

        // Texto do cabeçalho (branco, negrito)
        doc.fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .fontSize(9);

        header.forEach((cellText, i) => {
          const x = marginLeft + (i * colWidth) + cellPadding;
          doc.text(cellText || '', x, cursorY + 6, {
            width: colWidth - (cellPadding * 2),
            align: 'center',
            ellipsis: true,
            height: rowHeight - 6
          });
        });

        cursorY += rowHeight;

        // Linhas de dados
        doc.fillColor('#000').font('Helvetica').fontSize(9);

        for (let r = 1; r < parsed.length; r++) {
          ensureSpace(rowHeight);

          // Zebra striping
          if (r % 2 === 0) {
            doc.save();
            doc.rect(marginLeft, cursorY, contentWidth, rowHeight)
               .fillColor('#F8FAFC')
               .fill();
            doc.restore();
          }

          // Borda inferior
          doc.strokeColor('#E2E8F0')
             .lineWidth(0.5)
             .moveTo(marginLeft, cursorY + rowHeight)
             .lineTo(marginLeft + contentWidth, cursorY + rowHeight)
             .stroke();

          parsed[r].forEach((cellText, i) => {
            const x = marginLeft + (i * colWidth) + cellPadding;
            const cleanText = (cellText || '').replace(/\*\*/g, '');
            doc.fillColor('#000')
               .text(cleanText, x, cursorY + 6, {
                 width: colWidth - (cellPadding * 2),
                 align: i === 0 ? 'left' : 'center',
                 ellipsis: true,
                 height: rowHeight - 6
               });
          });

          cursorY += rowHeight;
        }

        // Borda da tabela
        doc.strokeColor('#1E5BAA')
           .lineWidth(1)
           .rect(marginLeft, cursorY - (parsed.length * rowHeight), contentWidth, parsed.length * rowHeight)
           .stroke();

        cursorY += 15;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Bloco de código
        if (trimmed.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            codeBuffer = [];
            continue;
          } else {
            // Renderiza código acumulado
            const codeHeight = codeBuffer.length * 12 + 20;
            ensureSpace(codeHeight);
            doc.save();
            doc.rect(marginLeft, cursorY, contentWidth, codeHeight)
               .fillColor('#0d1117')
               .fill();
            doc.restore();

            doc.fontSize(9)
               .fillColor('#E6EDF3')
               .font('Courier')
               .text(codeBuffer.join('\n'), marginLeft + 10, cursorY + 8, {
                 width: contentWidth - 20,
                 align: 'left'
               });
            doc.font('Helvetica').fillColor('#000').fontSize(11);

            cursorY += codeHeight + 10;
            inCodeBlock = false;
            codeBuffer = [];
            continue;
          }
        }

        if (inCodeBlock) {
          codeBuffer.push(line);
          continue;
        }

        // Tabela markdown
        if (line.startsWith('|') && line.endsWith('|')) {
          tableBuffer.push(line);
          inTable = true;
          continue;
        } else if (inTable && tableBuffer.length > 0) {
          drawTable(tableBuffer);
          tableBuffer = [];
          inTable = false;
        }

        // Títulos
        if (line.startsWith('# ')) {
          ensureSpace(40);
          cursorY += 10;
          doc.fontSize(20).font('Helvetica-Bold').fillColor('#1E5BAA');
          doc.text(line.substring(2), marginLeft, cursorY, { width: contentWidth });
          cursorY = doc.y + 12;
        }
        else if (line.startsWith('## ')) {
          ensureSpace(32);
          cursorY += 8;
          doc.fontSize(15).font('Helvetica-Bold').fillColor('#1E5BAA');
          doc.text(line.substring(3), marginLeft, cursorY, { width: contentWidth });
          cursorY = doc.y + 8;
        }
        else if (line.startsWith('### ')) {
          ensureSpace(26);
          cursorY += 6;
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#333');
          doc.text(line.substring(4), marginLeft, cursorY, { width: contentWidth });
          cursorY = doc.y + 6;
        }
        // Linha horizontal
        else if (trimmed === '---') {
          ensureSpace(15);
          cursorY += 5;
          doc.strokeColor('#CCCCCC')
             .lineWidth(0.5)
             .moveTo(marginLeft, cursorY)
             .lineTo(marginLeft + contentWidth, cursorY)
             .stroke();
          cursorY += 10;
        }
        // Citação
        else if (line.startsWith('> ')) {
          ensureSpace(30);
          const quoteText = line.substring(2).replace(/\*\*/g, '');
          doc.fontSize(11).font('Helvetica-Oblique').fillColor('#555');
          doc.text(quoteText, marginLeft + 20, cursorY, {
            width: contentWidth - 20,
            align: 'left'
          });
          cursorY = doc.y + 6;
          doc.font('Helvetica').fillColor('#000');
        }
        // Lista com bullet
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          ensureSpace(20);
          const text = line.substring(2).replace(/\*\*/g, '');

          doc.fontSize(11).font('Helvetica').fillColor('#1E5BAA');
          doc.text('•', marginLeft + 5, cursorY);

          doc.fontSize(11).font('Helvetica').fillColor('#000');
          doc.text(text, marginLeft + 20, cursorY, {
            width: contentWidth - 20,
            align: 'left'
          });
          cursorY = doc.y + 4;
        }
        // Lista numerada
        else if (/^\d+\.\s/.test(line)) {
          ensureSpace(20);
          const match = line.match(/^(\d+)\.\s(.*)$/);
          const num = match[1];
          const text = match[2].replace(/\*\*/g, '');

          doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E5BAA');
          doc.text(`${num}.`, marginLeft + 5, cursorY);

          doc.fontSize(11).font('Helvetica').fillColor('#000');
          doc.text(text, marginLeft + 25, cursorY, {
            width: contentWidth - 25,
            align: 'left'
          });
          cursorY = doc.y + 4;
        }
        // Linha vazia
        else if (trimmed === '') {
          cursorY += 8;
        }
        // Texto normal com markdown inline
        else {
          ensureSpace(30);

          // Processa **negrito** e divide em runs
          const segments = line.split(/(\*\*[^*]+\*\*)/g);
          let runs = [];
          for (const seg of segments) {
            if (seg.startsWith('**') && seg.endsWith('**')) {
              runs.push({ text: seg.slice(2, -2), bold: true });
            } else if (seg) {
              runs.push({ text: seg, bold: false });
            }
          }

          let xPos = marginLeft;
          const lineY = cursorY;

          for (const run of runs) {
            doc.fontSize(11);
            if (run.bold) doc.font('Helvetica-Bold');
            else doc.font('Helvetica');

            doc.fillColor('#000');
            doc.text(run.text, xPos, lineY, {
              width: contentWidth - (xPos - marginLeft),
              align: 'left',
              continued: false
            });

            xPos = marginLeft; // simplificado — texto completo em uma linha
          }

          cursorY = doc.y + 6;
        }
      }

      // Renderiza tabela pendente
      if (inTable && tableBuffer.length > 0) {
        drawTable(tableBuffer);
      }

      // Footer em todas as páginas
      const range = doc.bufferedPageRange();
      const totalPages = range.count;
      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
        addFooter(i - range.start + 1, totalPages);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ====== WORD (DOCX) - PROFISSIONAL ======
export async function generateDOCX({ title, content }) {
  const lines = content.split('\n');
  const children = [];

  // CAPA
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1500, after: 100 },
      children: [new TextRun({ text: 'Master IA', size: 56, bold: true, color: '1E5BAA' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'Master Contabilidade & Consultoria', size: 24, italics: true, color: '666666' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [new TextRun({ text: '━'.repeat(30), color: '1E5BAA' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 100 },
      children: [new TextRun({ text: title, size: 48, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString('pt-BR')}`, size: 22, italics: true, color: '888888' })]
    }),
    new Paragraph({ text: '', pageBreakBefore: true }) // quebra de página
  );

  // CONTEÚDO
  let tableBuffer = [];

  function flushTable() {
    if (tableBuffer.length === 0) return;
    const parsed = tableBuffer
      .filter(r => !r.match(/^\|[\s\-|]+\|$/))
      .map(r => r.split('|').slice(1, -1).map(c => c.trim()));

    if (parsed.length === 0) {
      tableBuffer = [];
      return;
    }

    const headerRow = new TableRow({
      tableHeader: true,
      children: parsed[0].map(cellText => new TableCell({
        shading: { fill: '1E5BAA', type: ShadingType.SOLID, color: 'auto' },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: cellText, bold: true, color: 'FFFFFF', size: 22 })]
        })]
      }))
    });

    const dataRows = parsed.slice(1).map((row, idx) => new TableRow({
      children: row.map(cellText => new TableCell({
        shading: idx % 2 === 0 ? { fill: 'F8FAFC', type: ShadingType.SOLID, color: 'auto' } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: cellText.replace(/\*\*/g, ''), size: 22 })]
        })]
      }))
    }));

    children.push(new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: '1E5BAA' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '1E5BAA' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '1E5BAA' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '1E5BAA' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }
      }
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    tableBuffer = [];
  }

  for (const line of lines) {
    // Acumula tabela
    if (line.startsWith('|') && line.endsWith('|')) {
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.substring(2), size: 40, bold: true, color: '1E5BAA' })],
        spacing: { before: 400, after: 200 }
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.substring(3), size: 32, bold: true, color: '1E5BAA' })],
        spacing: { before: 300, after: 150 }
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.substring(4), size: 26, bold: true, color: '333333' })],
        spacing: { before: 250, after: 120 }
      }));
    } else if (line.trim() === '---') {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: '━'.repeat(40), color: 'CCCCCC' })]
      }));
    } else if (line.startsWith('> ')) {
      children.push(new Paragraph({
        indent: { left: 720 },
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: line.substring(2), italics: true, color: '555555', size: 22 })]
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const runs = parseInlineMarkdown(line.substring(2));
      children.push(new Paragraph({
        children: runs,
        bullet: { level: 0 },
        spacing: { after: 80 }
      }));
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      const runs = parseInlineMarkdown(match[2]);
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${match[1]}. `, bold: true, color: '1E5BAA' }),
          ...runs
        ],
        spacing: { after: 80 },
        indent: { left: 360 }
      }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    } else {
      const runs = parseInlineMarkdown(line);
      children.push(new Paragraph({
        children: runs,
        spacing: { after: 140 },
        alignment: AlignmentType.JUSTIFIED
      }));
    }
  }

  if (tableBuffer.length > 0) flushTable();

  const doc = new Document({
    creator: 'Master IA',
    title: title,
    description: 'Documento gerado por Master IA',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

function parseInlineMarkdown(text) {
  const runs = [];
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
        color: 'C7254E'
      }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ====== EXCEL PROFISSIONAL ======
export async function generateXLSX({ title, content }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master IA';
  workbook.created = new Date();

  // Tenta detectar tabela markdown no conteúdo
  const tableMatch = content.match(/(\|.*\|[\s\S]*?\n)+/);

  if (tableMatch) {
    const sheet = workbook.addWorksheet(title.substring(0, 30));
    const tableLines = content.split('\n').filter(l => l.startsWith('|') && l.endsWith('|'));
    const parsed = tableLines
      .filter(r => !r.match(/^\|[\s\-|]+\|$/))
      .map(r => r.split('|').slice(1, -1).map(c => c.trim()));

    if (parsed.length > 0) {
      // Título
      sheet.mergeCells('A1:' + String.fromCharCode(64 + parsed[0].length) + '1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = title;
      titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      sheet.getRow(1).height = 35;

      // Data
      sheet.mergeCells('A2:' + String.fromCharCode(64 + parsed[0].length) + '2');
      const dateCell = sheet.getCell('A2');
      dateCell.value = `Gerado em ${new Date().toLocaleString('pt-BR')}`;
      dateCell.font = { size: 9, italic: true, color: { argb: 'FF888888' } };
      dateCell.alignment = { horizontal: 'center' };

      // Cabeçalhos (linha 4)
      const headerRow = sheet.getRow(4);
      parsed[0].forEach((header, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = header;
        cell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5BAA' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF1E5BAA' } },
          bottom: { style: 'medium', color: { argb: 'FF1E5BAA' } },
          left: { style: 'thin', color: { argb: 'FF1E5BAA' } },
          right: { style: 'thin', color: { argb: 'FF1E5BAA' } }
        };
      });
      headerRow.height = 30;

      // Dados
      parsed.slice(1).forEach((row, rowIdx) => {
        const dataRow = sheet.getRow(5 + rowIdx);
        const bgColor = rowIdx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';

        row.forEach((value, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = value.replace(/\*\*/g, '');
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
        dataRow.height = 24;
      });

      // Auto-ajustar largura
      parsed[0].forEach((header, i) => {
        const col = sheet.getColumn(i + 1);
        const maxLength = Math.max(
          header.length,
          ...parsed.slice(1).map(row => String(row[i] || '').length)
        );
        col.width = Math.min(Math.max(maxLength + 4, 15), 50);
      });

      // Filtro automático
      sheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + parsed.length - 1, column: parsed[0].length }
      };

      // Congelar cabeçalho
      sheet.views = [{ state: 'frozen', ySplit: 4 }];

      return await workbook.xlsx.writeBuffer();
    }
  }

  // Fallback: planilha simples
  return await generateSimpleXLSX(workbook, title, content);
}

async function generateSimpleXLSX(workbook, title, content) {
  const sheet = workbook.addWorksheet(title.substring(0, 30));

  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  const lines = content.split('\n');
  let row = 3;

  for (const line of lines) {
    if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
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
export function parseGenerationMarkers(text) {
  const markers = [];

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
