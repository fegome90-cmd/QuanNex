# 🌐 Claude Code - Proyecto Fullstack

## 📅 **Fecha**: December 2024
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"
## 🎯 **Propósito**: Configuración específica para proyectos fullstack con frontend y backend integrados

---

## 🎯 **CONTEXTO DEL PROYECTO**

**Nombre**: {{PROJECT_NAME}}
**Tipo**: Fullstack (Frontend + Backend)
**Descripción**: {{PROJECT_DESCRIPTION}}
**Tecnologías**: React + Node.js, TypeScript, PostgreSQL, Redis

---

## 🚀 **COMANDOS DISPONIBLES**

### **🧪 Testing y Validación:**
- **`/test-ui`**: Tests automatizados de interfaz con Playwright
- **`/test-api`**: Tests automatizados de endpoints y integración
- **`/test-e2e`**: Tests end-to-end completos del sistema
- **`/review`**: Revisión de código con análisis de calidad

### **🚀 Despliegue y CI/CD:**
- **`/deploy`**: Despliegue automatizado con validaciones
- **`/optimize-project`**: Optimización de performance y escalabilidad

---

## 🤖 **AGENTES ESPECIALIZADOS**

### **🔍 Revisión y Calidad:**
- **`@code-reviewer`**: Revisión de código y estándares
- **`@quality-assurance`**: Validación de calidad y testing

### **🏗️ Arquitectura y Performance:**
- **`@backend-architect`**: Arquitectura y patrones de diseño
- **`@frontend-expert`**: Optimización de UI/UX y performance

---

## 🛠️ **CONFIGURACIÓN TÉCNICA**

### **📁 Estructura del Proyecto:**
```
├── frontend/            # Aplicación React/TypeScript
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas y rutas
│   │   ├── hooks/       # Custom hooks
│   │   └── utils/       # Utilidades frontend
│   └── tests/           # Tests frontend
├── backend/             # API Node.js/TypeScript
│   ├── src/
│   │   ├── controllers/ # Controladores de endpoints
│   │   ├── services/    # Lógica de negocio
│   │   ├── models/      # Modelos de datos
│   │   └── routes/      # Definición de rutas
│   └── tests/           # Tests backend
└── shared/              # Código compartido
    ├── types/           # Tipos TypeScript compartidos
    └── utils/           # Utilidades compartidas
```

### **🔧 Herramientas Configuradas:**
- **Frontend**: React, TypeScript, CSS Modules, Jest, Playwright
- **Backend**: Node.js, Express, TypeScript, Jest, Supertest
- **Database**: PostgreSQL, Redis, Migrations
- **Build**: Vite (frontend), ts-node (backend)
- **Testing**: Jest + React Testing Library + Playwright

---

## 🚨 **GATES DE VALIDACIÓN**

### **✅ Gate de Desarrollo:**
- [ ] **Frontend**: React compila sin errores
- [ ] **Backend**: Node.js ejecuta sin errores
- [ ] **TypeScript**: Código compila sin errores
- [ ] **Testing**: Tests unitarios pasando

### **✅ Gate de Integración:**
- [ ] **API**: Endpoints responden correctamente
- [ ] **Database**: Conexiones y queries funcionando
- [ ] **E2E**: Tests end-to-end pasando
- [ ] **Performance**: Response times aceptables

### **✅ Gate de Despliegue:**
- [ ] **Build**: Ambos proyectos compilan correctamente
- [ ] **Integration**: Frontend y backend se comunican
- [ ] **Health Check**: Ambos servicios funcionando
- [ ] **Monitoring**: Métricas y logs funcionando

---

## 🚀 **FILOSOFÍA TOYOTA APLICADA**

### **"Menos (y Mejor) es Más"**
- **Funcionalidad esencial**: Solo lo que añade valor
- **Simplicidad**: Código claro y mantenible
- **Calidad**: Testing, documentación y performance por defecto

### **"Mejora Continua"**
- **Iteración**: Mejorar basado en feedback
- **Adaptación**: Ajustar según necesidades del proyecto
- **Optimización**: Refinar continuamente la integración

---

## 📝 **NOTAS DE IMPLEMENTACIÓN**

**Este template proporciona la configuración base para proyectos fullstack, siguiendo las mejores prácticas de integración frontend-backend, testing y deployment.**

**El proyecto está configurado para ser escalable, mantenible y de alta calidad desde el inicio, con integración completa entre capas.**

