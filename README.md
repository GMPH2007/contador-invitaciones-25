# 📱 Contador Automático de Invitaciones Exacto (25)

<p align="center">
  <img src="https://img.shields.io/badge/Versión-2.5%20Pro-purple?style=for-the-badge&logo=probot" alt="Versión Pro">
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

## 🛠️ Tecnologías y Nivel de Desarrollo Avanzado
Esta aplicación no usa servidores lentos ni APIs de terceros pesadas. Todo el procesamiento de imágenes corre a **60 Fotogramas por Segundo (FPS) estables** en el procesador interno del celular del usuario, garantizando velocidad y privacidad al 100%.

### 💻 Stack de Programación Utilizado:
* **HTML5 Semantic & CSS3 Custom Variable Layouts**: Diseño responsivo premium en modo oscuro con efecto de vidrio esmerilado (*Glassmorphism*).
* **Vanilla JavaScript ES6**: Motores de cálculo optimizados sin librerías externas para evitar lag.
* **HTML5 Canvas & WebRTC MediaStream API**: Acceso seguro a las cámaras traseras (*environment camera*) y control de la linterna (flash de celular) para interiores.
* **Web Speech API (Speech Synthesis)**: El celular habla en español cantando los números en vivo y alertando: *"¡Ya llegaste a 25!"* o *"Exceso"*.
* **Web Audio API**: Generación sintética de tonos de clic y campanas de victoria.

### 🧠 Algoritmos de Visión Artificial de Vanguardia:
1. **BFS Connected Component Labeling**: Algoritmo en cuadrícula de 28x21 celdas para agrupar píxeles vecinos y aislar objetos independientes.
2. **Skin Color Filtering**: Filtro cromático que analiza el espectro de color RGB para identificar y descartar brazos o manos del usuario, contando únicamente las invitaciones.
3. **Boundary Touch Filter**: Ignora los objetos que tocan los extremos de la pantalla para evitar contar la mano al colocar la tarjeta.
4. **Single-Buffer Memory Read**: Optimización del volcado de búfer a la CPU que reduce las llamadas de lectura gráfica a una sola por fotograma, eliminando el lag.
5. **Autocalibración Algorítmica**: Análisis por interpolación lineal para encontrar la sensibilidad de bordes óptima automáticamente.
