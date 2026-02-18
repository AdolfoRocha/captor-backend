"""
AuditorX Local Agent
Main entry point for the WhatsApp automation agent

FLUXO:
1. Busca trabalho pendente da API (pode ser 'scrape' ou 'message')
2. Se 'scrape': Navega até o perfil, extrai dados (telefone, bio), retorna para salvar no banco.
3. Se 'message': Recebe telefone já salvo, abre WhatsApp e envia mensagem.
"""
import os
import time
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Page, Browser

load_dotenv()

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001/api")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"

# WhatsApp selectors - Múltiplas opções para robustez
WHATSAPP_SELECTORS = {
    "input_box": [
        '[data-testid="conversation-compose-box-input"]',
        '[contenteditable="true"][data-tab="10"]',
        'div[contenteditable="true"][role="textbox"]',
        'footer [contenteditable="true"]',
        '#main footer [contenteditable="true"]',
        'div[title="Digite uma mensagem"]',
        'div[title="Type a message"]',
    ],
    "send_button": [
        '[data-testid="send"]',
        'span[data-icon="send"]',
        '[aria-label="Enviar"]',
        '[aria-label="Send"]',
        'button[aria-label*="enviar" i]',
        'button[aria-label*="send" i]',
        # O botão de enviar na URL de wa.me fica em uma posição diferente
        '[data-testid="compose-btn-send"]',
        # Fallback: qualquer botão com ícone de enviar
        'button span[data-icon="send"]',
        '[role="button"] span[data-icon="send"]',
    ],
    "chat_ready": [
        '[data-testid="conversation-panel-wrapper"]',
        '#main header',
        '[data-testid="conversation-header"]',
    ],
    "logged_in": [
        '[data-testid="chat-list"]',
        '[data-testid="side"]',
        '#pane-side',
    ],
    # Botão especial que aparece quando vem de um wa.me link com texto
    "send_text_button": [
        'button[aria-label="Enviar mensagem"]',
        'button[aria-label="Send message"]',
        '[data-testid="send"]',
    ]
}


