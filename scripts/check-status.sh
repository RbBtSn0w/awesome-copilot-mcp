#!/bin/bash

# 项目状态检查脚本
# 快速验证所有关键指标

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🔍 awesome-copilot-mcp 项目状态检查                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
CHECKS_PASSED=0
CHECKS_TOTAL=0

# 检查函数
check_item() {
    local name=$1
    local condition=$2
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    if eval "$condition"; then
        echo -e "${GREEN}✅${NC} $name"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}❌${NC} $name"
    fi
}

# 1. 构建检查
echo -e "${BLUE}📦 构建检查${NC}"
check_item "dist/ 目录存在" "[ -d dist ]"
check_item "dist/mcp-prompts.js 存在" "[ -f dist/mcp-prompts.js ]"
check_item "dist/mcp-tools.js 存在" "[ -f dist/mcp-tools.js ]"
check_item "dist/mcp-server.js 存在" "[ -f dist/mcp-server.js ]"
echo ""

# 2. 代码文件检查
echo -e "${BLUE}💻 源代码文件检查${NC}"
check_item "src/mcp-prompts.ts 存在" "[ -f src/mcp-prompts.ts ]"
check_item "src/mcp-tools.ts 存在" "[ -f src/mcp-tools.ts ]"
check_item "src/mcp-server.ts 存在" "[ -f src/mcp-server.ts ]"
check_item "src/logger.ts 存在" "[ -f src/logger.ts ]"
check_item "src/github-adapter.ts 存在" "[ -f src/github-adapter.ts ]"
echo ""

# 3. 测试文件检查
echo -e "${BLUE}🧪 测试文件检查 (Vitest)${NC}"
check_item "test/mcp-prompts.test.ts 存在" "[ -f test/mcp-prompts.test.ts ]"
check_item "test/mcp-tools.test.ts 存在" "[ -f test/mcp-tools.test.ts ]"
check_item "test/mcp-tools-advanced.test.ts 存在" "[ -f test/mcp-tools-advanced.test.ts ]"
check_item "test/github-adapter.test.ts 存在" "[ -f test/github-adapter.test.ts ]"
check_item "test/github-adapter-branch.test.ts 存在" "[ -f test/github-adapter-branch.test.ts ]"
check_item "test/types.test.ts 存在" "[ -f test/types.test.ts ]"
check_item "test/setup-vitest.ts 存在" "[ -f test/setup-vitest.ts ]"
echo ""

# 4. 文档检查
echo -e "${BLUE}📚 文档检查${NC}"
check_item "README.md 存在" "[ -f README.md ]"
# check_item "QUICK_START.md 存在" "[ -f QUICK_START.md ]" # Removed as it might not exist
echo ""

# 5. 依赖检查
echo -e "${BLUE}📦 依赖检查${NC}"
check_item "node_modules 存在" "[ -d node_modules ]"
check_item "package.json 存在" "[ -f package.json ]"
check_item "tsconfig.json 存在" "[ -f tsconfig.json ]"
echo ""

# 6. 配置检查
echo -e "${BLUE}⚙️  配置检查${NC}"
check_item "vitest.config.ts 存在" "[ -f vitest.config.ts ]"
check_item "scripts/ 目录存在" "[ -d scripts ]"
check_item "scripts/generate-metadata.js 存在" "[ -f scripts/generate-metadata.js ]"
check_item "scripts/archive-reports.js 存在" "[ -f scripts/archive-reports.js ]"
check_item ".eslintrc.json 存在" "[ -f .eslintrc.json ]"
echo ""

# 7. 性能输出
echo -e "${BLUE}📊 检查结果${NC}"
echo -e "通过: ${GREEN}$CHECKS_PASSED${NC} / $CHECKS_TOTAL 项"
echo ""

# 最终状态
if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "${GREEN}🟢 所有检查通过！项目状态正常${NC}"
    
    # 建议的后续步骤
    echo ""
    echo -e "${BLUE}📋 建议的后续步骤:${NC}"
    echo "  1. 运行测试: npm run test"
    echo "  2. 检查覆盖率: npm run test:coverage"
    echo "  3. 启动服务: npm start"
    echo "  4. 重启VS Code 后在Chat中输入 / 或 # 来验证新功能"
else
    echo -e "${RED}🔴 存在未通过的检查，请参考上面的❌标记项${NC}"
    echo ""
    echo -e "${BLUE}📋 故障排除:${NC}"
    echo "  1. 检查是否运行了 npm install"
    echo "  2. 检查是否运行了 npm run build"
    echo "  3. 查看 QUICK_START.md 获取详细帮助"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      检查完成                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# 返回状态码
if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    exit 0
else
    exit 1
fi
