"""Master IA — Serviço de Geração de PDF (ReportLab)
Baseado no código que JÁ FUNCIONA do outro projeto.
Usa ReportLab puro, sem Chromium ou X11 — funciona perfeitamente no Railway.
"""
from flask import Flask, request, jsonify, send_file
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, PageTemplate, Frame, HRFlowable)
import re, io, datetime, sys, traceback
from pathlib import Path
import os

app = Flask(__name__)

# ══════════════════════════════════════════════════════════════════
#  TEMAS
# ══════════════════════════════════════════════════════════════════
_TEMAS = {
    "padrao":    {"bg":"#0f172a","navy":"#1e3a5f","blue":"#2563eb","cyan":"#06b6d4","gold":"#f59e0b"},
    "verde":     {"bg":"#064e3b","navy":"#022c22","blue":"#065f46","cyan":"#10b981","gold":"#f59e0b"},
    "roxo":      {"bg":"#1e1b4b","navy":"#312e81","blue":"#4f46e5","cyan":"#8b5cf6","gold":"#f59e0b"},
    "escuro":    {"bg":"#111827","navy":"#1f2937","blue":"#374151","cyan":"#e5e7eb","gold":"#9ca3af"},
    "vermelho":  {"bg":"#450a0a","navy":"#7f1d1d","blue":"#dc2626","cyan":"#f87171","gold":"#fbbf24"},
    "laranja":   {"bg":"#431407","navy":"#7c2d12","blue":"#ea580c","cyan":"#fb923c","gold":"#fcd34d"},
    "marinho":   {"bg":"#0c1445","navy":"#1a237e","blue":"#1565c0","cyan":"#42a5f5","gold":"#ffd54f"},
    "cinza":     {"bg":"#1c1917","navy":"#292524","blue":"#57534e","cyan":"#a8a29e","gold":"#d6d3d1"},
    "dourado":   {"bg":"#1c1600","navy":"#3d2e00","blue":"#b45309","cyan":"#d97706","gold":"#fbbf24"},
    "teal":      {"bg":"#042f2e","navy":"#0d3d39","blue":"#0d9488","cyan":"#2dd4bf","gold":"#fbbf24"},
    "executivo": {"bg":"#0f172a","navy":"#1e3a5f","blue":"#2563eb","cyan":"#06b6d4","gold":"#f59e0b"},
    "minimalista": {"bg":"#ffffff","navy":"#1a365d","blue":"#2563eb","cyan":"#06b6d4","gold":"#f59e0b"},
}

# ══════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════
def now_str():
    return datetime.datetime.now().strftime("%d/%m/%Y às %H:%M")

def _ps(name, **kw): return ParagraphStyle(name, **kw)

def _md2rl(text):
    """Converte markdown inline para ReportLab XML."""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    text = re.sub(r'[�￾￿]', '', text)
    text = re.sub(r'[■-◿]', ' ', text)
    text = re.sub(r'  +', ' ', text)
    text = text.replace('&', '&amp;')
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    text = re.sub(r'`([^`]+)`', r'<font name="Courier" size="8.5" color="#06b6d4">\1</font>', text)
    text = text.replace('`', '')
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    return text 

