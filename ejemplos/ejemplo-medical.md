# 🏥 Ejemplo: Aplicación Médica con Compliance HIPAA

## Caso de Uso: Sistema de Gestión de Heridas (WoundCare)

### Paso 1: Ejecutar el Script
```bash
cd /Users/felipe/Desktop/claude-project-init-kit
./claude-project-init.sh
```

### Paso 2: Configuración
```
Introduce el nombre de tu nuevo proyecto: woundcare-management
Selecciona el tipo de proyecto (1-6): 4
```

### Paso 3: Resultado Generado
```
woundcare-management/
├── .claude/
│   ├── commands/
│   │   ├── test-ui.md           # Testing visual con validación clínica
│   │   ├── create-component.md  # Componentes médicos seguros
│   │   ├── review.md            # Review con foco HIPAA
│   │   ├── deploy.md            # Despliegue seguro médico
│   │   ├── optimize.md          # Optimización + compliance
│   │   └── commit.md            # Commits con auditabilidad
│   ├── agents/
│   │   ├── backend-architect.json
│   │   ├── react-expert.json
│   │   ├── code-reviewer.json
│   │   └── medical-reviewer.json  # 🏥 AGENTE ESPECIALIZADO
│   ├── mcp.json                 # Playwright para workflows clínicos
│   └── hooks.json               # 🔒 Hooks HIPAA automáticos
├── context/
├── CLAUDE.md                    # Configuración médica específica
├── .gitignore                   # Configurado para datos médicos
└── README.md
```

### Paso 4: Inicializar Claude Code
```bash
cd woundcare-management
claude
```

**🏥 Activación Automática:**
```
🏥 MODO MÉDICO: Verificando compliance HIPAA...
Recordatorio: Validar que no se expongan datos PHI
```

### Paso 5: Desarrollo con Compliance HIPAA

#### A. Crear Componente de Evaluación de Herida
```bash
/create-component WoundAssessment
```

**@medical-reviewer ejecutará:**
1. **HIPAA Compliance Check:**
   - ❌ No PHI en logs o console
   - ✅ Encriptación de datos sensibles
   - ✅ Audit trail completo

2. **Clinical Safety Validation:**
   - ✅ Terminología médica precisa
   - ✅ Workflows clínicos seguros
   - ✅ Manejo de errores sin estados peligrosos

3. **Medical Data Integrity:**
   - ✅ Validación robusta de datos clínicos
   - ✅ Códigos médicos (ICD-10, SNOMED) formateados
   - ✅ Cálculos clínicos matemáticamente correctos

#### B. Testing con Validación Clínica
```bash
/test-ui
```

**Claude ejecutará:**
1. Iniciar servidor HTTPS seguro (`npm run dev:secure`)
2. Ejecutar tests de workflows clínicos con Playwright
3. Validar flujos de entrada de datos médicos
4. Verificar que no se exponga PHI en client-side

#### C. Review Médico Especializado
```bash
/review
```

**@medical-reviewer analizará:**
- 🔒 **Security**: No exposición de PHI
- ⚡ **Performance**: Tiempos de respuesta clínicos
- 🧹 **Code Quality**: Estándares de software médico
- 🏥 **Compliance**: Regulaciones y audit trails

### Paso 6: Comandos Médicos del CLAUDE.md

```bash
# Desarrollo (PRIMARIO - HIPAA compliant)
npm run dev                    # Servidor seguro
npm run dev:secure            # HTTPS development mode

# Testing (ESENCIAL - compliance testing)
npx playwright test           # UI tests con workflows clínicos
npm test                     # Unit tests + lógica médica
npm run test:hipaa           # Tests de compliance HIPAA
npm run test:security        # Tests de vulnerabilidades

# Calidad (CRÍTICO para software médico)
npm run lint                 # ESLint con estándares médicos
npm run build               # Build con security checks
npm run audit               # Security audit
npm run compliance-check     # Verificación HIPAA
```

### Paso 7: Casos de Uso Médicos Específicos

#### A. Validación de Datos Clínicos
```bash
@medical-reviewer "Revisa el componente de cálculo de superficie de herida para precisión clínica"
```

