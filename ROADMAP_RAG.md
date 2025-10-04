# 📑 Roadmap Técnico — Evolución del Stack RAG hacia Producción Gobernada

## 🎯 Objetivo

Transformar el pipeline RAG actual de funcional a industrial: auditable, gobernado y confiable.

**Se prioriza la mitigación de riesgos sistémicos identificados:**
- Calidad de input (Garbage In, Gospel Out)
- Erosión de calidad en outputs
- Deuda técnica del prompt
- Precisión insuficiente en retrieval

---

## 🛠️ Etapas (ordenadas por impacto y dependencia)

### Paso 1 — Fundamento: Calidad del Input

**Acción:** Integrar Unstructured en el pipeline de ingesta.

- Reemplazar el parser simple por Unstructured para PDF/HTML/Docx
- Normalizar corpus existente mediante re-ingesta con el nuevo pipeline
- Guardar metadatos enriquecidos (tipo documento, secciones, timestamps)

**Valor agregado:** Mitigación directa del riesgo Garbage In, Gospel Out.

**Entregable:** `rag-ingest-unstructured.ts`, corpus re-ingestado

---

### Paso 2 — Validación: Calidad del Output

**Acción:** Integrar RAGAS como gate de TaskDB.

- Definir KPIs iniciales: fidelidad, relevancia, recall
- Añadir `taskdb_rag_eval_score` como métrica
- Gate obligatorio: ningún PRP crítico pasa sin evaluación automática

**Valor agregado:** Se transforma la calidad de respuesta en una métrica auditable.

**Entregable:** `eval/ragas_smoke.py`, TaskDB gate con KPIs

---

### Paso 3 — Reproducibilidad: PRP como Código

**Acción:** Adoptar DSPy para PRPs nuevos.

- Crear un PRP piloto en DSPy que formalice ingesta + retrieval + evaluación
- Versionar el PRP como módulo reproducible, con PRP.lock
- Integrar en pipeline CI de TaskDB

**Valor agregado:** Se elimina la deuda técnica del prompt → PRPs reproducibles, testeables y optimizables.

**Entregable:** `prp/pilot_dspy.py`, PRP.lock

---

### Paso 4 — Precisión: Retrieval Crítico

**Acción:** Introducir RAGatouille/ColBERT en shard de conocimiento sensible.

- Configurar ColBERT como retriever secundario bajo políticas de TaskDB
- Evaluar impacto comparando recall/precision con RAGAS
- Solo se activa en dominios críticos (coste-controlado)

**Valor agregado:** Precisión quirúrgica en dominios donde el error no es tolerable.

**Entregable:** `retrievers/colbert_adapter.ts`, métricas comparativas

---

## 🔄 Dependencias

1. **Unstructured primero** → todo corpus debe ser limpio y homogéneo
2. **RAGAS necesita** corpus ingestados para tener contexto real
3. **DSPy se apoya** en la infraestructura ya evaluada (RAGAS)
4. **ColBERT solo tiene sentido** cuando hay baseline medido

---

## ✅ Estado Esperado al Final

- Pipeline con insumos homogéneos y validados
- Calidad de respuestas medible en CI/CD
- PRPs reproducibles y versionados como código
- Recuperación de alta precisión en dominios sensibles

---

## 📋 Implementación como ADRs

Este roadmap se implementará como secuencia de ADRs (Architecture Decision Records):

- **ADR-002**: Calidad del Input - Integración de Unstructured
- **ADR-003**: Validación del Output - RAGAS como gate de calidad
- **ADR-004**: PRPs como Código - Adopción de DSPy
- **ADR-005**: Retrieval Crítico - ColBERT para dominios sensibles

---

*Documento creado: $(date)*
*Estado: Roadmap definido, listo para implementación secuencial*