def _parse_md(content):
    """Parser de markdown → lista de blocos estruturados."""
    blocks = []
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if re.match(r'^!\[.*\]\(.*\)$', stripped): i += 1; continue
        if '|' in stripped and i+1 < len(lines) and re.match(r'^\|[-| :]+\|', lines[i+1].strip()):
            headers = [c.strip() for c in stripped.split('|') if c.strip()]
            i += 2
            rows = []
            while i < len(lines) and '|' in lines[i]:
                r = [c.strip() for c in lines[i].split('|') if c.strip()]
                if r: rows.append(r)
                i += 1
            blocks.append({'type':'table','headers':headers,'rows':rows})
            continue
        m = re.match(r'^(#{1,4})\s+(.+)', stripped)
        if m:
            blocks.append({'type':f'h{len(m.group(1))}','text':_md2rl(m.group(2).strip())})
            i += 1; continue
        if re.match(r'^---+$', stripped): blocks.append({'type':'hr'}); i += 1; continue
        if stripped.startswith('>'):
            txt = stripped.lstrip('>').strip()
            blocks.append({'type':'cite','text':_md2rl(txt)}); i += 1; continue
        if re.match(r'^[-*•]\s+', stripped):
            items = []
            while i < len(lines) and re.match(r'^[-*•]\s+', lines[i].strip()):
                items.append(_md2rl(lines[i].strip()[2:].strip())); i += 1
            blocks.append({'type':'bullets','items':items}); continue
        if re.match(r'^\d+\.\s+', stripped):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i].strip()):
                items.append(_md2rl(re.sub(r'^\d+\.\s+', '', lines[i].strip()))); i += 1
            blocks.append({'type':'numbered','items':items}); continue
        if stripped.startswith('```'):
            i += 1; code_lines = []
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i]); i += 1
            if i < len(lines): i += 1
            if code_lines:
                blocks.append({'type':'codeblock','text':' '.join(l.strip() for l in code_lines if l.strip())})
            continue
        if not stripped: blocks.append({'type':'space'}); i += 1; continue
        para = []
        while i < len(lines):
            l = lines[i].strip()
            if (not l or l.startswith('#') or l.startswith('>') or
                re.match(r'^[-*•]\s+', l) or re.match(r'^\d+\.\s+', l) or
                re.match(r'^---+$', l) or
                ('|' in l and i+1 < len(lines) and re.match(r'^\|[-| :]+\|', lines[i+1].strip() if i+1<len(lines) else ''))):
                break
            para.append(l); i += 1
        txt = ' '.join(para).strip()
        if txt: blocks.append({'type':'para','text':_md2rl(txt)})
    return blocks

# ══════════════════════════════════════════════════════════════════
#  CLASSE DE DOCUMENTO COM HERO CUSTOMIZADO
# ══════════════════════════════════════════════════════════════════
class _MasterPDFDoc(SimpleDocTemplate):
    def __init__(self, buf, cores, sem_circulos=False, hero_cm=6.0, **kw):
        self._cores = cores
        self._sem_circulos = sem_circulos
        self._hero_cm = hero_cm
        super().__init__(buf, **kw)
        f = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='n')
        self.addPageTemplates([PageTemplate(id='m', frames=f, onPage=self._bg)])

    def _bg(self, c, doc):
        C = self._cores
        W2, H2 = A4
        c.saveState()
        hb = self._hero_cm * cm
        # Hero band escuro
        c.setFillColor(colors.HexColor(C['bg']))
        c.rect(0, H2-hb, W2, hb, fill=1, stroke=0)
        # Linha cyan no topo do hero
        c.setFillColor(colors.HexColor(C['cyan']))
        c.rect(0, H2-0.28*cm, W2, 0.28*cm, fill=1, stroke=0)
        # Linha dourada logo abaixo
        c.setFillColor(colors.HexColor(C['gold']))
        c.rect(0, H2-hb-0.14*cm, W2, 0.14*cm, fill=1, stroke=0)
        # Círculos decorativos no hero
        if not self._sem_circulos:
            c.setFillColor(colors.HexColor(C['navy']))
            c.circle(W2-0.7*cm, H2-hb/2, 2.4*cm, fill=1, stroke=0)
            c.setFillColor(colors.HexColor(C['blue']))
            c.circle(W2-0.7*cm, H2-hb/2, 1.5*cm, fill=1, stroke=0)
            c.setFillColor(colors.HexColor(C['cyan']))
            c.circle(W2-0.7*cm, H2-hb/2, 0.55*cm, fill=1, stroke=0)
        # Barra lateral cyan
        c.setFillColor(colors.HexColor(C['cyan']))
        c.rect(0, 0, 0.16*cm, H2-hb-0.14*cm, fill=1, stroke=0)
        # Rodapé
        c.setFillColor(colors.HexColor(C['bg']))
        c.rect(0, 0, W2, 1.15*cm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor(C['cyan']))
        c.rect(0, 1.15*cm, W2, 0.09*cm, fill=1, stroke=0)
        c.restoreState()

