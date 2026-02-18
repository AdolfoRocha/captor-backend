"""
WhatsApp Number Checker
Verifica se um número de telefone possui WhatsApp ativo
usando checagem via wa.me redirect
"""
import requests
import re
import time


def normalize_phone(phone: str) -> str:
    """Normaliza número de telefone para formato internacional (55XXXXXXXXXXX)"""
    digits = re.sub(r'[^\d]', '', phone)
    
    # Remove leading + if present in original
    if digits.startswith('0'):
        digits = digits[1:]
    
    # Add country code if missing
    if not digits.startswith('55'):
        digits = '55' + digits
    
    # Remove extra 55 prefix if doubled
    if digits.startswith('5555'):
        digits = digits[2:]
    
    return digits


def format_phone_display(phone: str) -> str:
    """Formata número para exibição: +55 (XX) XXXXX-XXXX"""
    digits = normalize_phone(phone)
    if len(digits) >= 12:
        return f"+{digits[:2]} ({digits[2:4]}) {digits[4:9]}-{digits[9:]}"
    elif len(digits) >= 10:
        return f"+55 ({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    return phone


def check_whatsapp(phone: str, timeout: int = 10) -> dict:
    """
    Verifica se um número possui WhatsApp.
    
    Usa o endpoint wa.me para checar se o número redireciona
    para o WhatsApp (indicando que é um número válido).
    
    Returns:
        dict com keys:
        - phone_raw: número normalizado
        - phone_formatted: número formatado para exibição
        - is_whatsapp: True/False
        - confidence: 'high' | 'medium' | 'low'
    """
    normalized = normalize_phone(phone)
    
    result = {
        "phone_raw": normalized,
        "phone_formatted": format_phone_display(phone),
        "is_whatsapp": False,
        "confidence": "low"
    }
    
    if len(normalized) < 12:
        return result
    
    try:
        # Method 1: Check wa.me redirect
        url = f"https://wa.me/{normalized}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        
        # If we get a 200 and the page contains "WhatsApp" or chat elements,
        # it likely means the number exists
        if resp.status_code == 200:
            page_text = resp.text.lower()
            
            # Check for indicators that the number is valid
            if 'send_api' in page_text or 'action="/send"' in page_text.lower():
                result["is_whatsapp"] = True
                result["confidence"] = "high"
            elif 'whatsapp' in page_text and 'message' in page_text:
                result["is_whatsapp"] = True
                result["confidence"] = "medium"
            elif resp.url and 'send' in resp.url:
                result["is_whatsapp"] = True
                result["confidence"] = "medium"
            # If 404-like or "invalid" page
            elif 'not found' in page_text or 'invalid' in page_text:
                result["is_whatsapp"] = False
                result["confidence"] = "high"
        
    except requests.exceptions.Timeout:
        result["confidence"] = "low"
    except Exception as e:
        result["error"] = str(e)
        result["confidence"] = "low"
    
    return result


def check_whatsapp_batch(phones: list, delay: float = 1.0) -> list:
    """
    Verifica uma lista de números.
    Adiciona delay entre as checagens para evitar rate-limiting.
    """
    results = []
    for i, phone in enumerate(phones):
        print(f"   📱 Verificando WhatsApp ({i+1}/{len(phones)}): {phone}...")
        result = check_whatsapp(phone)
        results.append(result)
        
        status = "✅ WhatsApp" if result["is_whatsapp"] else "❌ Não é WhatsApp"
        print(f"      {status} (confiança: {result['confidence']})")
        
        if i < len(phones) - 1:
            time.sleep(delay)
    
    return results


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python whatsapp_checker.py <numero1> [numero2] ...")
        sys.exit(1)
    
    phones = sys.argv[1:]
    results = check_whatsapp_batch(phones)
    
    print("\n" + "=" * 50)
    print("📊 RESULTADO DA VERIFICAÇÃO")
    print("=" * 50)
    
    valid = sum(1 for r in results if r["is_whatsapp"])
    print(f"\n✅ WhatsApp válidos: {valid}/{len(results)}")
    
    for r in results:
        status = "✅" if r["is_whatsapp"] else "❌"
        print(f"  {status} {r['phone_formatted']} ({r['confidence']})")
