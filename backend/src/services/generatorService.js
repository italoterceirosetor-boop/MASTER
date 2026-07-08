// ====== PDF VIA HTML PURO (SEM PUPPETEER, SEM PDFKIT) ======
// Gera um HTML que pode ser aberto no navegador e o usuário salva como PDF
// OU usa o html-pdf se disponível
import ExcelJS from 'exceljs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType
} from 'docx';
import PDFDocument from 'pdfkit';

// ====== TEMAS ======
const THEMES = {
  executivo: {
    name: 'Executivo',
    primary: '#1E3A8A',
    accent: '#3B82F6',
    bg: '#FFFFFF'
  },
  clean: {
    name: 'Clean',
    primary: '#111827',
    accent: '#6B7280',
    bg: '#FFFFFF'
  },
  colorido: {
    name: 'Colorido',
    primary: '#7C3AED',
    accent: '#EC4899',
    bg: '#FFFFFF'
  },
  minimalista: {
    name: 'Minimalista',
    primary: '#000000',
    accent: '#666666',
    bg: '#FFFFFF'
  },
  formal: {
    name: 'Formal',
    primary: '#0F172A',
    accent: '#475569',
    bg: '#FFFFFF'
  },
  vermelho: {
    name: 'Vermelho',
    primary: '#DC2626',
    accent: '#EF4444',
    bg: '#FFFFFF'
  },
  verde: {
    name: 'Verde',
    primary: '#059669',
    accent: '#10B981',
    bg: '#FFFFFF'
  },
  azul: {
    name: 'Azul',
    primary: '#2563EB',
    accent: '#3B82F6',
    bg: '#FFFFFF'
  },
  preto: {
    name: 'Preto',
    primary: '#000000',
    accent: '#404040',
    bg: '#FFFFFF'
  }
};

export function detectTheme(message) {
  const lower = message.toLowerCase();

  // Cores específicas têm prioridade
  if (/vermelho|vermelha|cor\s*vermelha/.test(lower)) return 'vermelho';
  if (/verde|cor\s*verde/.test(lower)) return 'verde';
  if (/azul|cor\s*azul/.test(lower)) return 'azul';
  if (/roxo|roxa|cor\s*roxa|lil[áa]s/.test(lower)) return 'colorido';
  if (/preto|preta|cor\s*preta/.test(lower)) return 'preto';

  // Temas
  if (/executiv|profissional|corporativ/.test(lower)) return 'executivo';
  if (/clean|limpo|simples/.test(lower)) return 'clean';
  if (/color|vibrante/.test(lower)) return 'colorido';
  if (/minimal|s[óo]\s*texto/.test(lower)) return 'minimalista';
  if (/formal|serif|times|cl[áa]ssico|tradicional/.test(lower)) return 'formal';

  return 'executivo';
}

