#!/usr/bin/env python3
"""
Latency Smoke Test - Validación de rendimiento del pipeline RAG
Ejecuta queries contra la API local y mide latencias p95/p99
"""
import json
import time
import requests
import argparse
import statistics
from typing import List, Dict, Any
from pathlib import Path

def load_evalset(evalset_path: str) -> List[Dict[str, Any]]:
    """Carga el evalset desde JSONL"""
    evalset = []
    with open(evalset_path, 'r') as f:
        for line in f:
            if line.strip():
                evalset.append(json.loads(line))
    return evalset

def query_api(query: str, api_url: str = "http://localhost:8000/query") -> Dict[str, Any]:
    """Ejecuta una query contra la API RAG"""
    try:
        start_time = time.time()
        response = requests.post(
            api_url,
            json={"query": query},
            timeout=30
        )
        end_time = time.time()
        
        latency_ms = (end_time - start_time) * 1000
        
        if response.status_code == 200:
            return {
                "success": True,
                "latency_ms": latency_ms,
                "response": response.json()
            }
        else:
            return {
                "success": False,
                "latency_ms": latency_ms,
                "error": f"HTTP {response.status_code}"
            }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "latency_ms": 0,
            "error": str(e)
        }

def calculate_percentiles(latencies: List[float], percentile: float) -> float:
    """Calcula percentil de una lista de latencias"""
    if not latencies:
        return 0.0
    sorted_latencies = sorted(latencies)
    index = int((percentile / 100) * len(sorted_latencies))
    return sorted_latencies[min(index, len(sorted_latencies) - 1)]

def main():
    parser = argparse.ArgumentParser(description="RAG Latency Smoke Test")
    parser.add_argument("--evalset", required=True, help="Path to evalset JSONL")
    parser.add_argument("--num_queries", type=int, default=20, help="Number of queries to test")
    parser.add_argument("--out", required=True, help="Output JSON file")
    parser.add_argument("--api_url", default="http://localhost:8000/query", help="RAG API URL")
    
    args = parser.parse_args()
    
    print("🚀 Starting RAG Latency Smoke Test")
    print(f"📊 Testing {args.num_queries} queries against {args.api_url}")
    
    # Cargar evalset
    evalset = load_evalset(args.evalset)
    if not evalset:
        print("❌ No queries found in evalset")
        return 1
    
    print(f"📋 Loaded {len(evalset)} queries from evalset")
    
    # Ejecutar queries
    results = []
    latencies = []
    successful_queries = 0
    
    for i in range(args.num_queries):
        # Seleccionar query (ciclar si es necesario)
        query_data = evalset[i % len(evalset)]
        query = query_data["query"]
        
        print(f"🔍 Query {i+1}/{args.num_queries}: {query[:50]}...")
        
        result = query_api(query, args.api_url)
        results.append({
            "query_id": query_data["id"],
            "query": query,
            **result
        })
        
        if result["success"]:
            latencies.append(result["latency_ms"])
            successful_queries += 1
            print(f"   ✅ {result['latency_ms']:.1f}ms")
        else:
            print(f"   ❌ {result['error']}")
    
    # Calcular métricas
    if latencies:
        avg_latency = statistics.mean(latencies)
        p95_latency = calculate_percentiles(latencies, 95)
        p99_latency = calculate_percentiles(latencies, 99)
        min_latency = min(latencies)
        max_latency = max(latencies)
    else:
        avg_latency = p95_latency = p99_latency = min_latency = max_latency = 0
    
    # Resultados finales
    summary = {
        "total_queries": args.num_queries,
        "successful_queries": successful_queries,
        "success_rate": successful_queries / args.num_queries if args.num_queries > 0 else 0,
        "latency_ms": {
            "avg": round(avg_latency, 2),
            "p95": round(p95_latency, 2),
            "p99": round(p99_latency, 2),
            "min": round(min_latency, 2),
            "max": round(max_latency, 2)
        },
        "thresholds": {
            "p95_max_ms": 2500,
            "p99_max_ms": 4000,
            "avg_max_ms": 1200
        },
        "passed": {
            "p95": p95_latency <= 2500,
            "p99": p99_latency <= 4000,
            "avg": avg_latency <= 1200
        },
        "results": results
    }
    
    # Guardar resultados
    with open(args.out, 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Mostrar resumen
    print("\n📊 Latency Test Results:")
    print(f"   Total queries: {summary['total_queries']}")
    print(f"   Successful: {summary['successful_queries']} ({summary['success_rate']:.1%})")
    print(f"   Average: {summary['latency_ms']['avg']:.1f}ms")
    print(f"   P95: {summary['latency_ms']['p95']:.1f}ms")
    print(f"   P99: {summary['latency_ms']['p99']:.1f}ms")
    print(f"   Min: {summary['latency_ms']['min']:.1f}ms")
    print(f"   Max: {summary['latency_ms']['max']:.1f}ms")
    
    print("\n🎯 Thresholds:")
    print(f"   P95: {'✅' if summary['passed']['p95'] else '❌'} {summary['latency_ms']['p95']:.1f}ms <= 2500ms")
    print(f"   P99: {'✅' if summary['passed']['p99'] else '❌'} {summary['latency_ms']['p99']:.1f}ms <= 4000ms")
    print(f"   Avg: {'✅' if summary['passed']['avg'] else '❌'} {summary['latency_ms']['avg']:.1f}ms <= 1200ms")
    
    # Determinar si pasó
    all_passed = all(summary['passed'].values())
    print(f"\n{'✅ All latency thresholds passed' if all_passed else '❌ Some latency thresholds failed'}")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())
