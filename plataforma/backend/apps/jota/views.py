from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .services import answer_question, get_public_config


class JotaThrottle(UserRateThrottle):
    scope = 'jota'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def config_view(request):
    return Response(get_public_config())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([JotaThrottle])
def ask_view(request):
    question = request.data.get('question', '')
    return Response(answer_question(question))
