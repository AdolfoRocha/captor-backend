"""
AuditorX Scraper - Customizado para SeguimoresVIP
Extrai informações de perfis de acompanhantes
"""
import argparse
import sys
import json
import re
import time
import random
import requests
from playwright.sync_api import sync_playwright

API_BASE_URL = "http://localhost:3001/api"

def post_target(data: dict, mission_id: str):
    """Post extracted target to the backend API"""
    if not mission_id or not data.get("profile", {}).get("whatsapp"):
        return

    profile = data["profile"]
    payload = {
        "name": profile.get("nome", "Desconhecido"),
        "phone": profile.get("whatsapp_raw") or profile.get("whatsapp"),
        "profileUrl": data.get("url"),  # URL do perfil para o agente navegar
        "missionId": mission_id,
        "scrapedBio": " | ".join(filter(None, [
            profile.get("idade"),
            profile.get("localizacao"),
            ", ".join(profile.get("servicos", [])),
            ", ".join(profile.get("precos", []))
        ]))
    }

    try:
        print(f"   📤 Enviando para o sistema: {payload['name']}...")
        requests.post(f"{API_BASE_URL}/targets", json=payload, timeout=5)
        print("   ✅ Alvo cadastrado com sucesso!")
    except Exception as e:
        print(f"   ⚠️ Erro ao cadastrar alvo: {e}")

def accept_age_verification(page):
    """Handle age verification modal if it appears"""
    try:
        age_button = page.locator("text='Eu tenho +18'").first
        if age_button.is_visible(timeout=3000):
            age_button.click()
            page.wait_for_timeout(1000)
            print("✓ Verificação de idade aceita")
    except:
        pass  # No modal appeared


