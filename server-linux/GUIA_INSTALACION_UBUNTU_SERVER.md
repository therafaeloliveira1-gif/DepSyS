# Guía de Instalación: Servidor DepSyS en Ubuntu Server 24.04 LTS
**Motos Mendes S.A. — Infraestructura Oficial de Producción**

---

## 🎯 Objetivo
Transformar la máquina del servidor (`192.168.1.125`) en un servidor Linux empresarial de alta disponibilidad, eliminando Windows 10 Pro y asegurando:
- **MySQL 8.0** optimizado con 6 GB de memoria RAM en buffer pool.
- **Node.js 22 LTS** gestionado con **PM2** (reinicio instantáneo en caso de fallos).
- **Apache 2.4 + PHP** configurado con módulos de reescritura (`mod_rewrite`) y proxy hacia Node.js.
- **Copias de seguridad automáticas** programadas todas las noches a las 23:00.

---

## 💾 1. Preparar el Medio de Instalación (Pendrive)

1. **Descargar la imagen ISO:**
   - [Ubuntu Server 24.04 LTS (Noble Numbat)](https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso)
2. **Crear el USB Booteable:**
   - Usar **Rufus** (Windows) o **BalenaEtcher**.
   - Seleccionar el pendrive (mínimo 4 GB) y la ISO descargada.
   - En Rufus: Esquema de partición `GPT`, Sistema de destino `UEFI`. Dar clic en **Empezar**.

---

## 🖥️ 2. Proceso de Instalación en la Máquina Servidor

1. Conectar el pendrive en la máquina física `192.168.1.125` y encenderla pulsando la tecla de Boot Menu (`F11`, `F12` o `F8` según la placa madre).
2. Seleccionar el pendrive UEFI e iniciar el instalador (**Try or Install Ubuntu Server**).
3. **Paso a paso en pantalla:**
   - **Idioma:** Español o English.
   - **Teclado:** Español (Latinoamérica).
   - **Tipo de instalación:** `Ubuntu Server` (por defecto, no minimizado).
   - **Red (Network connections):**
     - Seleccionar la tarjeta de red Ethernet (`eth0` o `enp...`).
     - Cambiar de `DHCP` a `Manual`:
       - **Subnet:** `192.168.1.0/24`
       - **Address:** `192.168.1.125`
       - **Gateway:** `192.168.1.1`
       - **Name servers:** `1.1.1.1, 8.8.8.8`
   - **Proxy:** Dejar en blanco.
   - **Mirror:** Dejar el que propone por defecto.
   - **Disco (Storage configuration):**
     - Seleccionar `Use an entire disk` (Usar todo el disco).
     - Dejar marcada la opción de LVM.
     - Confirmar el formateo (destructivo).
   - **Perfil de Usuario:**
     - **Your name:** `Motos Mendes`
     - **Server's name:** `depsys-server`
     - **Username:** `admin` (o `mendes`)
     - **Password:** Definir una contraseña segura (ej. `Mendes2026!`).
   - **SSH Setup (¡MUY IMPORTANTE!):**
     - Marcar con espacio: **`[*] Install OpenSSH server`**.
   - **Featured Server Snaps:** No marcar ninguno, dar clic en `Done`.
4. Esperar que finalice la instalación, retirar el pendrive y seleccionar **Reboot Now**.

---

## ⚡ 3. Aprovisionamiento Automático en 1 Solo Paso

Una vez que el servidor inicie en Ubuntu, ya no necesitas usar monitor ni teclado en esa máquina. Todo se hace desde tu PC de desarrollo:

### Opción A: Transferir y ejecutar el script vía SCP / Terminal
Abre PowerShell en tu PC y ejecuta:

```powershell
# 1. Copiar la carpeta completa de configuración al nuevo servidor Linux:
scp -r "c:\WorkSpace\DepSyS\server-linux" admin@192.168.1.125:/home/admin/

# 2. Conectarte por SSH al servidor:
ssh admin@192.168.1.125

# 3. Dentro del servidor, ejecutar el script de instalación automática:
cd /home/admin/server-linux
sudo bash setup.sh
```

El script `setup.sh` realizará automáticamente:
1. Actualización de paquetes de Ubuntu.
2. Configuración de zona horaria oficial `America/Asuncion` (-03:00).
3. Instalación de **MySQL 8.0** con buffer pool de 6 GB, creación de `mendes_db`, usuarios `root` y `depsys`, e importación de todas las tablas de `mendes_db_dump.sql`.
4. Instalación de **Node.js 22 LTS** y **PM2**.
5. Despliegue de `backend-api` como servicio persistente en `/opt/depsys/backend-api`.
6. Configuración de **Apache 2.4 + PHP** sirviendo en el puerto 80 y enlazando las APIs.
7. Configuración de **Firewall UFW** (puertos 22, 80, 3015, 3306).
8. Programación de **Backups Diarios** automáticos en `/var/backups/depsys/`.

---

## 🔍 4. Verificación del Servidor

Una vez finalizado el script, prueba desde cualquier navegador de la red:
- **Diagrama y Portal DepSyS:** `http://192.168.1.125/`
- **API Health / Pedidos:** `http://192.168.1.125/api/pedidos` o `http://192.168.1.125:3015/`
- **Conexión MySQL:** `192.168.1.125:3306` (Usuario: `root` o `depsys`, BD: `mendes_db`).

