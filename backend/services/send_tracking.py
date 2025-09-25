"""
Uniform Send Status Tracking Service
Provides consistent field structure across all modules for SMS/Email send operations
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List


def create_uniform_send_update(
    send_results: Dict[str, Any],
    method: str,
    recipient: str,
    attach_pdf: bool = False
) -> Dict[str, Any]:
    """
    Creates uniform send status update fields for all modules
    
    Args:
        send_results: Results from email/SMS send operations {"email": {...}, "sms": {...}}
        method: "email" or "sms" 
        recipient: Email or phone number
        attach_pdf: Whether PDF was attached (for email only)
    
    Returns:
        Dictionary with uniform field structure for database update
    """
    current_time_iso = datetime.now(timezone.utc).isoformat()
    
    # Build errors dict
    errors = {}
    if send_results.get("email") and not send_results["email"].get("success"):
        errors["email"] = send_results["email"].get("error", "Unknown error")
    if send_results.get("sms") and not send_results["sms"].get("success"):
        errors["sms"] = send_results["sms"].get("error", send_results["sms"].get("message", "Unknown error"))
    
    # Determine what was sent successfully
    sent_via = []
    if send_results.get("email") and send_results["email"].get("success"):
        sent_via.append("email")
    if send_results.get("sms") and send_results["sms"].get("success"):
        sent_via.append("sms")
    
    # Build uniform update fields
    update_fields = {
        # Core tracking fields
        "last_send_result": send_results,
        "last_send_errors": errors,
        "last_send_attempt_at": current_time_iso,
        "sent_to": recipient,
        "send_method": method,
        "pdf_attached": attach_pdf if method == "email" else False,
        "updated_at": current_time_iso,
        
        # Individual email/SMS status tracking
        "email_status": None,
        "sms_status": None,
        "email_sent_at": None,
        "sms_sent_at": None,
    }
    
    # Set email tracking fields
    if send_results.get("email"):
        if send_results["email"].get("success"):
            update_fields["email_sent_at"] = current_time_iso
            update_fields["email_status"] = "sent"
        else:
            update_fields["email_status"] = "failed"
    
    # Set SMS tracking fields  
    if send_results.get("sms"):
        if send_results["sms"].get("success"):
            update_fields["sms_sent_at"] = current_time_iso
            update_fields["sms_status"] = "sent"
        else:
            update_fields["sms_status"] = "failed"
    
    # Legacy compatibility fields
    if sent_via:
        update_fields.update({
            "sent_at": current_time_iso,
            "sent_via": sent_via,
            "last_sent_at": current_time_iso
        })
    
    # Clean up None values (don't update fields that weren't involved)
    cleaned_fields = {k: v for k, v in update_fields.items() if v is not None}
    
    return cleaned_fields


def get_uniform_send_response(
    send_results: Dict[str, Any],
    sent_via: List[str],
    errors: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Creates uniform API response for send operations
    
    Args:
        send_results: Results from email/SMS operations
        sent_via: List of successful send methods ["email", "sms"]
        errors: Dictionary of errors by method
    
    Returns:
        Standardized API response dictionary
    """
    overall_success = len(sent_via) > 0
    current_time_iso = datetime.now(timezone.utc).isoformat()
    
    message = f"Sent via {', '.join(sent_via)}" if overall_success else "Sending failed"
    
    return {
        "success": overall_success,
        "message": message,
        "result": send_results,
        "errors": errors,
        "sent_via": sent_via,
        "sent_at": current_time_iso,
    }