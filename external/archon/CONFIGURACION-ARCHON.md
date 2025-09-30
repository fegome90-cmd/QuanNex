# 🏗️ **GUÍA COMPLETA DE CONFIGURACIÓN DE ARCHON AL 100%**

## 📅 **Fecha**: Enero 2025

## 🎯 **Propósito**: Configurar Archon completamente funcional siguiendo instrucciones oficiales

## 🏗️ **Base**: Repositorio oficial https://github.com/coleam00/Archon

---

## 🚨 **PASOS CRÍTICOS OBLIGATORIOS**

### **PASO 1: Crear Proyecto Supabase**

#### **1.1 Crear Cuenta Supabase:**

```
1. Ir a: https://supabase.com
2. Hacer clic en "Start your project"
3. Crear cuenta nueva o iniciar sesión
4. Hacer clic en "New Project"
```

#### **1.2 Configurar Proyecto:**

```
1. Nombre del proyecto: "archon-project" (o el que prefieras)
2. Database Password: Crear contraseña segura (guardarla)
3. Region: Seleccionar la más cercana
4. Pricing Plan: Free tier (suficiente para empezar)
5. Hacer clic en "Create new project"
```

#### **1.3 Esperar Setup Completo:**

```
- El proyecto puede tardar 2-5 minutos en configurarse
- Esperar hasta que aparezca "Project is ready"
- NO continuar hasta que esté completamente listo
```

---

### **PASO 2: Obtener Credenciales Supabase**

#### **2.1 Acceder a Configuración API:**

```
1. En el dashboard de Supabase, ir a: Settings (⚙️)
2. Hacer clic en "API" en el menú lateral
3. Se abrirá la página de configuración de API
```

#### **2.2 Obtener SUPABASE_URL:**

```
1. En la sección "Project URL"
2. Copiar la URL completa (ejemplo: https://abcdefgh.supabase.co)
3. Esta será tu SUPABASE_URL
```

#### **2.3 Obtener SUPABASE_SERVICE_KEY:**

```
⚠️ CRÍTICO: Usar SERVICE ROLE key, NO anon key ⚠️

1. En la sección "Project API keys"
2. Verás DOS claves:
   ❌ anon (public): WRONG - Más corta, contiene "anon"
   ✅ service_role (secret): CORRECT - Más larga, contiene "service_role"
3. Copiar la clave "service_role" (la más larga)
4. Esta será tu SUPABASE_SERVICE_KEY
```

---

### **PASO 3: Configurar Archivo .env**

#### **3.1 Editar .env:**

```bash
cd external/archon
nano .env  # o usar tu editor preferido
```

#### **3.2 Configurar Variables:**

```bash
# Reemplazar estos valores con los tuyos:

SUPABASE_URL=https://tu-proyecto-id.supabase.co
SUPABASE_SERVICE_KEY=tu-service-role-key-aqui

# Mantener el resto de configuraciones por defecto
```

#### **3.3 Verificar Configuración:**

```bash
# Verificar que las variables estén configuradas
grep "SUPABASE_URL\|SUPABASE_SERVICE_KEY" .env
```

---

### **PASO 4: Ejecutar Migración SQL en Supabase**

#### **4.1 Acceder al SQL Editor:**

```
1. En el dashboard de Supabase, ir a: SQL Editor
2. Hacer clic en "New query"
3. Se abrirá el editor SQL
```

#### **4.2 Copiar Script de Migración:**

```bash
# En tu terminal local, copiar el contenido del archivo:
cat migration/complete_setup.sql
```

#### **4.3 Ejecutar Migración:**

```
1. Pegar todo el contenido en el SQL Editor de Supabase
2. Hacer clic en "Run" (▶️)
3. Esperar que se complete la ejecución
4. Verificar que no haya errores
```

#### **4.4 Verificar Tablas Creadas:**

```
1. En Supabase, ir a: Table Editor
2. Verificar que existan estas tablas:
   - archon_settings
   - archon_documents
   - archon_tasks
   - archon_crawls
   - archon_credentials
```

---

### **PASO 5: Obtener OpenAI API Key**

#### **5.1 Crear Cuenta OpenAI:**

```
1. Ir a: https://platform.openai.com
2. Crear cuenta nueva o iniciar sesión
3. Verificar email si es necesario
```

#### **5.2 Generar API Key:**

```
1. Ir a: https://platform.openai.com/api-keys
2. Hacer clic en "Create new secret key"
3. Dar nombre descriptivo (ej: "archon-project")
4. Copiar la API key generada
5. Guardarla en lugar seguro (no se puede ver de nuevo)
```

---

### **PASO 6: Iniciar Servicios Archon**

#### **6.1 Construir y Levantar Contenedores:**

```bash
# Desde external/archon/
docker compose up --build -d
```