def scrape_profile(url: str) -> dict:
    """
    Scrape professional information from a profile page
    Customizado para SeguimoresVIP
    """
    print(f"\n🔍 Scraping: {url}\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            page.goto(url, timeout=60000)
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(3000)  # Give time for dynamic content
            
            # Handle age verification
            accept_age_verification(page)
            
            page.wait_for_timeout(2000)
            
            data = {
                "url": url,
                "title": page.title(),
                "profile": {}
            }
            
            # ===== EXTRACT PROFILE INFO =====
            
            # Name (h1 or h2)
            try:
                name = page.locator("h1").first.text_content()
                if name:
                    data["profile"]["nome"] = name.strip()
            except:
                try:
                    name = page.locator("h2").first.text_content()
                    if name:
                        data["profile"]["nome"] = name.strip()
                except:
                    pass
            
            # Location/tagline
            try:
                tagline = page.locator(".brxe-text-basic").first.text_content()
                if tagline:
                    data["profile"]["localizacao"] = tagline.strip()
            except:
                pass
            
            # Get all text content for extraction
            body_text = page.locator("body").text_content() or ""
            
            # Age
            age_match = re.search(r'(\d{2})\s*anos', body_text)
            if age_match:
                data["profile"]["idade"] = f"{age_match.group(1)} anos"
            
            # Height
            height_match = re.search(r'(\d{3})\s*cm', body_text)
            if height_match:
                data["profile"]["altura"] = f"{height_match.group(1)} cm"
            
            # Weight
            weight_match = re.search(r'(\d{2,3})\s*kg', body_text)
            if weight_match:
                data["profile"]["peso"] = f"{weight_match.group(1)} kg"
            
            # Description - look for "Sobre mim" section
            try:
                # Find text blocks that look like descriptions
                text_blocks = page.locator("div").all()
                for block in text_blocks:
                    text = block.text_content() or ""
                    if "Acompanhante" in text and 50 < len(text) < 800:
                        # Clean up the text
                        clean_text = " ".join(text.split())
                        data["profile"]["descricao"] = clean_text[:500]
                        break
            except:
                pass
            
            # Services
            services = []
            service_keywords = ["Namoradinha", "Completo", "Oral", "Massagem", "Duo", 
                              "Fetiches", "Pernoite", "Acessórios", "Viagem"]
            for keyword in service_keywords:
                if keyword.lower() in body_text.lower():
                    services.append(keyword)
            if services:
                data["profile"]["servicos"] = services
            
            # Payment methods
            payments = []
            payment_keywords = ["Pix", "Dinheiro", "Cartão", "Cartao", "Crédito", "Débito"]
            for keyword in payment_keywords:
                if keyword.lower() in body_text.lower():
                    payments.append(keyword)
            if payments:
                data["profile"]["pagamentos"] = list(set(payments))
            
            # Prices
            prices = re.findall(r'R\$\s?\d+(?:[.,]\d+)?', body_text)
            if prices:
                data["profile"]["precos"] = list(set(prices))
            
            # ===== EXTRACT WHATSAPP =====
            
            whatsapp_number = None
            print("   📱 Procurando WhatsApp...")
            
            # Method 1: Click WhatsApp button and intercept navigation
            try:
                # PRIORITIZE "ME CHAME NO WHATSAPP"
                print("   🔍 Buscando botão 'ME CHAME NO WHATSAPP'...")
                wa_button = page.locator("text=/ME CHAME NO WHATSAPP/i").first
                
                if not wa_button.is_visible(timeout=2000):
                     # Try "Falar com"
                     wa_button = page.locator("text=/Falar com/i").first
                     
                if not wa_button.is_visible(timeout=2000):
                     # AVOID GENERIC .btn-zap if possible, or try to find it in the main content only
                     # For now, we follow the user's strict instruction: don't pick the site button.
                     # The site button is usually the LAST one or floating.
                     # The profile button is usually the FIRST one in the main column.
                     pass 
                
                if wa_button.is_visible(timeout=2000):
                    print(f"   ✓ Botão encontrado ({wa_button}), clicando...")
                    
                    # Set up navigation listener to capture the redirect URL
                    captured_url = []
                    
                    def handle_request(request):
                        url = request.url
                        if 'wa.me' in url or 'whatsapp.com' in url or 'api.whatsapp.com' in url:
                            captured_url.append(url)
                    
                    page.on("request", handle_request)
                    
                    # Click and wait for navigation or popup
                    try:
                        with page.expect_popup(timeout=5000) as popup_info:
                            wa_button.click()
                        popup = popup_info.value
                        popup_url = popup.url
                        popup.close()
                        
                        if 'wa.me' in popup_url or 'whatsapp.com' in popup_url:
                            captured_url.append(popup_url)
                    except:
                        # No popup, maybe same-page redirect or just intercepting requests
                        wa_button.click()
                        page.wait_for_timeout(2000)
                        
                    # Extract phone from captured URL
                    for url in captured_url:
                        phone_match = re.search(r'phone=(\d+)', url)
                        if phone_match:
                            whatsapp_number = phone_match.group(1)
                            print(f"   ✓ WhatsApp capturado da URL: {whatsapp_number}")
                            break
                        phone_match = re.search(r'wa\.me/(\d+)', url)
                        if phone_match:
                            whatsapp_number = phone_match.group(1)
                            print(f"   ✓ WhatsApp capturado do wa.me: {whatsapp_number}")
                            break
                            
                    # If request interception failed, try reading href/onclick from the button itself
                    if not whatsapp_number:
                        try:
                            href = wa_button.get_attribute("href")
                            onclick = wa_button.get_attribute("onclick")
                            target_url = (href or "") + (onclick or "")
                            
                            p_match = re.search(r'(?:phone=|wa\.me/|55)(\d{10,})', target_url)
                            if p_match:
                                whatsapp_number = p_match.group(1)
                                if not whatsapp_number.startswith("55") and len(whatsapp_number) <= 11:
                                    whatsapp_number = "55" + whatsapp_number
                                print(f"   ✓ WhatsApp capturado do atributo: {whatsapp_number}")
                        except:
                            pass

            except Exception as e:
                print(f"   ⚠ Método 1 falhou: {e}")
            
            # Method 2: Try to get href from JavaScript
            if not whatsapp_number:
                try:
                    wa_link = page.evaluate('''() => {
                        // Look for WhatsApp button/link
                        const selectors = [
                            '.btn-zap a',
                            'a.btn-zap',
                            'a[href*="wa.me"]',
                            'a[href*="whatsapp"]'
                        ];
                        
                        for (const sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el && el.href) return el.href;
                        }
                        
                        // Look for onclick handlers
                        const buttons = document.querySelectorAll('[onclick*="whatsapp"], [onclick*="wa.me"]');
                        for (const btn of buttons) {
                            const onclick = btn.getAttribute('onclick');
                            const match = onclick && onclick.match(/wa\.me\/(\d+)|phone=(\d+)/);
                            if (match) return match[0];
                        }
                        
                        // Look for data attributes
                        const dataEls = document.querySelectorAll('[data-phone], [data-whatsapp], [data-number]');
                        for (const el of dataEls) {
                            const phone = el.dataset.phone || el.dataset.whatsapp || el.dataset.number;
                            if (phone) return phone;
                        }
                        
                        return null;
                    }''')
                    
                    if wa_link:
                        phone_match = re.search(r'phone=(\d+)', str(wa_link))
                        if phone_match:
                            whatsapp_number = phone_match.group(1)
                        else:
                            phone_match = re.search(r'wa\.me/(\d+)', str(wa_link))
                            if phone_match:
                                whatsapp_number = phone_match.group(1)
                            elif wa_link.isdigit():
                                whatsapp_number = wa_link
                                
                except Exception as e:
                    print(f"   ⚠ Método 2 falhou: {e}")
            
            # Method 3: Find phone in page text
            if not whatsapp_number:
                phone_pattern = r'\(?0?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}'
                phones = re.findall(phone_pattern, body_text)
                if phones:
                    phone = re.sub(r'[^\d]', '', phones[0])
                    if len(phone) >= 10:
                        whatsapp_number = "55" + phone if not phone.startswith("55") else phone
                        print(f"   ✓ Telefone encontrado no texto: {whatsapp_number}")
            
            if whatsapp_number:
                # Format nicely
                if len(whatsapp_number) >= 12:
                    formatted = f"+{whatsapp_number[:2]} {whatsapp_number[2:4]} {whatsapp_number[4:9]}-{whatsapp_number[9:]}"
                    data["profile"]["whatsapp"] = formatted
                    data["profile"]["whatsapp_raw"] = whatsapp_number
                elif len(whatsapp_number) >= 10:
                    data["profile"]["whatsapp"] = whatsapp_number
                    data["profile"]["whatsapp_raw"] = "55" + whatsapp_number
            
            # ===== TAKE SCREENSHOT =====
            screenshot_path = "scrape_result.png"
            page.screenshot(path=screenshot_path, full_page=False)
            data["screenshot"] = screenshot_path
            
            return data
            
        finally:
            browser.close()


def scrape_listing(url: str, max_profiles: int = 5, mission_id: str = None) -> list:
    """
    Scrape the listing page and extract multiple profiles
    """
    print(f"\n🔍 Scraping listing: {url}\n")
    
    profiles = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            
            # Handle age verification
            accept_age_verification(page)
            
            page.wait_for_timeout(2000)
            
            # Find all profile links
            profile_links = page.evaluate('''() => {
                const links = [];
                const anchors = document.querySelectorAll('a[href*="/acompanhantes/"]');
                anchors.forEach(a => {
                    const href = a.href;
                    // Filter: Must match pattern /acompanhantes/CITY/CODE/NAME (approx 4 segments)
                    // Listing pages usually have only /acompanhantes/CITY/ or /acompanhantes/CATEGORY/
                    // So we look for at least 3 slashes after "acompanhantes"
                    
                    if (href && !links.includes(href) && href !== window.location.href) {
                        try {
                            const urlObj = new URL(href);
                            const path = urlObj.pathname;
                            const segments = path.split('/').filter(p => p.length > 0);
                            const acompIndex = segments.indexOf('acompanhantes');
                            
                            // If "acompanhantes" is found, we expect at least 3 parts after it: [city, id, name]
                            if (acompIndex !== -1 && (segments.length - acompIndex) >= 3) {
                                links.push(href);
                            }
                        } catch (e) {}
                    }
                });
                return links;
            }''')
            
            print(f"📋 Encontrados {len(profile_links)} links de perfil")
            
            # Limit and deduplicate
            unique_links = list(set(profile_links))[:max_profiles]
            
            for link in unique_links:
                print(f"\n   → Enfileirado: {link}")
                profiles.append({"url": link, "status": "pending"})
            
            browser.close()
            
        except Exception as e:
            browser.close()
            raise e

    # Now scrape each profile (sequentially with delays)
    for i, profile in enumerate(profiles):
        print(f"\n[{i+1}/{len(profiles)}] processando...")
        try:
            result = scrape_profile(profile["url"])
            profiles[i] = result
            
            # Post to API immediately
            if mission_id:
                post_target(result, mission_id)
                
            # Random delay between profiles (human-like behavior)
            if i < len(profiles) - 1:
                delay = random.randint(15, 30)
                print(f"   ⏳ Aguardando {delay}s para o próximo...")
                time.sleep(delay)
                
        except Exception as e:
            print(f"Error scraping profile: {e}")
            profiles[i]["status"] = "error"
            profiles[i]["error"] = str(e)
    
    return profiles


def print_results(data):
    """Pretty print the scraped data"""
    if isinstance(data, list):
        print("\n" + "=" * 60)
        print(f"📋 RESULTADO DO SCRAPING - {len(data)} PERFIS")
        print("=" * 60)
        for i, profile in enumerate(data):
            print(f"\n{'─' * 60}")
            print(f"PERFIL {i+1}")
            print_single_profile(profile, save_json=False) # Pass save_json=False
    else:
        print_single_profile(data, save_json=False) # Pass save_json=False


def print_single_profile(data, save_json=True):
    """Print single profile data"""
    print("\n" + "=" * 60)
    print("📋 RESULTADO DO SCRAPING")
    print("=" * 60)
    
    if "error" in data:
        print(f"❌ Erro: {data['error']}")
        return
    
    print(f"\n🔗 URL: {data.get('url', 'N/A')}")
    print(f"📄 Título: {data.get('title', 'N/A')}")
    
    profile = data.get("profile", {})
    
    if not profile:
        print("⚠️  Nenhum dado encontrado.")
        return
    
    print("\n" + "-" * 60)
    print("👤 DADOS DO PERFIL:")
    print("-" * 60)
    
    # Display in order
    display_order = ["nome", "idade", "altura", "peso", "localizacao", 
                     "whatsapp", "descricao", "servicos", "pagamentos", "precos"]
    
    icons = {
        "nome": "👤",
        "idade": "🎂",
        "altura": "📏",
        "peso": "⚖️",
        "localizacao": "📍",
        "whatsapp": "📱",
        "descricao": "📝",
        "servicos": "✨",
        "pagamentos": "💳",
        "precos": "💰"
    }
    
    for field in display_order:
        if field in profile:
            value = profile[field]
            icon = icons.get(field, "🔹")
            
            if isinstance(value, list):
                print(f"\n{icon} {field.upper()}:")
                for item in value:
                    print(f"   • {item}")
            else:
                display_val = value[:200] + "..." if len(str(value)) > 200 else value
                print(f"\n{icon} {field.upper()}: {display_val}")
    
    print("\n" + "=" * 60)
    
    # Save to JSON
    if save_json:
        with open("scrape_result.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Dados salvos em: scrape_result.json")
    
    if data.get("screenshot"):
        print(f"📸 Screenshot salvo: {data['screenshot']}")
    
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='AuditorX Scraper')
    parser.add_argument('url', help='URL do perfil ou listagem')
    parser.add_argument('-n', '--number', type=int, default=5, help='Número máximo de perfis')
    parser.add_argument('--mission-id', help='ID da missão para salvar os alvos')
    
    args = parser.parse_args()
    
    try:
        # Check if it looks like a listing
        # A URL de listagem geralmente não tem o último segmento de ID/nome do perfil
        # Ex: https://seguimoresvip.com.br/acompanhantes/fortaleza-ce/ (listing)
        # Ex: https://seguimoresvip.com.br/acompanhantes/fortaleza-ce/fn2k31/ana-julia/ (profile)
        # Contar segmentos após o domínio para heurística simples
        path_segments = [s for s in args.url.split('/') if s]
        is_listing = len(path_segments) <= 4 or "acompanhantes" in args.url and not re.search(r'/acompanhantes/[^/]+/[^/]+/[^/]+/?$', args.url)
        
        if is_listing:
            result = scrape_listing(args.url, args.number, args.mission_id)
        else:
            result = scrape_profile(args.url)
            if args.mission_id:
                post_target(result, args.mission_id)
        
        # Print results to console
        print_results(result)

        # Save JSON as backup (now handled here for both single and multiple profiles)
        with open("scrape_result.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"💾 Dados salvos em: scrape_result.json")
            
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