# ══════════════════════════════════════════════════════════════════
#  FUNÇÃO PRINCIPAL DE GERAÇÃO DE PDF
# ══════════════════════════════════════════════════════════════════
def gen_pdf(titulo, content, tema="padrao", uma_pagina=False,
           sem_circulos=False, subtitulo="", tamanho_fonte="normal",
           espacamento="normal", hero_altura="normal",
           mostrar_rodape=False, sem_hero=False):
    """Gera PDF profissional Master IA a partir de markdown."""
    t = _TEMAS.get(tema, _TEMAS["padrao"])
    C = {
        'bg': colors.HexColor(t['bg']),
        'navy': colors.HexColor(t['navy']),
        'blue': colors.HexColor(t['blue']),
        'cyan': colors.HexColor(t['cyan']),
        'gold': colors.HexColor(t['gold']),
        'white': colors.white,
        'text': colors.HexColor('#1e293b'),
        'text2': colors.HexColor('#64748b'),
        'surf': colors.HexColor('#f1f5f9'),
        'surf2': colors.HexColor('#e2e8f0'),
        'stripe': colors.HexColor('#f8fafc'),
    }

    _fs_map = {"pequeno":0.78,"normal":1.0,"grande":1.22,"muito_grande":1.45}
    _sp_map = {"compacto":0.7,"normal":1.0,"espacoso":1.35}
    _hero_map = {"pequeno":3.0,"normal":6.0,"grande":8.0}
    fs_scale = _fs_map.get(tamanho_fonte, 1.0)
    sp_scale = _sp_map.get(espacamento, 1.0)
    hero_cm = _hero_map.get(hero_altura, 6.0)
    sc = (0.82 if uma_pagina else 1.0) * fs_scale

    S = {
        'hero': _ps(f'mhero{tema}', fontSize=30, fontName='Helvetica-Bold',
                    textColor=C['white'], alignment=TA_CENTER, leading=38),
        'subtag': _ps(f'mstag{tema}', fontSize=9, fontName='Helvetica',
                      textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER, leading=13),
        'h1': _ps(f'mh1{tema}', fontSize=round(11*sc,1), fontName='Helvetica-Bold',
                  textColor=C['navy'], leading=round(15*sc,1),
                  spaceBefore=round(10*sc,1), spaceAfter=round(4*sc,1)),
        'h2': _ps(f'mh2{tema}', fontSize=round(9.5*sc,1), fontName='Helvetica-Bold',
                  textColor=C['blue'], leading=round(13*sc,1),
                  spaceBefore=round(8*sc,1), spaceAfter=round(3*sc,1)),
        'h3': _ps(f'mh3{tema}', fontSize=round(9*sc,1), fontName='Helvetica-Bold',
                  textColor=C['text'], leading=round(13*sc,1),
                  spaceBefore=round(5*sc,1), spaceAfter=round(2*sc,1)),
        'body': _ps(f'mbody{tema}', fontSize=round(9*sc,1), fontName='Helvetica',
                    textColor=C['text'], leading=round(13.5*sc,1),
                    alignment=TA_JUSTIFY, spaceAfter=round(3*sc,1)),
        'bullet': _ps(f'mbul{tema}', fontSize=round(9*sc,1), fontName='Helvetica',
                      textColor=C['text'], leading=round(13*sc,1),
                      leftIndent=12, spaceAfter=round(2*sc,1)),
        'num': _ps(f'mnum{tema}', fontSize=round(9*sc,1), fontName='Helvetica',
                   textColor=C['text'], leading=round(13*sc,1),
                   leftIndent=14, firstLineIndent=-10, spaceAfter=round(2*sc,1)),
        'th': _ps(f'mth{tema}', fontSize=8.5, fontName='Helvetica-Bold',
                 textColor=C['white'], alignment=TA_CENTER, leading=11),
        'td': _ps(f'mtd{tema}', fontSize=8.5, fontName='Helvetica',
                 textColor=C['text'], alignment=TA_CENTER, leading=11),
        'tdl': _ps(f'mtdl{tema}', fontSize=8.5, fontName='Helvetica',
                  textColor=C['text'], alignment=TA_LEFT, leading=11),
        'cite': _ps(f'mcite{tema}', fontSize=round(8.5*sc,1), fontName='Helvetica-Oblique',
                   textColor=C['blue'], leading=round(12*sc,1), leftIndent=10),
        'foot': _ps(f'mfoot{tema}', fontSize=7, fontName='Helvetica',
                   textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER, leading=10),
    }

    _top_margin = hero_cm * cm + 0.8*cm
    _hero_text_h = 1.6*cm
    sp_hero = _top_margin - (_top_margin - _hero_text_h) / 2.0
    if uma_pagina: sp_hero -= 0.3*cm

    sp_after_hero = (_top_margin - _hero_text_h) / 2.0 + 0.5*cm if not uma_pagina else 0.3*cm
    sp_section = round(0.18 * sp_scale, 2)*cm if not uma_pagina else 0.08*cm

    buf = io.BytesIO()
    doc = _MasterPDFDoc(buf, cores=t, sem_circulos=sem_circulos,
                       hero_cm=hero_cm, pagesize=A4,
                       leftMargin=1.8*cm, rightMargin=1.8*cm,
                       topMargin=_top_margin, bottomMargin=1.8*cm,
                       title=titulo or 'Documento')
    CW = A4[0] - 3.6*cm
    story = []

    blocks_all = _parse_md(content)

    # Truncar se uma_pagina
    if uma_pagina:
        MAX_PESO = 40
        peso_total = 0
        blocos_filtrados = []
        for b in blocks_all:
            bt = b.get('type', '')
            if bt == 'space': continue
            if bt == 'h1': peso = 3
            elif bt == 'h2': peso = 2
            elif bt in ('h3','h4'): peso = 1
            elif bt == 'para':
                chars = len(b.get('text',''))
                peso = max(2, chars // 60 + 1)
            elif bt == 'bullets': peso = len(b.get('items',[])) * 2
            elif bt == 'numbered': peso = len(b.get('items',[])) * 2
            elif bt == 'table': peso = len(b.get('rows',[])) * 2 + 2
            elif bt in ('hr','cite'): peso = 1
            else: peso = 1
            if peso_total + peso > MAX_PESO: break
            blocos_filtrados.append(b)
            peso_total += peso
        blocks_all = blocos_filtrados

    # Hero
    if not sem_hero:
        story.append(Spacer(1, -sp_hero))
        story.append(Paragraph(_md2rl(titulo or 'Documento'), S['hero']))
        story.append(Spacer(1, 0.25*cm))
        if mostrar_rodape:
            story.append(Paragraph(f'Gerado por Master IA · {now_str()}', S['subtag']))
        story.append(Spacer(1, sp_after_hero))

    # Conteúdo
    for block in blocks_all:
        btype = block.get('type')
        txt = block.get('text', '')
        if btype == 'h1':
            t = Table([[Paragraph(txt, S['h1'])]], colWidths=[CW])
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#eff6ff')),
                ('LINEBEFORE',(0,0),(0,-1),4,C['blue']),
                ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
                ('LEFTPADDING',(0,0),(-1,-1),10),
            ]))
            story.append(Spacer(1,4)); story.append(t); story.append(Spacer(1,4))
        elif btype == 'h2':
            story.append(Paragraph(txt, S['h2']))
            story.append(HRFlowable(width='100%', thickness=0.7, color=C['surf2'], spaceAfter=3))
        elif btype == 'h3':
            story.append(Paragraph(txt, S['h3']))
        elif btype == 'para':
            story.append(Paragraph(txt, S['body']))
        elif btype == 'bullets':
            for item in block['items']:
                story.append(Paragraph(f'<font color="#2563eb" size="11">•</font>  {item}', S['bullet']))
        elif btype == 'numbered':
            for n, item in enumerate(block['items'], 1):
                story.append(Paragraph(f'<b><font color="#2563eb">{n}.</font></b>  {item}', S['num']))
        elif btype == 'cite':
            t = Table([[Paragraph(txt, S['cite'])]], colWidths=[CW])
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),C['surf']),
                ('LINEBEFORE',(0,0),(0,-1),3,C['cyan']),
                ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
                ('LEFTPADDING',(0,0),(-1,-1),10),
            ]))
            story.append(t); story.append(Spacer(1,3))
        elif btype == 'table':
            headers = block.get('headers',[])
            rows = block.get('rows',[])
            if not headers: continue
            ncols = len(headers)
            lens = [max(len(str(headers[j])), max((len(str(r[j])) if j<len(r) else 0) for r in rows) if rows else 0)
                    for j in range(ncols)]
            total = sum(lens) or 1
            cws = [max(CW * l / total, CW * 0.08) for l in lens]
            sw = sum(cws); cws = [w * CW / sw for w in cws]
            fs = 7.5 if ncols > 5 else 8.5
            uid = str(abs(hash(str(block))))[-5:]
            s_th2 = _ps(f'TH{uid}', fontSize=fs, fontName='Helvetica-Bold', textColor=C['white'], alignment=TA_CENTER, leading=fs+2)
            s_td2 = _ps(f'TD{uid}', fontSize=fs, fontName='Helvetica', textColor=C['text'], alignment=TA_LEFT, leading=fs+4)
            tdata = [[Paragraph(_md2rl(str(h)), s_th2) for h in headers]]
            for r in rows:
                tdata.append([Paragraph(_md2rl(str(r[j])) if j<len(r) else '', s_td2) for j in range(ncols)])
            t = Table(tdata, colWidths=cws, repeatRows=1, hAlign='CENTER', splitByRow=True)
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0),C['navy']),
                ('LINEBELOW',(0,0),(-1,0),2,C['cyan']),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[C['stripe'],C['white']]),
                ('GRID',(0,0),(-1,-1),0.4,C['surf2']),
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
                ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
            ]))
            story.append(Spacer(1,4)); story.append(t); story.append(Spacer(1,4))
        elif btype == 'codeblock':
            s_code = _ps(f'mcode{tema}', fontSize=8.5, fontName='Courier',
                         textColor=C['cyan'], leading=13, alignment=TA_LEFT)
            t = Table([[Paragraph(txt, s_code)]], colWidths=[CW])
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#0d1b2a')),
                ('LINEBEFORE',(0,0),(0,-1),3,C['cyan']),
                ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
                ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),8),
            ]))
            story.append(Spacer(1,3)); story.append(t); story.append(Spacer(1,3))
        elif btype == 'hr':
            story.append(HRFlowable(width='100%', thickness=0.5, color=C['surf2'], spaceAfter=3))
        elif btype == 'space':
            story.append(Spacer(1, sp_section))

    if mostrar_rodape:
        story.append(Spacer(1, 0.5*cm))
        story.append(HRFlowable(width='100%', thickness=0.4, color=C['surf2'], spaceAfter=3))
        story.append(Paragraph('Gerado por Master IA', S['foot']))

    doc.build(story)
    buf.seek(0)
    return buf.read()