export function detectOptions(message) {
  const lower = message.toLowerCase();
  return {
    semCapa: /\bsem\s*capa\b|tirar?\s*capa|tira\s*a\s*capa|remover?\s*capa/.test(lower),
    semCabecalho: /\bsem\s*cabe[çc]alho\b|tirar?\s*cabe[çc]alho|tira\s*o\s*cabe[çc]alho|remover?\s*cabe[çc]alho|sem\s*header|sem\s*topo/.test(lower),
    semRodape: /\bsem\s*rodape\b|tirar?\s*rodape|remover?\s*rodape|sem\s*footer/.test(lower),
    semTabela: /\bsem\s*tabela|tirar?\s*tabela|sem\s*tabelas/.test(lower),
    semImagem: /\bsem\s*imagem|tirar?\s*imagem|sem\s*gr[áa]fico/.test(lower),
    corPersonalizada: lower.match(/cor\s*([#a-f0-9]{3,6})/i)?.[1],
    fonteMenor: /\bfonte\s*(pequena|menor|10|9)|texto\s*menor/.test(lower),
    fonteMaior: /\bfonte\s*(grande|maior|14|16)|texto\s*maior/.test(lower),
    // Modificadores adicionais
    umaPagina: /\buma\s*p[áa]gina\b|\buma\s*folha\b|\bs[óo]\s*uma\b|conciso|resumido|breve|short/.test(lower),
    detalhado: /\bdetalhado|completo|expandido|aprofundado|longo|completo/.test(lower),
    // Cores específicas
    corVermelha: /\bvermelho|vermelha|cor\s*vermelha/.test(lower),
    corVerde: /\bverde|cor\s*verde/.test(lower),
    corAzul: /\bazul|cor\s*azul/.test(lower),
    corRoxa: /\broxo|roxa|cor\s*roxa/.test(lower),
    corPreta: /\bpreto|preta|cor\s*preta/.test(lower)
  };
}

// ====== MARKDOWN → HTML ======
function markdownToHtml(content, theme) {
  const lines = content.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bloco de código
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true; codeBuffer = []; continue;
      } else {
        html += `<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>\n`;
        inCodeBlock = false; codeBuffer = [];
        continue;
      }
    }
    if (inCodeBlock) { codeBuffer.push(line); continue; }

    // Tabela markdown
    if (line.startsWith('|') && line.endsWith('|')) {
      tableRows.push(line);
      inTable = true;
      continue;
    } else if (inTable && tableRows.length > 0) {
      html += renderTableHtml(tableRows, theme) + '\n';
      tableRows = [];
      inTable = false;
    }

    // Títulos
    if (line.startsWith('# ')) {
      html += `<h1>${processInline(line.substring(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${processInline(line.substring(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${processInline(line.substring(4))}</h3>\n`;
    } else if (line.startsWith('#### ')) {
      html += `<h4>${processInline(line.substring(5))}</h4>\n`;
    }
    // Separador
    else if (trimmed === '---') {
      html += `<hr/>\n`;
    }
    // Citação
    else if (line.startsWith('> ')) {
      html += `<blockquote>${processInline(line.substring(2))}</blockquote>\n`;
    }
    // Lista com bullet
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<ul><li>${processInline(line.substring(2))}</li></ul>\n`;
    }
    // Lista numerada
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      html += `<ol><li>${processInline(match[2])}</li></ol>\n`;
    }
    // Linha vazia
    else if (trimmed === '') {
      html += '\n';
    }
    // Texto normal
    else {
      html += `<p>${processInline(line)}</p>\n`;
    }
  }

  if (inTable && tableRows.length > 0) {
    html += renderTableHtml(tableRows, theme) + '\n';
  }

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function processInline(text) {
  // Processa **negrito**, *itálico*, `código`
  let result = escapeHtml(text);
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  return result;
}

function renderTableHtml(rows, theme) {
  const parsed = rows
    .filter(r => !r.includes('---'))
    .map(r => r.split('|').slice(1, -1).map(c => c.trim()));

  if (parsed.length === 0) return '';

  let html = '<table>\n';
  // Cabeçalho
  html += '<thead><tr>';
  parsed[0].forEach(cell => {
    html += `<th>${processInline(cell)}</th>`;
  });
  html += '</tr></thead>\n';

  // Dados
  html += '<tbody>\n';
  for (let i = 1; i < parsed.length; i++) {
    html += '<tr>';
    parsed[i].forEach(cell => {
      html += `<td>${processInline(cell)}</td>`;
    });
    html += '</tr>\n';
  }
  html += '</tbody>\n</table>\n';
  return html;
}

// ====== GERA HTML COMPLETO PRA PDF ======
function buildHtml(title, content, theme = 'executivo', options = {}) {
  const t = { ...THEMES[theme] || THEMES.executivo };

  let primary = t.primary;
  let accent = t.accent;
  let showCover = true;
  let showHeader = true;
  let showFooter = true;
  let bodySize = '14px';
  let titleSize = '28px';

  if (options.corPersonalizada) {
    primary = options.corPersonalizada.startsWith('#') ? options.corPersonalizada : '#' + options.corPersonalizada;
    accent = primary;
  }
  if (options.fonteMenor) bodySize = '11px';
  if (options.fonteMaior) bodySize = '16px';
  if (options.semCapa) showCover = false;
  if (options.semCabecalho) showHeader = false;
  if (options.semRodape) showFooter = false;

  const htmlContent = markdownToHtml(content, t);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page {
    size: A4;
    margin: ${showCover || showHeader ? '20mm 15mm' : '15mm'};
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: ${bodySize};
    line-height: 1.6;
    color: #1f2937;
    background: white;
  }

  ${showHeader ? `
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 10px 0;
    border-bottom: 2px solid ${primary};
    font-size: 11px;
    background: white;
  }
  .header .logo {
    color: ${primary};
    font-weight: 700;
    font-size: 13px;
  }
  .header .subtitle {
    color: #6b7280;
    font-size: 10px;
  }
  ` : ''}

  ${showCover ? `
  .cover {
    page-break-after: always;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 40px;
  }
  .cover .logo-big {
    color: ${primary};
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .cover .logo-sub {
    color: #6b7280;
    font-size: 16px;
    margin-bottom: 40px;
  }
  .cover .divider {
    width: 200px;
    height: 3px;
    background: ${primary};
    margin: 20px auto;
  }
  .cover .doc-title {
    font-size: ${titleSize};
    font-weight: 700;
    color: #111827;
    margin: 30px 0;
  }
  .cover .date {
    color: #6b7280;
    font-size: 12px;
    font-style: italic;
  }
  ` : ''}

  ${showFooter ? `
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 0;
    border-top: 1px solid #e5e7eb;
    font-size: 10px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
  }
  ` : ''}

  .content {
    ${showCover || showHeader ? 'padding-top: 30px;' : ''}
    ${showFooter ? 'padding-bottom: 30px;' : ''}
  }

  /* Tipografia */
  h1 {
    color: ${primary};
    font-size: 24px;
    font-weight: 700;
    margin: 30px 0 15px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid ${primary};
  }

  h2 {
    color: ${primary};
    font-size: 20px;
    font-weight: 700;
    margin: 25px 0 12px 0;
  }

  h3 {
    color: #374151;
    font-size: 16px;
    font-weight: 700;
    margin: 20px 0 10px 0;
  }

  h4 {
    color: #4b5563;
    font-size: 14px;
    font-weight: 600;
    margin: 15px 0 8px 0;
  }

  p {
    margin: 8px 0;
    text-align: justify;
  }

  /* Listas */
  ul, ol {
    margin: 8px 0 8px 20px;
  }

  li {
    margin: 4px 0;
  }

  /* Negrito e itálico */
  strong { font-weight: 700; color: #111827; }
  em { font-style: italic; }

  /* Citação */
  blockquote {
    margin: 12px 0;
    padding: 10px 20px;
    border-left: 4px solid ${accent};
    background: #f9fafb;
    color: #4b5563;
    font-style: italic;
  }

  /* Separador */
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 20px 0;
  }

  /* Código */
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: #be185d;
  }

  pre {
    background: #1f2937;
    color: #e5e7eb;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
  }

  pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }

  /* Tabelas */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 0.9em;
    page-break-inside: avoid;
  }

  thead {
    background: ${primary};
    color: white;
  }

  th {
    padding: 10px 12px;
    text-align: center;
    font-weight: 600;
    border: 1px solid ${primary};
  }

  td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
  }

  tbody tr:nth-child(even) {
    background: #f9fafb;
  }

  tbody tr:hover {
    background: #f3f4f6;
  }
</style>
</head>
<body>

${showHeader ? `
<div class="header">
  <div class="logo">Master IA</div>
  <div class="subtitle">Master Contabilidade & Consultoria</div>
</div>
` : ''}

${showCover ? `
<div class="cover">
  <div class="logo-big">Master IA</div>
  <div class="logo-sub">Master Contabilidade & Consultoria</div>
  <div class="divider"></div>
  <div class="doc-title">${escapeHtml(title)}</div>
  <div class="date">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</div>
` : ''}

<div class="content">
  ${htmlContent}
</div>

${showFooter ? `
<div class="footer">
  <span>Master IA — Documento gerado automaticamente</span>
  <span class="page-number"></span>
</div>
` : ''}

</body>
</html>`;
}

