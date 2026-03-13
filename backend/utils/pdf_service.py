from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML

def gerar_pdf_from_html(template_name, context, filename=None):
    """
    Renderiza um template HTML para uma string, converte para PDF e retorna
    um objeto ContentFile pronto para ser salvo em um FileField.
    """
    # Renderiza o template HTML com o contexto fornecido
    html_string = render_to_string(template_name, context)
    
    # Gera os bytes do PDF a partir da string HTML
    pdf_bytes = HTML(string=html_string).write_pdf()
    
    # Retorna um ContentFile, agora com o nome do arquivo especificado
    return ContentFile(pdf_bytes, name=filename)
