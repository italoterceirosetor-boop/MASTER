// Gera PDF, Word e Excel profissionais com TEMAS customizáveis
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType
} from 'docx';

// ====== TEMAS PRÉ-DEFINIDOS ======
const THEMES = {
  executivo: {
    name: 'Executivo',
    primaryColor: '#1E3A8A',      // azul escuro
    accentColor: '#3B82F6',
    headerBg: '#1E3A8A',
    titleSize: 16,
    h1Size: 18,
    h2Size: 14,
    bodySize: 11,
    showCover: true,
    showHeader: true,
    showFooter: true,
    font: 'Helvetica'
  },
  clean: {
    name: 'Clean',
    primaryColor: '#111827',       // preto suave
    accentColor: '#6B7280',
    headerBg: '#F3F4F6',
    titleSize: 20,
    h1Size: 16,
    h2Size: 13,
    bodySize: 11,
    showCover: true,
    showHeader: false,
    showFooter: true,
    font: 'Helvetica'
  },
  colorido: {
    name: 'Colorido',
    primaryColor: '#7C3AED',       // roxo
    accentColor: '#EC4899',
    headerBg: '#7C3AED',
    titleSize: 18,
    h1Size: 16,
    h2Size: 13,
    bodySize: 11,
    showCover: true,
    showHeader: true,
    showFooter: true,
    font: 'Helvetica'
  },
  minimalista: {
    name: 'Minimalista',
    primaryColor: '#000000',
    accentColor: '#666666',
    headerBg: '#FFFFFF',
    titleSize: 14,
    h1Size: 13,
    h2Size: 12,
    bodySize: 10,
    showCover: false,
    showHeader: false,
    showFooter: false,
    font: 'Helvetica'
  },
  formal: {
    name: 'Formal',
    primaryColor: '#0F172A',       // navy
    accentColor: '#475569',
    headerBg: '#0F172A',
    titleSize: 18,
    h1Size: 16,
    h2Size: 13,
    bodySize: 11,
    showCover: true,
    showHeader: true,
    showFooter: true,
    font: 'Times-Roman'
  }
};

// Detecta tema pedido pelo usuário
export function detectTheme(message) {
  const lower = message.toLowerCase();
  if (/executiv|profissional|corporativ/.test(lower)) return 'executivo';
  if (/clean|limpo|simples|m[íi]nimo/.test(lower)) return 'clean';
  if (/color|roxo|rosa|colorido|vibrante/.test(lower)) return 'colorido';
  if (/minimal|s[óo] texto|sem cabe[çc]alho/.test(lower)) return 'minimalista';
  if (/formal|serif|times|cl[áa]ssico|tradicional/.test(lower)) return 'formal';
  return 'executivo'; // padrão
}

