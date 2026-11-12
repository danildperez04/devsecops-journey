# Semana 3: La terminal, navegación y archivos

## ¿Qué es la terminal?

La **terminal** es una ventana donde escribes órdenes en texto. El programa que las interpreta se llama **shell**; en Debian es **Bash**.

Cuando inicias sesión ves algo así:

```
dani@debian-lab:~$
```

Se lee así: usuario `dani`, en la máquina `debian-lab`, ubicado en `~` (tu carpeta personal). El `$` indica que eres un usuario normal; si fueras root, verías `#`.

## El árbol de Linux

En Linux todo cuelga de una sola raíz, `/`. No hay `C:` ni `D:`.

| Carpeta | Qué guarda |
|---|---|
| `/home` | Las carpetas personales de los usuarios (`/home/dani`) |
| `/root` | La carpeta personal del administrador |
| `/etc` | Archivos de configuración |
| `/var` | Datos que cambian: logs, bases de datos, webs |
| `/bin`, `/usr/bin` | Los programas (comandos) |
| `/tmp` | Archivos temporales; se borran al reiniciar |

## Rutas

- **Absoluta:** empieza en `/`, por ejemplo `/home/dani/apuntes`. Funciona desde cualquier lugar.
- **Relativa:** parte de donde estás, por ejemplo `apuntes`.
- **Atajos:** `~` es tu carpeta personal, `.` la carpeta actual y `..` la carpeta de arriba.

## Navegar

```bash
pwd              # ¿Dónde estoy?
ls               # ¿Qué hay aquí?
ls -la           # Todo, incluidos ocultos, con detalles
cd /etc          # Ir a /etc (ruta absoluta)
cd ..            # Subir un nivel
cd ~             # Volver a tu carpeta personal
```

Los archivos que empiezan con `.` están **ocultos**, como `.bashrc`.

## Manejar archivos

```bash
mkdir practica           # Crear carpeta
cd practica
touch nota.txt           # Crear archivo vacío
echo "hola" > nota.txt   # Escribir en el archivo
cat nota.txt             # Ver su contenido
cp nota.txt copia.txt    # Copiar
mv copia.txt otra.txt    # Mover o renombrar
rm otra.txt              # Borrar (¡sin papelera!)
less /etc/services       # Leer archivos largos (q para salir)
```

**Cuidado:** `rm` no tiene papelera. Lo que borras, se pierde. Nunca ejecutes un `rm -rf` que no entiendas.

## Buscar

```bash
find ~ -name "*.txt"             # Archivos .txt dentro de tu carpeta
grep "root" /etc/passwd          # Líneas que contienen "root"
```

## Trucos que te ahorran tiempo

- **Tab** autocompleta nombres. Úsala siempre.
- **Flecha arriba** muestra el comando anterior.
- `man ls` abre el manual de cualquier comando (`q` para salir).

## Ejercicios

1. Recorre `/`, `/etc`, `/var/log` y `/home` con `cd` y `ls`. Anota qué ves en cada una.
2. En tu carpeta personal crea esta estructura usando solo la terminal:
   ```
   practica/
   ├── docs/
   │   └── notas.txt
   └── scripts/
   ```
3. Copia `notas.txt` a `scripts/`, renómbrala a `backup.txt` y luego bórrala.
4. Busca con `find` todos los archivos `.conf` dentro de `/etc`.
5. Escribe `04-navegacion-archivos.md` con los comandos y lo que hace cada uno.

## Preguntas de repaso

1. ¿Cuál es la diferencia entre `/home/dani/docs` y `docs`?
2. ¿Qué significa `..`?
3. ¿Por qué es peligroso `rm` comparado con borrar un archivo en Windows?

