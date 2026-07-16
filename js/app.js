/* ==========================================================================
   🚀 İS-YIL FİNANS VE MUHASEBE PROGRAMI - APP KONTROLCÜ & ROUTER & DASHBOARD (APP.JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});

const App = {
    activePage: "dashboard",

    pages: {
        dashboard: { title: "Finans Özet Panel", subtitle: "Banka riskleri, limit kullanımları ve müşteri çekleri durum özeti", render: () => App.renderDashboard() },
        bankalar: { title: "Bankalarım", subtitle: "Banka hesapları, krediler, çekler ve teminat mektuplarınızın merkezi yönetimi", render: () => BankalarModule.render() },
        krediler: { title: "Banka Kredileri", subtitle: "BCH, Spot ve Taksitli kredilerin limit ve ödeme planı yönetimi", render: () => KredilerModule.render() },
        cekler: { title: "Müşteri Çekleri Portföyü", subtitle: "Müşterilerden alınan çeklerin durum ve ciro hareketleri takibi", render: () => CeklerModule.render() },
        performans: { title: "Keşideci Performans Analizi", subtitle: "Programa girilen çeklerin keşidecilerine göre ödeme performansları ve geçmiş analizleri", render: () => PerformansModule.render() },
        "nakit-akis": { title: "Nakit Akış Projeksiyonu", subtitle: "Vadeli çek tahsilatları ile kredi ödemelerinin vadelerine göre karşılaştırılması", render: () => App.renderNakitAkis() },
        raporlar: { title: "Finansal Raporlar", subtitle: "Kredi, çek ve genel finansal durum raporlarınızı oluşturun ve yazdırın", render: () => RaporlarModule.render() },
        takvim: { title: "Vade & Ödeme Takvimi", subtitle: "Çek tahsilatları, kredi taksitleri ve DBS faturalarının takvim görünümü", render: () => TakvimModule.render() },
        "toplu-giris": { title: "Toplu Veri İçe Aktar", subtitle: "Excel dosyası veya kopyala-yapıştır ile çeklerinizi ve kredilerinizi topluca yükleyin", render: () => TopluGirisModule.render() }
    },

    async init() {
        try {
            // Tema Yükle
            const savedTheme = localStorage.getItem("is-yil-tema") || "dark";
            document.documentElement.setAttribute("data-theme", savedTheme);

            this.updateDate();
            this.bindEvents();
            
            // Tarayıcı Bildirim İzni İste
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
            
            // İlk Kurulum mu yoksa Şifre Ekranı mı kontrol et
            let setupRequired = true;
            try {
                setupRequired = await Security.isSetupRequired();
            } catch (dbErr) {
                console.error("Setup check error, database might be corrupt/locked, attempting to auto-heal or force setup screen", dbErr);
                setupRequired = true;
                
                // Show a helpful repair card on the screen
                const errorDiv = document.getElementById("lock-error");
                if (errorDiv) {
                    errorDiv.innerHTML = `
                        <div style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.2); padding:12px; border-radius:8px; margin-bottom:12px; font-size:0.8rem; text-align:left; line-height:1.4;">
                            <span style="color:var(--accent-rose); font-weight:700;">Veritabanı Erişim Hatası:</span> ${dbErr.message || "Bilinmeyen hata"}<br>
                            <span style="color:var(--text-muted); font-size:0.75rem;">Sürüm uyuşmazlığı veya tarayıcı kilitlenmesi mevcut olabilir. Sistemi sıfırlayarak düzeltebilirsiniz:</span>
                            <button onclick="window.location.href = window.location.pathname + '?force-reset=true';" class="btn btn-secondary btn-block" style="margin-top:8px; padding:6px; font-size:0.75rem; background:rgba(244,63,94,0.2); border-color:rgba(244,63,94,0.3); color:var(--accent-rose); cursor:pointer;">
                                🚨 Sistem Veritabanını Sıfırla (Bunu Deneyin)
                            </button>
                        </div>
                    `;
                }
            }
            
            if (setupRequired) {
                document.getElementById("setup-fields").style.display = "block";
                document.getElementById("login-fields").style.display = "none";
                document.getElementById("lock-instruction").innerText = "Sistemi kullanmak için güvenli bir giriş şifresi belirleyin";
                document.getElementById("unlock-btn-text").innerText = "Şifreyi Belirle ve Giriş Yap";
            } else {
                document.getElementById("setup-fields").style.display = "none";
                document.getElementById("login-fields").style.display = "block";
                document.getElementById("lock-instruction").innerText = "Sisteme erişmek için giriş şifrenizi yazın";
                document.getElementById("unlock-btn-text").innerText = "Giriş Yap";
            }
            
            this.updateThemeIcon(savedTheme);
            lucide.createIcons();
        } catch (err) {
            console.error("Init hatası:", err);
            const errorDiv = document.getElementById("lock-error");
            if (errorDiv) {
                errorDiv.innerHTML = `<span style="color:var(--accent-rose); font-weight:700;">Başlatma Hatası (Initialization Error):</span> ${err.message}<br><small style="color:var(--text-muted); font-size:0.75rem;">Detay: ${err.stack || err.name}</small>`;
            }
        }
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("is-yil-tema", newTheme);
        this.updateThemeIcon(newTheme);
        this.showToast(`Tema değiştirildi: ${newTheme === 'dark' ? 'Karanlık' : 'Aydınlık'}`);
    },

    updateThemeIcon(theme) {
        const themeIcon = document.getElementById("theme-icon");
        if (themeIcon) {
            if (theme === "light") {
                themeIcon.setAttribute("data-lucide", "moon");
            } else {
                themeIcon.setAttribute("data-lucide", "sun");
            }
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    },

    updateDate() {
        const span = document.getElementById("current-date");
        const bugun = new Date();
        span.innerText = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(bugun);
    },

    bindEvents() {
        // Sidebar Sayfa Navigasyonu
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const page = item.getAttribute("data-page");
                window.location.hash = page;
                this.closeMobileMenu(); // Mobil menüyü otomatik kapat
            });
        });

        // URL Değişimini Dinle
        window.addEventListener("hashchange", () => {
            this.handleRouting();
        });

        // Global Kısayol Tuşları (Ctrl+K Arama, Escape Kapatma)
        window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                this.openSearch();
            }
            if (e.key === "Escape") {
                this.closeSearch();
            }
        });
    },

    // 🔐 KİLİT AÇMA (UNLOCK)
    async unlock(e) {
        e.preventDefault();
        const errorDiv = document.getElementById("lock-error");
        errorDiv.innerText = "";
        
        try {
            const setupRequired = await Security.isSetupRequired();
            
            if (setupRequired) {
                const newPass = document.getElementById("new-password").value;
                const confirmPass = document.getElementById("confirm-password").value;
                
                if (!newPass) {
                    errorDiv.innerText = "Lütfen bir şifre girin.";
                    return;
                }
                if (newPass !== confirmPass) {
                    errorDiv.innerText = "Şifreler eşleşmiyor!";
                    return;
                }
                
                await Security.setupMasterPassword(newPass);
                App.showToast("Şifreniz başarıyla oluşturuldu!");
            } else {
                const password = document.getElementById("login-password").value;
                const verified = await Security.verifyPassword(password);
                
                if (!verified) {
                    errorDiv.innerText = "Hatalı şifre! Lütfen tekrar deneyin.";
                    return;
                }
                App.showToast("Giriş başarılı.");
            }
            
            // Kilit ekranını gizle, ana ekranı göster
            document.getElementById("lock-screen").style.opacity = 0;
            setTimeout(() => {
                document.getElementById("lock-screen").style.display = "none";
                document.getElementById("app-main").style.display = "flex";
                App.handleRouting();
            }, 400);
        } catch (err) {
            console.error("Unlock hatası:", err);
            errorDiv.innerHTML = `<span style="color:var(--accent-rose); font-weight:700;">Sistem Hatası:</span> ${err.message}<br><small style="color:var(--text-muted); font-size:0.75rem;">Detay: ${err.stack || err.name}</small>`;
        }
    },

    // 🔒 UYGULAMAYI KİLİTLE
    lock() {
        Security.clearPassword();
        document.getElementById("login-password").value = "";
        document.getElementById("lock-screen").style.display = "flex";
        setTimeout(() => {
            document.getElementById("lock-screen").style.opacity = 1;
            document.getElementById("app-main").style.display = "none";
        }, 50);
        this.showToast("Oturum kilitlendi.");
    },

    // ROUTING YÖNETİMİ
    async handleRouting() {
        if (!Security.isPasswordLoaded()) {
            this.lock();
            return;
        }

        let hash = window.location.hash.replace("#", "");
        if (!hash || !this.pages[hash]) {
            hash = "dashboard";
        }

        this.activePage = hash;

        // Son işlem adımlarını kaydet (Sık kullanılanlar için)
        const routeMap = {
            dashboard: "Finans Özet Panel",
            bankalar: "Bankalarım Modülü",
            krediler: "Banka Kredileri Modülü",
            cekler: "Müşteri Çekleri Modülü",
            raporlar: "Finans Raporları",
            "toplu-giris": "Toplu Veri Girişi"
        };
        if (routeMap[hash]) {
            this.trackAction(hash, routeMap[hash]);
        }

        // Navigasyon Aktif Durumu Güncelle
        document.querySelectorAll(".nav-item").forEach(item => {
            if (item.getAttribute("data-page") === hash) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Sayfa Başlığını Güncelle
        const pageInfo = this.pages[hash];
        document.getElementById("current-page-title").innerText = pageInfo.title;
        document.getElementById("current-page-subtitle").innerText = pageInfo.subtitle;

        // Yükleniyor Göstergesi
        const container = document.getElementById("page-container");
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Güvenli veriler çözülüyor...</p>
            </div>
        `;

        try {
            await pageInfo.render();
            lucide.createIcons();
            this.checkYedekDurumu();
        } catch (error) {
            console.error(error);
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="alert-triangle" class="text-danger"></i>
                    <h4>Veri Okuma Hatası</h4>
                    <p>${error.message}</p>
                </div>
            `;
            lucide.createIcons();
        }
    },

    // --- 📊 DASHBOARD RENDER MOTORU ---
    async renderDashboard() {
        const container = document.getElementById("page-container");
        
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();
        const cekler = await DBService.getCekler();
        const sonIslemler = await DBService.getIslemGecmisi(8);
        const recentActions = App.getRecentActions();
        
        // DBS Faturaları ve Teminat Mektuplarını da çek
        let dbsFaturalar = [];
        let teminatMektuplari = [];
        try { dbsFaturalar = await DBService.getDbsFaturalar(); } catch(e) {}
        try { teminatMektuplari = await DBService.getTeminatMektuplari(); } catch(e) {}

        // 9. Veri İstatistikleri Hesaplamaları
        const bugunTarih = new Date();
        bugunTarih.setHours(0,0,0,0);
        const toplamCekAdedi = cekler.length;
        
        const sonuclananCekler = cekler.filter(c => c.durum === "Ödendi" || c.durum === "Karşılıksız");
        const odenenCekler = cekler.filter(c => c.durum === "Ödendi");
        const cekOdemeOrani = sonuclananCekler.length > 0 
            ? Math.round((odenenCekler.length / sonuclananCekler.length) * 100) 
            : 100;

        const bekleyenCekler = cekler.filter(c => c.durum === "Portföyde" || c.durum === "Tahsilde" || c.durum === "Teminatta");
        let ortalamaVadeGun = 0;
        if (bekleyenCekler.length > 0) {
            const toplamKalanGun = bekleyenCekler.reduce((sum, c) => {
                const diff = new Date(c.vadeTarihi) - bugunTarih;
                return sum + Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            }, 0);
            ortalamaVadeGun = Math.round(toplamKalanGun / bekleyenCekler.length);
        }

        const aktifKrediler = krediler.filter(k => k.durum !== "Kapatıldı");
        const aktifKrediSayisi = aktifKrediler.length;
        const dbsLimitAdedi = krediler.filter(k => k.krediTuru === "DBS").length;

        const aktifTm = teminatMektuplari.filter(m => m.durum === "Aktif");
        const aktifTmSayisi = aktifTm.length;
        const aktifTmToplamTutar = aktifTm.reduce((sum, m) => sum + (parseFloat(m.tutar) || 0), 0);

        let bankalarList = [];
        try { bankalarList = await DBService.getBankalar(); } catch(e) {}
        const toplamBankaSayisi = bankalarList.length;
        
        // Risk Limit Aşımı Hesaplamaları
        const riskAsimList = [];
        bankalarList.forEach(b => {
            if (b.riskLimiti) {
                const bKrediler = krediler.filter(k => k.bankaAdi === b.bankaAdi);
                const bKrediBorc = bKrediler.reduce((sum, k) => sum + (parseFloat(k.tutar) || 0), 0);
                
                const bMektuplar = teminatMektuplari.filter(m => m.bankaId === b.id && m.durum === 'Aktif');
                const bMektupTutar = bMektuplar.reduce((sum, m) => sum + (parseFloat(m.tutar) || 0), 0);

                const toplamRisk = bKrediBorc + bMektupTutar;
                if (toplamRisk > b.riskLimiti) {
                    const pct = Math.round((toplamRisk / b.riskLimiti) * 100);
                    riskAsimList.push({
                        bankaAdi: b.bankaAdi,
                        limit: b.riskLimiti,
                        risk: toplamRisk,
                        pct: pct
                    });
                }
            }
        });
        

        
        // 1. KPI Hesaplamaları
        let toplamKrediBorc = 0;
        let bchBakiye = 0;
        let portfoyCekTutar = 0;
        let ciroCekTutar = 0;
        
        krediler.forEach(k => {
            if (k.krediTuru === "BCH") {
                bchBakiye += parseFloat(k.tutar) || 0;
                toplamKrediBorc += parseFloat(k.tutar) || 0;
            } else if (k.krediTuru === "Spot") {
                toplamKrediBorc += parseFloat(k.tutar) || 0;
            }
        });
        
        // Taksitli kredilerin kalan anapara ödemelerini ekle
        odemeler.forEach(o => {
            if (!o.odendiMi) {
                toplamKrediBorc += parseFloat(o.tutar) || 0;
            }
        });
        
        // DBS bekleyen faturaları da toplam borca ekle
        dbsFaturalar.forEach(f => {
            if (f.durum === "Bekliyor") {
                toplamKrediBorc += parseFloat(f.tutar) || 0;
            }
        });
        
        cekler.forEach(c => {
            if (c.durum === "Portföyde") {
                portfoyCekTutar += parseFloat(c.tutar) || 0;
            } else if (c.durum === "Ciro Edildi" || c.durum === "Tahsilde" || c.durum === "Teminatta") {
                ciroCekTutar += parseFloat(c.tutar) || 0;
            }
        });

        // Yaklaşan Ödeme/Tahsilat Listesi (Tümü Harmanlanmış)
        const ajandaList = [];
        
        // Kredi taksitleri ve spot ödemeleri ekle
        odemeler.forEach(o => {
            if (!o.odendiMi) {
                const kr = krediler.find(k => k.id === o.krediId);
                ajandaList.push({
                    tip: "Gider",
                    kategori: "kredi",
                    baslik: `${kr ? kr.bankaAdi : "Banka"} - ${kr ? kr.krediTuru : "Taksitli"} Kredi Ödemesi`,
                    tarih: o.vadeTarihi,
                    tutar: o.tutar,
                    detay: `Taksit No: ${o.taksitNo}`
                });
            }
        });
        
        krediler.forEach(k => {
            if (k.krediTuru === "Spot" && k.durum !== "Kapatıldı") {
                ajandaList.push({
                    tip: "Gider",
                    kategori: "kredi",
                    baslik: `${k.bankaAdi} - Spot Kredi Vade Sonu`,
                    tarih: k.vadeTarihi,
                    tutar: k.tutar,
                    detay: `Vade Sonu Toplam Ödeme`
                });
            }
        });

        // DBS Fatura ödemelerini ekle
        dbsFaturalar.forEach(f => {
            if (f.durum === "Bekliyor") {
                const kr = krediler.find(k => k.id === f.krediId);
                ajandaList.push({
                    tip: "Gider",
                    kategori: "dbs",
                    baslik: `DBS Fatura - ${kr ? kr.tedarikciFirma || kr.bankaAdi : "Tedarikçi"}`,
                    tarih: f.vadeTarihi,
                    tutar: f.tutar,
                    detay: `Fatura: ${f.faturaNo || 'Belirtilmemiş'} | ${kr ? kr.bankaAdi : ''}`
                });
            }
        });

        // Teminat mektubu süresi dolacaklar
        teminatMektuplari.forEach(tm => {
            if (tm.durum === "Aktif" && tm.tur === "Süreli" && tm.bitisTarihi) {
                ajandaList.push({
                    tip: "Uyarı",
                    kategori: "teminat",
                    baslik: `Teminat Mektubu Süresi - ${tm.bankaAdi || 'Banka'}`,
                    tarih: tm.bitisTarihi,
                    tutar: tm.tutar,
                    detay: `Mektup No: ${tm.mektupNo} | Lehtar: ${tm.lehtar || '-'}`
                });
            }
        });

        // Çekleri ekle (Portföyde, Tahsilde olanlar bekleyen tahsilattır)
        cekler.forEach(c => {
            if (c.durum === "Portföyde" || c.durum === "Tahsilde" || c.durum === "Teminatta") {
                ajandaList.push({
                    tip: "Gelir",
                    kategori: "cek",
                    baslik: `Çek Tahsilatı - ${c.bankaAdi} (${c.kesideci})`,
                    tarih: c.vadeTarihi,
                    tutar: c.tutar,
                    detay: `Çek No: ${c.cekNo} [${c.durum}]`
                });
            }
        });

        // Tarihe göre sırala ve ilk 5'i al
        ajandaList.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
        const yaklasan5 = ajandaList.slice(0, 5);

        // Vadesine 7 gün veya daha az kalan kritik vadeler (Hatırlatıcı Banner için)
        const kritikVadeler = ajandaList.filter(item => {
            const diff = new Date(item.tarih) - bugunTarih;
            const gun = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return gun <= 7;
        });

        // 30 gün içinde vadesi gelen hatırlatma listesi (Hatırlatma Sekmesi için)
        const hatirlatmaListesi = ajandaList.filter(item => {
            const diff = new Date(item.tarih) - bugunTarih;
            const gun = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return gun <= 30;
        });

        // Kategorilere göre ayır
        const hatCekler = hatirlatmaListesi.filter(i => i.kategori === "cek");
        const hatKrediler = hatirlatmaListesi.filter(i => i.kategori === "kredi");
        const hatDbs = hatirlatmaListesi.filter(i => i.kategori === "dbs");
        const hatTeminat = hatirlatmaListesi.filter(i => i.kategori === "teminat");

        // Tarayıcı Bildirimi Tetikleme (Bugün vadesi gelenler)
        if ("Notification" in window && Notification.permission === "granted") {
            const bugunOlanlar = kritikVadeler.filter(item => {
                const diff = new Date(item.tarih) - bugunTarih;
                const gun = Math.ceil(diff / (1000 * 60 * 60 * 24));
                return gun === 0;
            });
            if (bugunOlanlar.length > 0) {
                new Notification("İs-Yil Finans - Önemli Hatırlatma!", {
                    body: `Bugün vadesi gelen ${bugunOlanlar.length} adet finansal işleminiz var! Lütfen kontrol edin.`,
                });
            }
        }

        // --- HATIRLATMA TABLOSATIRLARı OLUŞTUR ---
        const renderHatirlatmaSatir = (item) => {
            const diff = new Date(item.tarih) - bugunTarih;
            const gun = Math.ceil(diff / (1000 * 60 * 60 * 24));
            let gunMetni = "";
            if (gun < 0) gunMetni = `<span class="badge badge-danger" style="border-radius:4px; font-size:0.7rem;">Geçti (${Math.abs(gun)} Gün)</span>`;
            else if (gun === 0) gunMetni = `<span class="badge badge-danger" style="border-radius:4px; font-size:0.7rem; animation: pulse 1.5s infinite;">BUGÜN!</span>`;
            else if (gun === 1) gunMetni = `<span class="badge badge-warning" style="border-radius:4px; font-size:0.7rem;">Yarın</span>`;
            else if (gun <= 7) gunMetni = `<span class="badge badge-warning" style="border-radius:4px; font-size:0.7rem;">${gun} Gün</span>`;
            else gunMetni = `<span class="badge badge-success" style="border-radius:4px; font-size:0.7rem;">${gun} Gün</span>`;

            let tipBadge = "";
            if (item.tip === "Gelir") tipBadge = `<span class="badge badge-success" style="font-size:0.65rem; padding:2px 5px;">Tahsilat</span>`;
            else if (item.tip === "Uyarı") tipBadge = `<span class="badge badge-info" style="font-size:0.65rem; padding:2px 5px;">Uyarı</span>`;
            else tipBadge = `<span class="badge badge-danger" style="font-size:0.65rem; padding:2px 5px;">Ödeme</span>`;

            return `
                <tr style="${gun < 0 ? 'background:rgba(244,63,94,0.08);' : gun === 0 ? 'background:rgba(244,63,94,0.12);' : ''}">
                    <td>${tipBadge}</td>
                    <td>
                        <strong style="font-size:0.82rem;">${item.baslik}</strong><br>
                        <small style="color:var(--text-muted); font-size:0.72rem;">${item.detay}</small>
                    </td>
                    <td><strong style="font-size:0.82rem;">${utils.formatTarih(item.tarih)}</strong></td>
                    <td>${gunMetni}</td>
                    <td style="text-align:right;">
                        <strong class="${item.tip === 'Gelir' ? 'text-success' : 'text-danger'}" style="font-size:0.85rem;">${utils.formatPara(item.tutar)}</strong>
                    </td>
                </tr>
            `;
        };

        const renderHatirlatmaTablosu = (liste, bosKategoriAdi) => {
            if (liste.length === 0) {
                return `
                    <div style="text-align:center; padding:24px; color:var(--text-muted);">
                        <i data-lucide="check-circle-2" style="width:28px; height:28px; margin-bottom:8px; color:var(--accent-emerald);"></i>
                        <p style="font-size:0.85rem;">Önümüzdeki 30 gün içinde ${bosKategoriAdi} bulunmuyor.</p>
                    </div>
                `;
            }
            return `
                <div class="table-responsive" style="max-height:300px; overflow-y:auto;">
                    <table class="custom-table" style="font-size:0.82rem;">
                        <thead>
                            <tr>
                                <th style="width:70px;">Tip</th>
                                <th>Açıklama / Kurum</th>
                                <th style="width:100px;">Vade</th>
                                <th style="width:80px;">Kalan</th>
                                <th style="text-align:right; width:110px;">Tutar (₺)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${liste.map(renderHatirlatmaSatir).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        };

        // Hatırlatma Sekmesi - Her zaman görünür
        const gecmisOlanlar = ajandaList.filter(item => {
            const diff = new Date(item.tarih) - bugunTarih;
            return diff < 0;
        });

        const hatirlatmaSekmesi = `
            <div class="card" style="border: 1px solid rgba(251, 191, 36, 0.25); background: linear-gradient(135deg, rgba(251, 191, 36, 0.03), rgba(244, 63, 94, 0.03)); padding: 0; margin-bottom: 24px; overflow:hidden;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:16px 20px; border-bottom:1px solid var(--border-color); flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, var(--accent-amber), var(--accent-rose)); display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="bell-ring" style="width:18px; height:18px; color:#fff;"></i>
                        </div>
                        <div>
                            <h4 style="font-size:1rem; font-family:var(--font-display); margin:0;">Ödeme & Tahsilat Hatırlatıcısı</h4>
                            <small style="color:var(--text-muted); font-size:0.75rem;">Önümüzdeki 30 gün içindeki tüm finansal vadeleriniz</small>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${kritikVadeler.length > 0 ? `<span class="badge badge-danger" style="font-size:0.75rem; padding:4px 10px; animation: pulse 2s infinite;">${kritikVadeler.length} Kritik (7 Gün İçi)</span>` : ''}
                        ${gecmisOlanlar.length > 0 ? `<span class="badge badge-danger" style="font-size:0.75rem; padding:4px 10px;">${gecmisOlanlar.length} Gecikmiş</span>` : ''}
                        <span class="badge badge-info" style="font-size:0.75rem; padding:4px 10px;">Toplam ${hatirlatmaListesi.length} İşlem</span>
                    </div>
                </div>

                <div style="display:flex; border-bottom:1px solid var(--border-color); overflow-x:auto; background:rgba(0,0,0,0.1);" id="hatirlatma-tabs">
                    <button class="hatirlatma-tab active" onclick="App.switchHatirlatmaTab('tumu')" data-hat-tab="tumu" style="padding:10px 18px; border:none; background:none; color:var(--text-primary); cursor:pointer; font-size:0.82rem; font-weight:600; border-bottom:2px solid var(--accent-amber); white-space:nowrap; transition:all 0.2s;">
                        📋 Tümü (${hatirlatmaListesi.length})
                    </button>
                    <button class="hatirlatma-tab" onclick="App.switchHatirlatmaTab('cekler')" data-hat-tab="cekler" style="padding:10px 18px; border:none; background:none; color:var(--text-secondary); cursor:pointer; font-size:0.82rem; font-weight:500; border-bottom:2px solid transparent; white-space:nowrap; transition:all 0.2s;">
                        📄 Çekler (${hatCekler.length})
                    </button>
                    <button class="hatirlatma-tab" onclick="App.switchHatirlatmaTab('krediler')" data-hat-tab="krediler" style="padding:10px 18px; border:none; background:none; color:var(--text-secondary); cursor:pointer; font-size:0.82rem; font-weight:500; border-bottom:2px solid transparent; white-space:nowrap; transition:all 0.2s;">
                        🏦 Krediler (${hatKrediler.length})
                    </button>
                    <button class="hatirlatma-tab" onclick="App.switchHatirlatmaTab('dbs')" data-hat-tab="dbs" style="padding:10px 18px; border:none; background:none; color:var(--text-secondary); cursor:pointer; font-size:0.82rem; font-weight:500; border-bottom:2px solid transparent; white-space:nowrap; transition:all 0.2s;">
                        📑 DBS (${hatDbs.length})
                    </button>
                    <button class="hatirlatma-tab" onclick="App.switchHatirlatmaTab('teminat')" data-hat-tab="teminat" style="padding:10px 18px; border:none; background:none; color:var(--text-secondary); cursor:pointer; font-size:0.82rem; font-weight:500; border-bottom:2px solid transparent; white-space:nowrap; transition:all 0.2s;">
                        🛡️ Teminat Mektupları (${hatTeminat.length})
                    </button>
                </div>

                <div style="padding:16px 20px;">
                    <div id="hat-content-tumu" class="hat-content">${renderHatirlatmaTablosu(hatirlatmaListesi, "vadesi yaklaşan işlem")}</div>
                    <div id="hat-content-cekler" class="hat-content" style="display:none;">${renderHatirlatmaTablosu(hatCekler, "vadesi yaklaşan çek tahsilatı")}</div>
                    <div id="hat-content-krediler" class="hat-content" style="display:none;">${renderHatirlatmaTablosu(hatKrediler, "vadesi yaklaşan kredi ödemesi")}</div>
                    <div id="hat-content-dbs" class="hat-content" style="display:none;">${renderHatirlatmaTablosu(hatDbs, "vadesi yaklaşan DBS fatura ödemesi")}</div>
                    <div id="hat-content-teminat" class="hat-content" style="display:none;">${renderHatirlatmaTablosu(hatTeminat, "süresi dolacak teminat mektubu")}</div>
                </div>
            </div>
        `;

        let hatirlatmaBanner = "";
        if (kritikVadeler.length > 0) {
            hatirlatmaBanner = `
                <div class="card" style="border-left: 4px solid var(--accent-rose); background: rgba(244, 63, 94, 0.05); padding: 20px; margin-bottom: 24px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                        <i data-lucide="alert-triangle" class="text-danger" style="width:20px; height:20px;"></i>
                        <h4 class="text-danger" style="font-size:1rem; font-family:var(--font-display);">⚠️ Acil Dikkat! Kritik Vadeler (${kritikVadeler.length} Adet - 7 Gün İçi)</h4>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
                        ${kritikVadeler.map(item => {
                            const diff = new Date(item.tarih) - bugunTarih;
                            const gun = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            let gunMetni = "";
                            if (gun < 0) gunMetni = `<span class="badge badge-danger" style="border-radius:4px;">Günü Geçti (${Math.abs(gun)} Gün)</span>`;
                            else if (gun === 0) gunMetni = `<span class="badge badge-danger" style="border-radius:4px; animation: pulse 1.5s infinite;">BUGÜN!</span>`;
                            else if (gun === 1) gunMetni = `<span class="badge badge-warning" style="border-radius:4px;">Yarın</span>`;
                            else gunMetni = `<span class="badge badge-success" style="border-radius:4px;">${gun} Gün Kaldı</span>`;

                            let kategoriIcon = "";
                            if (item.kategori === "cek") kategoriIcon = "📄";
                            else if (item.kategori === "kredi") kategoriIcon = "🏦";
                            else if (item.kategori === "dbs") kategoriIcon = "📑";
                            else if (item.kategori === "teminat") kategoriIcon = "🛡️";
                            
                            return `
                                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:6px; flex-wrap:wrap; gap:4px;">
                                    <span>
                                        <span class="badge ${item.tip === 'Gelir' ? 'badge-success' : item.tip === 'Uyarı' ? 'badge-info' : 'badge-danger'}" style="margin-right:6px; font-size:0.7rem; padding: 2px 6px;">
                                            ${kategoriIcon} ${item.tip === 'Gelir' ? 'Tahsilat' : item.tip === 'Uyarı' ? 'Uyarı' : 'Ödeme'}
                                        </span>
                                        <strong>${item.baslik}</strong> <small style="color:var(--text-muted);">(${item.detay})</small>
                                    </span>
                                    <span style="white-space:nowrap;">
                                        ${gunMetni} | <strong class="${item.tip === 'Gelir' ? 'text-success' : 'text-danger'}">${utils.formatPara(item.tutar)}</strong>
                                    </span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }

        let riskAsimBanner = "";
        if (riskAsimList.length > 0) {
            riskAsimBanner = `
                <div class="card shake-anim" style="border-left: 4px solid var(--accent-rose); background: rgba(244, 63, 94, 0.05); padding: 20px; margin-bottom: 24px; border-color: var(--accent-rose);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                        <i data-lucide="shield-alert" class="text-danger" style="width:20px; height:20px; color:var(--accent-rose);"></i>
                        <h4 class="text-danger" style="font-size:1rem; font-family:var(--font-display); color:var(--accent-rose); margin:0;">⚠️ Risk Limiti Aşımı Uyarısı!</h4>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
                        ${riskAsimList.map(item => `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:6px; flex-wrap:wrap; gap:4px;">
                                <span>
                                    <strong>${item.bankaAdi}</strong> bankası risk limiti aşılmış!
                                </span>
                                <span style="white-space:nowrap;">
                                    <strong class="text-danger" style="color:var(--accent-rose); font-weight:700;">%${item.pct} Kullanım</strong> | Risk: <strong>${utils.formatPara(item.risk)}</strong> (Limit: ${utils.formatPara(item.limit)})
                                </span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        let sonIslemlerHtml = "";
        if (sonIslemler.length === 0) {
            sonIslemlerHtml = `
                <div style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.85rem;">
                    <i data-lucide="activity" style="width:24px; height:24px; margin-bottom:8px; opacity:0.5;"></i>
                    <p>Henüz bir işlem geçmişi bulunmuyor.</p>
                </div>
            `;
        } else {
            sonIslemlerHtml = `
                <div style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto; padding-right:4px;">
                    ${sonIslemler.map(log => {
                        let icon = "activity";
                        let color = "var(--text-muted)";
                        if (log.islemTipi === "Ekle") { icon = "plus-circle"; color = "var(--accent-emerald)"; }
                        else if (log.islemTipi === "Güncelle") { icon = "edit-3"; color = "var(--accent-blue)"; }
                        else if (log.islemTipi === "Sil") { icon = "trash-2"; color = "var(--accent-rose)"; }
                        
                        return `
                            <div style="display:flex; gap:10px; align-items:flex-start; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:8px;">
                                <div style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; background:rgba(255,255,255,0.03); flex-shrink:0;">
                                    <i data-lucide="${icon}" style="width:14px; height:14px; color:${color};"></i>
                                </div>
                                <div style="flex-grow:1; min-width:0;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:2px; flex-wrap:wrap; gap:4px;">
                                        <strong style="color:var(--text-primary);">${log.modul} - ${log.islemTipi}</strong>
                                        <small style="color:var(--text-muted); font-size:0.7rem;">${utils.formatTarih(log.tarih)} ${new Date(log.tarih).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</small>
                                    </div>
                                    <div style="color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:0.75rem;">${log.aciklama}</div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            `;
        }

        let recentActionsHtml = "";
        if (recentActions.length > 0) {
            recentActionsHtml = `
                <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <h4 style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="navigation" style="width:12px; height:12px;"></i> Sık Kullandığınız Sayfalar
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${recentActions.map(act => {
                            let icon = "layers";
                            if (act.name === "cekler") icon = "receipt";
                            else if (act.name === "krediler") icon = "percent";
                            else if (act.name === "bankalar") icon = "building";
                            else if (act.name === "raporlar") icon = "bar-chart-3";
                            else if (act.name === "toplu-giris") icon = "upload-cloud";
                            else if (act.name === "dashboard") icon = "home";
                            
                            return `
                                <div onclick="window.location.hash='${act.name}'" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:6px; background:rgba(255,255,255,0.02); font-size:0.78rem; cursor:pointer; transition:all 0.2s; border: 1px solid transparent;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='transparent'">
                                    <span style="display:flex; align-items:center; gap:8px; color:var(--text-primary);">
                                        <i data-lucide="${icon}" style="width:14px; height:14px; color:var(--accent-emerald);"></i>
                                        ${act.label}
                                    </span>
                                    <i data-lucide="chevron-right" style="width:12px; height:12px; color:var(--text-muted);"></i>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }

        let statsHtml = `
            <!-- 📊 GENEL İSTATİSTİKLER -->
            <div class="card" style="margin-top:24px; padding:20px; background:linear-gradient(135deg, rgba(59,130,246,0.03), rgba(16,185,129,0.03)); border:1px solid rgba(255,255,255,0.04); margin-bottom: 24px;">
                <h4 style="font-size:0.95rem; font-family:var(--font-display); margin-top:0; margin-bottom:16px; display:flex; align-items:center; gap:8px; color:var(--text-primary);">
                    <i data-lucide="bar-chart-4" style="color:var(--accent-blue); width:18px; height:18px;"></i> Genel Sistem İstatistikleri
                </h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:16px; text-align:center;">
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">Çek Hacmi / Adedi</small>
                        <strong style="font-size:1.1rem; color:var(--text-primary);">${toplamCekAdedi} Adet</strong>
                    </div>
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">Çek Ödeme Oranı</small>
                        <strong style="font-size:1.1rem; color:#10b981;">%${cekOdemeOrani}</strong>
                    </div>
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">Ort. Çek Vadesi</small>
                        <strong style="font-size:1.1rem; color:var(--accent-blue);">${ortalamaVadeGun} Gün</strong>
                    </div>
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">Aktif Banka Kredisi</small>
                        <strong style="font-size:1.1rem; color:var(--text-primary);">${aktifKrediSayisi} Kredi</strong>
                    </div>
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">DBS Limit Adedi</small>
                        <strong style="font-size:1.1rem; color:var(--text-primary);">${dbsLimitAdedi} Firma</strong>
                    </div>
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">Aktif Teminat Mektubu</small>
                        <strong style="font-size:1.1rem; color:var(--text-primary);">${aktifTmSayisi} Adet (${utils.formatPara(aktifTmToplamTutar).replace(",00", "").replace("₺", "").trim()})</strong>
                    </div>
                    <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.03);">
                        <small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-bottom:4px;">Tanımlı Bankalar</small>
                        <strong style="font-size:1.1rem; color:var(--text-primary);">${toplamBankaSayisi} Banka</strong>
                    </div>
                </div>
            </div>
        `;

        let html = `
            ${hatirlatmaBanner}
            ${riskAsimBanner}
            
            <!-- 🔔 HATIRLATMA SEKMESİ -->
            ${hatirlatmaSekmesi}
            
            <!-- 💎 KPI KARTLARI -->
            <div class="grid-cols-4">
                <div class="kpi-card">
                    <div class="kpi-icon-box rose"><i data-lucide="trending-down"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Toplam Borç & Risk</div>
                        <div class="kpi-value">${utils.formatPara(toplamKrediBorc)}</div>
                        <div class="kpi-trend">Spot + Taksitli Kalan + BCH</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon-box gold"><i data-lucide="percent"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">BCH (Rotatif) Risk</div>
                        <div class="kpi-value">${utils.formatPara(bchBakiye)}</div>
                        <div class="kpi-trend">Günlük Faiz İşletimi</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon-box green"><i data-lucide="receipt"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Kasadaki Çek Portföyü</div>
                        <div class="kpi-value">${utils.formatPara(portfoyCekTutar)}</div>
                        <div class="kpi-trend">Tahsil Edilmeyi Bekleyen</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon-box blue"><i data-lucide="share-2"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Dışarıdaki Çek Yükü</div>
                        <div class="kpi-value">${utils.formatPara(ciroCekTutar)}</div>
                        <div class="kpi-trend">Ciro / Tahsil / Teminat</div>
                    </div>
                </div>
            </div>
            
            ${statsHtml}

            <!-- 📊 ANA GRİD: AJANDA & KISA YOL HAREKETLERİ -->
            <div class="grid-main-side">
                <!-- Sol Taraf: Yaklaşan Finansal Takvim -->
                <div>
                    <div class="card">
                        <div class="card-title-area">
                            <h3 class="card-title"><i data-lucide="calendar-clock"></i> Yaklaşan Finansal Vadeler (İlk 5)</h3>
                            <span class="badge badge-info">Kronolojik Sıralı</span>
                        </div>
                        
                        ${yaklasan5.length === 0 ? `
                            <div class="empty-state">
                                <i data-lucide="check-circle-2" class="text-success"></i>
                                <h4>Yakın Zamanda Vade Bulunmuyor</h4>
                                <p>Tebrikler! Önümüzdeki günlerde ödemesi veya tahsilatı bekleyen acil bir işlem görünmüyor.</p>
                            </div>
                        ` : `
                            <div class="table-responsive">
                                <table class="custom-table">
                                    <thead>
                                        <tr>
                                            <th>İşlem Tipi</th>
                                            <th>Açıklama / Kurum</th>
                                            <th>Vade Tarihi</th>
                                            <th>Kalan Gün</th>
                                            <th>Tutar (₺)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${yaklasan5.map(item => {
                                            const kalanGun = utils.formatKalanGun(item.tarih);
                                            const isGelir = item.tip === "Gelir";
                                            return `
                                                <tr>
                                                    <td>
                                                        <span class="badge ${isGelir ? 'badge-success' : 'badge-danger'}">
                                                            <i data-lucide="${isGelir ? 'arrow-down-left' : 'arrow-up-right'}"></i>
                                                            ${isGelir ? 'Tahsilat' : 'Ödeme'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <strong>${item.baslik}</strong><br>
                                                        <small style="color:var(--text-muted);">${item.detay}</small>
                                                    </td>
                                                    <td><strong>${utils.formatTarih(item.tarih)}</strong></td>
                                                    <td>${kalanGun}</td>
                                                    <td>
                                                        <strong class="${isGelir ? 'text-success' : 'text-danger'}">
                                                            ${utils.formatPara(item.tutar)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join("")}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Sağ Taraf: Hızlı İşlemler & Kılavuz -->
                <div>
                    <div class="card" style="border-left: 4px solid var(--accent-emerald); margin-bottom: 24px;">
                        <h3 class="card-title" style="color: var(--accent-emerald);"><i data-lucide="zap"></i> Hızlı Finansal Aksiyon</h3>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:12px; margin-bottom:20px;">
                            Banka kredisi ödemesi veya müşteri çek girişi yapmak için aşağıdaki butonları kullanabilirsiniz.
                        </p>
                        
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <button class="btn btn-primary btn-block" onclick="window.location.hash='krediler'; setTimeout(()=>KredilerModule.showKrediEkleModal(), 100);">
                                <i data-lucide="plus"></i> Yeni Banka Kredisi Ekle
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="window.location.hash='cekler'; setTimeout(()=>CeklerModule.showCekEkleModal(), 100);" style="border-color: rgba(16,185,129,0.3);">
                                <i data-lucide="plus"></i> Yeni Müşteri Çeki Gir
                            </button>
                        </div>
                        
                        <!-- 🚀 SIK KULLANILAN SAYFALAR -->
                        ${recentActionsHtml}
                    </div>

                    <!-- 📜 SON İŞLEMLER LOGU -->
                    <div class="card" style="border-left: 4px solid var(--accent-blue);">
                        <h3 class="card-title" style="color: var(--accent-blue);"><i data-lucide="history"></i> Son İşlemler (Activity Feed)</h3>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:12px; margin-bottom:20px;">
                            Program üzerinde son gerçekleştirdiğiniz işlemlerin akışı:
                        </p>
                        ${sonIslemlerHtml}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },

    // --- 📈 NAKİT AKIŞ PROJEKSİYONU RENDER MOTORU ---
    async renderNakitAkis() {
        const container = document.getElementById("page-container");
        
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();
        const cekler = await DBService.getCekler();

        // 12 Aylık nakit akışı verilerini oluştur (Vade ayına göre grupla)
        const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const bugun = new Date();
        const grafikEtiketleri = [];
        const aylikGelirler = [];
        const aylikGiderler = [];

        // Gelecek 6 ayı hazırla
        for (let i = 0; i < 6; i++) {
            const d = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
            const ayIsmi = aylar[d.getMonth()] + " " + d.getFullYear();
            grafikEtiketleri.push(ayIsmi);
            
            const yil = d.getFullYear();
            const ay = d.getMonth();

            // Çek Tahsilatları (Gelir)
            let gelirTop = 0;
            cekler.forEach(c => {
                if (c.durum === "Portföyde" || c.durum === "Tahsilde" || c.durum === "Teminatta") {
                    const vd = new Date(c.vadeTarihi);
                    if (vd.getFullYear() === yil && vd.getMonth() === ay) {
                        gelirTop += parseFloat(c.tutar) || 0;
                    }
                }
            });
            aylikGelirler.push(gelirTop);

            // Kredi Ödemeleri (Gider)
            let giderTop = 0;
            odemeler.forEach(o => {
                if (!o.odendiMi) {
                    const vd = new Date(o.vadeTarihi);
                    if (vd.getFullYear() === yil && vd.getMonth() === ay) {
                        giderTop += parseFloat(o.tutar) || 0;
                    }
                }
            });
            // Spot Kredilerin Vade Sonlarını da ekle
            krediler.forEach(k => {
                if (k.krediTuru === "Spot" && k.durum !== "Kapatıldı") {
                    const vd = new Date(k.vadeTarihi);
                    if (vd.getFullYear() === yil && vd.getMonth() === ay) {
                        giderTop += parseFloat(k.tutar) || 0;
                    }
                }
            });
            aylikGiderler.push(giderTop);
        }

        let html = `
            <div class="card">
                <div class="card-title-area">
                    <h3 class="card-title"><i data-lucide="line-chart"></i> Nakit Akış Grafiği (Gelecek 6 Ay)</h3>
                    <span class="badge badge-success">Otomatik Güncellenir</span>
                </div>
                <div style="position:relative; height:320px; width:100%;">
                    <canvas id="cashflow-chart"></canvas>
                </div>
            </div>

            <div class="grid-cols-2">
                <div class="card">
                    <h4 class="card-title text-success" style="margin-bottom:16px;"><i data-lucide="arrow-down-circle"></i> Aylık Toplam Çek Tahsilatları</h4>
                    <div class="table-responsive">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Dönem</th>
                                    <th style="text-align:right;">Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${grafikEtiketleri.map((et, idx) => `
                                    <tr>
                                        <td><strong>${et}</strong></td>
                                        <td style="text-align:right;" class="text-success"><strong>${utils.formatPara(aylikGelirler[idx])}</strong></td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <h4 class="card-title text-danger" style="margin-bottom:16px;"><i data-lucide="arrow-up-circle"></i> Aylık Toplam Kredi Ödemeleri</h4>
                    <div class="table-responsive">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Dönem</th>
                                    <th style="text-align:right;">Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${grafikEtiketleri.map((et, idx) => `
                                    <tr>
                                        <td><strong>${et}</strong></td>
                                        <td style="text-align:right;" class="text-danger"><strong>${utils.formatPara(aylikGiderler[idx])}</strong></td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // ChartJS Grafik Çizimi
        setTimeout(() => {
            const ctx = document.getElementById("cashflow-chart").getContext("2d");
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: grafikEtiketleri,
                    datasets: [
                        {
                            label: 'Bekleyen Çek Tahsilatları (Gelir)',
                            data: aylikGelirler,
                            backgroundColor: 'rgba(16, 185, 129, 0.65)',
                            borderColor: '#10b981',
                            borderWidth: 1,
                            borderRadius: 4
                        },
                        {
                            label: 'Kredi Borç Ödemeleri (Gider)',
                            data: aylikGiderler,
                            backgroundColor: 'rgba(244, 63, 94, 0.65)',
                            borderColor: '#f43f5e',
                            borderWidth: 1,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94a3b8' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#f8fafc', font: { family: 'Inter' } }
                        }
                    }
                }
            });
        }, 50);
    },

    // --- 🔒 ŞİFRELİ VERİ YEDEKLEME & YÜKLEME ---
    async exportData() {
        try {
            const data = {
                krediler: await db.krediler.toArray(),
                krediOdemeleri: await db.krediOdemeleri.toArray(),
                cekler: await db.cekler.toArray(),
                bankalar: await db.bankalar.toArray(),
                teminatMektuplari: await db.teminatMektuplari.toArray(),
                dbsFaturalar: await db.dbsFaturalar.toArray()
            };

            const jsonStr = JSON.stringify(data, null, 2);
            
            // Güvenlik için yedek dosyasını da tarayıcı şifresiyle şifreliyoruz!
            const encryptedBackup = CryptoJS.AES.encrypt(jsonStr, MASTER_PASSWORD).toString();

            const blob = new Blob([encryptedBackup], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            const bugun = new Date().toISOString().slice(0,10);
            a.href = url;
            a.download = `IsYil_Finans_Yedek_${bugun}.enc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Son yedek tarihini kaydet
            await db.ayarlar.put({ anahtar: "son_yedek_tarihi", deger: new Date().toISOString() });
            
            App.showToast("Finansal yedek şifrelenerek başarıyla indirildi!");
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    triggerImport() {
        document.getElementById("import-file").click();
    },

    async importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const encryptedContent = event.target.result;
                
                // Şifreyi çöz
                const bytes = CryptoJS.AES.decrypt(encryptedContent, MASTER_PASSWORD);
                const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
                
                if (!decryptedStr) {
                    throw new Error("Yedek şifresi bu oturum şifresiyle uyuşmuyor!");
                }

                const data = JSON.parse(decryptedStr);
                
                if (confirm("Mevcut verileriniz silinecek ve yedekteki veriler yüklenecektir. Emin misiniz?")) {
                    await db.krediler.clear();
                    await db.krediOdemeleri.clear();
                    await db.cekler.clear();
                    await db.bankalar.clear();
                    await db.teminatMektuplari.clear();
                    await db.dbsFaturalar.clear();
                    
                    if (data.krediler) {
                        for (let k of data.krediler) await db.krediler.add(k);
                    }
                    if (data.krediOdemeleri) {
                        for (let o of data.krediOdemeleri) await db.krediOdemeleri.add(o);
                    }
                    if (data.cekler) {
                        for (let c of data.cekler) await db.cekler.add(c);
                    }
                    if (data.bankalar) {
                        for (let b of data.bankalar) await db.bankalar.add(b);
                    }
                    if (data.teminatMektuplari) {
                        for (let t of data.teminatMektuplari) await db.teminatMektuplari.add(t);
                    }
                    if (data.dbsFaturalar) {
                        for (let d of data.dbsFaturalar) await db.dbsFaturalar.add(d);
                    }
                    
                    App.showToast("Tüm finansal veriler başarıyla geri yüklendi!");
                    App.handleRouting();
                }
            } catch (err) {
                App.showToast("Geri yükleme hatası! Şifreniz uyuşmuyor veya dosya bozuk.", "error");
                console.error(err);
            }
        };
        reader.readAsText(file);
    },

    // TOAST BİLGİLENDİRME MESAJLARI
    showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.right = "24px";
        toast.style.padding = "14px 24px";
        toast.style.borderRadius = "8px";
        toast.style.fontSize = "0.9rem";
        toast.style.fontWeight = "600";
        toast.style.zIndex = "100000";
        toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        toast.style.animation = "toastSlideIn 0.3s ease-out";
        toast.style.display = "flex";
        toast.style.alignItems = "center";
        toast.style.gap = "8px";

        if (type === "success") {
            toast.style.backgroundColor = "#10b981";
            toast.style.color = "#050b10";
            toast.innerHTML = `<i data-lucide="check-circle" style="width:18px;height:18px;"></i> ${message}`;
        } else {
            toast.style.backgroundColor = "#f43f5e";
            toast.style.color = "#fff";
            toast.innerHTML = `<i data-lucide="alert-octagon" style="width:18px;height:18px;"></i> ${message}`;
        }

        document.body.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
            toast.style.animation = "toastSlideOut 0.3s ease-in";
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    },

    // 🔔 HATIRLATMA SEKMESİ TAB DEĞİŞTİRME
    switchHatirlatmaTab(tabName) {
        // Tab butonlarını güncelle
        document.querySelectorAll('.hatirlatma-tab').forEach(btn => {
            if (btn.getAttribute('data-hat-tab') === tabName) {
                btn.style.color = 'var(--text-primary)';
                btn.style.fontWeight = '600';
                btn.style.borderBottom = '2px solid var(--accent-amber)';
            } else {
                btn.style.color = 'var(--text-secondary)';
                btn.style.fontWeight = '500';
                btn.style.borderBottom = '2px solid transparent';
            }
        });

        // İçerik panellerini güncelle
        document.querySelectorAll('.hat-content').forEach(panel => {
            panel.style.display = 'none';
        });
        const activePanel = document.getElementById(`hat-content-${tabName}`);
        if (activePanel) {
            activePanel.style.display = 'block';
        }
        lucide.createIcons();
    },

    toggleMobileMenu() {
        const sidebar = document.getElementById("app-sidebar");
        const overlay = document.getElementById("sidebar-overlay");
        if (sidebar && overlay) {
            sidebar.classList.toggle("open");
            overlay.classList.toggle("active");
        }
    },

    closeMobileMenu() {
        const sidebar = document.getElementById("app-sidebar");
        const overlay = document.getElementById("sidebar-overlay");
        if (sidebar && overlay) {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        }
    },

    async checkYedekDurumu() {
        if (!Security.isPasswordLoaded()) return;
        try {
            const sonYedek = await db.ayarlar.get("son_yedek_tarihi");
            const banner = document.getElementById("yedek-uyari-banner");
            
            const ignoreTarih = localStorage.getItem("is-yil-yedek-ignore");
            if (ignoreTarih) {
                const bugunStr = new Date().toISOString().slice(0, 10);
                if (ignoreTarih === bugunStr) {
                    if (banner) banner.style.display = "none";
                    return;
                }
            }

            if (!sonYedek) {
                if (banner) banner.style.display = "flex";
            } else {
                const diff = new Date() - new Date(sonYedek.deger);
                const gun = diff / (1000 * 60 * 60 * 24);
                if (gun >= 7) {
                    if (banner) banner.style.display = "flex";
                } else {
                    if (banner) banner.style.display = "none";
                }
            }
        } catch (e) {
            console.error("Yedek durumu kontrol edilemedi:", e);
        }
    },

    ignoreYedekHatirlatma() {
        const bugunStr = new Date().toISOString().slice(0, 10);
        localStorage.setItem("is-yil-yedek-ignore", bugunStr);
        const banner = document.getElementById("yedek-uyari-banner");
        if (banner) banner.style.display = "none";
        this.showToast("Yedekleme hatırlatması yarına ertelendi.");
    },

    openSearch() {
        if (!Security.isPasswordLoaded()) return;
        const overlay = document.getElementById("search-overlay");
        if (overlay) {
            overlay.style.display = "flex";
            const input = document.getElementById("global-search-input");
            if (input) {
                input.value = "";
                input.focus();
            }
            // Reset results
            const resultsList = document.getElementById("search-results-list");
            if (resultsList) {
                resultsList.innerHTML = `
                    <div class="search-empty-state">
                        <i data-lucide="search" style="width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.3;"></i>
                        <p>Aramak istediğiniz kelimeyi yazın...</p>
                        <small style="color:var(--text-muted);">Örn: "Garanti", "12345", "Spot"</small>
                    </div>
                `;
            }
            lucide.createIcons();
        }
    },

    closeSearch() {
        const overlay = document.getElementById("search-overlay");
        if (overlay) {
            overlay.style.display = "none";
        }
    },

    async globalSearch(query) {
        const list = document.getElementById("search-results-list");
        if (!list) return;

        if (!query || query.trim().length < 2) {
            list.innerHTML = `
                <div class="search-empty-state">
                    <i data-lucide="search" style="width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.3;"></i>
                    <p>Aramak istediğiniz kelimeyi yazın...</p>
                    <small style="color:var(--text-muted);">Örn: "Garanti", "12345", "Spot"</small>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const q = query.toLowerCase().trim();

        // Verileri al
        const cekler = await DBService.getCekler();
        const krediler = await DBService.getKrediler();
        const bankalar = await DBService.getBankalar();
        const mektuplar = await DBService.getTeminatMektuplari();
        const faturalar = await DBService.getDbsFaturalar();

        // Filtrele
        const fCekler = cekler.filter(c => 
            (c.cekNo && c.cekNo.toLowerCase().includes(q)) ||
            (c.kesideci && c.kesideci.toLowerCase().includes(q)) ||
            (c.ciroEden && c.ciroEden.toLowerCase().includes(q)) ||
            (c.bankaAdi && c.bankaAdi.toLowerCase().includes(q)) ||
            (c.verilenBanka && c.verilenBanka.toLowerCase().includes(q))
        );

        const fKrediler = krediler.filter(k => 
            (k.bankaAdi && k.bankaAdi.toLowerCase().includes(q)) ||
            (k.krediTuru && k.krediTuru.toLowerCase().includes(q)) ||
            (k.tedarikciFirma && k.tedarikciFirma.toLowerCase().includes(q))
        );

        const fBankalar = bankalar.filter(b => 
            (b.bankaAdi && b.bankaAdi.toLowerCase().includes(q)) ||
            (b.subeAdi && b.subeAdi.toLowerCase().includes(q)) ||
            (b.iban && b.iban.toLowerCase().includes(q)) ||
            (b.hesapNo && b.hesapNo.toLowerCase().includes(q))
        );

        const fMektuplar = mektuplar.filter(m => 
            (m.mektupNo && m.mektupNo.toLowerCase().includes(q)) ||
            (m.lehtar && m.lehtar.toLowerCase().includes(q)) ||
            (m.bankaAdi && m.bankaAdi.toLowerCase().includes(q))
        );

        const fFaturalar = faturalar.filter(f => 
            (f.faturaNo && f.faturaNo.toLowerCase().includes(q)) ||
            (f.tedarikciFirma && f.tedarikciFirma.toLowerCase().includes(q))
        );

        let resultsHtml = "";

        // Sonuçları HTMLleştir
        if (fCekler.length > 0) {
            resultsHtml += `<div class="search-category-title">📄 Müşteri Çekleri (${fCekler.length})</div>`;
            fCekler.forEach(c => {
                resultsHtml += `
                    <div class="search-result-item" onclick="App.closeSearch(); window.location.hash='cekler'">
                        <div class="search-result-left">
                            <div class="search-result-icon-wrapper"><i data-lucide="receipt" style="width:16px; height:16px; color:var(--accent-emerald);"></i></div>
                            <div class="search-result-info">
                                <div class="search-result-title">Çek No: ${c.cekNo} - ${c.kesideci}</div>
                                <div class="search-result-subtitle">Vade: ${utils.formatTarih(c.vadeTarihi)} | Ciro: ${c.ciroEden || 'Yok'} -> ${c.ciroEdilenYer || 'Yok'}</div>
                            </div>
                        </div>
                        <div class="search-result-right">
                            <div class="search-result-value text-success">${utils.formatPara(c.tutar)}</div>
                            <div class="search-result-badge badge-success" style="padding:2px 6px; border-radius:4px; font-size:0.7rem; display:inline-block; margin-top:4px;">${c.durum}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (fKrediler.length > 0) {
            resultsHtml += `<div class="search-category-title">🏦 Banka Kredileri (${fKrediler.length})</div>`;
            fKrediler.forEach(k => {
                resultsHtml += `
                    <div class="search-result-item" onclick="App.closeSearch(); window.location.hash='krediler'">
                        <div class="search-result-left">
                            <div class="search-result-icon-wrapper"><i data-lucide="percent" style="width:16px; height:16px; color:var(--accent-amber);"></i></div>
                            <div class="search-result-info">
                                <div class="search-result-title">${k.bankaAdi} - ${k.krediTuru} Kredisi</div>
                                <div class="search-result-subtitle">Faiz: %${k.faizOrani || '0'} | Tedarikçi: ${k.tedarikciFirma || 'Yok'}</div>
                            </div>
                        </div>
                        <div class="search-result-right">
                            <div class="search-result-value text-danger">${utils.formatPara(k.tutar)} ${k.dovizCinsi || '₺'}</div>
                            <div class="search-result-badge badge-danger" style="padding:2px 6px; border-radius:4px; font-size:0.7rem; display:inline-block; margin-top:4px;">${k.durum || 'Aktif'}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (fBankalar.length > 0) {
            resultsHtml += `<div class="search-category-title">🏢 Banka Hesapları (${fBankalar.length})</div>`;
            fBankalar.forEach(b => {
                resultsHtml += `
                    <div class="search-result-item" onclick="App.closeSearch(); window.location.hash='bankalar'">
                        <div class="search-result-left">
                            <div class="search-result-icon-wrapper"><i data-lucide="building" style="width:16px; height:16px; color:var(--accent-blue);"></i></div>
                            <div class="search-result-info">
                                <div class="search-result-title">${b.bankaAdi} - ${b.subeAdi || 'Merkez'}</div>
                                <div class="search-result-subtitle">Hesap No: ${b.hesapNo || '-'} | IBAN: ${b.iban || '-'}</div>
                            </div>
                        </div>
                        <div class="search-result-right">
                            <div class="search-result-badge badge-info" style="padding:2px 6px; border-radius:4px; font-size:0.7rem; display:inline-block; margin-top:4px;">Banka</div>
                        </div>
                    </div>
                `;
            });
        }

        if (fMektuplar.length > 0) {
            resultsHtml += `<div class="search-category-title">🛡️ Teminat Mektupları (${fMektuplar.length})</div>`;
            fMektuplar.forEach(m => {
                resultsHtml += `
                    <div class="search-result-item" onclick="App.closeSearch(); window.location.hash='bankalar'">
                        <div class="search-result-left">
                            <div class="search-result-icon-wrapper"><i data-lucide="shield" style="width:16px; height:16px; color:var(--accent-amber);"></i></div>
                            <div class="search-result-info">
                                <div class="search-result-title">No: ${m.mektupNo} - ${m.lehtar}</div>
                                <div class="search-result-subtitle">Banka: ${m.bankaAdi || '-'} | Vade: ${m.bitisTarihi || 'Süresiz'}</div>
                            </div>
                        </div>
                        <div class="search-result-right">
                            <div class="search-result-value text-warning">${utils.formatPara(m.tutar)} ${m.doviz || '₺'}</div>
                            <div class="search-result-badge badge-warning" style="padding:2px 6px; border-radius:4px; font-size:0.7rem; display:inline-block; margin-top:4px;">${m.durum}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (fFaturalar.length > 0) {
            resultsHtml += `<div class="search-category-title">📑 DBS Faturaları (${fFaturalar.length})</div>`;
            fFaturalar.forEach(f => {
                resultsHtml += `
                    <div class="search-result-item" onclick="App.closeSearch(); window.location.hash='krediler'">
                        <div class="search-result-left">
                            <div class="search-result-icon-wrapper"><i data-lucide="file-text" style="width:16px; height:16px; color:var(--accent-rose);"></i></div>
                            <div class="search-result-info">
                                <div class="search-result-title">Fatura No: ${f.faturaNo} - ${f.tedarikciFirma}</div>
                                <div class="search-result-subtitle">Vade: ${utils.formatTarih(f.vadeTarihi)}</div>
                            </div>
                        </div>
                        <div class="search-result-right">
                            <div class="search-result-value text-danger">${utils.formatPara(f.faturaTutari || f.tutar)}</div>
                            <div class="search-result-badge badge-danger" style="padding:2px 6px; border-radius:4px; font-size:0.7rem; display:inline-block; margin-top:4px;">${f.durum || 'Bekliyor'}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (resultsHtml === "") {
            list.innerHTML = `
                <div class="search-empty-state">
                    <i data-lucide="info" style="width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.3;"></i>
                    <p>"${query}" için sonuç bulunamadı.</p>
                    <small style="color:var(--text-muted);">Yazım hatası olup olmadığını kontrol edin.</small>
                </div>
            `;
        } else {
            list.innerHTML = resultsHtml;
        }

        lucide.createIcons();
    },

    trackAction(actionName, label) {
        try {
            let actions = JSON.parse(localStorage.getItem("is-yil-recent-actions") || "[]");
            actions = actions.filter(a => a.name !== actionName);
            actions.unshift({ name: actionName, label: label, time: new Date().toISOString() });
            actions = actions.slice(0, 5);
            localStorage.setItem("is-yil-recent-actions", JSON.stringify(actions));
        } catch (e) {
            console.error("Action track hatası:", e);
        }
    },

    getRecentActions() {
        try {
            return JSON.parse(localStorage.getItem("is-yil-recent-actions") || "[]");
        } catch (e) {
            return [];
        }
    },

    async resetDatabaseConfirm(e) {
        e.preventDefault();
        if (confirm("🚨 DİKKAT! Tüm verileriniz (bankalar, krediler, çekler vb.) ve şifreniz KALICI OLARAK SİLİNECEKTİR!\n\nEğer elinizde güncel bir yedek (.enc) dosyası yoksa verilerinize bir daha ulaşamazsınız.\n\nSistemi sıfırlamak istediğinize kesin olarak emin misiniz?")) {
            const doubleCheck = prompt("Lütfen sıfırlama işlemini onaylamak için büyük harflerle 'SIFIRLA' yazın:");
            if (doubleCheck === "SIFIRLA") {
                try {
                    // Tarayıcıdaki olası kilitleri aşmak için önce tüm tabloları boşaltalım
                    const openReq = indexedDB.open("IsmailFinansDB");
                    openReq.onsuccess = async function(event) {
                        const database = event.target.result;
                        const storeNames = Array.from(database.objectStoreNames);
                        if (storeNames.length > 0) {
                            try {
                                const transaction = database.transaction(storeNames, "readwrite");
                                storeNames.forEach(storeName => {
                                    try { transaction.objectStore(storeName).clear(); } catch(e) {}
                                });
                                transaction.oncomplete = async function() {
                                    database.close();
                                    try {
                                        db.close();
                                        await db.delete();
                                    } catch(e) {}
                                    localStorage.clear();
                                    alert("Temizleme tamamlandı! Yeni şifre belirleme ekranı açılacaktır.");
                                    window.location.reload();
                                };
                            } catch(txErr) {
                                database.close();
                                localStorage.clear();
                                window.location.reload();
                            }
                        } else {
                            database.close();
                            localStorage.clear();
                            window.location.reload();
                        }
                    };
                    openReq.onerror = function() {
                        localStorage.clear();
                        window.location.reload();
                    };
                } catch (err) {
                    alert("Sıfırlama sırasında hata oluştu: " + err.message);
                }
            } else {
                alert("Onay kelimesi eşleşmedi. Sıfırlama iptal edildi.");
            }
        }
    }
};

// --- GENEL YARDIMCI FONKSİYONLAR (UTILS) ---
const utils = {
    formatPara(tutar) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(tutar || 0);
    },
    
    formatTarih(tarihStr) {
        if (!tarihStr) return "-";
        const d = new Date(tarihStr);
        return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(d);
    },
    
    formatKalanGun(tarihStr) {
        if (!tarihStr) return "-";
        const bugun = new Date();
        bugun.setHours(0,0,0,0);
        const vade = new Date(tarihStr);
        vade.setHours(0,0,0,0);
        
        const fark = vade - bugun;
        const gun = Math.ceil(fark / (1000 * 60 * 60 * 24));
        
        if (gun === 0) return `<span class="badge badge-warning">Bugün</span>`;
        if (gun < 0) return `<span class="badge badge-danger">Geçti (${Math.abs(gun)} Gün)</span>`;
        if (gun <= 7) return `<span class="badge badge-danger">${gun} Gün</span>`;
        if (gun <= 30) return `<span class="badge badge-warning">${gun} Gün</span>`;
        return `<span class="badge badge-success">${gun} Gün</span>`;
    },

    getValorTarihi(tarihStr, tip) {
        if (!tarihStr) return "-";
        if (tip !== "odeme") return tarihStr;
        const parts = tarihStr.split('-');
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        const day = date.getDay(); // 0 = Pazar, 1 = Pazartesi, ..., 5 = Cuma, 6 = Cumartesi
        let shift = 0;
        if (day === 5) shift = 3;      // Cuma -> Pazartesi
        else if (day === 6) shift = 2; // Cumartesi -> Pazartesi
        else if (day === 0) shift = 1; // Pazar -> Pazartesi
        
        if (shift > 0) {
            const adjusted = new Date(date);
            adjusted.setDate(adjusted.getDate() + shift);
            const y = adjusted.getFullYear();
            const m = String(adjusted.getMonth() + 1).padStart(2, '0');
            const d = String(adjusted.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return tarihStr;
    }
};

// Global scope Modal açma kapama
function openModal(title, bodyHtml) {
    document.getElementById("modal-title").innerText = title;
    document.getElementById("modal-body").innerHTML = bodyHtml;
    document.getElementById("modal-container").style.display = "flex";
    lucide.createIcons();
}

function closeModal() {
    document.getElementById("modal-container").style.display = "none";
}
