from rest_framework import serializers
from .models import ProcessMap, Process, ValueChainLink


class ProcessSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Process
        fields = [
            'id', 'process_map', 'code', 'name', 'type', 'type_display',
            'description', 'required', 'executable_by_entity', 'duplicated',
            'order',
        ]


class ValueChainLinkSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)

    class Meta:
        model = ValueChainLink
        fields = [
            'id', 'process_map', 'stage', 'stage_display',
            'description', 'related_process', 'order',
        ]


class ProcessMapSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    processes_count = serializers.IntegerField(source='processes.count', read_only=True)
    chain_count = serializers.IntegerField(source='value_chain.count', read_only=True)

    class Meta:
        model = ProcessMap
        fields = [
            'id', 'entity', 'entity_name', 'kind', 'kind_display',
            'name', 'reference_date', 'notes',
            'processes_count', 'chain_count',
            'created_at', 'updated_at',
        ]
