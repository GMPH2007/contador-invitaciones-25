import cv2
import numpy as np
import sys
import time

def speak_text(text):
    """Utiliza el sintetizador de voz nativo de Windows (SAPI) para hablar en español."""
    try:
        import win32com.client
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        # Encontrar una voz en español si está disponible
        for voice in speaker.GetVoices():
            if "spanish" in voice.GetDescription().lower() or "español" in voice.GetDescription().lower():
                speaker.Voice = voice
                break
        speaker.Speak(text)
    except Exception as e:
        print(f"[Voz de Windows no disponible]: {text}")

def main():
    print("==============================================================")
    print("   CONTADOR INTELIGENTE DE INVITACIONES (OPENCV - PYTHON)")
    print("==============================================================")
    print("Instrucciones de teclado:")
    print("  [R] - Reiniciar / Calibrar mesa vacía (Fondo)")
    print("  [S] - Calibrar Tamaño (Coloca 1 sola invitación en el centro y pulsa S)")
    print("  [+] - Aumentar Sensibilidad de detección")
    print("  [-] - Disminuir Sensibilidad de detección")
    print("  [ESC] - Salir del programa")
    print("==============================================================")

    # Inicializar la cámara (0 es la cámara web predeterminada de la laptop/PC)
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) if sys.platform.startswith('win') else cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("ERROR: No se pudo abrir la cámara web.")
        speak_text("Error. No se encontró la cámara.")
        return

    # Ajustar resolución a 640x480 para velocidad óptima
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # Estado de calibración
    bg_baseline = None
    unit_size = 3500.0  # Tamaño promedio predeterminado en píxeles de una tarjeta
    sensitivity = 28    # Umbral de diferencia de color
    target_count = 25   # Meta de invitaciones

    speak_text("Contador activo. Coloca la cámara fija en un soporte apuntando a la mesa.")

    last_count = -1
    last_speech_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error al leer el fotograma de la cámara.")
            break

        # Reducir ruido con filtro Gaussiano
        blurred = cv2.GaussianBlur(frame, (5, 5), 0)
        hsv = cv2.cvtColor(blurred, cv2.COLOR_BGR2HSV)

        # Si aún no se ha calibrado el fondo, tomar el fotograma actual como base
        if bg_baseline is None:
            bg_baseline = blurred.copy()
            print("Mesa calibrada automáticamente al inicio.")

        # Calcular diferencia absoluta frente al fondo base calibrado
        diff = cv2.absdiff(blurred, bg_baseline)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

        # Aplicar umbral binario para aislar el papel blanco
        _, thresh = cv2.threshold(gray_diff, sensitivity, 255, cv2.THRESH_BINARY)

        # Operaciones morfológicas para rellenar huecos y separar bordes ligeramente
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        # Encontrar los contornos de las hojas de papel en la mesa
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        total_count = 0
        display_frame = frame.copy()

        # Procesar cada contorno (objeto) detectado
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Filtrar ruidos pequeños (menores a 500 píxeles de área)
            if area < 500:
                continue

            # Obtener caja delimitadora (Bounding Box)
            x, y, w, h = cv2.boundingRect(contour)

            # RECHAZO DE BRAZO/MANO:
            # Si el contorno toca los bordes del fotograma, asumimos que es el brazo/mano del usuario
            touches_border = (x <= 5 or y <= 5 or (x + w) >= 635 or (y + h) >= 475)
            if touches_border:
                # Dibujar contorno amarillo indicando advertencia/mano
                cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 255), 2)
                cv2.putText(display_frame, "MANO / BORDE", (x, y - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
                continue

            # Conteo en conjunto: Estimar cuántas tarjetas hay en este contorno según el área unitaria calibrada
            estimated_qty = max(1, int(round(area / unit_size)))
            total_count += estimated_qty

            # Dibujar caja de detección neón sobre la invitación
            cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            label = f"INV x{estimated_qty}" if estimated_qty > 1 else "INV"
            cv2.putText(display_frame, f"{label} ({int(area)}px)", (x, y - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

        # Anuncio por voz en vivo al cambiar el número
        now = time.time()
        if total_count != last_count:
            if total_count > 0:
                if total_count == target_count:
                    speak_text(f"¡Llegaste a {target_count}! Pila completada.")
                elif total_count > target_count:
                    speak_text(f"Te pasaste. Hay {total_count}.")
                else:
                    if now - last_speech_time > 1.0:
                        speak_text(str(total_count))
                        last_speech_time = now
            last_count = total_count

        # Dibujar HUD superior con información de estado
        hud_bg = display_frame.copy()
        cv2.rectangle(hud_bg, (0, 0), (640, 50), (15, 16, 22), -1)
        cv2.addWeighted(hud_bg, 0.75, display_frame, 0.25, 0, display_frame)

        # Mostrar recuento
        color_status = (0, 255, 0) if total_count == target_count else (0, 122, 255)
        if total_count > target_count:
            color_status = (0, 0, 255)

        cv2.putText(display_frame, f"META: {target_count}", (15, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(display_frame, f"CONTEO: {total_count}", (180, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, color_status, 2)
        cv2.putText(display_frame, f"SENS: {sensitivity} | UNIT: {int(unit_size)}px", (400, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Mostrar visor
        cv2.imshow("Contador Inteligente de Invitaciones (OPENCV)", display_frame)
        
        # Procesar teclado
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        elif key == ord('r') or key == ord('R'):
            bg_baseline = blurred.copy()
            print("Mesa recalibrada (fondo vacío).")
            speak_text("Mesa recalibrada")
            total_count = 0
            last_count = -1
        elif key == ord('s') or key == ord('S'):
            # Calibrar tamaño unitario buscando el contorno más grande en el centro
            if len(contours) > 0:
                valid_contours = []
                for c in contours:
                    area = cv2.contourArea(c)
                    if area < 500:
                        continue
                    x, y, w, h = cv2.boundingRect(c)
                    # Debe estar lejos de los bordes
                    if not (x <= 5 or y <= 5 or (x + w) >= 635 or (y + h) >= 475):
                        valid_contours.append((area, c))
                
                if len(valid_contours) > 0:
                    # Seleccionar el de mayor área
                    valid_contours.sort(key=lambda item: item[0], reverse=True)
                    unit_size = valid_contours[0][0]
                    print(f"Calibrado: Tamaño de 1 tarjeta = {int(unit_size)} píxeles.")
                    speak_text(f"Tamaño de tarjeta establecido a {int(unit_size)} píxeles.")
                else:
                    print("No se encontró ningún contorno de tarjeta válido en el centro.")
                    speak_text("Coloca la tarjeta en el centro de la mesa.")
            else:
                print("No se detectó papel en la mesa para calibrar.")
                speak_text("Coloca la tarjeta en la mesa.")
        elif key == ord('+'):
            sensitivity = min(100, sensitivity + 2)
            print(f"Sensibilidad aumentada a: {sensitivity}")
        elif key == ord('-'):
            sensitivity = max(5, sensitivity - 2)
            print(f"Sensibilidad disminuida a: {sensitivity}")

    cap.release()
    cv2.destroyAllWindows()
    print("Programa finalizado.")

if __name__ == "__main__":
    main()
