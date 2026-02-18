"""
Captor - Google Maps Business Scraper
Busca empresas por nicho e localização no Google Maps,
extrai dados de contato e verifica WhatsApp.
"""
import argparse
import sys
import json
import re
import time
import random
import requests
from playwright.sync_api import sync_playwright
from whatsapp_checker import check_whatsapp, normalize_phone, format_phone_display

API_BASE_URL = "http://localhost:3001/api"


def post_gmaps_lead(data: dict, search_query: str = "", search_location: str = ""):
    """Post extracted Google Maps lead to the backend API as a Lead (not Target)"""
    phone = data.get("phone_raw") or data.get("phone", "")
    if not phone:
        return

    payload = {
        "name": data.get("name", "Empresa Desconhecida"),
        "phone": data.get("phone_formatted", phone),
        "phoneRaw": data.get("phone_raw", phone),
        "category": data.get("category", ""),
        "address": data.get("address", ""),
        "website": data.get("website", ""),
        "rating": data.get("rating", ""),
        "reviews": data.get("reviews", ""),
        "isWhatsapp": data.get("is_whatsapp", False),
        "waConfidence": data.get("wa_confidence", "low"),
        "searchQuery": search_query,
        "searchLocation": search_location,
    }

    try:
        print(f"   📤 Salvando lead: {payload['name']}...")
        resp = requests.post(f"{API_BASE_URL}/leads", json=payload, timeout=5)
        if resp.status_code in (200, 201):
            print(f"   ✅ Lead salvo com sucesso!")
        else:
            print(f"   ⚠️ Resposta inesperada: {resp.status_code}")
    except Exception as e:
        print(f"   ⚠️ Erro ao salvar lead: {e}")