**Resultado esperado:**
- ✅ Fórmula matemática validada
- ✅ Unidades de medida correctas
- ✅ Rangos de valores clínicamente válidos
- ✅ Manejo de edge cases médicos

#### B. Compliance HIPAA Automático
```bash
@medical-reviewer "Verifica que el componente de historial de paciente cumple HIPAA"
```

**Validaciones automáticas:**
- ❌ No PHI en logs del navegador
- ✅ Encriptación end-to-end
- ✅ Access controls implementados
- ✅ Audit logging configurado

### Paso 8: Hooks Automáticos HIPAA

**Pre-Tool Use:**
```
🔄 Modificando archivos...
🏥 MODO MÉDICO: Verificando compliance HIPAA...
```

**Post-Tool Use:**
```
✅ Auto-formato aplicado
🔒 Verificación de exposición PHI completada
```

**User Prompt Submit:**
```
🏥 MODO MÉDICO: Verificando compliance HIPAA...
Recordatorio: Validar que no se expongan datos PHI
```

### Paso 9: Flujos de Trabajo Clínicos

#### Desarrollo de Feature Médica
```bash
# 1. Crear componente con validación médica
/create-component PatientVitals

# 2. Testing de workflow clínico
/test-ui

# 3. Review con foco HIPAA
/review

# 4. Optimización manteniendo compliance
/optimize src/components/PatientVitals.tsx

# 5. Commit con auditabilidad
/commit
```

#### Delegación a Agente Médico
```bash
# Validación de lógica clínica
@medical-reviewer "Valida el algoritmo de recomendación de tratamiento de heridas"

# Review de compliance completo
@medical-reviewer "Auditoria completa del módulo de gestión de pacientes"

# Validación de terminología médica
@medical-reviewer "Verifica que la nomenclatura de tipos de herida sea clínicamente correcta"
```

### Paso 10: Características Específicas Médicas

#### CLAUDE.md Personalizado
- **Comandos HIPAA prioritarios**
- **Notas de compliance integradas**
- **Flujos de trabajo clínicos documentados**
- **Standards de software médico**

#### Agente Medical-Reviewer
```json
{
  "name": "medical-reviewer",
  "description": "Specialized agent for HIPAA compliance and clinical accuracy",
  "persona": "Senior healthcare software engineer with 10+ years experience",
  "focus": [
    "HIPAA Compliance Check",
    "Clinical Safety Validation", 
    "Medical Data Integrity",
    "Regulatory Compliance"
  ]
}
```

#### Hooks Especializados
- **Verificación PHI automática**
- **Compliance reminders en cada interacción**
- **Audit trail generation**
- **Security validation hooks**

### Paso 11: Quality Gates Médicos

**El sistema verifica automáticamente:**
- ✅ No exposición de PHI
- ✅ Encriptación de datos sensibles
- ✅ Audit trails completos
- ✅ Terminología médica correcta
- ✅ Workflows clínicos seguros
- ✅ Cálculos clínicos precisos

### Ejemplo de Output del Medical-Reviewer

```
🏥 MEDICAL REVIEW COMPLETED

🔒 **HIPAA COMPLIANCE**: ✅ PASSED
- No PHI detected in client-side code
- Encryption protocols verified
- Audit logging implemented

⚕️ **CLINICAL SAFETY**: ✅ PASSED  
- Medical terminology validated
- Clinical workflows are logical
- Error handling prevents dangerous states

📊 **DATA INTEGRITY**: ⚠️ MINOR ISSUES
- Input validation robust
- Medical codes properly formatted
- Clinical calculations need range validation for edge cases

🏛️ **REGULATORY COMPLIANCE**: ✅ PASSED
- Follows medical device software principles
- Documentation supports regulatory requirements

**VERDICT**: Approved for medical use with minor data validation improvements
```

### Resultado Final

Una aplicación médica completamente compliant con HIPAA, con validación clínica automática, terminología médica correcta, y workflows seguros para pacientes. 

**Seguridad y compliance garantizados desde el desarrollo.**