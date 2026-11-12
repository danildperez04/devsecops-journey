# Semana 5: Procesos, servicios y paquetes

## Procesos

Un **proceso** es un programa en ejecución. Cada uno tiene:
- **PID:** un número único que lo identifica.
- **Dueño:** el usuario con cuyos permisos corre.
- **PPID:** el PID de su proceso padre, el que lo lanzó.

El primer proceso del sistema es **systemd** (PID 1), y todos los demás descienden de él.

```bash
ps aux                  # Todos los procesos
ps aux | grep firefox   # Buscar uno
top                     # En vivo (q para salir)
pstree -p | head -20    # Árbol de procesos
```

En `ps aux`, las columnas clave son USER, PID, %CPU, %MEM y COMMAND.

## Señales: hablar con los procesos

```bash
kill 1234       # Pide al proceso 1234 que termine (SIGTERM, educado)
kill -9 1234    # Lo mata sin preguntar (SIGKILL, último recurso)
pkill firefox   # Por nombre
```

Con SIGTERM el programa puede guardar y cerrar bien. SIGKILL lo corta en seco y puedes perder datos.

## Servicios

Un **servicio** (o *daemon*) es un proceso que corre en segundo plano, como un servidor SSH o una base de datos. **systemd** los administra:

```bash
systemctl status sshd           # Estado
sudo systemctl start sshd       # Iniciar
sudo systemctl stop sshd        # Detener
sudo systemctl enable sshd      # Arrancar al encender
systemctl list-units --type=service --state=running
```

**Logs con journalctl:**

```bash
journalctl -u sshd          # Logs de un servicio
journalctl -f               # En vivo (Ctrl+C para salir)
journalctl -p err -b        # Solo errores desde el último arranque
```

## Paquetes

Un **gestor de paquetes** instala programas desde repositorios oficiales, verificados y firmados.

| Acción | Fedora (dnf) | Debian (apt) |
|---|---|---|
| Actualizar lista e instalar actualizaciones | `sudo dnf upgrade` | `sudo apt update && sudo apt upgrade` |
| Buscar | `dnf search htop` | `apt search htop` |
| Instalar | `sudo dnf install htop` | `sudo apt install htop` |
| Desinstalar | `sudo dnf remove htop` | `sudo apt remove htop` |
| Info | `dnf info htop` | `apt show htop` |

**Seguridad:** instalar desde los repositorios oficiales es mucho más seguro que descargar programas de páginas al azar, porque los paquetes van firmados y se actualizan con parches.

## Editores de terminal

- **nano:** sencillo, con los atajos abajo. `Ctrl+O` guarda y `Ctrl+X` sale.
- **vim:** potente pero con modos. Entra con `vim archivo`, pulsa `i` para escribir, `Esc` para salir del modo de escritura y `:wq` para guardar y salir. Si te atoras, `Esc` y luego `:q!` sale sin guardar.

Empieza con nano y aprende vim poco a poco: en servidores y máquinas comprometidas, vim (o `vi`) casi siempre está disponible.

## Práctica 5

```bash
echo $$
ps -p $$
```
`$$` es el PID de tu propia terminal.

```bash
sleep 300 &
ps aux | grep sleep
kill <PID_del_sleep>
ps aux | grep sleep
```
El `&` manda el proceso a segundo plano. Reemplaza `<PID_del_sleep>` por el número que te salga.

```bash
systemctl status sshd
journalctl -p err -b | tail -10
```

```bash
sudo dnf install htop
htop
```
`htop` es un `top` más visual. Sales con `F10` o `q`.

```bash
nano ~/prueba-nano.txt
```
Escribe dos líneas, guarda y sal.
