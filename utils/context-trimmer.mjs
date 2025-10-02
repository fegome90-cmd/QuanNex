/**
 * Context Trimmer - Optimización de contexto para evitar rate limits
 * Implementa recorte inteligente y RAG más delgado
 */

export class ContextTrimmer {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 4000;
    this.topKRAG = options.topKRAG || 3;
    this.rerankTopN = options.rerankTopN || 8;
    this.maxToolCalls = options.maxToolCalls || 2;
    this.trimRatio = options.trimRatio || 0.3;
  }

  /**
   * Recorta contexto basado en prioridad y relevancia
   * @param {Array} context - Contexto a recortar
   * @param {number} targetRatio - Ratio de recorte (0.0 a 1.0)
   * @returns {Array} Contexto recortado
   */
  trimContext(context, targetRatio = this.trimRatio) {
    if (!Array.isArray(context) || context.length === 0) {
      return context;
    }

    // Calcular número de elementos a mantener
    const targetCount = Math.max(1, Math.floor(context.length * (1 - targetRatio)));

    // Ordenar por relevancia y prioridad
    const sortedContext = this.prioritizeContext(context);

    // Tomar los más relevantes
    return sortedContext.slice(0, targetCount);
  }

  /**
   * Prioriza contexto por relevancia y tipo
   * @param {Array} context - Contexto a priorizar
   * @returns {Array} Contexto priorizado
   */
  prioritizeContext(context) {
    return context.sort((a, b) => {
      // Puntuación de prioridad
      const scoreA = this.calculatePriorityScore(a);
      const scoreB = this.calculatePriorityScore(b);

      return scoreB - scoreA; // Mayor puntuación primero
    });
  }

  /**
   * Calcula puntuación de prioridad para un elemento de contexto
   * @param {Object} item - Elemento de contexto
   * @returns {number} Puntuación de prioridad
   */
  calculatePriorityScore(item) {
    let score = 0;

    // Prioridad por tipo de contenido
    const typeScores = {
      instruction: 10,
      decision: 9,
      code: 8,
      error: 7,
      warning: 6,
      info: 5,
      debug: 3,
      metadata: 2,
    };

    score += typeScores[item.type] || 5;

    // Prioridad por relevancia
    if (item.relevance) {
      score += item.relevance * 5;
    }

    // Prioridad por timestamp (más reciente = más relevante)
    if (item.timestamp) {
      const age = Date.now() - new Date(item.timestamp).getTime();
      const ageHours = age / (1000 * 60 * 60);
      score += Math.max(0, 10 - ageHours); // Decae con el tiempo
    }

    // Prioridad por tamaño (contenido más conciso)
    if (item.content) {
      const contentLength = item.content.length;
      if (contentLength < 100)
        score += 2; // Contenido conciso
      else if (contentLength > 1000) score -= 1; // Contenido muy largo
    }

    return score;
  }

  /**
   * Optimiza RAG con TOPK y reranking
   * @param {Array} chunks - Chunks de RAG
   * @param {string} query - Query de búsqueda
   * @returns {Array} Chunks optimizados
   */
  optimizeRAG(chunks, query) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return chunks;
    }

    // 1. Aplicar TOPK inicial
    const topKChunks = chunks.slice(0, this.rerankTopN);

    // 2. Reranking por relevancia
    const rerankedChunks = this.rerankChunks(topKChunks, query);

    // 3. Aplicar TOPK final
    return rerankedChunks.slice(0, this.topKRAG);
  }

  /**
   * Reranking de chunks por relevancia
   * @param {Array} chunks - Chunks a rerankear
   * @param {string} query - Query de búsqueda
   * @returns {Array} Chunks rerankeado
   */
  rerankChunks(chunks, query) {
    return chunks
      .map(chunk => ({
        ...chunk,
        relevanceScore: this.calculateRelevanceScore(chunk, query),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calcula score de relevancia entre chunk y query
   * @param {Object} chunk - Chunk de contenido
   * @param {string} query - Query de búsqueda
   * @returns {number} Score de relevancia
   */
  calculateRelevanceScore(chunk, query) {
    if (!query || !chunk.content) return 0;

    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = chunk.content.toLowerCase().split(/\s+/);

    let score = 0;

    // Contar palabras de query que aparecen en el contenido
    for (const word of queryWords) {
      const wordCount = contentWords.filter(w => w.includes(word)).length;
      score += wordCount;
    }

    // Normalizar por longitud del contenido
    return score / Math.max(1, contentWords.length);
  }

  /**
   * Limita número de tool calls por turno
   * @param {Array} toolCalls - Tool calls a limitar
   * @returns {Array} Tool calls limitados
   */
  limitToolCalls(toolCalls) {
    if (!Array.isArray(toolCalls)) return toolCalls;

    // Priorizar tool calls por importancia
    const prioritizedCalls = toolCalls.sort((a, b) => {
      const priorityA = this.getToolPriority(a.name);
      const priorityB = this.getToolPriority(b.name);
      return priorityB - priorityA;
    });

    return prioritizedCalls.slice(0, this.maxToolCalls);
  }

  /**
   * Obtiene prioridad de una herramienta
   * @param {string} toolName - Nombre de la herramienta
   * @returns {number} Prioridad (mayor = más importante)
   */
  getToolPriority(toolName) {
    const toolPriorities = {
      codebase_search: 10,
      read_file: 9,
      search_replace: 8,
      write: 7,
      run_terminal_cmd: 6,
      web_search: 5,
      create_diagram: 4,
      fetch_pull_request: 3,
      update_memory: 2,
      other: 1,
    };

    return toolPriorities[toolName] || toolPriorities['other'];
  }

  /**
   * Genera resumen de contexto para reducir tokens
   * @param {Array} context - Contexto a resumir
   * @returns {string} Resumen del contexto
   */
  generateContextSummary(context) {
    if (!Array.isArray(context) || context.length === 0) {
      return '';
    }

    const summaries = [];

    // Agrupar por tipo
    const grouped = context.reduce((acc, item) => {
      const type = item.type || 'general';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});

    // Generar resumen por tipo
    for (const [type, items] of Object.entries(grouped)) {
      if (items.length === 1) {
        summaries.push(`${type}: ${this.truncateContent(items[0].content, 100)}`);
      } else {
        summaries.push(`${type}: ${items.length} items`);
      }
    }

    return summaries.join(' | ');
  }

  /**
   * Trunca contenido a longitud específica
   * @param {string} content - Contenido a truncar
   * @param {number} maxLength - Longitud máxima
   * @returns {string} Contenido truncado
   */
  truncateContent(content, maxLength = 200) {
    if (!content || typeof content !== 'string') return '';

    if (content.length <= maxLength) return content;

    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Aplica degradación progresiva basada en errores 429
   * @param {Object} config - Configuración actual
   * @param {number} errorCount - Número de errores 429
   * @returns {Object} Configuración degradada
   */
  applyProgressiveDegradation(config, errorCount) {
    const degradedConfig = { ...config };

    if (errorCount >= 1) {
      // Primera degradación: reducir TOPK_RAG
      degradedConfig.topKRAG = Math.max(1, Math.floor(config.topKRAG * 0.7));
    }

    if (errorCount >= 2) {
      // Segunda degradación: reducir contexto
      degradedConfig.contextTrimRatio = Math.min(0.5, config.contextTrimRatio + 0.1);
    }

    if (errorCount >= 3) {
      // Tercera degradación: reducir tool calls
      degradedConfig.maxToolCalls = Math.max(1, config.maxToolCalls - 1);
    }

    if (errorCount >= 4) {
      // Cuarta degradación: deshabilitar herramientas no críticas
      degradedConfig.disableNonCriticalTools = true;
    }

    return degradedConfig;
  }

  /**
   * Estima tokens de un contexto
   * @param {Array} context - Contexto a estimar
   * @returns {number} Estimación de tokens
   */
  estimateTokens(context) {
    if (!Array.isArray(context)) return 0;

    return context.reduce((total, item) => {
      const content = item.content || '';
      const tokens = Math.ceil(content.length / 4); // Aproximación: 4 chars = 1 token
      return total + tokens;
    }, 0);
  }
}

export default ContextTrimmer;
