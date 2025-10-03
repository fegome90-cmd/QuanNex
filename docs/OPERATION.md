# QuanNex Operation Guide

## 🚀 Quick Start

### Daily Operations
```bash
# Smoke test diario
npm run smoke:test

# Verificar estado del sistema
npm run dashboard

# Si hay problemas, revisar troubleshooting
cat TROUBLESHOOTING.md
```

### Emergency Procedures
```bash
# Rollback inmediato
git reset --hard <BASE_HASH>
git clean -fd
npm ci && npm run verify

# Pausar AutoFix V2
export AUTOFIX_V2=0

# Limpiar estado
git worktree prune
rm -rf .worktrees/
```

## 📊 Monitoring

### Key Metrics
- **AutoFix Success Rate**: ≥ 70%
- **Playbook Match Rate**: ≥ 90%
- **Verify Duration p95**: ≤ 30s
- **Policy Violations**: 0

### Dashboards
- **Grafana**: Import `config/grafana-dashboard.json`
- **Prometheus**: Alerts in `config/prometheus-alerts.yml`
- **GitHub**: SARIF reports in Security tab

## 🔧 Maintenance

### Weekly Tasks
- Review canary results
- Check artifact storage
- Update documentation
- Review policy exceptions

### Monthly Tasks
- Analyze success metrics
- Review and update policies
- Performance optimization
- Security audit

## 📞 Support

### Documentation
- `USAGE.md`: Command contracts
- `TROUBLESHOOTING.md`: Problem resolution
- `docs/CANARY-SUCCESS-CRITERIA.md`: Success metrics

### Issues
- Create GitHub issue with:
  - Problem description
  - Steps to reproduce
  - Relevant logs/artifacts
  - System configuration

### Escalation
1. Check troubleshooting guide
2. Review recent changes
3. Check canary results
4. Create issue with team
5. Escalate to platform team if critical