#### **6.2 Verificar Servicios:**

```bash
# Verificar que todos los contenedores estén corriendo
docker compose ps

# Verificar logs si hay problemas
docker compose logs -f
```

#### **6.3 Verificar Puertos:**

```bash
# Verificar que los puertos estén abiertos
lsof -i :3737  # UI
lsof -i :8181  # Server
lsof -i :8051  # MCP
```

---

### **PASO 7: Configurar API Key vía UI Web**

#### **7.1 Acceder a la UI:**

```
1. Abrir navegador
2. Ir a: http://localhost:3737
3. Deberías ver la interfaz de Archon
```

#### **7.2 Completar Onboarding:**

```
1. Seguir el flujo de onboarding automático
2. Cuando se solicite, pegar tu OpenAI API Key
3. Seleccionar modelo preferido (GPT-4 recomendado)
4. Completar configuración inicial
```

#### **7.3 Verificar Configuración:**

```
1. Ir a: Settings (⚙️)
2. Verificar que la API Key esté configurada
3. Verificar que el modelo esté seleccionado
4. Verificar que RAG strategy esté habilitado
```

---

## 🧪 **VERIFICACIÓN COMPLETA DEL SISTEMA**

### **PASO 8: Testing Exhaustivo**

#### **8.1 Verificar desde Nuestro Repo:**

```bash
# Desde claude-project-init-kit/
cd external/archon
make archon-check    # Debe pasar sin errores
make archon-smoke    # Debe pasar sin errores
make archon-edge     # Ya funciona
```

#### **8.2 Verificar Funcionalidades:**

```
1. UI web funcionando: http://localhost:3737
2. API respondiendo: http://localhost:8181/health
3. MCP funcionando: Puerto 8051
4. Base de datos conectada
5. API keys configuradas
```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS COMUNES**

### **Error: "Permission denied" al guardar**

```
CAUSA: Usando anon key en lugar de service_role key
SOLUCIÓN: Verificar que SUPABASE_SERVICE_KEY sea la clave correcta
```

### **Error: "Connection failed" a Supabase**

```
CAUSA: SUPABASE_URL incorrecto o proyecto no listo
SOLUCIÓN: Verificar URL y esperar que el proyecto esté completamente configurado
```

### **Error: "Port already in use"**

```
CAUSA: Puerto ocupado por otro servicio
SOLUCIÓN: Cambiar puerto en .env o detener servicio conflictivo
```

### **Error: "Database schema not found"**

```
CAUSA: Migración SQL no ejecutada
SOLUCIÓN: Ejecutar migration/complete_setup.sql en Supabase
```

---

## 🎯 **ESTADO FINAL ESPERADO**

### **✅ Sistema 100% Funcional:**

- **Base de datos**: Supabase conectado y configurado
- **API keys**: OpenAI configurado vía UI
- **Servicios**: Todos los contenedores corriendo
- **UI web**: http://localhost:3737 funcionando
- **API**: http://localhost:8181/health respondiendo
- **MCP**: Puerto 8051 funcionando
- **Edge matrix**: Funcionando en nuestro repo

### **🚀 Funcionalidades Disponibles:**

- **Gestión de documentos**: Subir PDFs, docs, websites
- **RAG avanzado**: Búsqueda inteligente con embeddings
- **Gestión de tareas**: Crear y gestionar tareas del proyecto
- **Integración MCP**: Conectar con Claude Code, Cursor, etc.
- **Crawling web**: Extraer contenido de sitios web
- **Colaboración en tiempo real**: WebSocket updates

---

## 🔗 **INTEGRACIÓN CON NUESTRO SISTEMA**

### **Comandos Make Funcionando:**

```bash
make archon-check    # Verificación completa del sistema
make archon-smoke    # Testing operativo end-to-end
make archon-edge     # Edge matrix funcionando
```

### **Scripts de Bootstrap:**

```bash
scripts/archon-bootstrap.sh    # Setup automático completo
scripts/archon-setup-check.sh  # Verificación de configuración
scripts/archon-smoke.sh        # Testing operativo
```

---

## 📅 **TIMELINE DE IMPLEMENTACIÓN**

### **HOY:**

1. ✅ Crear proyecto Supabase
2. ✅ Configurar .env
3. ✅ Ejecutar migración SQL
4. ✅ Obtener OpenAI API key
5. ✅ Iniciar servicios
6. ✅ Configurar vía UI web
7. ✅ Testing completo

### **MAÑANA:**

1. 🚀 Sistema en producción
2. 🚀 Integración con nuestros agentes
3. 🚀 Workflows colaborativos funcionando

---

**Sigue estos pasos exactamente en orden. Cada paso es crítico para el funcionamiento del sistema. ¿Empezamos con la configuración de Supabase?** 🚀✨