// Detecta opções extras
export function detectOptions(message) {
  const lower = message.toLowerCase();
  return {
    semCapa: /sem capa|sem t[íi]tulo/.test(lower),
    semCabecalho: /sem cabe[çc]alho|sem header/.test(lower),
    semRodape: /sem rodape|sem footer/.test(lower),
    umaPagina: /uma p[áa]gina|s[óo] uma|single page/.test(lower),
    semTabela: /sem tabela|sem tabelas/.test(lower),
    semImagem: /sem imagem|sem gr[áa]fico/.test(lower),
    corPersonalizada: lower.match(/cor\s*([#a-f0-9]{3,6})/i)?.[1],
    fonteMenor: /fonte\s*(pequena|menor|10|9)/.test(lower),
    fonteMaior: /fonte\s*(grande|maior|14|16)/.test(lower)
  };
}

// ====== PDF PROFISSIONAL COM TEMAS ======
export async function generatePDF({ title, content, theme = 'executivo', options = {} }) {
  const t = { ...THEMES[theme] || THEMES.executivo };

  // Aplica overrides
  if (options.corPersonalizada) {
    t.primaryColor = options.corPersonalizada.startsWith('#') ? options.corPersonalizada : '#' + options.corPersonalizada;
    t.headerBg = t.primaryColor;
  }
  if (options.fonteMenor) t.bodySize = Math.max(9, t.bodySize - 2);
  if (options.fonteMaior) t.bodySize = Math.min(14, t.bodySize + 2);
  if (options.semCapa) t.showCover = false;
  if (options.semCabecalho) t.showHeader = false;
  if (options.semRodape) t.showFooter = false;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 70, bottom: 70, left: 70, right: 70 },
        bufferPages: true,
        info: {
          Title: title,
          Author: 'Master IA',
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

      function addHeader() {
        if (!t.showHeader) return;
        doc.save();
        doc.fillColor(t.primaryColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Master IA', marginLeft, 30);

        doc.fontSize(8)
           .fillColor('#888')
           .font('Helvetica')
           .text('Master Contabilidade & Consultoria', marginLeft, 45);

        doc.strokeColor(t.primaryColor)
           .lineWidth(1)
           .moveTo(marginLeft, 60)
           .lineTo(pageWidth - marginRight, 60)
           .stroke();
        doc.restore();
      }

      function addFooter(pageNum, totalPages) {
        if (!t.showFooter) return;
        const footerY = pageHeight - 40;
        doc.save();
        doc.fontSize(8).fillColor('#888').font('Helvetica');
        doc.text('Master IA — Documento gerado automaticamente', marginLeft, footerY);
        doc.text(`Página ${pageNum} de ${totalPages}`, marginLeft, footerY, {
          width: contentWidth, align: 'right'
        });
        doc.restore();
      }

      // CAPA
      if (t.showCover) {
        doc.fillColor(t.primaryColor).fontSize(40).font('Helvetica-Bold')
           .text('Master IA', marginLeft, 200);
        doc.fontSize(14).fillColor('#666').font('Helvetica')
           .text('Master Contabilidade & Consultoria', marginLeft, 250);

        doc.strokeColor(t.primaryColor).lineWidth(3)
           .moveTo(marginLeft, 290).lineTo(pageWidth - marginRight, 290).stroke();

        doc.fillColor('#000').fontSize(28).font('Helvetica-Bold')
           .text(title, marginLeft, 360, { width: contentWidth, align: 'center' });

        doc.fontSize(11).fillColor('#666').font('Helvetica-Oblique')
           .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, marginLeft, 470, {
             width: contentWidth, align: 'center'
           });

        doc.addPage();
        addHeader();
      }

      let cursorY = t.showCover ? 80 : 50;

      function ensureSpace(neededHeight) {
        if (cursorY + neededHeight > pageHeight - marginBottom) {
          doc.addPage();
          addHeader();
          cursorY = 80;
        }
      }

      // Renderiza texto linha por linha com posicionamento correto
      function renderTextLine(line, fontSize, fontName, color, indent = 0) {
        ensureSpace(fontSize + 8);
        doc.fontSize(fontSize).font(fontName).fillColor(color);
        doc.text(line, marginLeft + indent, cursorY, {
          width: contentWidth - indent,
          align: 'left',
          lineGap: 3
        });
        cursorY = doc.y + 6;
      }

      function drawTable(rows) {
        if (rows.length === 0) return;
        if (options.semTabela) return;

        const parsed = rows
          .filter(r => !r.includes('---'))
          .map(r => r.split('|').slice(1, -1).map(c => c.trim()));

        if (parsed.length === 0) return;

        const colCount = parsed[0].length;
        const colWidth = contentWidth / colCount;
        const rowHeight = 24;
        const cellPadding = 6;

        const header = parsed[0];

        ensureSpace(rowHeight);

        doc.save();
        doc.rect(marginLeft, cursorY, contentWidth, rowHeight).fillColor(t.headerBg).fill();
        doc.restore();

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        header.forEach((cellText, i) => {
          const x = marginLeft + (i * colWidth) + cellPadding;
          doc.text(cellText || '', x, cursorY + 6, {
            width: colWidth - (cellPadding * 2),
            align: 'center', ellipsis: true, height: rowHeight - 6
          });
        });
        cursorY += rowHeight;

        doc.fillColor('#000').font('Helvetica').fontSize(9);

        for (let r = 1; r < parsed.length; r++) {
          ensureSpace(rowHeight);

          if (r % 2 === 0) {
            doc.save();
            doc.rect(marginLeft, cursorY, contentWidth, rowHeight).fillColor('#F8FAFC').fill();
            doc.restore();
          }

          doc.strokeColor('#E2E8F0').lineWidth(0.5)
             .moveTo(marginLeft, cursorY + rowHeight)
             .lineTo(marginLeft + contentWidth, cursorY + rowHeight).stroke();

          parsed[r].forEach((cellText, i) => {
            const x = marginLeft + (i * colWidth) + cellPadding;
            const cleanText = (cellText || '').replace(/\*\*/g, '');
            doc.fillColor('#000').text(cleanText, x, cursorY + 6, {
              width: colWidth - (cellPadding * 2),
              align: i === 0 ? 'left' : 'center', ellipsis: true, height: rowHeight - 6
            });
          });
          cursorY += rowHeight;
        }

        cursorY += 15;
      }

      // Processa conteúdo
      const lines = content.split('\n');
      let inCodeBlock = false, codeBuffer = [];
      let tableBuffer = [], inTable = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true; codeBuffer = []; continue;
          } else {
            const codeHeight = codeBuffer.length * 12 + 20;
            ensureSpace(codeHeight);
            doc.save();
            doc.rect(marginLeft, cursorY, contentWidth, codeHeight).fillColor('#0d1117').fill();
            doc.restore();
            doc.fontSize(9).fillColor('#E6EDF3').font('Courier')
               .text(codeBuffer.join('\n'), marginLeft + 10, cursorY + 8, { width: contentWidth - 20 });
            doc.font(t.font).fillColor('#000').fontSize(t.bodySize);
            cursorY += codeHeight + 10;
            inCodeBlock = false; codeBuffer = []; continue;
          }
        }
        if (inCodeBlock) { codeBuffer.push(line); continue; }

        if (line.startsWith('|') && line.endsWith('|')) {
          tableBuffer.push(line); inTable = true; continue;
        } else if (inTable && tableBuffer.length > 0) {
          drawTable(tableBuffer);
          tableBuffer = []; inTable = false;
        }

        if (line.startsWith('# ')) {
          ensureSpace(40); cursorY += 10;
          renderTextLine(line.substring(2), t.h1Size + 4, 'Helvetica-Bold', t.primaryColor);
        }
        else if (line.startsWith('## ')) {
          ensureSpace(32); cursorY += 8;
          renderTextLine(line.substring(3), t.h2Size + 2, 'Helvetica-Bold', t.primaryColor);
        }
        else if (line.startsWith('### ')) {
          ensureSpace(26); cursorY += 6;
          renderTextLine(line.substring(4), t.h2Size, 'Helvetica-Bold', '#333');
        }
        else if (trimmed === '---') {
          ensureSpace(15); cursorY += 5;
          doc.strokeColor('#CCCCCC').lineWidth(0.5)
             .moveTo(marginLeft, cursorY).lineTo(marginLeft + contentWidth, cursorY).stroke();
          cursorY += 10;
        }
        else if (line.startsWith('> ')) {
          renderTextLine(line.substring(2).replace(/\*\*/g, ''), t.bodySize, 'Helvetica-Oblique', '#555', 20);
        }
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          ensureSpace(t.bodySize + 6);
          doc.fontSize(t.bodySize).font('Helvetica').fillColor(t.accentColor);
          doc.text('•', marginLeft + 5, cursorY);
          renderTextLine(line.substring(2).replace(/\*\*/g, ''), t.bodySize, 'Helvetica', '#000', 15);
        }
        else if (/^\d+\.\s/.test(line)) {
          ensureSpace(t.bodySize + 6);
          const match = line.match(/^(\d+)\.\s(.*)$/);
          doc.fontSize(t.bodySize).font('Helvetica-Bold').fillColor(t.primaryColor);
          doc.text(`${match[1]}.`, marginLeft + 5, cursorY);
          renderTextLine(match[2].replace(/\*\*/g, ''), t.bodySize, 'Helvetica', '#000', 20);
        }
        else if (trimmed === '') {
          cursorY += 8;
        }
        else {
          ensureSpace(t.bodySize + 10);
          // Processa negrito inline - divide em segmentos
          const segments = line.split(/(\*\*[^*]+\*\*)/g);
          const processedLine = segments.map(s => s.replace(/\*\*/g, '')).join('');
          renderTextLine(processedLine, t.bodySize, 'Helvetica', '#000');
        }
      }

      if (inTable && tableBuffer.length > 0) drawTable(tableBuffer);

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

