#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Captor - Script de Setup para Google Cloud VM
# Execute este script na VM após o SSH
# ═══════════════════════════════════════════════════════════════

set -e

echo "🚀 Iniciando setup do Captor na Google Cloud VM..."

# 1. Atualizar sistema
echo "📦 Atualizando pacotes..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Instalar Docker
echo "🐳 Instalando Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Instalar Docker Compose
echo "🔧 Instalando Docker Compose..."
sudo apt-get install -y docker-compose-plugin

# 4. Instalar Node.js 20 (para build do server)
echo "📗 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 5. Instalar Git
echo "📂 Instalando Git..."
sudo apt-get install -y git

# 6. Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3001/tcp  # Captor Backend
sudo ufw allow 8092/tcp  # Evolution API
sudo ufw allow 80/tcp    # HTTP (futuro Nginx)
sudo ufw allow 443/tcp   # HTTPS (futuro Nginx)
sudo ufw --force enable

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Faça logout e login novamente (para Docker sem sudo)"
echo "  2. Clone o repositório do Captor"
echo "  3. Execute: cd Captor/deploy && docker compose -f docker-compose.prod.yml up -d"
echo ""
