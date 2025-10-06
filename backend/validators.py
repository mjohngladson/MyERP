"""
Comprehensive validation utilities for ERP transactions
"""
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional


def validate_required_fields(data: Dict[str, Any], required_fields: List[str], document_type: str = "Document"):
    """
    Validate that required fields are present and not empty
    
    Args:
        data: Dictionary containing the data to validate
        required_fields: List of field names that are required
        document_type: Type of document for error messages (e.g., "Quotation", "Sales Order")
    
    Raises:
        HTTPException: If any required field is missing or empty
    """
    # Field name mapping for better error messages
    field_labels = {
        "customer_name": "Customer Name",
        "customer_id": "Customer",
        "supplier_name": "Supplier Name",
        "supplier_id": "Supplier",
        "items": "Items",
        "invoice_number": "Invoice Number",
        "quotation_number": "Quotation Number",
        "order_number": "Order Number",
        "party_name": "Party Name",
        "party_id": "Party",
        "payment_type": "Payment Type",
        "payment_method": "Payment Method",
        "payment_date": "Payment Date",
        "amount": "Amount",
        "reference_invoice": "Reference Invoice"
    }
    
    missing_fields = []
    empty_fields = []
    
    for field in required_fields:
        if field not in data:
            missing_fields.append(field_labels.get(field, field))
        elif data[field] is None or (isinstance(data[field], str) and not data[field].strip()):
            empty_fields.append(field_labels.get(field, field))
        elif isinstance(data[field], list) and len(data[field]) == 0:
            empty_fields.append(field_labels.get(field, field))
    
    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Please provide the following required field(s): {', '.join(missing_fields)}"
        )
    
    if empty_fields:
        raise HTTPException(
            status_code=400,
            detail=f"The following field(s) cannot be empty: {', '.join(empty_fields)}"
        )


def validate_items(items: List[Dict[str, Any]], document_type: str = "Document"):
    """
    Validate transaction items (quotations, orders, invoices)
    
    Args:
        items: List of item dictionaries
        document_type: Type of document for error messages
    
    Raises:
        HTTPException: If items are invalid
    """
    if not items or len(items) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Please add at least one item to the {document_type.lower()}"
        )
    
    for idx, item in enumerate(items):
        # Check required item fields
        if not item.get("item_name"):
            raise HTTPException(
                status_code=400,
                detail=f"Item #{idx + 1}: Please select or enter an item name"
            )
        
        # Validate quantity
        try:
            quantity = float(item.get("quantity", 0))
            if quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item '{item.get('item_name')}': Quantity must be greater than 0"
                )
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail=f"Item '{item.get('item_name')}': Please enter a valid quantity"
            )
        
        # Validate rate
        try:
            rate = float(item.get("rate", 0))
            if rate < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item '{item.get('item_name')}': Rate cannot be negative"
                )
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail=f"Item '{item.get('item_name')}': Please enter a valid rate"
            )


def validate_amounts(data: Dict[str, Any], document_type: str = "Document"):
    """
    Validate monetary amounts
    
    Args:
        data: Dictionary containing amount fields
        document_type: Type of document for error messages
    
    Raises:
        HTTPException: If amounts are invalid
    """
    # Validate total amount
    total_amount = data.get("total_amount", 0)
    try:
        total_amount = float(total_amount)
        if total_amount < 0:
            raise HTTPException(
                status_code=400,
                detail="Total amount cannot be negative"
            )
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid total amount"
        )
    
    # Validate discount
    discount = data.get("discount_amount", 0)
    try:
        discount = float(discount)
        if discount < 0:
            raise HTTPException(
                status_code=400,
                detail="Discount amount cannot be negative"
            )
        
        subtotal = float(data.get("subtotal", 0))
        if discount > subtotal:
            raise HTTPException(
                status_code=400,
                detail="Discount amount cannot be greater than the subtotal"
            )
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid discount amount"
        )
    
    # Validate tax rate
    tax_rate = data.get("tax_rate", 0)
    try:
        tax_rate = float(tax_rate)
        if tax_rate < 0 or tax_rate > 100:
            raise HTTPException(
                status_code=400,
                detail="Tax rate must be between 0% and 100%"
            )
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid tax rate"
        )


def validate_status_transition(current_status: str, new_status: str, allowed_transitions: Dict[str, List[str]], document_type: str = "Document"):
    """
    Validate status transitions
    
    Args:
        current_status: Current status of the document
        new_status: New status to transition to
        allowed_transitions: Dictionary mapping current status to list of allowed next statuses
        document_type: Type of document for error messages
    
    Raises:
        HTTPException: If status transition is not allowed
    """
    if current_status == new_status:
        return  # No transition
    
    allowed = allowed_transitions.get(current_status, [])
    if new_status not in allowed:
        if allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot change status from '{current_status}' to '{new_status}'. Valid next status options: {', '.join(allowed)}"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot change status from '{current_status}' as it is a final state"
            )


