# L1 · Contextos · Juego de vocabulario español

Juego web accesible para emparejar expresiones en español con su significado en inglés. Incluye las 23 entradas visibles en la hoja de vocabulario, rondas aleatorias, puntuación, sonido opcional, navegación por teclado y competiciones entre clases conectadas a Supabase.

## Competición

La sesión inicial usa el código `L1-CONTEXTOS`. Cada estudiante dispone de un máximo de tres intentos por sesión y clase. El sistema conserva todos los intentos, escoge automáticamente la mejor puntuación y muestra el número de intentos utilizados. El ranking público muestra solamente el nombre y la inicial del apellido.

## Publicación con GitHub Pages

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment**, elige **Deploy from a branch**.
3. Selecciona la rama **main**, la carpeta **/(root)** y pulsa **Save**.
4. GitHub mostrará la URL pública cuando termine la publicación.

## Incrustar en Canvas

```html
<iframe
  src="https://migueliglesiascc-create.github.io/L1-contextos-juego-vocabulario-espanol/"
  title="Juego de vocabulario: Contextos"
  width="100%"
  height="760"
  style="border:0; border-radius:16px;"
  loading="lazy"
  allow="autoplay"
></iframe>
```

Los resultados se almacenan en el proyecto privado de Supabase asociado al juego. Las tablas tienen Row Level Security activado y el navegador solo puede usar las funciones públicas necesarias para participar y consultar clasificaciones anonimizadas.
