# 🧩 Comando: /create-component

## 📅 **Fecha**: December 2024
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"
## 🎯 **Propósito**: Creación automatizada de componentes React con mejores prácticas

---

## 🎯 **DESCRIPCIÓN**

**`/create-component`** crea componentes React siguiendo las mejores prácticas, incluyendo TypeScript, testing, documentación y accesibilidad por defecto.

---

## 🚀 **USO**

```
/create-component [opciones]
```

### **📋 Opciones Disponibles:**

- **`--name <nombre>`**: Nombre del componente (requerido)
- **`--type <functional|class>`**: Tipo de componente (default: functional)
- **`--props <interface>`**: Interface de props en TypeScript
- **`--testing`**: Incluir tests unitarios
- **`--storybook`**: Incluir Storybook stories
- **`--accessibility`**: Incluir validaciones de accesibilidad
- **`--styled`**: Usar styled-components o CSS modules

---

## 🔄 **FUNCIONALIDAD**

### **📊 Generación Automatizada:**
1. **Componente React**: Funcional o de clase con TypeScript
2. **Props Interface**: Tipado fuerte con TypeScript
3. **Testing**: Tests unitarios con Jest y React Testing Library
4. **Documentación**: JSDoc y README del componente
5. **Accesibilidad**: ARIA labels y navegación por teclado
6. **Styling**: CSS modules, styled-components o Tailwind

### **🛡️ Validaciones de Calidad:**
- **TypeScript**: Tipado fuerte y interfaces validadas
- **ESLint**: Reglas de calidad de código aplicadas
- **Prettier**: Formateo consistente del código
- **Accessibility**: Validaciones de accesibilidad automáticas

---

## 📊 **SALIDA**

### **✅ Componente Creado Exitosamente:**
```
🧩 Componente Creado - COMPLETADO
✅ Componente: src/components/Button/Button.tsx
✅ Interface: src/components/Button/Button.types.ts
✅ Tests: src/components/Button/Button.test.tsx
✅ Stories: src/components/Button/Button.stories.tsx
✅ Styles: src/components/Button/Button.module.css
✅ Documentación: src/components/Button/README.md
🎉 Componente Button creado exitosamente
```

### **❌ Error en Creación:**
```
🧩 Componente Creado - ERROR
❌ Error: Nombre de componente inválido
⚠️  El nombre debe ser PascalCase y no contener caracteres especiales
💡 Sugerencia: Usar --name Button o --name UserProfile
```

---

## 🛠️ **IMPLEMENTACIÓN TÉCNICA**

### **🔧 Generación de Archivos:**
- **Componente**: React functional component con TypeScript
- **Types**: Interface de props y tipos relacionados
- **Tests**: Jest + React Testing Library
- **Stories**: Storybook para documentación visual
- **Styles**: CSS modules con variables CSS

### **📝 Estructura de Archivos:**
```
src/components/[ComponentName]/
├── [ComponentName].tsx          # Componente principal
├── [ComponentName].types.ts     # Tipos TypeScript
├── [ComponentName].test.tsx     # Tests unitarios
├── [ComponentName].stories.tsx  # Storybook stories
├── [ComponentName].module.css   # Estilos CSS modules
└── README.md                    # Documentación
```

---

## 🚨 **GATES DE VALIDACIÓN**

### **✅ Gate de Inicio:**
- [ ] **Nombre válido**: PascalCase sin caracteres especiales
- [ ] **Directorio disponible**: Permisos de escritura en src/components/
- [ ] **Dependencias**: React, TypeScript, testing disponibles

### **✅ Gate de Generación:**
- [ ] **Archivos creados**: Todos los archivos generados correctamente
- [ ] **TypeScript válido**: Código compila sin errores
- [ ] **Tests pasando**: Tests unitarios ejecutándose correctamente

### **✅ Gate de Finalización:**
- [ ] **Componente funcional**: Renderiza correctamente
- [ ] **Documentación**: README y JSDoc completos
- [ ] **Accesibilidad**: ARIA labels y navegación implementados

---

## 🚀 **FILOSOFÍA TOYOTA APLICADA**

### **"Menos (y Mejor) es Más"**
- **Componentes esenciales**: Solo lo que añade valor
- **Simplicidad**: Código claro y mantenible
- **Calidad**: Testing, documentación y accesibilidad por defecto

### **"Mejora Continua"**
- **Iteración**: Mejorar templates basado en feedback
- **Adaptación**: Ajustar según necesidades del proyecto
- **Optimización**: Refinar continuamente la generación

---

## 📝 **NOTAS DE IMPLEMENTACIÓN**

**Este comando implementa generación automatizada de componentes React siguiendo las mejores prácticas, incluyendo TypeScript, testing y accesibilidad por defecto.**

**El comando está diseñado para ser extensible, permitiendo fácil personalización de templates y reglas de generación según necesidades específicas del proyecto.**
