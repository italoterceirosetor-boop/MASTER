# Serviço Python para geração de PDF
# Endpoints:
#   GET  /health         - Health check
#   POST /generate-pdf   - Recebe markdown, retorna PDF

from flask import Flask, request, jsonify, send_file
from weasyprint import HTML, CSS
import markdown
import io
import datetime
import os
import sys
import traceback

app = Flask(__name__)

THEMES = {
    "executivo": {"primary": "#1E3A8A", "accent": "#3B82F6", "name": "Executivo"},
    "limpo": {"primary": "#111827", "accent": "#6B7280", "name": "Clean"},
    "colorido": {"primary": "#7C3AED", "accent": "#EC4899", "name": "Colorido"},
    "minimalista": {"primary": "#000000", "accent": "#666666", "name": "Minimalista"},
    "formal": {"primary": "#0F172A", "accent": "#475569", "name": "Formal"},
    "vermelho": {"primary": "#DC2626", "accent": "#EF4444", "name": "Vermelho"},
    "verde": {"primary": "#059669", "accent": "#10B981", "name": "Verde"},
    "azul": {"primary": "#2563EB", "accent": "#3B82F6", "name": "Azul"},
    "preto": {"primary": "#000000", "accent": "#404040", "name": "Preto"},
}


def detect_theme(content=""):
    """Detecta tema automaticamente baseado no conteúdo"""
    content_lower = (content or "").lower()
    for key in ["verde", "vermelho", "azul", "roxo", "preto", "rosa", "lilas"]:
        if key in content_lower:
            return THEMES.get(key, THEMES["executivo"])
    if "executiv" in content_lower or "profissional" in content_lower:
        return THEMES["executivo"]
    if "minimalista" in content_lower or "so texto" in content_lower:
        return THEMES["minimalista"]
    if "formal" in content_lower or "serif" in content_lower:
        return THEMES["formal"]
    return THEMES["executivo"]


def generate_css(theme, options):
    primary = theme["primary"]
    accent = theme["accent"]
    one_page = options.get("umaPagina", False)

    font_size = "10px" if one_page else "11px"
    h1_size = "22px" if not one_page else "14px"
    h2_size = "15px" if not one_page else "11px"

    one_page_css = ""
    if one_page:
        one_page_css = """
body { font-size: 9px; line-height: 1.3; }
h1 { font-size: 14px; margin: 8px 0 4px 0; padding-bottom: 3px; }
h2 { font-size: 11px; margin: 6px 0 4px 0; }
h3 { font-size: 10px; margin: 4px 0 2px 0; }
p, li { margin: 3px 0; }
ul, ol { margin: 4px 0 4px 14px; }
table { font-size: 0.8em; margin: 4px 0; }
th, td { padding: 3px 5px; }
blockquote { margin: 4px 0; padding: 4px 10px; }
pre { margin: 4px 0; padding: 6px; font-size: 8px; }
.cover { padding: 40px 15px; min-height: 60vh; }
.cover-logo { font-size: 32px; }
.cover-title { font-size: 20px; }
"""

    return f"""
@page {{ size: A4; margin: 25mm 20mm 25mm 20mm; }}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: {font_size};
    line-height: 1.5;
    color: #1f2937;
    background: white;
}}

h1 {{
    color: {primary};
    font-size: {h1_size};
    font-weight: 700;
    margin: 16px 0 8px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid {primary};
    page-break-after: avoid;
}}

h2 {{
    color: {primary};
    font-size: {h2_size};
    font-weight: 700;
    margin: 12px 0 6px 0;
    page-break-after: avoid;
}}

h3 {{
    color: #374151;
    font-size: 13px;
    font-weight: 700;
    margin: 10px 0 4px 0;
}}

h4 {{
    color: #4b5563;
    font-size: 12px;
    font-weight: 600;
    margin: 8px 0 4px 0;
}}

p {{ margin: 5px 0; text-align: justify; orphans: 3; widows: 3; }}

ul, ol {{ margin: 6px 0 6px 18px; padding-left: 8px; }}
li {{ margin: 3px 0; page-break-inside: avoid; }}

strong {{ font-weight: 700; color: #111827; }}
em {{ font-style: italic; }}

code {{
    background: #f3f4f6;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
    color: #be185d;
    font-size: 0.9em;
}}

pre {{
    background: #1f2937;
    color: #e5e7eb;
    padding: 12px;
    border-radius: 6px;
    margin: 10px 0;
    font-size: 10px;
    page-break-inside: avoid;
    white-space: pre-wrap;
}}

pre code {{ background: transparent; color: inherit; padding: 0; }}

blockquote {{
    margin: 10px 0;
    padding: 8px 14px;
    border-left: 3px solid {accent};
    background: #f9fafb;
    color: #4b5563;
    font-style: italic;
}}

hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 14px 0; }}

table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 0.9em;
    page-break-inside: avoid;
}}

thead {{ display: table-header-group; }}

th {{
    padding: 8px 10px;
    text-align: center;
    font-weight: 600;
    border: 1px solid {primary};
    color: white;
    background: {primary};
}}

td {{
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    vertical-align: middle;
}}

tbody tr:nth-child(even) {{ background: #f9fafb; }}

.cover {{
    page-break-after: always;
    text-align: center;
    padding: 60px 20px;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}}

.cover-logo {{ color: {primary}; font-size: 38px; font-weight: 700; margin-bottom: 8px; }}
.cover-subtitle {{ color: #6b7280; font-size: 13px; margin-bottom: 25px; }}
.cover-divider {{ width: 160px; height: 3px; background: {primary}; margin: 12px auto; }}
.cover-title {{ font-size: 22px; font-weight: 700; color: #111827; margin: 20px 0 12px 0; }}
.cover-date {{ color: #6b7280; font-size: 11px; font-style: italic; margin-top: 20px; }}

{one_page_css}
"""


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Master IA PDF Service", "version": "1.0"})


@app.route("/generate-pdf", methods=["POST"])
def generate_pdf():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "JSON requerido"}), 400

        title = data.get("title", "Documento")
        content = data.get("content", "")
        theme_name = data.get("theme", "executivo")
        options = data.get("options", {})

        # Seleciona tema
        theme = THEMES.get(theme_name)
        if not theme:
            theme = detect_theme(content)

        # Gera CSS
        css_text = generate_css(theme, options)

        # Converte markdown → HTML
        html_content = markdown.markdown(
            content,
            extensions=["extra", "tables", "fenced_code", "toc", "sane_lists"]
        )

        # Capa opcional
        show_cover = not options.get("semCapa", False)
        cover_html = ""
        if show_cover:
            cover_html = f"""
<div class="cover">
    <div class="cover-logo">Master IA</div>
    <div class="cover-subtitle">Master Contabilidade & Consultoria</div>
    <div class="cover-divider"></div>
    <div class="cover-title">{title}</div>
    <div class="cover-date">Gerado em {datetime.datetime.now().strftime('%d/%m/%Y às %H:%M')}</div>
</div>
"""

        full_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
</head>
<body>
    {cover_html}
    {html_content}
</body>
</html>"""

        # Gera PDF com WeasyPrint
        pdf_bytes = HTML(string=full_html).write_pdf(
            stylesheets=[CSS(string=css_text)]
        )

        print(f"[PDF Service] Gerado: {title}.pdf ({len(pdf_bytes)} bytes)", file=sys.stderr)

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
