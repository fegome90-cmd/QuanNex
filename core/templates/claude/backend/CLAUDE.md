# ⚙️ Claude Code - Proyecto Backend

## 📅 **Fecha**: December 2024
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"
## 🎯 **Propósito**: Configuración específica para proyectos backend con Node.js/Python

---

## 🎯 **CONTEXTO DEL PROYECTO**

**Nombre**: {{PROJECT_NAME}}
**Tipo**: Backend (API/Server)
**Descripción**: {{PROJECT_DESCRIPTION}}
**Tecnologías**: Node.js/Python, Express/FastAPI, PostgreSQL, Redis

---

## 🚀 **COMANDOS DISPONIBLES**

### **🧪 Testing y Validación:**
- **`/test-api`**: Tests automatizados de endpoints y integración
- **`/create-endpoint`**: Crear endpoints con validaciones y documentación
- **`/review`**: Revisión de código con análisis de seguridad

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
- **`@performance-optimizer`**: Optimización de performance

---

## 🛠️ **CONFIGURACIÓN TÉCNICA**

### **📁 Estructura del Proyecto:**
```
src/
├── controllers/         # Controladores de endpoints
├── services/            # Lógica de negocio
├── models/              # Modelos de datos
├── middleware/          # Middleware personalizado
├── routes/              # Definición de rutas
├── utils/               # Utilidades y helpers
├── tests/               # Tests unitarios y de integración
└── config/              # Configuraciones y variables
```

### **🔧 Herramientas Configuradas:**
- **Linting**: ESLint + Prettier (Node.js) / Black + Flake8 (Python)
- **Testing**: Jest (Node.js) / Pytest (Python)
- **API Testing**: Supertest (Node.js) / Pytest-httpx (Python)
- **Database**: Migrations y seeders
- **Documentation**: OpenAPI/Swagger

---

## 🚨 **GATES DE VALIDACIÓN**

### **✅ Gate de Desarrollo:**
- [ ] **Compilación**: Código compila/ejecuta sin errores
- [ ] **Linting**: Linter pasa sin warnings
- [ ] **Testing**: Tests unitarios pasando
- [ ] **API**: Endpoints responden correctamente

### **✅ Gate de Calidad:**
- [ ] **Seguridad**: Validaciones de entrada implementadas
- [ ] **Performance**: Response times < 200ms
- [ ] **Database**: Migrations y queries optimizadas
- [ ] **Documentation**: API documentada con OpenAPI

### **✅ Gate de Despliegue:**
- [ ] **Build**: Proyecto compila correctamente
- [ ] **Tests**: Tests de integración pasando
- [ ] **Health Check**: Endpoint de health funcionando
- [ ] **Secrets**: Variables de entorno configuradas

---

## 🚀 **FILOSOFÍA TOYOTA APLICADA**

### **"Menos (y Mejor) es Más"**
- **Endpoints esenciales**: Solo lo que añade valor
- **Simplicidad**: Código claro y mantenible
- **Calidad**: Testing, documentación y seguridad por defecto

### **"Mejora Continua"**
- **Iteración**: Mejorar basado en feedback
- **Adaptación**: Ajustar según necesidades del proyecto
- **Optimización**: Refinar continuamente la performance

---

## 📝 **NOTAS DE IMPLEMENTACIÓN**

**Este template proporciona la configuración base para proyectos backend, siguiendo las mejores prácticas de API design, testing y seguridad.**

**El proyecto está configurado para ser escalable, mantenible y de alta calidad desde el inicio.**