def extract_phone_from_text(text: str) -> str:
    """Extrai número de telefone de texto"""
    # Padrões brasileiros comuns
    patterns = [
        r'\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}',
        r'\+55\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return ""


def scrape_google_maps(query: str, location: str, max_results: int = 20) -> list:
    """
    Busca empresas no Google Maps por nicho e localização.
    
    Args:
        query: Nicho/segmento (ex: "Clínicas odontológicas")
        location: Localização (ex: "São Paulo, SP")
        max_results: Número máximo de resultados
    
    Returns:
        Lista de dicts com dados das empresas
    """
    search_query = f"{query} em {location}" if location else query
    maps_url = f"https://www.google.com/maps/search/{requests.utils.quote(search_query)}"
    
    print(f"\n🗺️  Google Maps Scraper")
    print(f"=" * 60)
    print(f"🔍 Busca: {search_query}")
    print(f"📍 URL: {maps_url}")
    print(f"🎯 Máximo de resultados: {max_results}")
    print(f"=" * 60)
    
    leads = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            locale='pt-BR',
            geolocation=None,
            viewport={'width': 1280, 'height': 900}
        )
        page = context.new_page()
        
        try:
            # Navigate to Google Maps search
            print(f"\n🌐 Abrindo Google Maps...")
            page.goto(maps_url, timeout=60000)
            page.wait_for_load_state("networkidle", timeout=30000)
            time.sleep(3)
            
            # Accept cookies/consent if prompted
            try:
                consent_btn = page.locator("button:has-text('Aceitar'), button:has-text('Accept'), form[action*='consent'] button").first
                if consent_btn.is_visible(timeout=3000):
                    consent_btn.click()
                    time.sleep(2)
                    print("   ✓ Consentimento aceito")
            except:
                pass
            
            # Wait for results to load - look for the results feed
            print("   ⏳ Aguardando resultados...")
            try:
                page.wait_for_selector('[role="feed"], .m6QErb', timeout=15000)
            except:
                # Try alternative selectors
                try:
                    page.wait_for_selector('.Nv2PK, .hfpxzc', timeout=10000)
                except:
                    print("   ⚠️ Nenhum resultado encontrado na página")
            
            time.sleep(2)
            
            # Scroll to load more results
            print(f"\n📜 Carregando resultados (scroll)...")
            feed = page.locator('[role="feed"], .m6QErb.DxyBCb').first
            
            previous_count = 0
            scroll_attempts = 0
            max_scroll_attempts = 15
            
            while scroll_attempts < max_scroll_attempts:
                # Count current items
                items = page.locator('.Nv2PK, .hfpxzc').all()
                current_count = len(items)
                
                print(f"   📊 Encontrados: {current_count} empresas (scroll {scroll_attempts + 1})")
                
                if current_count >= max_results:
                    print(f"   ✓ Limite de {max_results} atingido!")
                    break
                
                if current_count == previous_count:
                    scroll_attempts += 1
                    if scroll_attempts >= 3:
                        # Check if we hit "end of results"
                        end_text = page.locator("text=/Você chegou ao fim|end of list|No more results/i")
                        try:
                            if end_text.is_visible(timeout=1000):
                                print("   ✓ Fim dos resultados")
                                break
                        except:
                            pass
                else:
                    scroll_attempts = 0
                
                previous_count = current_count
                
                # Scroll down in the feed panel
                try:
                    feed.evaluate("el => el.scrollTop = el.scrollHeight")
                except:
                    page.keyboard.press("End")
                
                time.sleep(random.uniform(1.5, 3.0))
            
            # Now extract data from each result
            items = page.locator('.Nv2PK, .hfpxzc').all()
            total_items = min(len(items), max_results)
            
            print(f"\n🔎 Extraindo dados de {total_items} empresas...")
            print(f"{'─' * 60}")
            
            for i in range(total_items):
                try:
                    # Re-query items as DOM may have changed
                    items = page.locator('.Nv2PK, .hfpxzc').all()
                    if i >= len(items):
                        break
                    
                    item = items[i]
                    
                    print(f"\n[{i+1}/{total_items}] Processando...")
                    
                    # Click on the item to open details
                    try:
                        item.click(timeout=5000)
                    except:
                        # Try clicking the link inside
                        link = item.locator('a').first
                        link.click(timeout=5000)
                    
                    time.sleep(random.uniform(2.0, 3.5))
                    
                    lead = extract_business_details(page)
                    
                    if lead.get("name"):
                        print(f"   🏢 {lead['name']}")
                        
                        if lead.get("phone"):
                            print(f"   📞 {lead['phone']}")
                            
                            # Check WhatsApp
                            print(f"   📱 Verificando WhatsApp...")
                            wa_result = check_whatsapp(lead["phone"])
                            lead["is_whatsapp"] = wa_result["is_whatsapp"]
                            lead["phone_raw"] = wa_result["phone_raw"]
                            lead["phone_formatted"] = wa_result["phone_formatted"]
                            lead["wa_confidence"] = wa_result["confidence"]
                            
                            status = "✅ WhatsApp válido" if lead["is_whatsapp"] else "❌ Não é WhatsApp"
                            print(f"   {status}")
                            
                            # Only add leads with WhatsApp
                            if lead["is_whatsapp"]:
                                leads.append(lead)
                                
                                # Post to API
                                post_gmaps_lead(lead, search_query=query, search_location=location)
                            else:
                                print(f"   ⏭️  Pulando (sem WhatsApp)")
                        else:
                            print(f"   ⚠️ Sem telefone encontrado")
                    
                    # Go back to results list
                    try:
                        back_btn = page.locator('button[aria-label*="Voltar"], button[aria-label*="Back"]').first
                        if back_btn.is_visible(timeout=2000):
                            back_btn.click()
                            time.sleep(1.5)
                    except:
                        page.keyboard.press("Escape")
                        time.sleep(1)
                    
                    # Random delay
                    time.sleep(random.uniform(1.0, 2.0))
                    
                except Exception as e:
                    print(f"   ⚠️ Erro ao processar item {i+1}: {e}")
                    # Try to go back
                    try:
                        page.keyboard.press("Escape")
                        time.sleep(1)
                    except:
                        pass
                    continue
            
        except Exception as e:
            print(f"\n❌ Erro durante scraping: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    return leads


def extract_business_details(page) -> dict:
    """Extrai detalhes de uma empresa da página de detalhes do Google Maps"""
    lead = {
        "name": "",
        "category": "",
        "address": "",
        "phone": "",
        "website": "",
        "rating": "",
        "reviews": "",
        "hours": "",
    }
    
    try:
        # Name
        try:
            name_el = page.locator('h1, [data-attrid="title"] span, .DUwDvf, .fontHeadlineLarge').first
            name = name_el.text_content(timeout=3000)
            if name:
                lead["name"] = name.strip()
        except:
            pass
        
        # Category / Type
        try:
            cat_el = page.locator('button[jsaction*="category"], .DkEaL, .fontBodyMedium button').first
            cat = cat_el.text_content(timeout=2000)
            if cat:
                lead["category"] = cat.strip()
        except:
            pass
        
        # Rating
        try:
            rating_el = page.locator('.F7nice span[aria-hidden="true"], .fontDisplayLarge, .ceNzKf [role="img"]').first
            rating_text = rating_el.text_content(timeout=2000)
            if rating_text:
                lead["rating"] = rating_text.strip().replace(',', '.')
        except:
            pass
        
        # Reviews count
        try:
            reviews_el = page.locator('.F7nice span[aria-label*="avaliação"], .F7nice span[aria-label*="review"]').first
            reviews_text = reviews_el.text_content(timeout=2000)
            if reviews_text:
                nums = re.findall(r'[\d.]+', reviews_text.replace('.', ''))
                if nums:
                    lead["reviews"] = nums[0]
        except:
            pass
        
        # Extract info from the info buttons/rows
        # Google Maps uses buttons with data-item-id for phone, address, website, etc.
        info_buttons = page.locator('button[data-item-id], a[data-item-id]').all()
        
        for btn in info_buttons:
            try:
                item_id = btn.get_attribute("data-item-id") or ""
                aria_label = btn.get_attribute("aria-label") or ""
                text = btn.text_content(timeout=1000) or ""
                
                # Phone
                if 'phone' in item_id or 'tel:' in item_id:
                    phone = aria_label.replace("Telefone:", "").replace("Phone:", "").strip()
                    if not phone:
                        phone = text.strip()
                    if phone:
                        lead["phone"] = phone
                
                # Address
                elif 'address' in item_id or 'oloc' in item_id:
                    addr = aria_label.replace("Endereço:", "").replace("Address:", "").strip()
                    if not addr:
                        addr = text.strip()
                    if addr:
                        lead["address"] = addr
                
                # Website
                elif 'authority' in item_id or 'website' in item_id:
                    site = aria_label.replace("Site:", "").replace("Website:", "").strip()
                    if not site:
                        site = text.strip()
                    if site:
                        lead["website"] = site
                
                # Hours
                elif 'hours' in item_id or 'oh' in item_id:
                    hours_text = aria_label or text
                    if hours_text:
                        lead["hours"] = hours_text.strip()[:100]
                        
            except:
                continue
        
        # Fallback: try extracting phone from full page text if not found
        if not lead["phone"]:
            try:
                body_text = page.locator('[role="main"]').text_content(timeout=3000) or ""
                phone = extract_phone_from_text(body_text)
                if phone:
                    lead["phone"] = phone
            except:
                pass
        
    except Exception as e:
        print(f"   ⚠️ Erro ao extrair detalhes: {e}")
    
    return lead


def print_results_summary(leads: list):
    """Imprime resumo dos leads encontrados"""
    print(f"\n{'=' * 60}")
    print(f"📊 RESULTADO DA BUSCA - Google Maps")
    print(f"{'=' * 60}")
    
    total = len(leads)
    wa_valid = sum(1 for l in leads if l.get("is_whatsapp"))
    
    print(f"\n✅ Total de leads com WhatsApp: {wa_valid}")
    print(f"📊 Total processado: {total}")
    
    for i, lead in enumerate(leads):
        wa_icon = "✅" if lead.get("is_whatsapp") else "❌"
        print(f"\n{'─' * 40}")
        print(f"[{i+1}] {lead.get('name', 'N/A')}")
        print(f"   📍 {lead.get('address', 'N/A')}")
        print(f"   📞 {lead.get('phone_formatted', lead.get('phone', 'N/A'))}")
        print(f"   {wa_icon} WhatsApp: {'Sim' if lead.get('is_whatsapp') else 'Não'}")
        if lead.get("category"):
            print(f"   🏷️  {lead['category']}")
        if lead.get("rating"):
            print(f"   ⭐ {lead['rating']} ({lead.get('reviews', '?')} avaliações)")
    
    print(f"\n{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Captor - Google Maps Business Scraper')
    parser.add_argument('--query', '-q', required=True, help='Nicho/segmento para buscar (ex: "Academias")')
    parser.add_argument('--location', '-l', required=True, help='Localização (ex: "São Paulo, SP")')
    parser.add_argument('--max', '-n', type=int, default=20, help='Número máximo de resultados')
    
    args = parser.parse_args()
    
    try:
        leads = scrape_google_maps(
            query=args.query,
            location=args.location,
            max_results=args.max
        )
        
        print_results_summary(leads)
        
        # Save JSON
        output_file = "gmaps_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(leads, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Dados salvos em: {output_file}")
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
