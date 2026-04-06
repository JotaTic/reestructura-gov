from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin, RestructuringScopedMixin
from apps.common.exports import EXPORT_RENDERERS
from apps.core.models import Entity, Restructuring

from .models import ActTemplate, ActDraft
from .serializers import ActTemplateSerializer, ActDraftSerializer
from .services import build_context, create_draft_from_template, render_template, render_act_content


class ActTemplateViewSet(viewsets.ModelViewSet):
    """Plantillas: globales (cualquier entidad puede usarlas)."""
    queryset = ActTemplate.objects.all()
    serializer_class = ActTemplateSerializer
    filterset_fields = ['kind', 'scope', 'topic', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'kind', 'scope', 'topic']

    @action(detail=True, methods=['post'], url_path='generar-borrador')
    def generate_draft(self, request, pk=None):
        template = self.get_object()
        # El borrador nace dentro del contexto activo del usuario.
        entity_id = request.headers.get('X-Entity-Id') or request.data.get('entity')
        restr_id = request.headers.get('X-Restructuring-Id') or request.data.get('restructuring')
        if not entity_id or not restr_id:
            return Response(
                {'detail': 'Se requiere entidad y reestructuración activas.', 'code': 'context_required'},
                status=403,
            )
        try:
            entity = Entity.objects.get(pk=entity_id)
            restr = Restructuring.objects.get(pk=restr_id, entity=entity)
        except (Entity.DoesNotExist, Restructuring.DoesNotExist):
            return Response({'detail': 'Contexto inválido.'}, status=404)

        title = request.data.get('title') or template.name
        draft = create_draft_from_template(template, entity, title, restructuring=restr)
        return Response(ActDraftSerializer(draft).data, status=201)


class ActDraftViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = ActDraft.objects.select_related('entity', 'restructuring', 'template').all()
    serializer_class = ActDraftSerializer
    filterset_fields = ['kind', 'topic', 'status']
    search_fields = ['title', 'act_number']
    ordering_fields = ['updated_at', 'issue_date', 'title']

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        """Return rendered content with placeholders resolved."""
        draft = self.get_object()
        rendered = render_act_content(draft)
        return Response({'rendered_content': rendered, 'title': draft.title})

    @action(detail=True, methods=['post'], url_path='re-renderizar')
    def rerender(self, request, pk=None):
        draft = self.get_object()
        if not draft.template:
            return Response({'detail': 'El borrador no tiene plantilla asociada.'}, status=400)
        ctx = build_context(draft.entity)
        draft.content = render_template(draft.template, ctx)
        draft.save(update_fields=['content', 'updated_at'])
        return Response(ActDraftSerializer(draft).data)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'export/(?P<fmt>xlsx|docx)',
        renderer_classes=EXPORT_RENDERERS,
    )
    def export(self, request, pk=None, fmt=None):
        from apps.common.exports import export_response
        from apps.common.module_exports import export_act_draft
        draft = self.get_object()
        title, meta, sections, base, fctx = export_act_draft(draft)
        return export_response(fmt, title, meta, sections, base, fctx)
