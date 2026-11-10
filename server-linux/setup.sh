#!/bin/bash
# ==============================================================================
# SCRIPT DE APROVISIONAMIENTO AUTOMÁTICO DEPSYS - MOTOS MENDES S.A.
# Sistema Operativo: Ubuntu Server 24.04 LTS (Noble Numbat)
# Componentes: MySQL 8.0 (6GB Buffer Pool) + Node.js 22 LTS + Apache 2.4 + PHP + PM2 + Cron Backup
# ==============================================================================

set -e

# Colores para la terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${RED}================================================================${NC}"
echo -e "${RED}      DEPSYS - SERVIDOR OFICIAL MOTOS MENDES S.A. (UBUNTU)      ${NC}"
echo -e "${RED}================================================================${NC}"

# 1. Verificar privilegios root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Este script debe ejecutarse como root o con sudo.${NC}"
  exit 1
fi

echo -e "\n${CYAN}[1/7] Actualizando repositorios del sistema y paquetes base...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git ufw htop net-tools unzip build-essential software-properties-common

# 2. Configurar Zona Horaria oficial de Paraguay (-03:00)
echo -e "\n${CYAN}[2/7] Configurando zona horaria a America/Asuncion...${NC}"
timedatectl set-timezone America/Asuncion

# 3. Instalar y optimizar MySQL 8.0
echo -e "\n${CYAN}[3/7] Instalando y optimizando MySQL 8.0...${NC}"
apt install -y mysql-server

# Configuración de alto rendimiento para 12GB RAM (8GB InnoDB Buffer Pool)
cat << 'EOF' > /etc/mysql/mysql.conf.d/depsys.cnf
[mysqld]
# Configuración de Red
bind-address            = 0.0.0.0
mysqlx-bind-address     = 0.0.0.0
port                    = 3306

# Rendimiento y Memoria (Aprovechando los 12GB de RAM)
innodb_buffer_pool_size         = 6G
innodb_log_file_size            = 512M
innodb_buffer_pool_instances    = 6
innodb_flush_log_at_trx_commit  = 2
innodb_file_per_table           = 1
innodb_flush_method             = O_DIRECT

# Conexiones y Caché
max_connections                 = 500
thread_cache_size               = 32
table_open_cache                = 4000
open_files_limit                = 65535

# Codificación y Zona Horaria de Paraguay
character-set-server            = utf8mb4
collation-server                = utf8mb4_unicode_ci
default-time-zone               = '-03:00'
EOF

systemctl restart mysql
systemctl enable mysql

# Configurar Base de Datos y Usuarios
echo -e "${YELLOW}Configurando usuarios y permisos de MySQL...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS mendes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Usuario root con acceso local y desde la red
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';"
mysql -e "CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root';"
mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;"

# Usuario de aplicación específico
mysql -e "CREATE USER IF NOT EXISTS 'depsys'@'%' IDENTIFIED WITH mysql_native_password BY 'depsys2026';"
mysql -e "GRANT ALL PRIVILEGES ON mendes_db.* TO 'depsys'@'%';"
mysql -e "FLUSH PRIVILEGES;"

# Restaurar dump inicial si existe en el directorio actual
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/mendes_db_dump.sql" ]; then
    echo -e "${GREEN}Restaurando base de datos mendes_db desde mendes_db_dump.sql...${NC}"
    mysql mendes_db < "$SCRIPT_DIR/mendes_db_dump.sql"
    echo -e "${GREEN}Base de datos restaurada con éxito.${NC}"
fi

# 4. Instalar Node.js 22 LTS y PM2
echo -e "\n${CYAN}[4/7] Instalando Node.js 22 LTS y PM2 Process Manager...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2

# 5. Instalar y configurar Apache 2.4 + PHP + Módulos Proxy
echo -e "\n${CYAN}[5/7] Instalando Apache 2.4, PHP y módulos proxy...${NC}"
apt install -y apache2 php libapache2-mod-php php-mysql php-mbstring php-xml php-curl

