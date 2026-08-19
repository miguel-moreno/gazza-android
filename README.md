# Gazza Club Caddie — V5.0

Aplicación Android privada y 100% offline: introduces una distancia y la app recomienda el palo.

**Nombre visible:** Gazza Club Caddie  
**Package:** `com.gazza.clubcaddie`  
**Versión:** 5.0.0  
**APK:** `apk/GazzaClubCaddie-5.0.0.apk`

## Instalar en el teléfono

1. Copia `apk/GazzaClubCaddie-5.0.0.apk` al teléfono.
2. Abre el archivo e instálalo (permite “orígenes desconocidos” si Android lo pide).
3. No necesita Internet, cuenta ni GPS.

## Uso

- Mueve el slider (40–220 m) o toca el número grande para escribir la distancia.
- El palo central es el seleccionado.
- **PREV.** muestra el palo de distancia inferior. **NEXT** muestra el palo de distancia superior.
- Menú ☰ → **Settings**:
  - Introduce **Driver (D)** y **7 Iron (I7)**.
  - En cada palo, **AUTO** on calcula la distancia con las fórmulas. **AUTO** off permite escribirla a mano.
  - Pulsa **SAVE** para guardar y volver al Club Selector.

## Compilar

Requiere JDK 17+ y Android SDK (platform 35).

```bash
export ANDROID_HOME=/ruta/al-android-sdk
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./gradlew assembleRelease
```

El APK firmado queda en `app/build/outputs/apk/release/app-release.apk`.
