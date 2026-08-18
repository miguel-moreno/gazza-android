# Gazza Club Caddie — V3.0

Aplicación Android privada y 100% offline: introduces una distancia y la app recomienda el palo.

**Nombre visible:** Gazza Club Caddie  
**Package:** `com.gazza.clubcaddie`  
**Versión:** 3.0.0  
**APK:** `apk/GazzaClubCaddie-3.0.0.apk`

## Instalar en el teléfono

1. Copia `apk/GazzaClubCaddie-3.0.0.apk` al teléfono.
2. Abre el archivo e instálalo (permite “orígenes desconocidos” si Android lo pide).
3. No necesita Internet, cuenta ni GPS.

## Uso

- Mueve el slider (40–220 m) o toca el número grande para escribir la distancia.
- El palo central es el seleccionado.
- **PREV.** muestra el palo de distancia inferior. **NEXT** muestra el palo de distancia superior.
- Menú ☰ → **Settings**: solo se introducen **Driver (D)** y **7 Iron (I7)**. El resto de palos se calcula con las fórmulas y el rango min/max es ±5 m.

## Compilar

Requiere JDK 17+ y Android SDK (platform 35).

```bash
export ANDROID_HOME=/ruta/al-android-sdk
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./gradlew assembleRelease
```

El APK firmado queda en `app/build/outputs/apk/release/app-release.apk`.
