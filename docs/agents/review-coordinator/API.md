# 🤝 **API Documentation - @review-coordinator**

## 📅 **Versión**: 1.0.0
## 🎯 **Agente**: @review-coordinator
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **API OVERVIEW**

El agente `@review-coordinator` proporciona una API completa para coordinación de revisiones entre agentes, gestión de flujos de trabajo y consolidación de reportes. La API está diseñada para orquestar múltiples agentes especializados.

## 🚀 **ENDPOINTS**

### **POST /api/coordination/start**
Inicia coordinación de revisiones.

**Request:**
```json
{
  "review_type": "all",
  "agents": ["code-reviewer", "security-guardian"],
  "options": {
    "parallel_execution": true,
    "notifications": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "coordination": {
    "agents_assigned": 2,
    "estimated_duration": "5m",
    "coordination_id": "coord-123"
  },
  "workflow": [
    {
      "step": 1,
      "agent": "code-reviewer",
      "status": "pending"
    },
    {
      "step": 2,
      "agent": "security-guardian",
      "status": "pending"
    }
  ]
}
```

---

**📅 Última actualización**: Agosto 31, 2025  
**🤝 Estado**: Activo y funcional  
**📊 Completitud**: 100%
