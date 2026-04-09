"""
Generación nativa de PDF para actos administrativos usando reportlab.
"""
import io
from datetime import date

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from .models import ActDraft
from .services import render_act_content


def _build_styles():
    """Return a dict of named ParagraphStyles for the act PDF."""
    base = getSampleStyleSheet()

    header_entity = ParagraphStyle(
        'HeaderEntity',
        parent=base['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=6,
    )

    header_act = ParagraphStyle(
        'HeaderAct',
        parent=base['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    date_line = ParagraphStyle(
        'DateLine',
        parent=base['Normal'],
        fontName='Helvetica',
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=12,
    )

    body_style = ParagraphStyle(
        'BodyContent',
        parent=base['Normal'],
        fontName='Helvetica',
        fontSize=10,
        alignment=TA_JUSTIFY,
        leading=14,
        spaceAfter=6,
    )

    signed_style = ParagraphStyle(
        'SignedBy',
        parent=base['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        alignment=TA_CENTER,
        spaceBefore=30,
        spaceAfter=4,
    )

    return {
        'entity': header_entity,
        'act': header_act,
        'date': date_line,
        'body': body_style,
        'signed': signed_style,
    }


def _add_page_number(canvas, doc):
    """Draw page number at the bottom center of each page."""
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    page_num = canvas.getPageNumber()
    text = f"Página {page_num}"
    canvas.drawCentredString(LETTER[0] / 2, 1.5 * cm, text)
    canvas.restoreState()


def generate_act_pdf(draft: ActDraft) -> bytes:
    """
    Generate a PDF document for the given ActDraft and return raw bytes.

    The PDF includes:
    - Entity name header (centered, bold, 14pt)
    - Act type and number (centered, 12pt)
    - Date line
    - Rendered body content
    - Signed-by line at the bottom
    - Page numbers
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    styles = _build_styles()
    story = []

    # --- Header: entity name ---
    entity_name = draft.entity.name if draft.entity else ''
    if entity_name:
        story.append(Paragraph(entity_name, styles['entity']))
        story.append(Spacer(1, 6))

    # --- Act type and number ---
    kind_display = draft.get_kind_display()
    act_number = draft.act_number or '[SIN NÚMERO]'
    act_line = f"{kind_display} N° {act_number}"
    story.append(Paragraph(act_line, styles['act']))
    story.append(Spacer(1, 4))

    # --- Date line ---
    if draft.issue_date:
        date_str = draft.issue_date.strftime('%d de %B de %Y')
    else:
        date_str = date.today().strftime('%d de %B de %Y')
    story.append(Paragraph(f"Fecha: {date_str}", styles['date']))
    story.append(Spacer(1, 12))

    # --- Body content ---
    rendered = render_act_content(draft)
    # Split content by line breaks and create individual paragraphs
    for line in rendered.split('\n'):
        line = line.strip()
        if line:
            # Escape XML-special characters for reportlab Paragraph
            safe_line = (
                line.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
            )
            story.append(Paragraph(safe_line, styles['body']))
        else:
            story.append(Spacer(1, 6))

    # --- Signed by ---
    signed_by = draft.signed_by or '[POR DEFINIR]'
    story.append(Spacer(1, 24))
    story.append(Paragraph('Firmado por:', styles['signed']))
    story.append(Paragraph(signed_by, styles['signed']))

    # Build the PDF
    doc.build(story, onFirstPage=_add_page_number, onLaterPages=_add_page_number)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
