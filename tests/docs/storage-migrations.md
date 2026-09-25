Preparación: Montar el RAID 1 en /mnt/storage y verificar con df -h y lsblk.
Copia en caliente: Detener el contenedor y clonar datos: rsync -avh --progress /opt/ssei_data/ /mnt/storage/ssei_data/.
Verificación de integridad: Comparar hashes: cd /opt/ssei_data && find . -type f -exec sha256sum {} + > /tmp/orig.sums y validar en destino con sha256sum -c.
Conmutación: Editar solo el volumen en docker-compose.yml y levantar.
Validación post-migración: Al arrancar, el log [STORAGE] debe mostrar ~1.81 TB totales; probar subida y descarga de un documento; verificar que /biblioteca/download/{id} responde con archivos históricos.
Retención: Mantener el disco de 500 GB intacto como respaldo frío durante 30 días antes de formatearlo.