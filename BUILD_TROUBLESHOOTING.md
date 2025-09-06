# 🔧 Enhanced MCP Build Test & Troubleshooting

## 📋 Quick Build Test

TypeScript hatalarını düzelttik. Şimdi build işlemini test edin:

### Windows:
```cmd
cd C:\mcp-project-context
.\scripts\build-enhanced.bat
```

### Linux/macOS:
```bash
cd /path/to/mcp-project-context
chmod +x scripts/build-enhanced.sh
./scripts/build-enhanced.sh
```

### Manuel Build:
```bash
npm run build
```

---

## ✅ Düzeltilen Hatalar

1. **Import Path Error**: `../storage/memoryManager.js` → `../../storage/memoryManager.js`
2. **Type Annotations**: Parameter tiplerini açık olarak belirledik
3. **Undefined Check**: `firstKey` kontrolü eklendi
4. **Performance Metrics**: Type annotation sorununu çözdük

---

## 🎯 Expected Build Output

Başarılı build'den sonra şu dosyalar oluşmalı:

```
dist/
├── enhancedIndex.js (NEW - Main entry point)
├── context/
│   ├── enhancedContextManager.js (NEW)
│   └── enhanced/
│       ├── documentationLoader.js (NEW)  
│       └── enhancedMemorySearch.js (NEW)
├── handlers/
│   └── enhancedToolHandler.js (NEW)
└── ... (diğer existing files)
```

---

## 🚨 Build Başarısız Olursa

### Olası Hatalar ve Çözümleri:

**1. Module Resolution Errors:**
```bash
# node_modules'ı temizleyip yeniden install
rm -rf node_modules
npm install
```

**2. TypeScript Version Issues:**
```bash
# TypeScript sürümünü kontrol et
npx tsc --version  # Should be 5.7+

# Update if needed
npm install --save-dev typescript@latest
```

**3. Missing Type Declarations:**
```bash
npm install --save-dev @types/node@latest
```

**4. Import/Export Errors:**
```bash
# package.json'da "type": "module" olduğundan emin ol
# Tüm import'lar .js extension ile bitmeli
```

---

## 🔍 Debugging Build Issues

### 1. Verbose Build:
```bash
npx tsc --verbose
```

### 2. Check Specific Files:
```bash
npx tsc --noEmit src/context/enhancedContextManager.ts
npx tsc --noEmit src/handlers/enhancedToolHandler.ts
```

### 3. Type Check Only:
```bash
npx tsc --noEmit
```

---

## ⚡ Quick Fix Script

Eğer hala sorunlar varsa, bu script'i çalıştırın:

```bash
# Create quick-fix.js
cat > quick-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('🔧 Quick fixing TypeScript issues...');

// Fix any remaining type issues
const files = [
  'src/context/enhancedContextManager.ts',
  'src/handlers/enhancedToolHandler.ts', 
  'src/context/enhanced/enhancedMemorySearch.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix common issues
    content = content.replace(/: typeof this\.\w+/g, ': any');
    content = content.replace(/\bmap\((\w+)\s*=>/g, 'map(($1: any) =>');
    content = content.replace(/\bsome\((\w+)\s*=>/g, 'some(($1: any) =>');
    
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed ${file}`);
  }
});

console.log('🎉 Quick fixes applied! Try npm run build again.');
EOF

node quick-fix.js
```

---

## 🎯 Final Test Command

Build başarılı olduktan sonra:

```bash
# Test the enhanced entry point
node dist/enhancedIndex.js --help

# Check if modules load correctly
node -e "console.log('✅ Enhanced MCP loads successfully'); process.exit(0);"
```

---

## 📞 Get Help

Eğer build sorunları devam ederse:

1. **Full error output** ile geri bildirim verin
2. **Node.js version**: `node --version`  
3. **NPM version**: `npm --version`
4. **TypeScript version**: `npx tsc --version`

---

**🚀 Build başarılı olduğunda, Claude Desktop konfigürasyonunuzu güncelleyip yeni enhanced özellikleri test edebilirsiniz!**
