import os
import logging
from typing import Dict, Any
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

class TwilioSmsService:
    def __init__(self) -> None:
        self.account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        self.auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        self.from_phone = os.environ.get('TWILIO_FROM_PHONE')
        if not (self.account_sid and self.auth_token and self.from_phone):
            raise RuntimeError('Twilio not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE')
        self.client = Client(self.account_sid, self.auth_token)

    def send_sms(self, to: str, body: str) -> Dict[str, Any]:
        try:
            msg = self.client.messages.create(from_=self.from_phone, to=to, body=body)
            return {
                'success': True,
                'sid': msg.sid,
                'status': msg.status,
                'to': msg.to,
                'from': msg.from_,
            }
        except TwilioRestException as e:
            logger.exception('Twilio send failed')
            return {'success': False, 'error': e.msg, 'code': e.code, 'status': e.status}
        except Exception as e:
            logger.exception('Twilio unexpected error')
            return {'success': False, 'error': str(e)}