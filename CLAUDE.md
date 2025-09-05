# MCP Project Context Manager

## Proje Özeti
Bu proje, Claude Desktop için Model Context Protocol (MCP) server implementasyonudur. Claude Code benzeri proje bağlam yönetimi ve kalıcı hafıza yetenekleri sağlar.

## 🎯 Ana Özellikler

### 🔍 Proje Keşfi (Project Discovery)
- Otomatik git repository tespiti
- Çok dilli proje türü tanıma (JavaScript, Python, Java, Go, Rust, vb.)
- Framework tespiti (React, Vue, Angular, Django, Flask, vb.)
- Paket yöneticisi tanımlama
- Build tool tespiti

### 🧠 Hiyerarşik Hafıza Sistemi
- Knowledge graph tabanlı kalıcı depolama
- Proje özelinde hafıza izolasyonu
- Kullanıcı tercih yönetimi
- Otomatik hafıza temizliği ve optimizasyonu
- Konuşmalar arası bağlam koruması

### 📁 Bağlam Yönetimi
- Oturum başlangıcında otomatik bağlam yükleme
- Gerçek zamanlı dosya değişiklik izleme
- Git durumu takibi
- Alakaya dayalı akıllı bağlam filtreleme
- @syntax desteği ile import sistemi (Claude Code benzeri)

### 🛠 Mevcut Araçlar
- Dosya işlemleri (okuma, yazma, oluşturma, silme, taşıma)
- Git işlemleri ve durum takibi
- Dizin listeleme ve navigasyon
- Proje hafıza arama ve yönetimi

## 🏗 Mimari Tasarım

### Temel Prensipler
- **Modüler Tasarım**: Endişeleri farklı handler'lara ayırma
- **Tür Güvenliği**: Strict mode ile tam TypeScript
- **Performans Odaklı**: <2s keşif, <1s bağlam yükleme optimizasyonu
- **Hafıza Verimli**: 200MB altında hafıza kullanımı
- **Hata Dirençli**: Zarif bozulma ve kurtarma

### Dizin Yapısı
```
mcp-project-context/
├── src/                    # Kaynak kod
│   ├── discovery/          # Proje analizi ve tespiti
│   ├── storage/            # Hafıza ve kalıcılık katmanı
│   ├── context/            # Bağlam üretimi ve yönetimi
│   └── handlers/           # MCP protokol handler'ları
├── dist/                   # Derlenmiş JavaScript çıktısı
├── tests/                  # Test dosyaları
├── test-project/           # Test projesi
└── package.json            # Proje konfigürasyonu
```

## 🔧 Anahtar Bileşenler

### ProjectDiscovery (`src/discovery/projectDiscovery.ts`)
- Proje türü, dil, framework tespiti
- Git bilgilerini bulma ve proje yapısı
- CLAUDE.md dosyalarını hiyerarşik olarak bulma

### MemoryManager (`src/storage/`)
- Kalıcı knowledge graph depolaması
- Proje özelinde hafıza izolasyonu
- Kullanıcı tercih yönetimi
- Eski hafızaların otomatik temizlenmesi

### ContextManager (`src/context/contextManager.ts`)
- Claude için optimize edilmiş bağlam üretimi
- Dosya cache ve import'ları yönetimi
- Oturum etkileşimlerini takip etme

### Handler'lar (`src/handlers/`)
- **FileHandler**: Dosya sistem işlemleri ve izleme
- **GitHandler**: Git repository işlemleri
- **ToolHandler**: MCP araç implementasyonları
- **ResourceHandler**: MCP kaynak sağlayıcıları
- **PromptHandler**: MCP prompt şablonları

## 📊 Performans Hedefleri
- Proje keşfi: <2 saniye
- Bağlam üretimi: <1 saniye
- Hafıza işlemleri: <500ms
- Dosya işlemleri: <200ms
- Toplam hafıza kullanımı: <200MB

## 🚀 Kurulum ve Kullanım

### Gereksinimler
- Node.js 18+
- TypeScript 5.7+
- Git (opsiyonel, gelişmiş özellikler için)

### Kurulum
```bash
npm install
npm run build
```

### Geliştirme
```bash
npm run dev          # Watch mode ile çalıştırma
npm run build        # Production build
npm run test         # Test'leri çalıştırma
npm run quickstart   # Hızlı başlangıç
```

### Debug Modu
```bash
DEBUG=mcp:* node dist/index.js
```

## 🔧 Konfigürasyon

### package.json Özeti
```json
{
  "name": "mcp-project-context",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.5",
    "chokidar": "^4.0.1",
    "simple-git": "^3.27.0",
    "glob": "^11.0.0"
  }
}
```

### TypeScript Konfigürasyonu
- Target: ES2022
- Module: node16
- Strict mode aktif
- Source map ve declaration desteği

## 🔒 Güvenlik Hususları
- Hassas dosyalar asla açığa çıkarılmaz (.env, anahtarlar)
- Tüm dosya yolları doğrulanır
- Kullanıcı girişleri temizlenir
- Varsayılan olarak salt okuma işlemleri

## 📝 Kod Standartları
- ES modules (import/export) kullanımı
- Tüm asenkron işlemler için async/await
- Try-catch ile kapsamlı hata yönetimi
- Anlamlı değişken ve fonksiyon isimleri
- Karmaşık mantığın yorumlarla belgelenmesi

## 🧪 Test Stratejisi
- Temel mantık için birim testler (hafıza, keşif)
- Handler'lar için entegrasyon testleri
- Mock MCP istemcisi ile uçtan uca testler

## 📈 Gelecek Geliştirmeler
- [ ] Gelişmiş import çözümleme
- [ ] Proje şablon sistemi
- [ ] Multi-proje desteği
- [ ] Bağlam sıkıştırması
- [ ] Akıllı önbellekleme stratejileri
- [ ] Plugin sistemi
- [ ] Konfigürasyon için Web UI

## 🐛 Hata Ayıklama
Verbose loglama için environment variable ayarlayın:
```bash
DEBUG=mcp:* node dist/index.js
```

## 📊 Git Durumu
- Branch: main
- Durum: Uncommitted değişiklikler mevcut
- Proje aktif geliştirme aşamasında

## 🗂 Test Projesi
`test-project/` dizininde örnek test projesi bulunmakta:
- TypeScript projesi
- Async/await pattern'ları
- Fonksiyonel programlama prensipleri
- Component tabanlı mimari

## 🎯 Kullanım Senaryoları

### Claude Desktop Entegrasyonu
1. MCP server olarak çalışır
2. Proje bağlamını otomatik keşfeder
3. Dosya değişikliklerini izler
4. Cross-conversation hafıza sağlar

### Geliştirici Workflow'u
1. `/src` dizininde değişiklik yap
2. `npm run build` ile derle
3. Claude Desktop ile test et
4. Console çıktısını izle

## 🔍 Önemli Notlar
- Proje ID'si otomatik oluşturulur
- Hafıza proje özelinde izole edilir
- File watching güvenlik kontrolleri ile sınırlandırılır
- Git durumu gerçek zamanlı takip edilir

---

**Güncellenme Tarihi**: 5 Eylül 2025  
**Proje Versiyonu**: 1.0.0  
**Durum**: Aktif Geliştirme

Bu dokümantasyon, MCP Project Context Manager projesinin tam bir referansıdır ve geliştirme sürecinde rehber olarak kullanılabilir.