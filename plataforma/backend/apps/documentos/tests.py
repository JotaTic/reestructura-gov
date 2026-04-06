"""Tests para apps.documentos."""
from __future__ import annotations

from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.core.models import Entity, Restructuring
from .models import Document, DocumentKind, MAX_FILE_SIZE_BYTES
from .services import save_document, list_documents_for


def _make_entity(name='DocEntity'):
    return Entity.objects.create(
        name=name, acronym=name[:4].upper(),
        order='MUNICIPAL', legal_nature='ALCALDIA',
        municipality_category='6',
    )


class SaveDocumentTest(TestCase):
    def setUp(self):
        self.entity = _make_entity()
        self.restructuring = Restructuring.objects.create(
            entity=self.entity, name='R1', code='R001',
            reference_date='2026-01-01', status='DRAFT',
        )

    def test_creates_document_without_target(self):
        file = SimpleUploadedFile('test.pdf', b'%PDF-1.4 content', content_type='application/pdf')
        doc = save_document(
            entity=self.entity,
            restructuring=self.restructuring,
            target_model='',
            target_id=0,
            kind=DocumentKind.PRESUPUESTO,
            title='Presupuesto 2026',
            file=file,
        )
        self.assertIsNotNone(doc.pk)
        self.assertEqual(doc.title, 'Presupuesto 2026')
        self.assertEqual(doc.entity_id, self.entity.pk)

    def test_document_with_target_links_content_type(self):
        """Vincula el documento a una restructuring via content_type/object_id."""
        file = SimpleUploadedFile('acto.docx', b'PK\x03\x04', content_type='application/octet-stream')
        doc = save_document(
            entity=self.entity,
            restructuring=self.restructuring,
            target_model='core.restructuring',
            target_id=self.restructuring.pk,
            kind=DocumentKind.ACTO_ESTRUCTURA,
            title='Decreto 0123/2026',
            file=file,
        )
        self.assertIsNotNone(doc.content_type)
        self.assertEqual(doc.object_id, self.restructuring.pk)


class ListDocumentsForTest(TestCase):
    def setUp(self):
        self.entity = _make_entity('ListDocEntity')
        self.restructuring = Restructuring.objects.create(
            entity=self.entity, name='R2', code='R002',
            reference_date='2026-01-01', status='DRAFT',
        )

    def test_list_documents_for_target(self):
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(Restructuring)

        # Create 2 documents linked to this restructuring
        for i in range(2):
            file = SimpleUploadedFile(f'doc{i}.pdf', b'content', content_type='application/pdf')
            Document.objects.create(
                entity=self.entity,
                content_type=ct,
                object_id=self.restructuring.pk,
                title=f'Doc {i}',
                kind=DocumentKind.OTRO,
                file=file,
            )

        # Create 1 doc linked to a different object
        file2 = SimpleUploadedFile('other.pdf', b'content', content_type='application/pdf')
        Document.objects.create(
            entity=self.entity,
            content_type=ct,
            object_id=self.restructuring.pk + 99999,
            title='Other',
            kind=DocumentKind.OTRO,
            file=file2,
        )

        qs = list_documents_for(self.restructuring)
        self.assertEqual(qs.count(), 2)


class DocumentSizeValidationTest(TestCase):
    def test_document_over_25mb_rejected(self):
        entity = _make_entity('SizeEntity')
        file = SimpleUploadedFile('bigfile.pdf', b'x', content_type='application/pdf')
        doc = Document(
            entity=entity,
            title='Archivo grande',
            kind=DocumentKind.OTRO,
            file=file,
            size=MAX_FILE_SIZE_BYTES + 1,
        )
        with self.assertRaises(ValidationError):
            doc.clean()

    def test_document_under_25mb_ok(self):
        entity = _make_entity('SizeOkEntity')
        file = SimpleUploadedFile('smallfile.pdf', b'x', content_type='application/pdf')
        doc = Document(
            entity=entity,
            title='Archivo pequeño',
            kind=DocumentKind.OTRO,
            file=file,
            size=1024,
        )
        # Should not raise
        doc.clean()