// ====== PDF COM FALLBACK (tenta md-to-pdf, depois pdfkit) ======
export async function generatePDF({ title, content, theme = 'executivo', options = {} }) {
  // Tenta primeiro com md-to-pdf (qualidade alta)
  try {
    return await generatePDFWithMdToPdf({ title, content, theme, options });
  } catch (err) {
    console.log('[Master IA] md-to-pdf falhou, usando pdfkit:', err.message);
    // Fallback pro pdfkit que SEMPRE funciona
    return await generatePDFWithPdfKit({ title, content, theme, options });
  }
}

// ====== OPÇÃO 1: md-to-pdf (qualidade alta, precisa de Chromium) ======
async function generatePDFWithMdToPdf({ title, content, theme, options }) {
  const { mdToPdf } = await import('md-to-pdf');
  const t = { ...THEMES[theme] || THEMES.executivo };

  const showCover = !options.semCapa;
  const showHeader = !options.semCabecalho;
  const showFooter = !options.semRodape;
  const onePage = !!options.umaPagina;

  const css = generateCSS(t, { showCover, showHeader, showFooter, onePage });

  let fullContent = '';
  if (showCover) {
    fullContent += `# ${title}\n\n_Gerado em ${new Date().toLocaleString('pt-BR')} por Master IA_\n\n---\n\n`;
  }
  fullContent += content;

  const pdf = await mdToPdf(
    { content: fullContent },
    {
      css: css,
      pdf_options: {
        format: 'A4',
        margin: {
          top: showHeader ? '60px' : '30px',
          bottom: showFooter ? '50px' : '30px',
          left: '40px',
          right: '40px'
        },
        printBackground: true,
        displayHeaderFooter: showHeader || showFooter,
        headerTemplate: showHeader ? `<div style="font-size: 9px; color: ${t.primary}; width: 100%; padding: 0 40px; border-bottom: 2px solid ${t.primary}; padding-bottom: 5px;"><strong>Master IA</strong> <span style="color: #888;">— Master Contabilidade & Consultoria</span></div>` : '<div></div>',
        footerTemplate: showFooter ? `<div style="font-size: 8px; color: #888; width: 100%; padding: 0 40px; text-align: center;">Master IA — Documento gerado automaticamente — Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>` : '<div></div>'
        },
        stylesheet_encoding: 'utf-8',
        highlight_style: 'github-dark',
        body_class: 'master-ia-pdf'
      }
    }
  );

  return pdf.content;
}

