# Figuras de Lissajous

Visualizador interactivo de **curvas de Lissajous**:

```
x = A · sin(a·t + δ)
y = B · sin(b·t)
```

## Uso

Abre `index.html` en el navegador (no requiere instalación).

- Controla las frecuencias **a** y **b**, el desfase **δ** (en grados) y las amplitudes **A** y **B**, con deslizadores o escribiendo el valor.
- Figuras predefinidas: círculo, elipse, ocho, parábola, 3:2, 3:4, 5:4…
- **Girar δ**: anima el desfase y la figura parece rotar en 3D.
- **Trazar**: dibuja la curva poco a poco, como un osciloscopio, con las proyecciones de cada oscilador.
- Degradado o color único, grosor, brillo, ejes y fondo.
- **Guardar PNG** en 1080, 2048 o 4096 px.

La relación a:b se muestra simplificada; si no es racional con denominador pequeño, la curva no se cierra y se dibujan 100 vueltas.

Atajos: `Espacio` girar δ · `T` trazar · `←` `→` a ±1 · `↑` `↓` b ±1 (`Shift` ±0.01) · `S` guardar.
