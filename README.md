# CC 3GITT · Laboratorio PLL

Aplicación docente para Circuitos de Comunicaciones, Grado en Ingeniería de las Tecnologías de Telecomunicación. Autor: Vicente Baena Lecuyer, Universidad de Sevilla.

## Uso

Abrir `index.html` en un navegador. No requiere instalación, servidor, conexión a Internet ni dependencias externas. Interfaz en español, adaptable a escritorio y móvil, con ayuda al pasar el ratón o enfocar controles.

## Sintetizador ADF4351

- Ejemplos comparables de N entero (PFD 1 MHz) y N fraccional (PFD 25 MHz), ambos con pasos de 1 MHz.
- Referencia inicial de 25 MHz. Salida 2441 MHz: INT = 97, FRAC = 16, MOD = 25, divisor RF = 1.
- Diagrama del lazo, respuesta temporal, ilustración de pulsos PFD y distribución del ruido de fase.
- Cambio de canal, reproducción/pausa, avance manual y cursor temporal en la vista PFD.
- Ventana temporal fija de 100 µs por defecto, seleccionable manualmente en Enganche; cambiar f_n o zeta no cambia el eje temporal.
- Controles de frecuencia natural, amortiguamiento y parámetros didácticos avanzados.

## Modelo y límites

Modelo lineal promediado, de segundo orden y tipo 2, con filtro PI ideal. La simulación integra mediante RK4 el error de fase en el PFD y el estado integral. Se conserva una fase incremental para evitar muestrear la portadora RF. Se reajustan las ganancias del filtro al modificar N, K_VCO, f_n o zeta para conservar la dinámica seleccionada.

H(s) = (2 zeta omega_n s + omega_n^2)/(s^2 + 2 zeta omega_n s + omega_n^2).

f_n es frecuencia natural, no ancho de banda de -3 dB. El establecimiento usa una banda del 1 % del salto de frecuencia (mínimo 1 Hz). El cursor determina el error instantáneo mostrado; la frecuencia RF principal indica el objetivo.

No se modelan adquisición no lineal, saturación, deslizamientos de ciclo, sigma-delta ni espurios. La vista PFD ilustra flancos con una diferencia de fase congelada; no representa una simulación lógica del circuito durante la adquisición. Avisos señalan configuraciones fuera de rango o del dominio lineal. La tensión central de 1,5 V y K_VCO = 100 MHz/V son elecciones didácticas, no una caracterización del ADF4351.

El ruido es un cálculo espectral independiente del transitorio determinista. Se suman potencias de fuentes independientes: referencia/PFD/CP filtrados por H y VCO filtrado por 1-H. Se usa un suelo normalizado PFD/CP de -220 dBc/Hz; las otras curvas son ilustrativas. Las curvas se refieren al nodo VCO, antes del divisor RF. D = T = 0, realimentación fundamental desde el VCO; INT < 75 presupone prescaler 4/5. No es una herramienta de diseño ni programación completa del chip.

Fuente: [hoja de datos ADF4351](https://www.analog.com/media/en/technical-documentation/data-sheets/adf4351.pdf).

## Estructura

- `index.html`: interfaz.
- `app/styles.css`: estilo inspirado en SEC_3GITT.
- `app/model.js`: modelo independiente de la interfaz.
- `app/main.js`: gráficos e interacción.
- `tests/model.test.cjs`: comprobaciones del modelo (`node tests/model.test.cjs`).

## GitHub y aplicación publicada

- Repositorio: https://github.com/vicentebaena/CC_3GITT
- Aplicación: https://vicentebaena.github.io/CC_3GITT/

## Licencia

Código MIT. Textos, diagramas y contenido docente CC BY 4.0. Véase LICENSE.md.