// ====== OPÇÃO 2: pdfkit (sempre funciona) ======
async function generatePDFWithPdfKit({ title, content, theme = 'executivo', options = {} }) {
  const t = { ...THEMES[theme] || THEMES.executivo };
  const primaryHex = t.primary;
  const accentHex = t.accent;

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  };

  const primary = hexToRgb(primaryHex);
  const accent = hexToRgb(accentHex);
  const gray = { r: 100, g: 100, b: 100 };
  const lightGray = { r: 220, g: 220, b: 220 };

  const showCover = !options.semCapa;
  const showHeader = !options.semCabecalho;
  const showFooter = !options.semRodape;
  const margin = 50;
  const pageWidth = doc.page.width - (margin * 2);
  const pageHeight = doc.page.height - margin;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        bufferPages: true,
        info: { Title: title, Author: 'Master IA', Creator: 'Master IA' }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // CAPA
      if (showCover) {
        doc.fillColor(primary.r, primary.g, primary.b)
           .fontSize(32).font('Helvetica-Bold').text('Master IA', margin, 200);
        doc.fontSize(11).fillColor(gray.r, gray.g, gray.b).font('Helvetica')
           .text('Master Contabilidade & Consultoria', margin, 240);
        doc.strokeColor(primary.r, primary.g, primary.b).lineWidth(2)
           .moveTo(margin, 270).lineTo(545, 270).stroke();
        doc.fillColor(0, 0, 0).fontSize(22).font('Helvetica-Bold')
           .text(title, margin, 320, { width: pageWidth, align: 'center' });
        doc.fontSize(9).fillColor(gray.r, gray.g, gray.b).font('Helvetica-Oblique')
           .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, 420, { width: pageWidth, align: 'center' });
        doc.addPage();
      }

      // HEADER
      if (showHeader) {
        doc.fillColor(primary.r, primary.g, primary.b).fontSize(9).font('Helvetica-Bold')
           .text('Master IA', margin, 25);
        doc.fontSize(7).fillColor(gray.r, gray.g, gray.b).font('Helvetica')
           .text('Master Contabilidade & Consultoria', margin, 38);
        doc.strokeColor(primary.r, primary.g, primary.b).lineWidth(1)
           .moveTo(margin, 50).lineTo(doc.page.width - margin, 50).stroke();
      }

      let y = showHeader ? 70 : 40;

      function checkPage(needed) {
        if (y + needed > doc.page.height - margin - (showFooter ? 30 : 0)) {
          doc.addPage();
          if (showHeader) {
            doc.fillColor(primary.r, primary.g, primary.b).fontSize(9).font('Helvetica-Bold')
               .text('Master IA', margin, 25);
            doc.strokeColor(primary.r, primary.g, primary.b).lineWidth(1)
               .moveTo(margin, 50).lineTo(doc.page.width - margin, 50).stroke();
            y = 70;
          } else {
            y = 40;
          }
        }
      }

      function renderH1(text) {
        checkPage(35);
        doc.fontSize(18).font('Helvetica-Bold').fillColor(primary.r, primary.g, primary.b)
           .text(text, margin, y, { width: pageWidth });
        y = doc.y + 4;
        doc.strokeColor(primary.r, primary.g, primary.b).lineWidth(1.5)
           .moveTo(margin, y).lineTo(doc.page.width - margin, y).stroke();
        y += 8;
      }

      function renderH2(text) {
        checkPage(28);
        doc.fontSize(13).font('Helvetica-Bold').fillColor(primary.r, primary.g, primary.b)
           .text(text, margin, y, { width: pageWidth });
        y = doc.y + 6;
      }

      function renderH3(text) {
        checkPage(22);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(gray.r, gray.g, gray.b)
           .text(text, margin, y, { width: pageWidth });
        y = doc.y + 5;
      }

      function renderP(text) {
        checkPage(18);
        doc.fontSize(10).font('Helvetica').fillColor(0, 0, 0)
           .text(text, margin, y, { width: pageWidth, align: 'justify', lineGap: 2 });
        y = doc.y + 5;
      }

      function renderBullet(text) {
        checkPage(16);
        doc.fontSize(10).font('Helvetica').fillColor(0, 0, 0)
           .text(`•  ${text}`, margin + 5, y, { width: pageWidth - 5, align: 'left', lineGap: 2 });
        y = doc.y + 3;
      }

      function renderNumbered(num, text) {
        checkPage(16);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primary.r, primary.g, primary.b)
           .text(`${num}.`, margin + 5, y, { width: 15, continued: false });
        doc.font('Helvetica').fillColor(0, 0, 0)
           .text(text, margin + 25, y, { width: pageWidth - 25, align: 'left', lineGap: 2 });
        y = doc.y + 3;
      }

      function renderQuote(text) {
        checkPage(22);
        doc.fontSize(9).font('Helvetica-Oblique').fillColor(gray.r, gray.g, gray.b)
           .text(text, margin + 15, y, { width: pageWidth - 15 });
        y = doc.y + 6;
      }

      function renderSeparator() {
        checkPage(15);
        y += 4;
        doc.strokeColor(lightGray.r, lightGray.g, lightGray.b).lineWidth(0.5)
           .moveTo(margin + 50, y).lineTo(doc.page.width - margin - 50, y).stroke();
        y += 8;
      }

      function renderTable(rows) {
        if (rows.length < 2) return;
        const dataRows = rows.filter(r => !r.match(/^\|[\s\-|]+\|$/));
        if (dataRows.length === 0) return;

        const numCols = dataRows[0].split('|').length - 2;
        const colWidth = pageWidth / numCols;
        const rowHeight = 20;
        const padding = 6;
        const totalHeight = dataRows.length * rowHeight;

        checkPage(totalHeight + 8);
        const tableY = y;

        // Cabeçalho
        doc.save();
        doc.rect(margin, tableY, pageWidth, rowHeight).fillColor(primary.r, primary.g, primary.b).fill();
        doc.restore();

        doc.fontSize(9).font('Helvetica-Bold').fillColor(255, 255, 255);
        const headerCells = dataRows[0].split('|').slice(1, -1).map(c => c.trim());
        headerCells.forEach((cell, i) => {
          doc.text(cell || '', margin + (i * colWidth) + padding, tableY + 5, {
            width: colWidth - (padding * 2),
            align: 'center', ellipsis: true
          });
        });

        // Dados
        let rowY = tableY + rowHeight;
        for (let r = 1; r < dataRows.length; r++) {
          if (r % 2 === 0) {
            doc.save();
            doc.rect(margin, rowY, pageWidth, rowHeight).fillColor(248, 250, 252).fill();
            doc.restore();
          }

          doc.font('Helvetica').fontSize(8).fillColor(0, 0, 0);
          const cells = dataRows[r].split('|').slice(1, -1).map(c => c.trim());
          cells.forEach((cell, i) => {
            doc.text(cell || '', margin + (i * colWidth) + padding, rowY + 5, {
              width: colWidth - (padding * 2),
              align: i === 0 ? 'left' : 'center', ellipsis: true
            });
          });

          doc.save();
          doc.strokeColor(235, 238, 245).lineWidth(0.3)
             .moveTo(margin, rowY + rowHeight).lineTo(margin + pageWidth, rowY + rowHeight).stroke();
          doc.restore();

          rowY += rowHeight;
        }

        // Borda externa
        doc.save();
        doc.strokeColor(primary.r, primary.g, primary.b).lineWidth(1)
           .rect(margin, tableY, pageWidth, totalHeight).stroke();
        doc.restore();

        doc.font('Helvetica').fontSize(10).fillColor(0, 0, 0);
        y = rowY + 8;
      }

      function renderCode(text) {
        const lines = text.split('\n').length;
        const codeHeight = Math.max(lines * 12 + 12, 24);
        checkPage(codeHeight);

        doc.save();
        doc.rect(margin, y, pageWidth, codeHeight).fillColor(240, 240, 240).fill();
        doc.restore();

        doc.fontSize(8).font('Courier').fillColor(180, 30, 80)
           .text(text, margin + 8, y + 6, { width: pageWidth - 16 });

        doc.font('Helvetica').fillColor(0, 0, 0);
        y += codeHeight + 4;
      }

      // PROCESSA CONTEÚDO
      const lines = content.split('\n');
      let tableBuffer = [];

      function flushTable() {
        if (tableBuffer.length > 0) {
          renderTable(tableBuffer);
          tableBuffer = [];
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (line.startsWith('|') && line.endsWith('|')) {
          tableBuffer.push(line);
          continue;
        } else if (tableBuffer.length > 0) flushTable();

        if (trimmed.startsWith('```')) {
          let codeText = '';
          i++;
          while (i < lines.length && !lines[i].trim().startsWith('```')) {
            codeText += lines[i] + '\n';
            i++;
          }
          renderCode(codeText.trim());
          continue;
        }

        if (line.startsWith('# ')) renderH1(line.substring(2));
        else if (line.startsWith('## ')) renderH2(line.substring(3));
        else if (line.startsWith('### ')) renderH3(line.substring(4));
        else if (line.startsWith('#### ')) renderH3(line.substring(5));
        else if (trimmed === '---') renderSeparator();
        else if (line.startsWith('> ')) renderQuote(line.substring(2).replace(/\*\*/g, ''));
        else if (line.startsWith('- ') || line.startsWith('* ')) renderBullet(line.substring(2).replace(/\*\*/g, ''));
        else if (/^\d+\.\s/.test(line)) {
          const m = line.match(/^(\d+)\.\s(.*)$/);
          renderNumbered(m[1], m[2].replace(/\*\*/g, ''));
        }
        else if (trimmed === '') y += 5;
        else renderP(line.replace(/\*\*/g, '').replace(/\*/g, ''));
      }

      flushTable();

      // FOOTER
      if (showFooter) {
        const range = doc.bufferedPageRange();
        const total = range.count;
        for (let i = range.start; i < range.start + total; i++) {
          doc.switchToPage(i);
          doc.fontSize(7).fillColor(gray.r, gray.g, gray.b).font('Helvetica')
             .text('Master IA — Documento gerado automaticamente', margin, doc.page.height - 30);
          doc.text(`Página ${i - range.start + 1} de ${total}`, margin, doc.page.height - 30, {
            width: pageWidth, align: 'right'
          });
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function generateCSS(t, { showCover, showHeader, showFooter, onePage }) {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${onePage ? '10px' : '12px'};
      line-height: 1.5;
      color: #1f2937;
      background: white;
      padding: 20px 30px;
    }
    h1 {
      color: ${t.primary};
      font-size: 22px;
      font-weight: 700;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid ${t.primary};
    }
    h2 {
      color: ${t.primary};
      font-size: 17px;
      font-weight: 700;
      margin: 18px 0 10px 0;
    }
    h3 {
      color: #374151;
      font-size: 14px;
      font-weight: 700;
      margin: 14px 0 8px 0;
    }
    p { margin: 6px 0; text-align: justify; }
    ul, ol { margin: 6px 0 6px 20px; }
    li { margin: 3px 0; }
    strong { font-weight: 700; color: #111827; }
    blockquote {
      margin: 10px 0;
      padding: 6px 14px;
      border-left: 3px solid ${t.accent};
      background: #f9fafb;
      font-style: italic;
    }
    code {
      background: #f3f4f6;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      color: #be185d;
    }
    pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 10px;
      border-radius: 6px;
      margin: 10px 0;
      font-size: 10px;
    }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 14px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 0.9em;
    }
    thead { background: ${t.primary}; color: white; }
    th {
      padding: 8px 10px;
      text-align: center;
      font-weight: 600;
      border: 1px solid ${t.primary};
      color: white;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e5e7eb;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    ${onePage ? `
    body { font-size: 9px; line-height: 1.3; padding: 15px 25px; }
    h1 { font-size: 16px; margin: 10px 0 6px 0; }
    h2 { font-size: 13px; margin: 8px 0 5px 0; }
    h3 { font-size: 11px; margin: 6px 0 4px 0; }
    p, li { margin: 3px 0; }
    ul, ol { margin: 4px 0 4px 16px; }
    table { font-size: 0.85em; margin: 6px 0; }
    th, td { padding: 4px 6px; }
    blockquote { margin: 6px 0; padding: 4px 10px; }
    pre { margin: 6px 0; padding: 6px; font-size: 8px; }
    ` : ''}
  `;
}

// ====== WORD (DOCX) PROFISSIONAL ======
export async function generateDOCX({ title, content, theme = 'executivo', options = {} }) {
  const t = { ...THEMES[theme] || THEMES.executivo };
  const primaryRGB = t.primary.replace('#', '').toUpperCase();

  const lines = content.split('\n');
  const children = [];

  // CAPA
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

  let tableBuffer = [];

  function flushTable() {
    if (tableBuffer.length === 0) return;
    const parsed = tableBuffer.filter(r => !r.match(/^\|[\s\-|]+\|$/))
      .map(r => r.split('|').slice(1, -1).map(c => c.trim()));
    if (parsed.length === 0) { tableBuffer = []; return; }

    const headerRow = new TableRow({
      tableHeader: true,
      children: parsed[0].map(cellText => new TableCell({
        shading: { fill: primaryRGB, type: ShadingType.SOLID, color: 'auto' },
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
        top: { style: BorderStyle.SINGLE, size: 4, color: primaryRGB },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: primaryRGB },
        left: { style: BorderStyle.SINGLE, size: 4, color: primaryRGB },
        right: { style: BorderStyle.SINGLE, size: 4, color: primaryRGB },
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
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Consolas', color: 'C7254E' }));
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

  const openRegex = /\[GERAR_(PDF|DOCX|XLSX|TXT):([^\]]+)\]([\s\S]*?)(?=\[GERAR_|$)/g;
  while ((match = openRegex.exec(text)) !== null) {
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

  cleanText = cleanText.replace(/\[GERAR_(PDF|DOCX|XLSX|TXT):[^\]]+\]/g, '');
  cleanText = cleanText.replace(/\[FIM_(PDF|DOCX|XLSX|TXT)\]/g, '');

  return { cleanText: cleanText.trim(), markers };
}
