"""Servicios para apps.documentos."""
from __future__ import annotations

import mimetypes
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models import QuerySet
    from .models import Document


def save_document(
    entity,
    restructuring,
    target_model: str,
    target_id: int,
    kind: str,
    title: str,
    file,
    notes: str = '',
) -> 'Document':
    """
    Crea y persiste un Document.

    target_model: string 'app_label.ModelName' (ej. 'diagnostico.Diagnosis').
                  Puede ser None/''/falsy para documentos sin target específico.
    """
    from django.contrib.contenttypes.models import ContentType
    from .models import Document

    content_type = None
    object_id = None
    if target_model and target_id:
        try:
            app_label, model_name = target_model.split('.')
            content_type = ContentType.objects.get(app_label=app_label, model=model_name.lower())
            object_id = int(target_id)
        except (ValueError, ContentType.DoesNotExist):
            pass

    # Calcular mime y size
    mime = ''
    size = 0
    if file:
        if hasattr(file, 'name'):
            mime, _ = mimetypes.guess_type(file.name)
            mime = mime or ''
        if hasattr(file, 'size'):
            size = file.size
        elif hasattr(file, 'seek'):
            file.seek(0, 2)
            size = file.tell()
            file.seek(0)

    doc = Document(
        entity=entity,
        restructuring=restructuring,
        content_type=content_type,
        object_id=object_id,
        title=title,
        kind=kind,
        mime=mime,
        size=size,
        notes=notes,
    )
    doc.file = file
    doc.full_clean()
    doc.save()
    return doc


def list_documents_for(target) -> 'QuerySet[Document]':
    """Devuelve todos los documentos vinculados a un objeto específico."""
    from django.contrib.contenttypes.models import ContentType
    from .models import Document

    ct = ContentType.objects.get_for_model(target)
    return Document.objects.filter(content_type=ct, object_id=target.pk)


def extract_text_if_ocr_enabled(document: 'Document') -> None:
    """
    Extrae texto del documento si OCR_ENABLED=1 y pytesseract está instalado.
    Si no, es un no-op. El texto extraído se guarda en document.extracted_text.

    Decisión Sprint 3: pytesseract no es dependencia obligatoria.
    Se activa solo si la variable de entorno OCR_ENABLED=1 está presente
    y el paquete está instalado en el sistema.
    """
    if os.environ.get('OCR_ENABLED') != '1':
        return

    try:
        import pytesseract  # noqa: F401 — opcional
    except ImportError:
        return

    try:
        from PIL import Image  # type: ignore
        if document.file and hasattr(document.file, 'path'):
            img = Image.open(document.file.path)
            text = pytesseract.image_to_string(img)
            document.extracted_text = (document.extracted_text + '\n' + text).strip()
            document.save(update_fields=['extracted_text'])
    except Exception:
        pass  # OCR es best-effort, nunca falla silenciosamente al usuario