def validate_dates(data: Dict[str, Any], document_type: str = "Document", check_future: bool = False):
    """
    Validate date fields
    
    Args:
        data: Dictionary containing date fields
        document_type: Type of document for error messages
        check_future: If True, prevent future dates for completed transactions
    
    Raises:
        HTTPException: If dates are invalid
    """
    date_fields = ["quotation_date", "order_date", "invoice_date", "credit_note_date", "debit_note_date", "payment_date"]
    
    for field in date_fields:
        if field in data and data[field]:
            date_value = data[field]
            
            # Try to parse the date
            try:
                if isinstance(date_value, str):
                    parsed_date = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                elif isinstance(date_value, datetime):
                    parsed_date = date_value
                else:
                    continue
                
                # Check if date is in the future (for certain statuses)
                if check_future and data.get("status") in ["submitted", "paid", "fulfilled", "applied", "issued"]:
                    now = datetime.now(timezone.utc)
                    if parsed_date > now:
                        raise HTTPException(
                            status_code=400,
                            detail=f"{document_type}: {field} cannot be in the future for submitted/completed documents"
                        )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"{document_type}: invalid date format for {field}"
                )


def validate_reference(reference_id: str, reference_field: str, collection, document_type: str = "Document"):
    """
    Validate that a referenced document exists (for async use)
    
    This is a sync wrapper - use validate_reference_async in async contexts
    
    Args:
        reference_id: ID of the referenced document
        reference_field: Name of the reference field (for error messages)
        collection: MongoDB collection to check
        document_type: Type of document for error messages
    """
    # This is just a placeholder for the pattern
    # Actual validation should be done in the route handlers using await
    pass


async def validate_reference_async(reference_id: str, reference_field: str, collection, document_type: str = "Document"):
    """
    Validate that a referenced document exists
    
    Args:
        reference_id: ID of the referenced document
        reference_field: Name of the reference field (for error messages)
        collection: MongoDB collection to check
        document_type: Type of document for error messages
    
    Raises:
        HTTPException: If referenced document doesn't exist
    """
    if not reference_id:
        return  # Optional reference
    
    referenced_doc = await collection.find_one({"id": reference_id})
    if not referenced_doc:
        raise HTTPException(
            status_code=404,
            detail=f"{document_type}: Referenced {reference_field} '{reference_id}' not found"
        )


def validate_transaction_update(existing_status: str, document_type: str = "Document"):
    """
    Validate that a transaction can be updated (not submitted/finalized)
    
    Args:
        existing_status: Current status of the document
        document_type: Type of document for error messages
    
    Raises:
        HTTPException: If document cannot be updated
    """
    immutable_statuses = ["submitted", "paid", "fulfilled", "applied", "issued", "accepted"]
    if existing_status in immutable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"This {document_type.lower()} cannot be modified because it has been {existing_status}. Only draft documents can be edited."
        )


def validate_transaction_delete(existing_status: str, document_type: str = "Document"):
    """
    Validate that a transaction can be deleted (only draft/cancelled)
    
    Args:
        existing_status: Current status of the document
        document_type: Type of document for error messages
    
    Raises:
        HTTPException: If document cannot be deleted
    """
    allowed_delete_statuses = ["draft", "cancelled"]
    if existing_status not in allowed_delete_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"This {document_type.lower()} cannot be deleted because it has been {existing_status}. Only draft or cancelled documents can be deleted."
        )


# Status transition rules for different document types
QUOTATION_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["won", "lost", "cancelled"],
    "won": [],  # Final state
    "lost": [],  # Final state
    "cancelled": []  # Final state
}

SALES_ORDER_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["fulfilled", "cancelled"],
    "fulfilled": [],  # Final state
    "cancelled": []  # Final state
}

SALES_INVOICE_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["paid", "overdue", "cancelled"],
    "paid": [],  # Final state
    "overdue": ["paid", "cancelled"],
    "cancelled": []  # Final state
}

PURCHASE_ORDER_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["fulfilled", "cancelled"],
    "fulfilled": [],  # Final state
    "cancelled": []  # Final state
}

PURCHASE_INVOICE_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["paid", "cancelled"],
    "paid": [],  # Final state
    "cancelled": []  # Final state
}

CREDIT_NOTE_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["issued", "cancelled"],
    "issued": ["applied"],
    "applied": [],  # Final state
    "cancelled": []  # Final state
}

DEBIT_NOTE_STATUS_TRANSITIONS = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["issued", "cancelled"],
    "issued": ["applied", "accepted"],
    "applied": [],  # Final state
    "accepted": [],  # Final state
    "cancelled": []  # Final state
}
