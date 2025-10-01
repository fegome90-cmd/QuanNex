# MCP Workflow Guide for Future Tasks

## Overview
This guide provides a structured approach to using MCP tools for various types of tasks in the project.

## Task Categories and Recommended Workflows

### 1. Security-Related Tasks

#### Workflow:
1. **Start with Security Agent**
   ```bash
   node agents/security/agent.js '{"target_path": ".", "check_mode": "scan", "scan_depth": 2}'
   ```

2. **Analyze Security Findings**
   - Review JSON output for vulnerabilities
   - Prioritize high/medium severity issues
   - Note console.log statements and unsafe eval usage

3. **Apply Security Fixes**
   - Address high severity issues first
   - Remove console.log statements in production code
   - Replace unsafe eval() with safer alternatives

4. **Re-scan with Security Agent**
   - Verify fixes were applied
   - Check for new vulnerabilities introduced

5. **Use DAST Scanner for Dynamic Testing**
   ```bash
   ./tools/dast.sh -v  # Scan localhost:8787
   ./tools/dast.sh -t api -v https://target-url.com  # Scan specific URL
   ```

6. **Update Documentation (if needed)**
   ```bash
   node agents/docsync/docsync-agent.js
   ```

#### Expected Outputs:
- Security report with vulnerability count and severity breakdown
- DAST report with dynamic security findings
- Updated documentation reflecting security improvements

### 2. Complex Multi-Step Repairs

#### Workflow:
1. **Activate Orchestrator**
   ```bash
   node orchestration/orchestrator.js
   ```

2. **Review/Update Orchestration Plan**
   - Check `orchestration/plan.json` configuration
   - Define workflow steps if needed
   - Specify agent dependencies

3. **Execute Coordinated Tasks**
   - Let orchestrator manage agent execution
   - Monitor agent outputs and logs
   - Check for errors or failures

4. **Validate Results with Test Agent**
   ```bash
   node agents/tests/test-agent.js
   ```

5. **Update Documentation**
   ```bash
   node agents/docsync/docsync-agent.js
   ```

#### Expected Outputs:
- Coordinated execution of multiple agents
- Comprehensive repair results
- Updated project documentation

### 3. Testing and Validation Tasks

#### Workflow:
1. **Run Test Agent**
   ```bash
   node agents/tests/test-agent.js
   ```

2. **Review Test Results**
   - Analyze test failures and coverage
   - Identify areas needing attention
   - Note performance issues

3. **Fix Identified Issues**
   - Address test failures
   - Improve code coverage
   - Optimize performance

4. **Re-run Tests**
   - Validate fixes
   - Confirm improved coverage
   - Check for regressions

5. **Update Test Documentation**
   ```bash
   node agents/docsync/docsync-agent.js
   ```

#### Expected Outputs:
- Test execution results
- Coverage reports
- Performance metrics
- Updated test documentation

### 4. Documentation Updates

#### Workflow:
1. **Identify Documentation Needs**
   - Review recent changes
   - Check for outdated information
   - Identify missing documentation

2. **Run Documentation Agent**
   ```bash
   node agents/docsync/docsync-agent.js
   ```

3. **Review Generated Updates**
   - Check for accuracy
   - Verify completeness
   - Ensure consistency

4. **Manual Review and Refinement**
   - Add missing information
   - Correct inaccuracies
   - Improve clarity

#### Expected Outputs:
- Updated documentation files
- Consistent formatting
- Complete information coverage

## Tool Integration Patterns

### Security + Testing Pattern
```bash
# 1. Security analysis
node agents/security/agent.js '{"target_path": ".", "check_mode": "scan"}'

# 2. Apply security fixes
# ... manual fixes ...

# 3. Test validation
node agents/tests/test-agent.js

# 4. Re-scan security
node agents/security/agent.js '{"target_path": ".", "check_mode": "scan"}'
```

### Orchestrator + Multiple Agents Pattern
```bash
# 1. Start orchestrator
node orchestration/orchestrator.js

# 2. Orchestrator coordinates:
#    - Security Agent
#    - Test Agent
#    - Documentation Agent
```

### DAST + Security Agent Pattern
```bash
# 1. Static security analysis
node agents/security/agent.js '{"target_path": ".", "check_mode": "scan"}'

# 2. Dynamic security testing
./tools/dast.sh -v

# 3. Compare and analyze results
# ... manual analysis ...
```

## Best Practices

### 1. Always Start with Security
- Run Security Agent first for security-related tasks
- Address high severity issues immediately
- Re-scan after fixes

### 2. Use Orchestrator for Complexity
- Activate Orchestrator for multi-step processes
- Let it coordinate multiple agents
- Monitor execution progress

### 3. Validate with Testing
- Run Test Agent after significant changes
- Check for regressions
- Verify functionality

### 4. Keep Documentation Updated
- Use Documentation Agent for updates
- Review generated changes
- Maintain consistency

### 5. Log Everything
- Record tool usage
- Note outputs and results
- Track effectiveness

## Common Pitfalls to Avoid

### 1. Skipping Security Agent
- **Problem:** Not running security analysis
- **Solution:** Always start with Security Agent for security tasks

### 2. Not Using Orchestrator
- **Problem:** Manual coordination of multiple agents
- **Solution:** Use Orchestrator for complex workflows

### 3. Ignoring Test Results
- **Problem:** Not validating changes
- **Solution:** Always run Test Agent after changes

### 4. Outdated Documentation
- **Problem:** Documentation not reflecting changes
- **Solution:** Use Documentation Agent regularly

### 5. Not Logging Usage
- **Problem:** No record of tool effectiveness
- **Solution:** Log all tool usage and results

## Troubleshooting

### Tool Not Working
1. Check if tool exists: `ls -la agents/*/agent.js`
2. Verify dependencies: `which jq curl node`
3. Check permissions: `chmod +x agents/*/agent.js`
4. Review error messages and logs

### Unexpected Outputs
1. Validate JSON format
2. Check tool configuration
3. Review input parameters
4. Consult tool documentation

### Performance Issues
1. Check system resources
2. Review tool configuration
3. Consider running tools sequentially
4. Monitor tool execution time

## Future Enhancements

### Planned Improvements
1. **MCP Archon Integration:** Will be enabled for task management
2. **Enhanced Orchestrator:** Better agent coordination
3. **Improved Error Handling:** Better error reporting and recovery
4. **Performance Optimization:** Faster tool execution

### Tool Development
1. **New Agents:** Additional specialized agents
2. **Better Integration:** Improved tool interoperability
3. **Enhanced Reporting:** Better output formats
4. **Automated Workflows:** More automated processes
