from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML

def gerar_pdf_from_html(template_name, context):
    # Render HTML string
    html_string = render_to_string(template_name, context)
    # Generate PDF bytes
    pdf_bytes = HTML(string=html_string).write_pdf()
    return ContentFile(pdf_bytes)