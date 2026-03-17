#!/bin/bash
# Script de backup para proyecto Node.js

# Carpeta del proyecto
PROJECT_DIR="/home/aggustin/.vscode/food-order-app"
# Carpeta de destino para backups
BACKUP_DIR="/home/aggustin/backups"
# Fecha actual para el nombre del backup
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
# Nombre del archivo de backup
BACKUP_FILE="food-order-app-backup-$DATE.tar.gz"

# Crear carpeta de backups si no existe
mkdir -p "$BACKUP_DIR"

# Crear el backup excluyendo dependencias y archivos temporales
# Puedes agregar más --exclude según lo que no quieras respaldar

tar -czvf "$BACKUP_DIR/$BACKUP_FILE" \
  --exclude="node_modules" \
  --exclude="env" \
  --exclude="venv" \
  --exclude=".git" \
  --exclude="backups" \
  -C "$PROJECT_DIR" .

# Mensaje de éxito
echo "Backup creado en $BACKUP_DIR/$BACKUP_FILE"

# (Opcional) Para subir a la nube, puedes usar rclone, aws cli, etc.
# Ejemplo para Google Drive con rclone:
# rclone copy "$BACKUP_DIR/$BACKUP_FILE" remote:mi_carpeta_drive