// ====== WORD PROFISSIONAL COM TEMAS ======
export async function generateDOCX({ title, content, theme = 'executivo', options = {} }) {
  const t = { ...THEMES[theme] || THEMES.executivo };
  const primaryRGB = hexToDocxColor(t.primaryColor);
  const accentRGB = hexToDocxColor(t.accentColor);

  const lines = content.split('\n');
  const children = [];

  if (t.showCover) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 1500, after: 100 },
        children: [new TextRun({ text: 'Master IA', size: 56, bold: true, color: primaryRGB })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: 'Master Contabilidade & Consultoria', size: 24, italics: true, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 800 },
        children: [new TextRun({ text: '━'.repeat(30), color: primaryRGB })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 800, after: 100 },
        children: [new TextRun({ text: title, size: 48, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 800 },
        children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString('pt-BR')}`, size: 22, italics: true, color: '888888' })]
      }),
      new Paragraph({ text: '', pageBreakBefore: true })
    );
  }

  let tableBuffer = [];

  function flushTable() {
    if (tableBuffer.length === 0 || options.semTabela) return;
    const parsed = tableBuffer.filter(r => !r.match(/^\|[\s\-|]+\|$/))
      .map(r => r.split('|').slice(1, -1).map(c => c.trim()));
    if (parsed.length === 0) { tableBuffer = []; return; }

    const headerRow = new TableRow({
      tableHeader: true,
      children: parsed[0].map(cellText => new TableCell({
        shading: { fill: t.primaryColor.replace('#', ''), type: ShadingType.SOLID, color: 'auto' },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: cellText, bold: true, color: 'FFFFFF', size: 22 })]
        })]
      }))
    });

    const dataRows = parsed.slice(1).map((row, idx) => new TableRow({
      children: row.map(cellText => new TableCell({
        shading: idx % 2 === 0 ? { fill: 'F8FAFC', type: ShadingType.SOLID, color: 'auto' } : undefined,
        children: [new Paragraph({ children: [new TextRun({ text: cellText.replace(/\*\*/g, ''), size: 22 })] })]
      }))
    }));

    children.push(new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: t.primaryColor.replace('#', '') },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: t.primaryColor.replace('#', '') },
        left: { style: BorderStyle.SINGLE, size: 4, color: t.primaryColor.replace('#', '') },
        right: { style: BorderStyle.SINGLE, size: 4, color: t.primaryColor.replace('#', '') },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }
      }
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    tableBuffer = [];
  }

  for (const line of lines) {
    if (line.startsWith('|') && line.endsWith('|')) {
      tableBuffer.push(line); continue;
    } else if (tableBuffer.length > 0) flushTable();

    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.substring(2), size: 40, bold: true, color: primaryRGB })],
        spacing: { before: 400, after: 200 }
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.substring(3), size: 32, bold: true, color: primaryRGB })],
        spacing: { before: 300, after: 150 }
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.substring(4), size: 26, bold: true, color: '333333' })],
        spacing: { before: 250, after: 120 }
      }));
    } else if (line.trim() === '---') {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: '━'.repeat(40), color: 'CCCCCC' })]
      }));
    } else if (line.startsWith('> ')) {
      children.push(new Paragraph({
        indent: { left: 720 }, spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: line.substring(2), italics: true, color: '555555', size: 22 })]
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({
        children: parseInlineMarkdown(line.substring(2)),
        bullet: { level: 0 }, spacing: { after: 80 }
      }));
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${match[1]}. `, bold: true, color: primaryRGB }),
          ...parseInlineMarkdown(match[2])
        ],
        spacing: { after: 80 }, indent: { left: 360 }
      }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    } else {
      children.push(new Paragraph({
        children: parseInlineMarkdown(line),
        spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED
      }));
    }
  }
  if (tableBuffer.length > 0) flushTable();

  const doc = new Document({
    creator: 'Master IA', title,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

// Helper: converte hex pra cor Word
function hexToDocxColor(hex) {
  return hex.replace('#', '').toUpperCase();
}

// ====== EXCEL ======
export async function generateXLSX({ title, content }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master IA';

  const tableMatch = content.match(/(\|.*\|[\s\S]*?\n)+/);

  if (tableMatch) {
    const sheet = workbook.addWorksheet(title.substring(0, 30));
    const tableLines = content.split('\n').filter(l => l.startsWith('|') && l.endsWith('|'));
    const parsed = tableLines.filter(r => !r.match(/^\|[\s\-|]+\|$/))
      .map(r => r.split('|').slice(1, -1).map(c => c.trim()));

    if (parsed.length > 0) {
      sheet.mergeCells('A1:' + String.fromCharCode(64 + parsed[0].length) + '1');
      const tc = sheet.getCell('A1');
      tc.value = title;
      tc.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
      tc.alignment = { horizontal: 'center', vertical: 'middle' };
      tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      sheet.getRow(1).height = 35;

      const headerRow = sheet.getRow(4);
      parsed[0].forEach((h, i) => {
        const c = headerRow.getCell(i + 1);
        c.value = h;
        c.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5BAA' } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      headerRow.height = 30;

      parsed.slice(1).forEach((row, ri) => {
        const dr = sheet.getRow(5 + ri);
        row.forEach((v, ci) => {
          const c = dr.getCell(ci + 1);
          c.value = v.replace(/\*\*/g, '');
          c.font = { size: 11 };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
          c.alignment = { horizontal: ci === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true };
          c.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
        dr.height = 24;
      });

      parsed[0].forEach((h, i) => {
        const col = sheet.getColumn(i + 1);
        col.width = Math.min(Math.max(h.length + 4, 15), 50);
      });

      sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + parsed.length - 1, column: parsed[0].length } };
      sheet.views = [{ state: 'frozen', ySplit: 4 }];

      return await workbook.xlsx.writeBuffer();
    }
  }

  return await generateSimpleXLSX(workbook, title, content);
}

async function generateSimpleXLSX(workbook, title, content) {
  const sheet = workbook.addWorksheet(title.substring(0, 30));
  sheet.mergeCells('A1:D1');
  const tc = sheet.getCell('A1');
  tc.value = title;
  tc.font = { size: 16, bold: true, color: { argb: 'FF1E5BAA' } };
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  let row = 3;
  for (const line of content.split('\n')) {
    if (line.startsWith('#')) {
      sheet.mergeCells(`A${row}:D${row}`);
      sheet.getCell(`A${row}`).value = line.replace(/^#+\s/, '');
      sheet.getCell(`A${row}`).font = { size: 14, bold: true, color: { argb: 'FF1E5BAA' } };
      sheet.getRow(row).height = 24;
    } else if (line.trim() !== '') {
      sheet.mergeCells(`A${row}:D${row}`);
      sheet.getCell(`A${row}`).value = line.replace(/\*\*/g, '');
    }
    row++;
  }

  sheet.getColumn(1).width = 40;
  return await workbook.xlsx.writeBuffer();
}

// ====== TXT ======
export function generateTXT({ title, content }) {
  return Buffer.from(`${title}\n${'='.repeat(title.length)}\nGerado em ${new Date().toLocaleString('pt-BR')}\n\n${content}`, 'utf-8');
}

export function parseGenerationMarkers(text) {
  const markers = [];

  // Padrão 1: marcador completo [GERAR_PDF:nome]conteúdo[FIM_PDF]
  const completeRegex = /\[GERAR_(PDF|DOCX|XLSX|TXT):([^\]]+)\]([\s\S]*?)\[FIM_(PDF|DOCX|XLSX|TXT)\]/g;

  let cleanText = text;
  let match;
  while ((match = completeRegex.exec(text)) !== null) {
    markers.push({
      type: match[1].toLowerCase(),
      filename: match[2].trim(),
      content: match[3].trim()
    });
    cleanText = cleanText.replace(match[0], '');
  }

  // Padrão 2: marcador sem fechar [GERAR_PDF:nome]conteúdo (pega até o fim ou próximo marcador)
  const openRegex = /\[GERAR_(PDF|DOCX|XLSX|TXT):([^\]]+)\]([\s\S]*?)(?=\[GERAR_|$)/g;
  while ((match = openRegex.exec(text)) !== null) {
    // Só adiciona se não foi capturado pelo padrão completo
    const alreadyCaptured = markers.some(m => m.filename === match[2].trim());
    if (!alreadyCaptured && match[3].trim().length > 50) {
      markers.push({
        type: match[1].toLowerCase(),
        filename: match[2].trim(),
        content: match[3].trim()
      });
      cleanText = cleanText.replace(match[0], '');
    }
  }

  // Remove marcadores órfãos que sobraram
  cleanText = cleanText.replace(/\[GERAR_(PDF|DOCX|XLSX|TXT):[^\]]+\]/g, '');
  cleanText = cleanText.replace(/\[FIM_(PDF|DOCX|XLSX|TXT)\]/g, '');

  return { cleanText: cleanText.trim(), markers };
}
