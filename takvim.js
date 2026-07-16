/* ==========================================================================
   📅 İS-YIL FİNANS VE MUHASEBE PROGRAMI - ÇEK VADE VE ÖDEME TAKVİMİ (TAKVİM.JS)
   ========================================================================== */

const TakvimModule = {
    mevcutAy: new Date().getMonth(),
    mevcutYil: new Date().getFullYear(),

    async render() {
        const container = document.getElementById("page-container");

        // Verileri al
        const cekler = await DBService.getCekler();
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();
        
        let dbsFaturalar = [];
        let teminatMektuplari = [];
        try { dbsFaturalar = await DBService.getDbsFaturalar(); } catch(e) {}
        try { teminatMektuplari = await DBService.getTeminatMektuplari(); } catch(e) {}

        const aylar = [
            "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
            "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
        ];

        // Takvim Oluşturma Parametreleri
        const ilkGun = new Date(this.mevcutYil, this.mevcutAy, 1);
        const sonGun = new Date(this.mevcutYil, this.mevcutAy + 1, 0);
        
        // JS getDay(): 0 = Pazar, 1 = Pazartesi ... 6 = Cumartesi
        // Bizim takvim: Pazartesi -> Pazar olacağı için düzeltelim
        let startDay = ilkGun.getDay(); 
        if (startDay === 0) startDay = 7; // Pazar en son gün
        const bosluklar = startDay - 1; // Pazartesiden önceki boşluk sayısı

        const toplamGun = sonGun.getDate();

        // Ay günlerini oluştur
        let gunlerHtml = "";

        // Önceki aydan kalan boşlukları doldur
        const oncekiAySonGun = new Date(this.mevcutYil, this.mevcutAy, 0).getDate();
        for (let i = bosluklar - 1; i >= 0; i--) {
            gunlerHtml += `<div class="takvim-cell other-month">${oncekiAySonGun - i}</div>`;
        }

        // Bu ayın günlerini doldur
        const bugun = new Date();
        bugun.setHours(0,0,0,0);

        for (let g = 1; g <= toplamGun; g++) {
            const gunTarih = new Date(this.mevcutYil, this.mevcutAy, g);
            const tarihStr = `${this.mevcutYil}-${String(this.mevcutAy + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
            
            const isBugun = bugun.getTime() === gunTarih.getTime() ? "today" : "";

            // O güne ait finansal olayları filtrele
            const gununCekleri = cekler.filter(c => c.vadeTarihi === tarihStr && (c.durum === 'Portföyde' || c.durum === 'Tahsilde' || c.durum === 'Teminatta'));
            const gununTaksitleri = odemeler.filter(o => o.vadeTarihi === tarihStr && !o.odendiMi);
            const gununSpotKredileri = krediler.filter(k => k.vadeTarihi === tarihStr && k.krediTuru === "Spot" && k.durum !== "Kapatıldı");
            const gununFaturalari = dbsFaturalar.filter(f => f.vadeTarihi === tarihStr && f.durum === "Bekliyor");
            const gununMektuplari = teminatMektuplari.filter(m => m.bitisTarihi === tarihStr && m.durum === "Aktif" && m.tur === "Süreli");

            // Toplam hesaplamaları
            const toplamGelir = gununCekleri.reduce((sum, c) => sum + (parseFloat(c.tutar) || 0), 0);
            const toplamGider = gununTaksitleri.reduce((sum, o) => sum + (parseFloat(o.tutar) || 0), 0) + 
                                gununSpotKredileri.reduce((sum, k) => sum + (parseFloat(k.tutar) || 0), 0) +
                                gununFaturalari.reduce((sum, f) => sum + (parseFloat(f.faturaTutari || f.tutar) || 0), 0);

            // Renk kodlu noktalar (Dots)
            let dots = "";
            if (toplamGelir > 0) dots += `<span class="takvim-dot gelir" title="Tahsilat: ${utils.formatPara(toplamGelir)}"></span>`;
            if (toplamGider > 0) dots += `<span class="takvim-dot gider" title="Ödeme: ${utils.formatPara(toplamGider)}"></span>`;
            if (gununMektuplari.length > 0) dots += `<span class="takvim-dot uyari" title="${gununMektuplari.length} Teminat Mektubu Süresi"></span>`;

            // Tutar etiketleri (Sadece değer varsa göster)
            let tutarMetni = "";
            if (toplamGelir > 0 || toplamGider > 0) {
                tutarMetni = `
                    <div class="takvim-tutarlar">
                        ${toplamGelir > 0 ? `<div class="t-gelir">+${utils.formatPara(toplamGelir).replace("TL", "").replace("₺", "").trim()}</div>` : ''}
                        ${toplamGider > 0 ? `<div class="t-gider">-${utils.formatPara(toplamGider).replace("TL", "").replace("₺", "").trim()}</div>` : ''}
                    </div>
                `;
            }

            const hasEvent = (toplamGelir > 0 || toplamGider > 0 || gununMektuplari.length > 0) ? "clickable" : "";

            gunlerHtml += `
                <div class="takvim-cell ${isBugun} ${hasEvent}" onclick="if('${hasEvent}') TakvimModule.showGunDetay('${tarihStr}')">
                    <span class="takvim-gun-no">${g}</span>
                    <div class="takvim-dots-container">${dots}</div>
                    ${tutarMetni}
                </div>
            `;
        }

        // Sonraki aydan doldur (Takvimi 6 satıra - 42 hücreye tamamla)
        const toplamHucre = bosluklar + toplamGun;
        const kalanBoşluk = 42 - toplamHucre;
        for (let i = 1; i <= kalanBoşluk; i++) {
            gunlerHtml += `<div class="takvim-cell other-month">${i}</div>`;
        }

        const html = `
            <div class="page-title-area" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
                <div>
                    <h1>Vade & Ödeme Takvimi</h1>
                    <p class="page-subtitle">Çek tahsilatları, kredi taksitleri ve DBS faturalarının takvim görünümü</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn btn-secondary btn-icon" onclick="TakvimModule.ayDegistir(-1)">
                        <i data-lucide="chevron-left"></i>
                    </button>
                    <span style="font-size:1.15rem; font-weight:700; min-width:140px; text-align:center; color:var(--text-primary); font-family:var(--font-display);">
                        ${aylar[this.mevcutAy]} ${this.mevcutYil}
                    </span>
                    <button class="btn btn-secondary btn-icon" onclick="TakvimModule.ayDegistir(1)">
                        <i data-lucide="chevron-right"></i>
                    </button>
                </div>
            </div>

            <!-- Takvim Renk Göstergeleri (Legend) -->
            <div class="card" style="padding:14px 20px; margin-bottom:20px; display:flex; gap:20px; align-items:center; flex-wrap:wrap; font-size:0.82rem;">
                <span style="color:var(--text-muted); font-weight:600; text-transform:uppercase; font-size:0.75rem;">Renk Kodları:</span>
                <span style="display:flex; align-items:center; gap:6px; color:var(--text-primary);">
                    <span style="width:10px; height:10px; border-radius:50%; background:#10b981; display:inline-block;"></span>
                    Çek Tahsilatları (+ Gelir)
                </span>
                <span style="display:flex; align-items:center; gap:6px; color:var(--text-primary);">
                    <span style="width:10px; height:10px; border-radius:50%; background:#f43f5e; display:inline-block;"></span>
                    Kredi & DBS Ödemeleri (- Gider)
                </span>
                <span style="display:flex; align-items:center; gap:6px; color:var(--text-primary);">
                    <span style="width:10px; height:10px; border-radius:50%; background:#fbbf24; display:inline-block;"></span>
                    Teminat Mektubu Vadeleri (Uyarı)
                </span>
            </div>

            <!-- Ana Takvim Kartı -->
            <div class="card" style="padding: 20px; overflow-x: auto;">
                <div style="min-width: 700px;">
                    <div class="takvim-header">
                        <div>Pazartesi</div>
                        <div>Salı</div>
                        <div>Çarşamba</div>
                        <div>Perşembe</div>
                        <div>Cuma</div>
                        <div style="color:var(--accent-rose);">Cumartesi</div>
                        <div style="color:var(--accent-rose);">Pazar</div>
                    </div>
                    <div class="takvim-grid">
                        ${gunlerHtml}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    ayDegistir(yon) {
        this.mevcutAy += yon;
        if (this.mevcutAy > 11) {
            this.mevcutAy = 0;
            this.mevcutYil += 1;
        } else if (this.mevcutAy < 0) {
            this.mevcutAy = 11;
            this.mevcutYil -= 1;
        }
        this.render();
    },

    async showGunDetay(tarih) {
        // Verileri al
        const cekler = await DBService.getCekler();
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();
        
        let dbsFaturalar = [];
        let teminatMektuplari = [];
        try { dbsFaturalar = await DBService.getDbsFaturalar(); } catch(e) {}
        try { teminatMektuplari = await DBService.getTeminatMektuplari(); } catch(e) {}

        const gununCekleri = cekler.filter(c => c.vadeTarihi === tarih && (c.durum === 'Portföyde' || c.durum === 'Tahsilde' || c.durum === 'Teminatta'));
        const gununTaksitleri = odemeler.filter(o => o.vadeTarihi === tarih && !o.odendiMi);
        const gununSpotKredileri = krediler.filter(k => k.vadeTarihi === tarih && k.krediTuru === "Spot" && k.durum !== "Kapatıldı");
        const gununFaturalari = dbsFaturalar.filter(f => f.vadeTarihi === tarih && f.durum === "Bekliyor");
        const gununMektuplari = teminatMektuplari.filter(m => m.bitisTarihi === tarih && m.durum === "Aktif" && m.tur === "Süreli");

        let bodyHtml = "";

        // ÇEK TAHSİLATLARI
        if (gununCekleri.length > 0) {
            bodyHtml += `
                <div style="margin-bottom:20px;">
                    <h4 style="font-size:0.9rem; color:#10b981; border-bottom:1px solid rgba(16,185,129,0.2); padding-bottom:6px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="arrow-down-left" style="width:16px; height:16px;"></i> Çek Tahsilatları (${gununCekleri.length} Adet)
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${gununCekleri.map(c => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.1); padding:10px 14px; border-radius:8px; font-size:0.82rem;">
                                <div>
                                    <strong>No: ${c.cekNo} - ${c.kesideci}</strong><br>
                                    <small style="color:var(--text-muted);">${c.bankaAdi} | Durum: ${c.durum}</small>
                                </div>
                                <strong style="color:#10b981; font-size:0.9rem;">${utils.formatPara(c.tutar)}</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        // KREDİ VE DBS ÖDEMELERİ
        if (gununTaksitleri.length > 0 || gununSpotKredileri.length > 0 || gununFaturalari.length > 0) {
            bodyHtml += `
                <div style="margin-bottom:20px;">
                    <h4 style="font-size:0.9rem; color:#f43f5e; border-bottom:1px solid rgba(244,63,94,0.2); padding-bottom:6px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="arrow-up-right" style="width:16px; height:16px;"></i> Ödemeler (Kredi & DBS)
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <!-- Kredi Taksitleri -->
                        ${gununTaksitleri.map(o => {
                            const kr = krediler.find(k => k.id === o.krediId);
                            return `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(244,63,94,0.04); border:1px solid rgba(244,63,94,0.1); padding:10px 14px; border-radius:8px; font-size:0.82rem;">
                                    <div>
                                        <strong>${kr ? kr.bankaAdi : 'Banka'} - Taksitli Kredi Ödemesi</strong><br>
                                        <small style="color:var(--text-muted);">Taksit: ${o.taksitNo} | Kalan Borç</small>
                                    </div>
                                    <strong style="color:#f43f5e; font-size:0.9rem;">${utils.formatPara(o.tutar)}</strong>
                                </div>
                            `;
                        }).join("")}

                        <!-- Spot Krediler -->
                        ${gununSpotKredileri.map(k => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(244,63,94,0.04); border:1px solid rgba(244,63,94,0.1); padding:10px 14px; border-radius:8px; font-size:0.82rem;">
                                <div>
                                    <strong>${k.bankaAdi} - Spot Kredi Vade Sonu</strong><br>
                                    <small style="color:var(--text-muted);">Toplam Anapara + Faiz Kapatma</small>
                                </div>
                                <strong style="color:#f43f5e; font-size:0.9rem;">${utils.formatPara(k.tutar)} ${k.dovizCinsi || '₺'}</strong>
                            </div>
                        `).join("")}

                        <!-- DBS Faturaları -->
                        ${gununFaturalari.map(f => {
                            const kr = krediler.find(k => k.id === f.krediId);
                            return `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(244,63,94,0.04); border:1px solid rgba(244,63,94,0.1); padding:10px 14px; border-radius:8px; font-size:0.82rem;">
                                    <div>
                                        <strong>DBS Faturası - ${kr ? kr.tedarikciFirma || kr.bankaAdi : 'Tedarikçi'}</strong><br>
                                        <small style="color:var(--text-muted);">Fatura No: ${f.faturaNo} | ${kr ? kr.bankaAdi : ''}</small>
                                    </div>
                                    <strong style="color:#f43f5e; font-size:0.9rem;">${utils.formatPara(f.faturaTutari || f.tutar)}</strong>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }

        // TEMİNAT MEKTUBU BİTİŞLERİ
        if (gununMektuplari.length > 0) {
            bodyHtml += `
                <div>
                    <h4 style="font-size:0.9rem; color:#fbbf24; border-bottom:1px solid rgba(251,191,36,0.2); padding-bottom:6px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="shield-alert" style="width:16px; height:16px;"></i> Teminat Mektubu Vadeleri
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${gununMektuplari.map(m => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(251,191,36,0.04); border:1px solid rgba(251,191,36,0.1); padding:10px 14px; border-radius:8px; font-size:0.82rem;">
                                <div>
                                    <strong>Mektup No: ${m.mektupNo} - ${m.lehtar}</strong><br>
                                    <small style="color:var(--text-muted);">${m.bankaAdi || 'Banka'} | Türü: Süreli</small>
                                </div>
                                <strong style="color:#fbbf24; font-size:0.9rem;">${utils.formatPara(m.tutar)} ${m.doviz || '₺'}</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        openModal(`${utils.formatTarih(tarih)} - Detaylı Vade Durumu`, bodyHtml);
    }
};
