# StartKit QuanNex - Estructura Organizada

## 📁 Estructura del Proyecto

```
startkit-main/
├── orchestrator.js              # Punto de entrada principal
├── versions/                    # Versiones del sistema
│   ├── v1/                     # Baseline estable
│   ├── v2/                     # Router + Handoffs
│   ├── v3/                     # Optimizations
│   ├── latest/                 # Symlink a versión actual
│   └── manifest.json           # Metadatos de versiones
├── shared/                      # Código compartido
│   ├── contracts/              # Contratos y esquemas
│   ├── utils/                  # Utilidades compartidas
│   ├── types/                  # Tipos y constantes
│   └── constants/              # Constantes del sistema
├── tools/                       # Herramientas de desarrollo
│   ├── scripts/                # Scripts de automatización
│   ├── organizers/             # Scripts de organización
│   └── validators/             # Scripts de validación
├── docs/                        # Documentación
│   ├── versions/               # Docs por versión
│   ├── api/                    # Documentación de API
│   └── guides/                 # Guías de uso
└── tests/                       # Testing
    ├── unit/                   # Tests unitarios
    ├── integration/            # Tests de integración
    └── e2e/                    # Tests end-to-end
```

## 🚀 Comandos Disponibles

### Usar Versión Específica
```bash
VERSION=v2 node orchestrator.js
VERSION=v3 node orchestrator.js
VERSION=latest node orchestrator.js
```

### Testing por Versión
```bash
./tools/test-version.sh v2 unit
./tools/test-version.sh v3 integration
./tools/test-version.sh latest e2e
```

### Limpieza del Proyecto
```bash
./tools/clean-project.sh
./tools/clean-project.sh CLEAN_NODE_MODULES=true
```

### Organización
```bash
./tools/organize-project.sh
./tools/complete-organization.sh
```

## 📋 Versiones Disponibles

- **v1**: Baseline - Versión original estable
- **v2**: Router + Handoffs - Router declarativo + Handoffs estructurados  
- **v3**: Optimizations - Performance tuning + Memory optimization
- **latest**: Symlink a v3 (versión actual)

## 🔧 Desarrollo

### Agregar Nueva Versión
1. Crear directorio `versions/v4/`
2. Copiar archivos base de `versions/v3/`
3. Implementar mejoras
4. Actualizar `versions/manifest.json`
5. Actualizar symlink `latest/` si es necesario

### Modificar Código Compartido
- Los cambios en `shared/` afectan todas las versiones
- Usar con precaución en producción
- Considerar crear nueva versión para cambios breaking

## ✅ Beneficios

- **Versionado limpio**: Cada versión en su directorio
- **Separación clara**: Código agrupado por responsabilidad
- **Fácil navegación**: Estructura intuitiva
- **Mantenimiento simple**: Cambios aislados por versión
- **Testing organizado**: Tests por versión
- **Documentación clara**: Docs separadas por propósito