# Habilitar módulos necesarios (Reescritura y Proxy hacia Node.js)
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod headers

mkdir -p /var/www/depsys/html
cp "$SCRIPT_DIR/flujo_bidireccional_depsys_sap.html" /var/www/depsys/html/index.html 2>/dev/null || true
cp "$SCRIPT_DIR/flujo_bidireccional_depsys_sap.html" /var/www/depsys/html/flujo_depsys.html 2>/dev/null || true

# Configurar VirtualHost de Apache para DepSyS y Proxy a Node.js
cat << 'EOF' > /etc/apache2/sites-available/depsys.conf
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/depsys/html

    <Directory /var/www/depsys/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Proxy inverso transparente hacia la API Node.js (Puerto 3015)
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:3015/api/
    ProxyPassReverse /api/ http://127.0.0.1:3015/api/

    ErrorLog ${APACHE_LOG_DIR}/depsys_error.log
    CustomLog ${APACHE_LOG_DIR}/depsys_access.log combined
</VirtualHost>
EOF

a2dissite 000-default.conf
a2ensite depsys.conf
systemctl restart apache2
systemctl enable apache2

# 6. Desplegar DepSyS backend-api
echo -e "\n${CYAN}[6/7] Desplegando Backend API Node.js (/opt/depsys/backend-api)...${NC}"
mkdir -p /opt/depsys
if [ -d "$SCRIPT_DIR/backend-api" ]; then
    cp -r "$SCRIPT_DIR/backend-api" /opt/depsys/
    cd /opt/depsys/backend-api
    npm install --omit=dev
    
    # Iniciar con PM2
    pm2 delete depsys-api 2>/dev/null || true
    pm2 start server.js --name "depsys-api" --time
    pm2 save
    pm2 startup systemd -u root --hp /root
    echo -e "${GREEN}Backend API iniciado bajo PM2 en el puerto 3015.${NC}"
fi

# 7. Configuración de Firewall (UFW) y Backups Automáticos
echo -e "\n${CYAN}[7/7] Configurando Firewall y Copias de Seguridad Diarias...${NC}"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 3306/tcp
ufw allow 3015/tcp
ufw --force enable

# Script de backup diario automático
mkdir -p /var/backups/depsys
cat << 'EOF' > /usr/local/bin/backup-depsys.sh
#!/bin/bash
FECHA=$(date +\%Y\%m\%d_\%H\%M\%S)
DESTINO="/var/backups/depsys"
mysqldump -u root -proot --single-transaction --quick mendes_db | gzip > "$DESTINO/mendes_db_$FECHA.sql.gz"
# Mantener solo los últimos 14 días de copias
find "$DESTINO" -type f -name "*.sql.gz" -mtime +14 -exec rm {} \;
EOF

chmod +x /usr/local/bin/backup-depsys.sh

# Agregar tarea a Crontab para ejecutarse todos los días a las 23:00
(crontab -l 2>/dev/null | grep -v 'backup-depsys.sh'; echo "0 23 * * * /usr/local/bin/backup-depsys.sh >/dev/null 2>&1") | crontab -

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}  ¡SERVIDOR DEPSYS CONFIGURADO AL 100% EN UBUNTU SERVER 24.04!  ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "IP Servidor:         ${CYAN}192.168.1.125${NC}"
echo -e "MySQL Puerto:        ${CYAN}3306 (BD: mendes_db, User: root / depsys)${NC}"
echo -e "Node API Puerto:     ${CYAN}3015 (Gestionado por PM2)${NC}"
echo -e "Web / Apache:        ${CYAN}http://192.168.1.125/${NC}"
echo -e "Copias de seguridad: ${CYAN}Diarias a las 23:00 en /var/backups/depsys/${NC}"
echo -e "${GREEN}================================================================${NC}\n"