# ══════════════════════════════════════════════════════════════════
#  FLASK
# ══════════════════════════════════════════════════════════════════
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Master IA PDF", "engine": "reportlab"})

@app.route("/generate-pdf", methods=["POST"])
def generate_pdf():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "JSON requerido"}), 400

        title = data.get("title", "Documento")
        content = data.get("content", "")
        theme_name = data.get("theme", "padrao")
        options = data.get("options", {})

        # Detecção automática de tema pelo conteúdo se for "auto"
        if theme_name == "auto":
            content_lower = content.lower()
            for key in _TEMAS.keys():
                if key != "padrao" and key in content_lower:
                    theme_name = key
                    break

        pdf_bytes = gen_pdf(
            title,
            content,
            tema=theme_name,
            uma_pagina=options.get("umaPagina", False),
            sem_circulos=options.get("semCirculos", True),  # padrão sem círculos
            subtitulo=options.get("subtitulo", ""),
            tamanho_fonte=options.get("tamanhoFonte", "normal"),
            espacamento=options.get("espacamento", "normal"),
            hero_altura=options.get("heroAltura", "normal"),
            mostrar_rodape=options.get("mostrarRodape", False),
            sem_hero=options.get("semHero", False),
        )

        print(f"[PDF] Gerado: {title} ({len(pdf_bytes)} bytes)", file=sys.stderr)

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{title}.pdf"
        )
    except Exception as e:
        print(f"Erro: {e}", file=sys.stderr)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"[PDF Service] Iniciando na porta {port}", file=sys.stderr)
    app.run(host="0.0.0.0", port=port, debug=False)