class AuditorXAgent:
    def __init__(self):
        self.browser: Browser = None
        self.page: Page = None
        self.whatsapp_page: Page = None
        self.conversation_log = []
        
    def start(self):
        """Start the agent with Playwright"""
        print("🚀 Starting AuditorX Agent...")
        
        with sync_playwright() as p:
            # Launch browser with persistent context for session storage
            user_data_dir = os.path.join(os.path.dirname(__file__), "browser_data")
            
            self.browser = p.chromium.launch_persistent_context(
                user_data_dir,
                headless=HEADLESS,
                viewport={"width": 1400, "height": 900},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            # Get or create main page
            if self.browser.pages:
                self.page = self.browser.pages[0]
            else:
                self.page = self.browser.new_page()
            
            # Check/ensure WhatsApp is logged in
            self._ensure_whatsapp_logged_in()
            
            # Main loop
            self._run_loop()
            
    def _ensure_whatsapp_logged_in(self):
        """Make sure WhatsApp Web is logged in"""
        print("📱 Checking WhatsApp Web login status...")
        
        # Go to WhatsApp
        self.page.goto("https://web.whatsapp.com", wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        
        # Check if logged in
        def is_logged_in():
            for sel in WHATSAPP_SELECTORS["logged_in"]:
                try:
                    if self.page.locator(sel).is_visible(timeout=1000):
                        return True
                except:
                    pass
            return False
        
        if is_logged_in():
            print("✅ WhatsApp Web already logged in!")
            self._report_status("CONNECTED")
            return
        
        print("⏳ Please scan QR code...")
        
        # Wait for login
        while True:
            if is_logged_in():
                print("✅ WhatsApp Web logged in!")
                self._report_status("CONNECTED")
                break
            
            # Extract QR code data ref if possible
            qr_code = self._extract_qr_code()
            self._report_status("WAITING_QR", qr_code=qr_code)
            
            time.sleep(2)
            print(".", end="", flush=True)
            
    def _extract_qr_code(self):
        """Take a screenshot of the QR code and return base64 string"""
        try:
            # Selector for the container that has data-ref or the canvas
            # canvas is usually where the QR is drawn
            element = self.page.locator('canvas').first
            if element.is_visible():
                screenshot_bytes = element.screenshot()
                import base64
                return base64.b64encode(screenshot_bytes).decode('utf-8')
            
            # Fallback to container if canvas not found (older versions?)
            element = self.page.locator('div[data-ref]').first
            if element.is_visible():
                screenshot_bytes = element.screenshot()
                import base64
                return base64.b64encode(screenshot_bytes).decode('utf-8')
                
            return None
        except Exception as e:
            return None

    def _report_status(self, status: str, qr_code: str = None, current_action: str = None):
        """Report agent status to server"""
        try:
            requests.post(
                f"{API_BASE_URL}/agent/status",
                json={
                    "status": status, 
                    "qrCode": qr_code,
                    "currentAction": current_action or ""
                },
                timeout=5
            )
        except Exception as e:
            pass  # Silently fail
            
    def _log(self, message: str, log_type: str = "info"):
        """Send log to server and print locally"""
        print(f"   [{log_type.upper()}] {message}")
        try:
            requests.post(
                f"{API_BASE_URL}/agent/logs",
                json={"type": log_type, "message": message},
                timeout=2
            )
        except:
            pass  # Silently fail
        
    def _run_loop(self):
        """Main polling loop"""
        self._log("🔄 Loop de polling iniciado", "info")
        self._report_status("CONNECTED", current_action="Aguardando trabalho...")
        
        while True:
            try:
                self._report_status("CONNECTED", current_action="Verificando alvos pendentes...")
                work = self._fetch_pending_work()
                
                if work and work.get("hasWork"):
                    target = work["target"]
                    mission = work["mission"]
                    job_type = work.get("jobType", "scrape") # fallback default
                    
                    self._log(f"📋 Novo trabalho ({job_type}): {target['name']}", "work")
                    self._report_status("CONNECTED", current_action=f"{job_type.upper()}: {target['name']}")
                    
                    if job_type == 'scrape':
                        result = self._handle_scraping(target, mission)
                        success = result.get("success", False)
                        scraped_data = result.get("data", None)
                        
                        if success:
                            self._log(f"✅ Scraping concluído para {target['name']}!", "success")
                            self._report_result(
                                target_id=target["id"],
                                status="scraped",
                                messages=[],
                                scraped_data=scraped_data
                            )
                        else:
                            self._log(f"❌ Scraping falhou para {target['name']}", "error")
                            self._report_result(
                                target_id=target["id"],
                                status="failed",
                                messages=self.conversation_log
                            )

                    elif job_type == 'message':
                        success = self._handle_messaging(target, mission)
                        
                        if success:
                            self._log(f"✅ Mensagem enviada para {target['name']}!", "success")
                            self._report_result(
                                target_id=target["id"],
                                status="completed",
                                messages=self.conversation_log
                            )
                        else:
                            self._log(f"❌ Falha ao enviar mensagem para {target['name']}", "error")
                            self._report_result(
                                target_id=target["id"],
                                status="failed",
                                messages=self.conversation_log
                            )
                    
                    self.conversation_log = []
                    self._report_status("CONNECTED", current_action="Aguardando próximo trabalho...")
                else:
                    # No work available - this is normal
                    self._report_status("CONNECTED", current_action="Nenhum trabalho pendente. Aguardando...")
                    
            except Exception as e:
                self._log(f"❌ Erro: {str(e)}", "error")
                self._report_status("CONNECTED", current_action=f"Erro: {str(e)[:50]}")
                import traceback
                traceback.print_exc()
            
            # Prevent tab buildup: Close all pages that might be left open
            self._cleanup_tabs()
                
            time.sleep(POLL_INTERVAL)
            
    def _cleanup_tabs(self):
        """Force close all pages except one blank one to keep browser alive"""
        try:
            pages = self.browser.pages
            # If we have too many pages, close all but the last one (or create a new blank one and close others)
            # Keep at least one page open
            if len(pages) > 1:
                self._log(f"🧹 Limpando {len(pages)} abas abertas...", "info")
                for page in pages[:-1]:
                    try:
                        page.close()
                    except:
                        pass
                # Reset self.page to the remaining one if possible
                if not self.page or self.page.is_closed():
                    self.page = pages[-1]
            elif len(pages) == 0:
                 self.page = self.browser.new_page()
            elif len(pages) == 1:
                 # Ensure the single page is blank-ish so it doesn't run heavy scripts
                 if "whatsapp" in pages[0].url:
                     try:
                         pages[0].goto("about:blank")
                     except:
                         pass
                 self.page = pages[0]
        except Exception as e:
            print(f"Error cleaning tabs: {e}")
            
    def _fetch_pending_work(self):
        """Fetch pending work from the API"""
        try:
            response = requests.get(f"{API_BASE_URL}/agent/pending", timeout=10)
            return response.json()
        except Exception as e:
            return None
            
    def _handle_scraping(self, target, mission) -> dict:
        """Go to profile, find phone number AND details, return data"""
        try:
            profile_url = target.get("profileUrl")
            self._log(f"🕵️ Iniciando scraping: {profile_url}", "info")
            
            if not profile_url:
                self._log("❌ Sem URL de perfil para fazer scraping", "error")
                return {"success": False}

            # Open the profile page
            profile_page = self.browser.new_page()
            try:
                profile_page.goto(profile_url, timeout=45000)
                profile_page.wait_for_load_state("domcontentloaded")
                time.sleep(3)
                
                # Handle age verification if present
                try:
                    age_btn = profile_page.locator("text='Eu tenho +18'").first
                    if age_btn.is_visible(timeout=3000):
                        age_btn.click()
                        time.sleep(1)
                except:
                    pass

                # ===== EXTRACT PROFILE DATA =====
                scraped_data = {
                    "name": "Desconhecido",
                    "bio": "",
                    "services": [],
                    "price": ""
                }
                
                # 1. Name
                try:
                    name = profile_page.locator("h1").first.text_content()
                    if name: scraped_data["name"] = name.strip()
                except:
                    try:
                        name = profile_page.locator("h2").first.text_content()
                        if name: scraped_data["name"] = name.strip()
                    except: pass
                
                # 2. Body Text for regex extraction
                body_text = profile_page.locator("body").text_content() or ""
                
                # 3. Details (Age, Location, etc)
                details = []
                import re # Ensure re is imported
                
                # Age
                age_match = re.search(r'(\d{2})\s*anos', body_text)
                if age_match: details.append(f"{age_match.group(1)} anos")
                
                # Height/Weight
                height_match = re.search(r'(\d{3})\s*cm', body_text)
                if height_match: details.append(f"{height_match.group(1)}cm")
                
                # Location
                try:
                    loc = profile_page.locator(".brxe-text-basic").first.text_content()
                    if loc: details.append(loc.strip())
                except: pass
                
                # Services
                services = []
                service_keywords = ["Namoradinha", "Completo", "Oral", "Massagem", "Duo", 
                                  "Fetiches", "Pernoite", "Acessórios", "Viagem"]
                for keyword in service_keywords:
                    if keyword.lower() in body_text.lower():
                        services.append(keyword)
                if services: details.append(", ".join(services))
                
                # Prices
                prices = re.findall(r'R\$\s?\d+(?:[.,]\d+)?', body_text)
                if prices:
                    unique_prices = list(set(prices))
                    details.append(f"Preços: {', '.join(unique_prices)}")
                    
                scraped_data["bio"] = " | ".join(details)

                # ===== EXTRACT WHATSAPP BY CLICKING BUTTON =====
                wa_button = None
                
                # 1. Try specific text "ME CHAME NO WHATSAPP"
                try:
                    target_btn = profile_page.locator("text=/ME CHAME NO WHATSAPP/i").first
                    if target_btn.is_visible(timeout=2000):
                        wa_button = target_btn
                        self._log("✓ Botão 'ME CHAME NO WHATSAPP' encontrado", "info")
                except:
                    pass
                
                if not wa_button:
                     # 2. Try generic text
                     try:
                        wa_button = profile_page.locator("a", has_text="WhatsApp").first
                        if wa_button.is_visible(timeout=1000):
                            self._log("✓ Botão 'WhatsApp' genérico encontrado", "info")
                     except:
                        pass
                
                if not wa_button:
                    # 3. Try selectors from scraper.py
                    try:
                        wa_button = profile_page.locator('.btn-zap a, a.btn-zap, a[href*="wa.me"]').first
                        if wa_button.is_visible(timeout=1000):
                            self._log("✓ Botão .btn-zap encontrado", "info")
                    except:
                        pass
                
                if not wa_button:
                    self._log("⚠️ Botão WhatsApp não encontrado no perfil", "warning")
                    profile_page.close()
                    return {"success": False}
                
                # ===== CLICK THE BUTTON AND CAPTURE THE REDIRECT URL =====
                extracted_phone = None
                captured_url = None
                
                self._log("🖱️ Clicando no botão WhatsApp para capturar URL...", "info")
                
                try:
                    # Set up request listener to capture WhatsApp URLs
                    captured_urls = []
                    
                    def handle_request(request):
                        url = request.url
                        if 'wa.me' in url or 'whatsapp.com' in url or 'api.whatsapp.com' in url:
                            captured_urls.append(url)
                    
                    profile_page.on("request", handle_request)
                    
                    # Try to expect a popup (new tab) when clicking
                    try:
                        with profile_page.expect_popup(timeout=5000) as popup_info:
                            wa_button.click()
                        popup = popup_info.value
                        captured_url = popup.url
                        self._log(f"📎 URL capturada do popup: {captured_url[:50]}...", "info")
                        popup.close()
                    except Exception as popup_err:
                        # No popup opened, maybe same-page navigation or just request interception
                        self._log("ℹ️ Sem popup, verificando URLs capturadas...", "info")
                        wa_button.click()
                        time.sleep(2)  # Give time for navigation/request
                        
                        # Check if we captured any URLs
                        if captured_urls:
                            captured_url = captured_urls[0]
                            self._log(f"📎 URL capturada via request: {captured_url[:50]}...", "info")
                        else:
                            # Check current page URL
                            current_url = profile_page.url
                            if 'wa.me' in current_url or 'whatsapp.com' in current_url:
                                captured_url = current_url
                                self._log(f"📎 URL capturada da navegação: {captured_url[:50]}...", "info")
                    
                    # Extract phone from the captured URL
                    if captured_url:
                        # Pattern for wa.me/55123456789 or phone=55123456789
                        phone_patterns = [
                            r'wa\.me/(\d{10,})',
                            r'phone=(\d{10,})',
                            r'api\.whatsapp\.com/send\?phone=(\d{10,})'
                        ]
                        
                        for pattern in phone_patterns:
                            match = re.search(pattern, captured_url)
                            if match:
                                extracted_phone = match.group(1)
                                break
                        
                        if extracted_phone:
                            # Formatting: add 55 if needed
                            if len(extracted_phone) <= 11 and not extracted_phone.startswith("55"):
                                extracted_phone = "55" + extracted_phone
                                
                            self._log(f"📞 Telefone extraído: {extracted_phone}", "success")
                            self._log(f"👤 Dados: {scraped_data['name']} - {scraped_data['bio'][:30] if scraped_data['bio'] else 'sem bio'}...", "info")
                            
                            profile_page.close()
                            return {
                                "success": True, 
                                "data": {
                                    "phone": extracted_phone,
                                    "name": scraped_data["name"],
                                    "scrapedBio": scraped_data["bio"]
                                }
                            }
                        else:
                            self._log(f"❌ URL capturada mas sem número: {captured_url}", "error")
                    else:
                        self._log("❌ Nenhuma URL de WhatsApp capturada após clique", "error")
                        
                except Exception as click_err:
                    self._log(f"❌ Erro ao clicar no botão: {click_err}", "error")
                
                profile_page.close()
                return {"success": False}
                    
            except Exception as e:
                self._log(f"❌ Erro durante navegação do perfil: {e}", "error")
                profile_page.close()
                return {"success": False}
                
        except Exception as e:
            self._log(f"❌ Erro no handler de scraping: {e}", "error")
            return {"success": False}

    def _handle_messaging(self, target, mission) -> bool:
        """Send message to the already scraped phone number"""
        try:
            phone = target.get("phone")
            name = target.get("name", "")
            
            if not phone:
                self._log("❌ Erro: Telefone não fornecido para envio de mensagem", "error")
                return False
                
            # Clean phone
            phone = phone.replace("+", "").replace(" ", "").replace("-", "")
            
            # FIXED INITIAL MESSAGE
            initial_msg = "Olá, estou olhando seu perfil no site Seguimores VIP e quero saber mais sobre os seus serviços."
            # Optionally customize with mission instructions if needed, but user asked for fixed initial message first.
            # prompt = mission.get("promptInstruction", "")
            
            self._log(f"📨 Iniciando envio para: {phone}", "info")
            return self._send_via_direct_link(phone, initial_msg)
            
        except Exception as e:
            self._log(f"❌ Erro no handler de mensagem: {e}", "error")
            return False

    def _send_via_direct_link(self, phone: str, message: str = None) -> bool:
        """Open WhatsApp directly using wa.me link with optional message"""
        try:
            from urllib.parse import quote
            
            # Create URL with phone number and optional message
            url = f"https://web.whatsapp.com/send?phone={phone}"
            if message:
                url += f"&text={quote(message)}"
                self._log(f"📝 Mensagem incluída: {message[:50]}...", "info")
            
            self._log(f"🔗 Abrindo: {url[:80]}...", "info")
            
            # Ensure page is valid and open
            try:
                if self.page.is_closed():
                    self._log("⚠️ Página principal fechada, criando nova...", "warning")
                    self.page = self.browser.new_page()
            except:
                self.page = self.browser.new_page()

            # Handle potential dialogs (alerts/confirmations)
            self.page.on("dialog", lambda dialog: dialog.accept())
            
            # Open in the main WhatsApp page
            try:
                self.page.goto(url, wait_until="domcontentloaded", timeout=45000)
            except Exception as e:
                if "Target page, context or browser has been closed" in str(e):
                    self._log("⚠️ Crash de página detectado, tentando recuperar...", "warning")
                    self.page = self.browser.new_page()
                    self.page.goto(url, wait_until="domcontentloaded")
                else:
                    raise e
            
            success = self._wait_and_send_in_whatsapp(self.page, message)
            return success
            
        except Exception as e:
            self._log(f"❌ Erro no link direto: {e}", "error")
            return False
            
    def _wait_and_send_in_whatsapp(self, page: Page, message: str = None) -> bool:
        """Wait for WhatsApp chat to load and send message"""
        try:
            self._log("⏳ Aguardando WhatsApp carregar...", "info")
            
            # Wait for any of these indicators that chat is loaded
            chat_ready = False
            for selector in WHATSAPP_SELECTORS["chat_ready"]:
                try:
                    if page.is_visible(selector, timeout=15000):
                        chat_ready = True
                        break
                except:
                    continue
                    
            # Check logged in state specifically
            try:
                if page.is_visible(WHATSAPP_SELECTORS["logged_in"], timeout=2000):
                    chat_ready = True
            except:
                pass
                
            if not chat_ready:
                # Check for invalid number popup
                try:
                    invalid = page.locator('[data-testid="popup-controls-ok"]')
                    if invalid.is_visible(timeout=1000):
                        self._log("❌ Número de telefone inválido", "error")
                        return False
                except:
                    pass
                self._log("⚠️ Chat pode não estar pronto, tentando enviar mesmo assim...", "warning")
            
            # Wait extra time for message to pre-fill from wa.me link
            time.sleep(3)
            
            # Take screenshot for debugging
            page.screenshot(path="whatsapp_debug.png")
            self._log("📸 Screenshot salvo: whatsapp_debug.png", "info")
            
            # Try to find input box
            input_box_sel = None
            input_selectors = [
                'footer [contenteditable="true"]',
                '[data-testid="conversation-compose-box-input"]',
                '[contenteditable="true"][data-tab="10"]',
                'div[role="textbox"][contenteditable="true"][aria-placeholder*="mensagem"]'
            ]
            
            for sel in input_selectors:
                try:
                    if page.locator(sel).first.is_visible(timeout=500):
                        input_box_sel = sel
                        break
                except:
                    continue
            
            # Check current text
            current_text = ""
            if input_box_sel:
                current_text = page.locator(input_box_sel).first.text_content()
            
            if current_text:
                self._log(f"✓ Mensagem pré-preenchida: {current_text[:50]}...", "info")
                self._log_message("bot", current_text)
            else:
                self._log("ℹ️ Nenhuma mensagem pré-preenchida encontrada", "info")
                
                # If we have a message to send and box is empty, TYPE IT
                if message and input_box_sel:
                    self._log(f"⌨️ Digitando mensagem: {message[:30]}...", "info")
                    
                    # Focus and type
                    page.click(input_box_sel)
                    time.sleep(0.5)
                    
                    # Split message by newlines to handle paragraphs properly
                    lines = message.split('\n')
                    for i, line in enumerate(lines):
                        if line.strip():
                            page.keyboard.type(line)
                        
                        # If not the last line, add Shift+Enter for new line
                        if i < len(lines) - 1:
                            page.keyboard.press("Shift+Enter")
                    
                    time.sleep(1) # Wait for typing to finish
                    self._log_message("bot", message)
                elif message and not input_box_sel:
                    self._log("❌ Caixa de texto não encontrada para digitar!", "error")
                    return False
                elif not message:
                    self._log("❌ Nenhuma mensagem para enviar e campo vazio!", "error")
                    # Try to focus page and press enter anyway as last resort (maybe text is there but not detected)
            
            # Try to find and click send button - multiple strategies
            self._log("🔍 Procurando botão de enviar...", "info")
            
            send_clicked = False
            
            # Strategy 1: Try all known selectors
            all_send_selectors = WHATSAPP_SELECTORS["send_button"] + WHATSAPP_SELECTORS.get("send_text_button", [])
            
            for sel in all_send_selectors:
                try:
                    btn = page.locator(sel).first
                    if btn.is_visible(timeout=500):
                        self._log(f"✓ Botão encontrado com seletor: {sel}", "info")
                        btn.click()
                        send_clicked = True
                        break
                except:
                    continue
            
            if not send_clicked:
                # Strategy 2: Use JavaScript to find and click
                self._log("🔧 Tentando via JavaScript...", "info")
                clicked = page.evaluate("""() => {
                    // Try clicking the send button via data-icon
                    const sendIcon = document.querySelector('span[data-icon="send"]');
                    if (sendIcon) {
                        const btn = sendIcon.closest('button') || sendIcon.parentElement;
                        if (btn) {
                            btn.click();
                            return true;
                        }
                    }
                    // Try aria-label
                    const sendBtn = document.querySelector('[aria-label*="Enviar"], [aria-label*="Send"]');
                    if (sendBtn) {
                        sendBtn.click();
                        return true;
                    }
                    return false;
                }""")
                send_clicked = clicked
            
            if not send_clicked:
                # Strategy 3: Press Enter as fallback
                self._log("⌨️ Botão não encontrado, tentando Enter...", "warning")
                page.keyboard.press("Enter")
                send_clicked = True
            
            if send_clicked:
                time.sleep(2) # Give it a moment to actually send
                self._log("✅ Mensagem enviada!", "success")
                try:
                    page.close()
                    self._log("🔒 Aba do WhatsApp fechada", "info")
                except:
                    pass
                return True
            else:
                self._log("❌ Não foi possível enviar a mensagem", "error")
                try:
                    page.close()
                except:
                    pass
                return False
                
        except Exception as e:
            self._log(f"❌ Erro ao enviar: {e}", "error")
            page.screenshot(path="error_send.png")
            try:
                page.close()
            except:
                pass
            return False
            
    def _log_message(self, role: str, message: str):
        """Log a message to the conversation history"""
        self.conversation_log.append({
            "role": role,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
    def _report_result(self, target_id: str, status: str, messages: list, scraped_data: dict = None):
        """Report the audit result back to the server"""
        try:
            payload = {
                "targetId": target_id,
                "status": status,
                "messages": messages
            }
            if scraped_data:
                payload["scrapedData"] = scraped_data
                
            response = requests.post(
                f"{API_BASE_URL}/agent/report",
                json=payload,
                timeout=10
            )
            print(f"   📤 Result reported: {status}")
        except Exception as e:
            print(f"   ⚠️ Failed to report result: {e}")


if __name__ == "__main__":
    try:
        print("🚀 Starting AuditorX Agent...")
        agent = AuditorXAgent()
        agent.start()
    except Exception as e:
        print(f"🔥 CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
