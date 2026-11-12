Bien hecho. Antes de avanzar, una comprobación rápida de 30 segundos. Respóndela de memoria:

1. ¿Qué diferencia hay entre `>` y `>>`?
2. ¿Por qué `rm practica` falla y `rm -r practica` no?

Ahora sí, a la lección 4.

# Semana 4: Permisos, usuarios y grupos

## Por qué existen

Linux es **multiusuario**: varias personas y servicios comparten la misma máquina. Los permisos deciden quién puede leer, modificar o ejecutar cada archivo. Es la primera línea de defensa en seguridad.

## Leer los permisos

Ejecuta `ls -l` en cualquier carpeta y verás algo así:

```
-rwxr-xr--  1 dani  devs  1024 nov 9 14:00 script.sh
```

| Parte | Significado |
|---|---|
| `-` | Tipo: `-` es archivo, `d` es carpeta |
| `rwx` | Permisos del **dueño** (dani) |
| `r-x` | Permisos del **grupo** (devs) |
| `r--` | Permisos de **otros** (todos los demás) |

- **r** (*read*): leer el archivo o listar la carpeta.
- **w** (*write*): modificar el archivo o crear y borrar dentro de la carpeta.
- **x** (*execute*): ejecutar el archivo o entrar a la carpeta con `cd`.

Leído completo: dani puede todo, el grupo devs puede leer y ejecutar, y los demás solo pueden leer.

## Permisos en números

Cada permiso vale un número: **r = 4, w = 2, x = 1**. Se suman por bloque.

| Número | Permisos | Uso típico |
|---|---|---|
| 7 | rwx | Dueño de un script |
| 6 | rw- | Archivo que editas |
| 5 | r-x | Ejecutar sin modificar |
| 4 | r-- | Solo lectura |
| 0 | --- | Nada |

Así, `755` es `rwxr-xr-x` y `600` es `rw-------`.

## Cambiar permisos y dueños

```bash
chmod 755 script.sh       # Forma numérica
chmod u+x script.sh       # Agrega ejecución al dueño (u=user, g=group, o=others)
chmod o-r secreto.txt     # Quita lectura a los demás
sudo chown ana archivo    # Cambia el dueño
sudo chown ana:devs archivo  # Cambia dueño y grupo
```

## Usuarios, grupos y root

```bash
whoami          # Quién soy
id              # Mi usuario, mis grupos y sus números
groups          # Mis grupos
```

- **root** (UID 0) puede hacer todo y salta cualquier permiso.
- **sudo** te deja ejecutar un comando como root, sin iniciar sesión como root. Queda registrado y se puede limitar.

**Conexión con seguridad:** un archivo de configuración con contraseñas y permisos `644` lo puede leer cualquier usuario. Encontrar errores así es uno de los primeros pasos de la escalada de privilegios.

## Práctica 4

```bash
cd ~ && mkdir permisos && cd permisos
echo 'echo "¡Funciono!"' > hola.sh
ls -l hola.sh
./hola.sh
```
**Pregunta:** ¿por qué falla?

```bash
chmod u+x hola.sh
ls -l hola.sh
./hola.sh
```

```bash
echo "contraseña123" > secreto.txt
chmod 600 secreto.txt
ls -l secreto.txt
```
**Pregunta:** ¿quién puede leer `secreto.txt` ahora?

```bash
ls -l /etc/shadow
cat /etc/shadow
```
**Pregunta:** ¿por qué te niega el acceso? `/etc/shadow` guarda los hashes de las contraseñas del sistema.

```bash
id
```
