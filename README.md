# 📱 Contador Automático de Invitaciones Exacto (25)

<p align="center">
  <img src="https://img.shields.io/badge/Versión-3.0%20Ultra-purple?style=for-the-badge&logo=probot" alt="Versión Ultra">
  <img src="https://img.shields.io/badge/Tecnología-Visión%20Artificial-green?style=for-the-badge&logo=nvidia" alt="Visión Artificial">
  <img src="https://img.shields.io/badge/Despliegue-GitHub%20Pages-blue?style=for-the-badge&logo=github" alt="GitHub Pages">
</p>

---

## 🔗 Enlace de Acceso Rápido
¡Usa la aplicación directamente desde tu celular haciendo clic en el siguiente botón!

<p align="center">
  <a href="https://gmph2007.github.io/contador-invitaciones-25/">
    <img src="https://img.shields.io/badge/📱%20ABRIR%20CONTADOR%20EN%20CELULAR-https%3A%2F%2Fgmph2007.github.io%2Fcontador--invitaciones--25%2F-34c759?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Abrir Contador en Vivo" />
  </a>
</p>

---

## 📝 ¿Para qué sirve esta aplicación?
Esta aplicación web móvil está diseñada específicamente para optimizar y automatizar el conteo físico de **tarjetas e invitaciones dobladas**. Ayuda a los organizadores de eventos, impresores y diseñadores a verificar en tiempo real que existan **exactamente 25 invitaciones** (o cualquier cantidad meta personalizada), eliminando el conteo manual lento y propenso a errores humanos.

---

## ⚡ Modos de Operación y Funciones
El contador incluye tres modos de detección avanzados adaptados a tu forma de trabajar:

### 🔴 Modo A: Escaneo de Pila (Canto / Bordes)
* **Función**: Cuenta las hojas acumuladas en una pila compacta analizando el "canto" (los bordes doblados en forma de abanico).
* **Cómo sirve**: Colocas la pila frente a la guía roja de la cámara y el sistema detecta los picos de contraste (líneas de papel).
* **Calibración inteligente**: Incluye un algoritmo de búsqueda por fuerza bruta matemática que auto-calibra los filtros al pulsar un botón para encontrar exactamente las 25 invitaciones.

### 🟢 Modo B: Deslizar (Paso a Paso)
* **Función**: Funciona de forma similar a una **contadora de billetes**.
* **Cómo sirve**: Apoyas el celular fijo sobre un vaso o soporte y deslizas las tarjetas una por una frente al recuadro verde. Cada tarjeta que cruza la cámara se cuenta de forma instantánea al milisegundo.

### 🔵 Modo C: Mesa Completa (Conteo en Conjunto)
* **Función**: Cuenta todas las invitaciones esparcidas o unidas sobre la mesa en un solo segundo.
* **Conteo superpuesto**: Si las invitaciones se tocan y se superponen en la mesa, el sistema calcula el área física (cantidad de celdas cubiertas) y la divide por el tamaño de una sola tarjeta para dar el número exacto.
* **Calibración unitaria**: Colocas una sola invitación en la mesa, pulsas "Calibrar Tamaño" y el sistema aprende sus dimensiones exactas.

---

## 🆕 Novedades de la Versión 3.0 Ultra (¡Lo nuevo!)
Hemos añadido mejoras masivas de rendimiento y robustez física para el uso en celulares:

1. **🛡️ Inmunidad a Exposición de Cámara (Auto-Exposure Compensation)**:
   Los celulares ajustan automáticamente el brillo al colocar la mano o el papel, lo que antes arruinaba la calibración. Ahora, un algoritmo calcula en tiempo real la desviación de iluminación en el fondo vacío y **compensa automáticamente los cambios de brillo**, manteniendo el detector 100% calibrado.
2. **🦾 Descarte Inteligente de Brazos y Manos (Hand/Arm Rejection)**:
   * **Filtro de Bordes (Boundary Check)**: Todo objeto detectado que toque los extremos de la pantalla es descartado inmediatamente (asumiendo que es tu mano o brazo entrando a la escena). Solo se cuentan los papeles que están libres en la mesa.
   * **Filtro Cromático de Piel (Skin-Tone Filter)**: Analiza los valores RGB para ignorar colores cálidos del espectro de piel humana, concentrándose únicamente en el blanco y azul de tus invitaciones.
3. **🎯 Calibración por Búsqueda de Bloque Aislado**:
   Al presionar "Calibrar Tamaño (1 Tarjeta)", el sistema no suma ruidos externos; localiza el contorno (Blob) exacto y cerrado del papel en el centro y calibra la dimensión patrón de forma limpia.
4. **📈 Cuadrícula de Escaneo de Alta Resolución (40x30)**:
   Aumentamos la resolución del procesamiento en el celular a **1,200 puntos de análisis**, logrando una definición de contornos extremadamente exacta.
5. **🐍 Script de Escritorio en Python con OpenCV (`contador.py`)**:
   ¡Añadimos soporte para PC! Si prefieres usar una webcam en tu computadora, el repositorio ahora incluye un programa de Python profesional con procesamiento de imagen nativo, filtros de morfología matemática OpenCV y voz de Windows integrada.

---

## 🛠️ Tecnologías Utilizadas
* **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript ES6 (sin dependencias para asegurar 60 FPS fijos).
* **APIs de Navegador**: WebRTC MediaStream (Cámara trasera y control de Linterna/Flash), Web Speech API (Voz sintética en español), Web Audio API (Generación de ondas de audio sintéticas para alertas).
* **Backend de Escritorio**: Python 3 con OpenCV (procesamiento de imágenes), Numpy (matrices de datos) y PyWin32 (Voz nativa de Windows).
