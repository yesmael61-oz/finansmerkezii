/* ==========================================================================
   📄 İSMAİL FİNANS MERKEZİ - TASARLANABILIR RAPOR MODÜLÜ (RAPORLAR.JS)
   ========================================================================== */

const RaporlarModule = {
    // Rapor Tasarım Ayarları (Kullanıcının Özelleştirebileceği)
    ayarlar: {
        raporTuru: "kredi-raporu",
        raporBasligi: "İSMAİL FİNANS MERKEZİ",
        raporAltBaslik: "",
        baslangicTarihi: "",
        bitisTarihi: "",
        bchFaizDonem: "2",
        bchFaizYil: new Date().getFullYear().toString(),
        // Kredi Raporu Sütun Seçimleri
        krediSutunlar: {
            banka: true,
            tur: true,
            tutar: true,
            faiz: true,
            vade: true,
            kalanGun: true,
            durum: true,
            taksitDetay: true
        },
        krediGruplama: "tur",   // tur | banka | hepsi
        cekSutunlar: {
            cekNo: true,
            kesideci: true,
            ciroEden: true,
            banka: true,
            vade: true,
            kalanGun: true,
            tutar: true,
            durum: true,
            riskNotu: true
        },
        cekGruplama: "durum",   // durum | banka | kesideci | hepsi
        cekDurumFiltre: "Tümü",
        // Teminat Mektubu Seçimleri
        tmSutunlar: {
            mektupNo: true,
            banka: true,
            tutar: true,
            tur: true,
            baslangic: true,
            bitis: true,
            lehtar: true,
            durum: true
        },
        tmGruplama: "banka", // banka | durum | hepsi
        tmDurumFiltre: "Aktif"
    },

    async render() {
        const container = document.getElementById("page-container");

        let html = `
            <!-- Rapor Seçim Sekmeleri -->
            <div class="tab-container">
                <button class="tab-btn ${this.ayarlar.raporTuru === 'kredi-raporu' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('kredi-raporu')">Kredi Durum Raporu</button>
                <button class="tab-btn ${this.ayarlar.raporTuru === 'bch-faiz-raporu' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('bch-faiz-raporu')">BCH Faiz Raporu</button>
                <button class="tab-btn ${this.ayarlar.raporTuru === 'cek-raporu' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('cek-raporu')">Çek Portföy Raporu</button>
                <button class="tab-btn ${this.ayarlar.raporTuru === 'teminat-mektubu-raporu' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('teminat-mektubu-raporu')">Teminat Mektubu Raporu</button>
                <button class="tab-btn ${this.ayarlar.raporTuru === 'donem-karsilastirma' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('donem-karsilastirma')">Dönem Karşılaştırma</button>
                <button class="tab-btn ${this.ayarlar.raporTuru === 'tedarikci-analizi' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('tedarikci-analizi')">Tedarikçi Analizi</button>
                <button class="tab-btn ${this.ayarlar.raporTuru === 'genel-ozet' ? 'active' : ''}" onclick="RaporlarModule.switchRapor('genel-ozet')">Genel Finansal Özet</button>
            </div>

            <!-- ⚙️ RAPOR TASARIM PANELİ -->
            <div class="card" style="border-left: 4px solid var(--accent-blue); margin-bottom:24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; cursor:pointer;" onclick="document.getElementById('rapor-tasarim-icerik').style.display = document.getElementById('rapor-tasarim-icerik').style.display === 'none' ? 'block' : 'none';">
                    <h3 class="card-title" style="margin-bottom:0;"><i data-lucide="sliders-horizontal"></i> Rapor Tasarım Ayarları</h3>
                    <span class="badge badge-info">Tıklayarak Aç / Kapat</span>
                </div>
                <div id="rapor-tasarim-icerik">
                    ${this.renderTasarimPaneli()}
                </div>
            </div>

            <!-- 📊 RAPOR ÇIKTISI -->
            <div id="rapor-cikti-alani">
                ${await this.renderAktifRapor()}
            </div>
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    switchRapor(raporAdi) {
        this.ayarlar.raporTuru = raporAdi;
        if (raporAdi === 'kredi-raporu') this.ayarlar.raporAltBaslik = "Banka Kredileri Durum Raporu";
        else if (raporAdi === 'bch-faiz-raporu') this.ayarlar.raporAltBaslik = "BCH Kredileri Dönem Sonu Faiz Raporu";
        else if (raporAdi === 'cek-raporu') this.ayarlar.raporAltBaslik = "Müşteri Çekleri Portföy Raporu";
        else if (raporAdi === 'teminat-mektubu-raporu') this.ayarlar.raporAltBaslik = "Banka Teminat Mektupları Raporu";
        else if (raporAdi === 'donem-karsilastirma') this.ayarlar.raporAltBaslik = "Karşılaştırmalı Dönem Raporu";
        else if (raporAdi === 'tedarikci-analizi') this.ayarlar.raporAltBaslik = "Tedarikçi / Firma Bazlı Maliyet Analizi";
        else this.ayarlar.raporAltBaslik = "Genel Finansal Durum Özet Raporu";
        this.render();
    },

    // =========================================================================
    // ⚙️ TASARIM PANELİ (Sütun Seçimi, Başlık, Tarih Filtresi, Gruplama)
    // =========================================================================
    renderTasarimPaneli() {
        const a = this.ayarlar;
        const raporTuru = a.raporTuru;

        let html = `
            <!-- Ortak Ayarlar: Başlık & Tarih -->
            <div class="grid-cols-3" style="margin-bottom:16px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Rapor Ana Başlığı</label>
                    <input type="text" class="form-control" value="${a.raporBasligi}" onchange="RaporlarModule.ayarlar.raporBasligi = this.value" placeholder="Firma Adı">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Başlangıç Tarihi (Opsiyonel)</label>
                    <input type="date" class="form-control" value="${a.baslangicTarihi}" onchange="RaporlarModule.ayarlar.baslangicTarihi = this.value">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Bitiş Tarihi (Opsiyonel)</label>
                    <input type="date" class="form-control" value="${a.bitisTarihi}" onchange="RaporlarModule.ayarlar.bitisTarihi = this.value">
                </div>
            </div>
        `;

        // Kredi raporuna özel sütun ve gruplama seçimleri
        if (raporTuru === "kredi-raporu") {
            const ks = a.krediSutunlar;
            html += `
                <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start;">
                    <div>
                        <label class="form-label" style="margin-bottom:8px;">Görüntülenecek Sütunlar</label>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${this._checkboxHtml('kr-banka', 'Banka Adı', ks.banka, 'krediSutunlar', 'banka')}
                            ${this._checkboxHtml('kr-tur', 'Kredi Türü', ks.tur, 'krediSutunlar', 'tur')}
                            ${this._checkboxHtml('kr-tutar', 'Tutar', ks.tutar, 'krediSutunlar', 'tutar')}
                            ${this._checkboxHtml('kr-faiz', 'Faiz Oranı', ks.faiz, 'krediSutunlar', 'faiz')}
                            ${this._checkboxHtml('kr-vade', 'Vade Tarihi', ks.vade, 'krediSutunlar', 'vade')}
                            ${this._checkboxHtml('kr-kalan', 'Kalan Gün', ks.kalanGun, 'krediSutunlar', 'kalanGun')}
                            ${this._checkboxHtml('kr-durum', 'Durum', ks.durum, 'krediSutunlar', 'durum')}
                            ${this._checkboxHtml('kr-taksit', 'Taksit Detayı', ks.taksitDetay, 'krediSutunlar', 'taksitDetay')}
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom:0; min-width:180px;">
                        <label class="form-label">Gruplama</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.krediGruplama = this.value">
                            <option value="tur" ${a.krediGruplama === 'tur' ? 'selected' : ''}>Kredi Türüne Göre</option>
                            <option value="banka" ${a.krediGruplama === 'banka' ? 'selected' : ''}>Bankaya Göre</option>
                            <option value="hepsi" ${a.krediGruplama === 'hepsi' ? 'selected' : ''}>Grupsuz (Tümü Birlikte)</option>
                        </select>
                    </div>
                </div>
            `;
        }

        // Çek raporuna özel sütun ve gruplama seçimleri
        if (raporTuru === "cek-raporu") {
            const cs = a.cekSutunlar;
            html += `
                <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start;">
                    <div>
                        <label class="form-label" style="margin-bottom:8px;">Görüntülenecek Sütunlar</label>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${this._checkboxHtml('ck-no', 'Çek No', cs.cekNo, 'cekSutunlar', 'cekNo')}
                            ${this._checkboxHtml('ck-kesideci', 'Keşideci', cs.kesideci, 'cekSutunlar', 'kesideci')}
                            ${this._checkboxHtml('ck-ciro', 'Bize Ciro Eden', cs.ciroEden, 'cekSutunlar', 'ciroEden')}
                            ${this._checkboxHtml('ck-banka', 'Banka/Şube', cs.banka, 'cekSutunlar', 'banka')}
                            ${this._checkboxHtml('ck-vade', 'Vade Tarihi', cs.vade, 'cekSutunlar', 'vade')}
                            ${this._checkboxHtml('ck-kalan', 'Kalan Gün', cs.kalanGun, 'cekSutunlar', 'kalanGun')}
                            ${this._checkboxHtml('ck-tutar', 'Tutar', cs.tutar, 'cekSutunlar', 'tutar')}
                            ${this._checkboxHtml('ck-durum', 'Durum', cs.durum, 'cekSutunlar', 'durum')}
                            ${this._checkboxHtml('ck-risk', 'Risk Notu', cs.riskNotu, 'cekSutunlar', 'riskNotu')}
                        </div>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <div class="form-group" style="margin-bottom:0; min-width:180px;">
                            <label class="form-label">Gruplama</label>
                            <select class="form-control" onchange="RaporlarModule.ayarlar.cekGruplama = this.value">
                                <option value="durum" ${a.cekGruplama === 'durum' ? 'selected' : ''}>Duruma Göre</option>
                                <option value="banka" ${a.cekGruplama === 'banka' ? 'selected' : ''}>Bankaya Göre</option>
                                <option value="kesideci" ${a.cekGruplama === 'kesideci' ? 'selected' : ''}>Keşideciye Göre</option>
                                <option value="hepsi" ${a.cekGruplama === 'hepsi' ? 'selected' : ''}>Grupsuz (Tümü)</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0; min-width:160px;">
                            <label class="form-label">Durum Filtresi</label>
                            <select class="form-control" onchange="RaporlarModule.ayarlar.cekDurumFiltre = this.value">
                                <option value="Tümü" ${a.cekDurumFiltre === 'Tümü' ? 'selected' : ''}>Tüm Durumlar</option>
                                <option value="Portföyde" ${a.cekDurumFiltre === 'Portföyde' ? 'selected' : ''}>Portföyde</option>
                                <option value="Tahsilde" ${a.cekDurumFiltre === 'Tahsilde' ? 'selected' : ''}>Tahsilde</option>
                                <option value="Teminatta" ${a.cekDurumFiltre === 'Teminatta' ? 'selected' : ''}>Teminatta</option>
                                <option value="Ciro Edildi" ${a.cekDurumFiltre === 'Ciro Edildi' ? 'selected' : ''}>Ciro Edildi</option>
                                <option value="Ödendi" ${a.cekDurumFiltre === 'Ödendi' ? 'selected' : ''}>Ödendi</option>
                                <option value="Karşılıksız" ${a.cekDurumFiltre === 'Karşılıksız' ? 'selected' : ''}>Karşılıksız</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }

        // Teminat Mektubu raporuna özel
        if (raporTuru === "teminat-mektubu-raporu") {
            const tm = a.tmSutunlar;
            html += `
                <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start;">
                    <div>
                        <label class="form-label" style="margin-bottom:8px;">Görüntülenecek Sütunlar</label>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${this._checkboxHtml('tm-no', 'Mektup No', tm.mektupNo, 'tmSutunlar', 'mektupNo')}
                            ${this._checkboxHtml('tm-banka', 'Banka', tm.banka, 'tmSutunlar', 'banka')}
                            ${this._checkboxHtml('tm-tutar', 'Tutar', tm.tutar, 'tmSutunlar', 'tutar')}
                            ${this._checkboxHtml('tm-tur', 'Tür (Süreli/Süresiz)', tm.tur, 'tmSutunlar', 'tur')}
                            ${this._checkboxHtml('tm-bas', 'Başlangıç', tm.baslangic, 'tmSutunlar', 'baslangic')}
                            ${this._checkboxHtml('tm-bit', 'Bitiş', tm.bitis, 'tmSutunlar', 'bitis')}
                            ${this._checkboxHtml('tm-lehtar', 'Lehtar', tm.lehtar, 'tmSutunlar', 'lehtar')}
                            ${this._checkboxHtml('tm-durum', 'Durum', tm.durum, 'tmSutunlar', 'durum')}
                        </div>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <div class="form-group" style="margin-bottom:0; min-width:180px;">
                            <label class="form-label">Gruplama</label>
                            <select class="form-control" onchange="RaporlarModule.ayarlar.tmGruplama = this.value">
                                <option value="banka" ${a.tmGruplama === 'banka' ? 'selected' : ''}>Bankaya Göre</option>
                                <option value="durum" ${a.tmGruplama === 'durum' ? 'selected' : ''}>Duruma Göre</option>
                                <option value="hepsi" ${a.tmGruplama === 'hepsi' ? 'selected' : ''}>Grupsuz (Tümü)</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0; min-width:160px;">
                            <label class="form-label">Durum Filtresi</label>
                            <select class="form-control" onchange="RaporlarModule.ayarlar.tmDurumFiltre = this.value">
                                <option value="Tümü" ${a.tmDurumFiltre === 'Tümü' ? 'selected' : ''}>Tüm Durumlar</option>
                                <option value="Aktif" ${a.tmDurumFiltre === 'Aktif' ? 'selected' : ''}>Sadece Aktif Olanlar</option>
                                <option value="İade Edildi" ${a.tmDurumFiltre === 'İade Edildi' ? 'selected' : ''}>İade Edilenler</option>
                                <option value="Tazmin Edildi" ${a.tmDurumFiltre === 'Tazmin Edildi' ? 'selected' : ''}>Tazmin Edilenler</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }

        if (raporTuru === "bch-faiz-raporu") {
            html += `
                <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;">
                    <div class="form-group" style="margin-bottom:0; min-width:180px;">
                        <label class="form-label">Yıl Seçimi</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.bchFaizYil = this.value; RaporlarModule.render();">
                            <option value="2025" ${a.bchFaizYil === '2025' ? 'selected' : ''}>2025 Yılı</option>
                            <option value="2026" ${a.bchFaizYil === '2026' ? 'selected' : ''}>2026 Yılı</option>
                            <option value="2027" ${a.bchFaizYil === '2027' ? 'selected' : ''}>2027 Yılı</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0; min-width:240px;">
                        <label class="form-label">Çeyrek Dönem Seçimi</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.bchFaizDonem = this.value; RaporlarModule.render();">
                            <option value="1" ${a.bchFaizDonem === '1' ? 'selected' : ''}>1. Çeyrek (1 Ocak - 31 Mart)</option>
                            <option value="2" ${a.bchFaizDonem === '2' ? 'selected' : ''}>2. Çeyrek (1 Nisan - 30 Haziran)</option>
                            <option value="3" ${a.bchFaizDonem === '3' ? 'selected' : ''}>3. Çeyrek (1 Temmuz - 30 Eylül)</option>
                            <option value="4" ${a.bchFaizDonem === '4' ? 'selected' : ''}>4. Çeyrek (1 Ekim - 31 Aralık)</option>
                            <option value="5" ${a.bchFaizDonem === '5' ? 'selected' : ''}>Tüm Yıl (1 Ocak - 31 Aralık)</option>
                        </select>
                    </div>
                </div>
            `;
        }

        html += `
            <div style="margin-top:20px; display:flex; gap:12px;">
                <button class="btn btn-primary" onclick="RaporlarModule.render()">
                    <i data-lucide="refresh-cw"></i> Raporu Güncelle
                </button>
                <button class="btn btn-info" onclick="RaporlarModule.yazdir()">
                    <i data-lucide="printer"></i> Raporu Yazdır / PDF Kaydet
                </button>
            </div>
        `;

        return html;
    },

    _checkboxHtml(id, label, checked, grupAdi, alanAdi) {
        return `
            <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px; cursor:pointer; font-size:0.8rem; color:${checked ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-weight:${checked ? '600' : '400'};">
                <input type="checkbox" ${checked ? 'checked' : ''} onchange="RaporlarModule.ayarlar.${grupAdi}.${alanAdi} = this.checked;" style="accent-color: var(--accent-emerald);">
                ${label}
            </label>
        `;
    },

    // =========================================================================
    // AKTIF RAPOR RENDER
    // =========================================================================
    async renderAktifRapor() {
        if (this.ayarlar.raporTuru === "kredi-raporu") return await this.renderKrediRaporu();
        if (this.ayarlar.raporTuru === "bch-faiz-raporu") return await this.renderBchFaizRaporu();
        if (this.ayarlar.raporTuru === "cek-raporu") return await this.renderCekRaporu();
        if (this.ayarlar.raporTuru === "teminat-mektubu-raporu") return await this.renderTeminatMektubuRaporu();
        if (this.ayarlar.raporTuru === "donem-karsilastirma") return await this.renderDonemKarsilastirma();
        if (this.ayarlar.raporTuru === "tedarikci-analizi") return await this.renderTedarikciAnalizi();
        return await this.renderGenelOzet();
    },

    // Tarih filtresi yardımcısı
    _tarihFiltreUygula(liste, tarihAlani) {
        let sonuc = [...liste];
        const bas = this.ayarlar.baslangicTarihi;
        const bit = this.ayarlar.bitisTarihi;
        if (bas) sonuc = sonuc.filter(x => x[tarihAlani] >= bas);
        if (bit) sonuc = sonuc.filter(x => x[tarihAlani] <= bit);
        return sonuc;
    },

    // =========================================================================
    // 📊 KREDİ DURUM RAPORU
    // =========================================================================
    async renderKrediRaporu() {
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();
        const ks = this.ayarlar.krediSutunlar;
        const gruplama = this.ayarlar.krediGruplama;

        // Tarih filtresi (varsa vade tarihine göre)
        let filtre = krediler;
        if (this.ayarlar.baslangicTarihi || this.ayarlar.bitisTarihi) {
            filtre = this._tarihFiltreUygula(filtre, 'vadeTarihi');
        }

        // Gruplama
        let gruplar = {};
        if (gruplama === "tur") {
            ["BCH", "DBS", "Spot", "Taksitli"].forEach(t => {
                const list = filtre.filter(k => k.krediTuru === t);
                if (list.length > 0) gruplar[t] = list;
            });
        } else if (gruplama === "banka") {
            filtre.forEach(k => {
                if (!gruplar[k.bankaAdi]) gruplar[k.bankaAdi] = [];
                gruplar[k.bankaAdi].push(k);
            });
        } else {
            gruplar["Tüm Krediler"] = filtre;
        }

        let toplamBorc = 0;

        let tabloHtml = "";
        for (const [grupAdi, liste] of Object.entries(gruplar)) {
            let grupToplam = liste.reduce((s, k) => s + (parseFloat(k.tutar) || 0), 0);
            // Taksitli için kalan borcu hesapla
            if (gruplama === "tur" && grupAdi === "Taksitli") {
                grupToplam = 0;
                liste.forEach(k => {
                    const ko = odemeler.filter(o => o.krediId === k.id && !o.odendiMi);
                    grupToplam += ko.reduce((s, o) => s + (parseFloat(o.tutar) || 0), 0);
                });
            }
            toplamBorc += grupToplam;

            tabloHtml += `
                <h4 style="font-size:0.95rem; margin:20px 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <span class="badge badge-info">${grupAdi}</span>
                    <span style="color:var(--text-secondary); font-size:0.8rem;">(${liste.length} Adet — Toplam: <strong>${utils.formatPara(grupToplam)}</strong>)</span>
                </h4>
                <div class="table-responsive" style="margin-bottom:16px;">
                    <table class="custom-table">
                        <thead><tr>
                            ${ks.banka ? '<th>Banka</th>' : ''}
                            ${ks.tur ? '<th>Tür</th>' : ''}
                            ${ks.tutar ? '<th>Tutar / Bakiye</th>' : ''}
                            ${ks.faiz ? '<th>Faiz %</th>' : ''}
                            ${ks.vade ? '<th>Vade Tarihi</th>' : ''}
                            ${ks.kalanGun ? '<th>Kalan Gün</th>' : ''}
                            ${ks.durum ? '<th>Durum</th>' : ''}
                        </tr></thead>
                        <tbody>
                            ${liste.map(k => {
                                 const kom = k.komisyonTutari || 0;
                                 const mas = k.krediMasrafi || 0;
                                 return `
                                     <tr>
                                         ${ks.banka ? `<td>
                                             <strong>${k.bankaAdi}</strong><br>
                                             <small style="color:var(--text-secondary); font-size:0.75rem;">
                                                 Komisyon: ${utils.formatPara(kom)} | Masraf: ${utils.formatPara(mas)}
                                             </small>
                                         </td>` : ''}
                                         ${ks.tur ? `<td><span class="badge badge-info">${k.krediTuru}</span></td>` : ''}
                                         ${ks.tutar ? `<td><strong class="text-danger">${utils.formatPara(k.tutar)}</strong></td>` : ''}
                                         ${ks.faiz ? `<td>%${k.faizOrani}</td>` : ''}
                                         ${ks.vade ? `<td>${k.vadeTarihi ? utils.formatTarih(k.vadeTarihi) : '-'}</td>` : ''}
                                         ${ks.kalanGun ? `<td>${k.vadeTarihi ? utils.formatKalanGun(k.vadeTarihi) : '-'}</td>` : ''}
                                         ${ks.durum ? `<td><span class="badge ${k.durum === 'Aktif' ? 'badge-success' : 'badge-danger'}">${k.durum}</span></td>` : ''}
                                     </tr>
                                     ${ks.taksitDetay && k.krediTuru === 'Taksitli' ? this._renderTaksitDetayRow(k, odemeler, ks) : ''}
                                 `;
                             }).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        return `
            <div class="card" id="rapor-yazdirma-alani">
                <div class="card-title-area">
                    <h3 class="card-title"><i data-lucide="file-text"></i> ${this.ayarlar.raporAltBaslik || 'Kredi Durum Raporu'}</h3>
                </div>
                ${tabloHtml}
                <div style="background: linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(245,158,11,0.1) 100%); border:1px solid rgba(244,63,94,0.2); border-radius:var(--radius-md); padding:20px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.8rem; text-transform:uppercase; color:var(--text-secondary); font-weight:600;">Toplam Borç & Kredi Riski</div>
                    </div>
                    <strong class="text-danger" style="font-size:1.6rem; font-family:var(--font-display);">${utils.formatPara(toplamBorc)}</strong>
                </div>
                ${filtre.length === 0 ? '<div class="empty-state"><i data-lucide="file-x"></i><h4>Kayıt Bulunamadı</h4><p>Seçtiğiniz filtrelere uygun kredi kaydı yok.</p></div>' : ''}
            </div>
        `;
    },

    _renderTaksitDetayRow(kredi, odemeler, ks) {
        const taksitler = odemeler.filter(o => o.krediId === kredi.id);
        if (taksitler.length === 0) return '';
        const colSpan = Object.values(ks).filter(v => v).length - (ks.taksitDetay ? 0 : 0);
        return `
            <tr>
                <td colspan="${colSpan}" style="padding:0;">
                    <div class="installment-list">
                        <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:600; margin-bottom:8px;">Taksit Planı (${taksitler.filter(t=>t.odendiMi).length}/${taksitler.length} Ödendi)</div>
                        ${taksitler.map(o => `
                            <div class="installment-item" style="${o.odendiMi ? 'opacity:0.5;' : ''}">
                                <span>Taksit ${o.taksitNo}/${taksitler.length} — ${utils.formatTarih(o.vadeTarihi)}</span>
                                <span>
                                    <strong class="${o.odendiMi ? 'text-success' : 'text-danger'}">${utils.formatPara(o.tutar)}</strong>
                                    <span class="badge ${o.odendiMi ? 'badge-success' : 'badge-danger'}" style="margin-left:6px; font-size:0.65rem;">${o.odendiMi ? '✓' : '✗'}</span>
                                </span>
                            </div>
                        `).join("")}
                    </div>
                </td>
            </tr>
        `;
    },

    // =========================================================================
    // 📊 BCH KREDİLERİ DÖNEM SONU FAİZ TAHAKKUK RAPORU
    // =========================================================================
    async renderBchFaizRaporu() {
        const krediler = await DBService.getKrediler();
        const bchKrediler = krediler.filter(k => k.krediTuru === "BCH");

        let dbsFaturalar = [];
        try { dbsFaturalar = await DBService.getDbsFaturalar(); } catch(e){}
        dbsFaturalar.forEach(f => {
            if (f.durum === "Banka Ödedi") {
                const anaKredi = krediler.find(k => k.id === f.krediId) || {};
                bchKrediler.push({
                    bankaAdi: (anaKredi.bankaAdi || 'Bilinmiyor') + " (DBS Fatura: " + f.faturaNo + ")",
                    faizOrani: f.uygulananFaizOrani || 0,
                    tutar: f.tutar,
                    baslangicTarihi: f.vadeTarihi,
                    komisyonTutari: 0,
                    krediMasrafi: 0,
                    hareketler: [{
                        tarih: f.vadeTarihi,
                        tip: "kullanim",
                        tutar: f.tutar,
                        bakiye: f.tutar,
                        aciklama: "DBS Faturası Banka Ödemesi"
                    }]
                });
            }
        });

        const donem = this.ayarlar.bchFaizDonem;
        const yil = this.ayarlar.bchFaizYil;

        let bas = "", bit = "";
        let donemMetni = "";
        if (donem === "1") { bas = `${yil}-01-01`; bit = `${yil}-03-31`; donemMetni = "1. Çeyrek (1 Ocak - 31 Mart)"; }
        else if (donem === "2") { bas = `${yil}-04-01`; bit = `${yil}-06-30`; donemMetni = "2. Çeyrek (1 Nisan - 30 Haziran)"; }
        else if (donem === "3") { bas = `${yil}-07-01`; bit = `${yil}-09-30`; donemMetni = "3. Çeyrek (1 Temmuz - 30 Eylül)"; }
        else if (donem === "4") { bas = `${yil}-10-01`; bit = `${yil}-12-31`; donemMetni = "4. Çeyrek (1 Ekim - 31 Aralık)"; }
        else if (donem === "5") { bas = `${yil}-01-01`; bit = `${yil}-12-31`; donemMetni = "Tüm Yıl (1 Ocak - 31 Aralık)"; }

        let faizSatirlari = "";
        let detayliKartlarHtml = "";
        let toplamNetFaiz = 0;
        let toplamBsmv = 0;
        let genelToplamFaiz = 0;

        bchKrediler.forEach(k => {
            const res = KredilerModule.calculateBchInterestForPeriod(k, bas, bit);
            toplamNetFaiz += res.netFaiz;
            toplamBsmv += res.bsmv;
            genelToplamFaiz += res.toplam;

            const gunler = res.detayi.reduce((sum, d) => sum + d.gun, 0);

            faizSatirlari += `
                <tr>
                    <td>
                        <strong>${k.bankaAdi}</strong><br>
                        <small style="color:var(--text-secondary); font-size:0.75rem;">
                            Komisyon: ${utils.formatPara(k.komisyonTutari || 0)} | Masraf: ${utils.formatPara(k.krediMasrafi || 0)}
                        </small>
                    </td>
                    <td>% ${k.faizOrani}</td>
                    <td><span class="badge badge-info">${gunler} gün</span></td>
                    <td><strong class="text-danger">${utils.formatPara(res.netFaiz)}</strong></td>
                    <td>${utils.formatPara(res.bsmv)}</td>
                    <td><strong class="text-danger" style="font-size:0.95rem;">${utils.formatPara(res.toplam)}</strong></td>
                </tr>
            `;

            detayliKartlarHtml += `
                <div style="margin-top:24px; padding:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); background:rgba(255,255,255,0.01);">
                    <h4 style="font-size:0.95rem; margin-bottom:12px; font-family:var(--font-display); color:var(--accent-blue); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                        <span style="display:flex; align-items:center; gap:8px;">
                            <span class="badge badge-info">🏦 ${k.bankaAdi}</span>
                            <span>Faiz Hesaplama Detayları</span>
                        </span>
                        <small style="color:var(--text-secondary); font-size:0.75rem;">
                            Komisyon: <strong>${utils.formatPara(k.komisyonTutari || 0)}</strong> | Masraf: <strong>${utils.formatPara(k.krediMasrafi || 0)}</strong>
                        </small>
                    </h4>
                    <div class="table-responsive">
                        <table class="custom-table" style="font-size:0.8rem;">
                            <thead>
                                <tr>
                                    <th>Günlük Valör Aralığı</th>
                                    <th>Kredi Borç Bakiyesi</th>
                                    <th>Gün</th>
                                    <th>Net Faiz Oranı (%)</th>
                                    <th style="text-align:right;">Net Faiz</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${res.detayi.map(d => `
                                    <tr>
                                        <td>${utils.formatTarih(d.baslangic)} — ${utils.formatTarih(d.bitis)}</td>
                                        <td><strong>${utils.formatPara(d.bakiye)}</strong></td>
                                        <td><span class="badge badge-info">${d.gun} gün</span></td>
                                        <td>% ${k.faizOrani}</td>
                                        <td style="text-align:right;"><strong class="text-danger">${utils.formatPara(d.faiz)}</strong></td>
                                    </tr>
                                `).join("")}
                                ${res.detayi.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">Bu dönemde bakiye hareketi veya borç bulunmamaktadır.</td></tr>` : ''}
                                <tr style="background:rgba(255,255,255,0.02); font-weight:700;">
                                    <td colspan="2">TOPLAM</td>
                                    <td><span class="badge badge-success">${gunler} gün</span></td>
                                    <td>—</td>
                                    <td style="text-align:right;"><strong class="text-danger">${utils.formatPara(res.netFaiz)}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:20px; font-size:0.8rem; color:var(--text-secondary); border-top:1px dashed var(--border-color); padding-top:10px;">
                        <span>Net Faiz: <strong>${utils.formatPara(res.netFaiz)}</strong></span>
                        <span>BSMV (%5): <strong>${utils.formatPara(res.bsmv)}</strong></span>
                        <span class="text-danger" style="font-weight:700;">Toplam Faiz Tahakkuk Borcu: <strong>${utils.formatPara(res.toplam)}</strong></span>
                    </div>
                </div>
            `;
        });

        return `
            <div class="card" id="rapor-yazdirma-alani">
                <div class="card-title-area">
                    <h3 class="card-title"><i data-lucide="file-text"></i> ${this.ayarlar.raporAltBaslik || 'BCH Dönem Sonu Faiz Raporu'}</h3>
                    <span class="badge badge-info" style="font-size:0.75rem;">${donemMetni}</span>
                </div>
                
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
                    <strong>Hesaplama Parametreleri:</strong> Faiz Gün Sayısı = 360 Gün Esaslı • BSMV = %5 Ticari Kredi Gider Vergisi • Valör Günleri Dahildir.
                </div>

                <div class="table-responsive">
                    <table class="custom-table" style="font-size:0.85rem;">
                        <thead>
                            <tr>
                                <th>Banka Adı</th>
                                <th>Yıllık Faiz Oranı (%)</th>
                                <th>Toplam Gün</th>
                                <th>Net Faiz</th>
                                <th>BSMV (%5)</th>
                                <th>Toplam Tahakkuk Borcu</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${faizSatirlari}
                            <tr style="background:rgba(255,255,255,0.02); font-weight:700; font-size:0.9rem;">
                                <td colspan="3">GENEL FAİZ TOPLAMI</td>
                                <td><strong class="text-danger">${utils.formatPara(toplamNetFaiz)}</strong></td>
                                <td>${utils.formatPara(toplamBsmv)}</td>
                                <td><strong class="text-danger" style="font-size:1.05rem;">${utils.formatPara(genelToplamFaiz)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-top:30px; border-top:2px solid var(--border-color); padding-top:20px;">
                    <h3 style="font-size:1.05rem; font-family:var(--font-display); margin-bottom:8px;"><i data-lucide="file-check-2"></i> Banka Denetim ve Valör Hesaplama Detayları (Banka-Banka Ayrı Ayrı)</h3>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:16px;">Her banka için günlük valör ve bakiye değişim detaylarını aşağıdan denetleyebilirsiniz:</p>
                    ${detayliKartlarHtml}
                </div>

                ${bchKrediler.length === 0 ? '<div class="empty-state"><i data-lucide="file-x"></i><h4>Kayıt Bulunamadı</h4><p>Sistemde kayıtlı BCH kredi hesabı bulunmamaktadır.</p></div>' : ''}
            </div>
        `;
    },

    // =========================================================================
    // 📄 ÇEK PORTFÖY RAPORU
    // =========================================================================
    async renderCekRaporu() {
        let cekler = await DBService.getCekler();
        const cs = this.ayarlar.cekSutunlar;
        const gruplama = this.ayarlar.cekGruplama;

        // Tarih filtresi
        if (this.ayarlar.baslangicTarihi || this.ayarlar.bitisTarihi) {
            cekler = this._tarihFiltreUygula(cekler, 'vadeTarihi');
        }
        // Durum filtresi
        if (this.ayarlar.cekDurumFiltre !== "Tümü") {
            cekler = cekler.filter(c => c.durum === this.ayarlar.cekDurumFiltre);
        }

        // Gruplama
        let gruplar = {};
        if (gruplama === "durum") {
            ["Portföyde","Tahsilde","Teminatta","Ciro Edildi","Ödendi","Karşılıksız"].forEach(d => {
                const list = cekler.filter(c => c.durum === d);
                if (list.length > 0) gruplar[d] = list;
            });
        } else if (gruplama === "banka") {
            cekler.forEach(c => {
                if (!gruplar[c.bankaAdi]) gruplar[c.bankaAdi] = [];
                gruplar[c.bankaAdi].push(c);
            });
        } else if (gruplama === "kesideci") {
            cekler.forEach(c => {
                if (!gruplar[c.kesideci]) gruplar[c.kesideci] = [];
                gruplar[c.kesideci].push(c);
            });
        } else {
            gruplar["Tüm Çekler"] = cekler;
        }

        let genelToplam = cekler.reduce((s, c) => s + (parseFloat(c.tutar) || 0), 0);

        let tabloHtml = "";
        for (const [grupAdi, liste] of Object.entries(gruplar)) {
            const grupToplam = liste.reduce((s, c) => s + (parseFloat(c.tutar) || 0), 0);
            let badgeClass = "badge-info";
            if (grupAdi === "Portföyde" || grupAdi === "Ödendi") badgeClass = "badge-success";
            else if (grupAdi === "Ciro Edildi") badgeClass = "badge-warning";
            else if (grupAdi === "Karşılıksız") badgeClass = "badge-danger";

            tabloHtml += `
                <h4 style="font-size:0.95rem; margin:20px 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <span class="badge ${badgeClass}">${grupAdi}</span>
                    <span style="color:var(--text-secondary); font-size:0.8rem;">(${liste.length} Adet — <strong>${utils.formatPara(grupToplam)}</strong>)</span>
                </h4>
                <div class="table-responsive" style="margin-bottom:16px;">
                    <table class="custom-table">
                        <thead><tr>
                            ${cs.cekNo ? '<th>Çek No</th>' : ''}
                            ${cs.kesideci ? '<th>Keşideci</th>' : ''}
                            ${cs.ciroEden ? '<th>Bize Ciro Eden</th>' : ''}
                            ${cs.banka ? '<th>Banka / Şube</th>' : ''}
                            ${cs.vade ? '<th>Vade Tarihi</th>' : ''}
                            ${cs.kalanGun ? '<th>Kalan Gün</th>' : ''}
                            ${cs.tutar ? '<th>Tutar</th>' : ''}
                            ${cs.durum ? '<th>Durum</th>' : ''}
                            ${cs.riskNotu ? '<th>Risk Notu</th>' : ''}
                        </tr></thead>
                        <tbody>
                            ${liste.map(c => {
                                const riskBadge = this._riskBadge(c.riskNotu);
                                return `
                                    <tr>
                                        ${cs.cekNo ? `<td><strong>${c.cekNo}</strong></td>` : ''}
                                        ${cs.kesideci ? `<td>${c.kesideci}</td>` : ''}
                                        ${cs.ciroEden ? `<td>${c.ciroEden || '<span style="color:var(--text-muted);font-style:italic;">Kendisi</span>'}</td>` : ''}
                                        ${cs.banka ? `<td>${c.bankaAdi} / ${c.sube}</td>` : ''}
                                        ${cs.vade ? `<td>${utils.formatTarih(c.vadeTarihi)}</td>` : ''}
                                        ${cs.kalanGun ? `<td>${utils.formatKalanGun(c.vadeTarihi)}</td>` : ''}
                                        ${cs.tutar ? `<td><strong>${utils.formatPara(c.tutar)}</strong></td>` : ''}
                                        ${cs.durum ? `<td>
                                             <span class="badge ${c.durum === 'Karşılıksız' ? 'badge-danger' : c.durum === 'Ödendi' ? 'badge-success' : 'badge-info'}">${c.durum}</span>
                                             ${c.durum === 'Ciro Edildi' && c.ciroEdilenYer ? `<br><small style="color:var(--accent-gold); font-size:0.7rem;">Ciro: ${c.ciroEdilenYer}</small>` : ''}
                                             ${(c.durum === 'Tahsilde' || c.durum === 'Teminatta') && c.verilenBanka ? `<br><small style="color:var(--accent-blue); font-size:0.7rem;">Banka: ${c.verilenBanka}</small>` : ''}
                                         </td>` : ''}
                                        ${cs.riskNotu ? `<td>${riskBadge}</td>` : ''}
                                    </tr>
                                `;
                            }).join("")}
                            <tr style="background:rgba(255,255,255,0.02); font-weight:700;">
                                <td colspan="99">TOPLAM — ${grupAdi}</td>
                            </tr>
                            <tr style="background:rgba(255,255,255,0.02); font-weight:700;">
                                ${cs.tutar ? `<td colspan="99" style="text-align:right;"><strong>${utils.formatPara(grupToplam)}</strong></td>` : '<td colspan="99"></td>'}
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        return `
            <div class="card" id="rapor-yazdirma-alani">
                <div class="card-title-area">
                    <h3 class="card-title"><i data-lucide="file-text"></i> ${this.ayarlar.raporAltBaslik || 'Çek Portföy Raporu'}</h3>
                </div>
                ${tabloHtml}
                <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-md); padding:20px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.8rem; text-transform:uppercase; color:var(--text-secondary); font-weight:600;">Genel Çek Portföy Toplamı</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${cekler.length} adet çek</div>
                    </div>
                    <strong class="text-success" style="font-size:1.6rem; font-family:var(--font-display);">${utils.formatPara(genelToplam)}</strong>
                </div>
                ${cekler.length === 0 ? '<div class="empty-state"><i data-lucide="file-x"></i><h4>Kayıt Bulunamadı</h4><p>Seçtiğiniz filtrelere uygun çek kaydı yok.</p></div>' : ''}
            </div>
        `;
    },

    _riskBadge(riskNotu) {
        if (!riskNotu) return '<span style="color:var(--text-muted); font-style:italic; font-size:0.75rem;">Sorgulanmadı</span>';
        const n = parseInt(riskNotu);
        if (n >= 1500) return `<span class="badge badge-success" style="font-size:0.75rem;">${riskNotu} ★ Düşük Risk</span>`;
        if (n >= 1000) return `<span class="badge badge-warning" style="font-size:0.75rem;">${riskNotu} ⚠ Orta Risk</span>`;
        return `<span class="badge badge-danger" style="font-size:0.75rem;">${riskNotu} ✖ Yüksek Risk</span>`;
    },

    // =========================================================================
    // 📜 TEMİNAT MEKTUBU RAPORU
    // =========================================================================
    async renderTeminatMektubuRaporu() {
        let mektuplar = await DBService.getTeminatMektuplari();
        const tm = this.ayarlar.tmSutunlar;
        const gruplama = this.ayarlar.tmGruplama;

        // Tarih filtresi (Başlangıç tarihine göre)
        if (this.ayarlar.baslangicTarihi || this.ayarlar.bitisTarihi) {
            mektuplar = this._tarihFiltreUygula(mektuplar, 'baslangicTarihi');
        }
        
        // Durum filtresi
        if (this.ayarlar.tmDurumFiltre !== "Tümü") {
            mektuplar = mektuplar.filter(m => m.durum === this.ayarlar.tmDurumFiltre);
        }

        // Gruplama
        let gruplar = {};
        if (gruplama === "banka") {
            mektuplar.forEach(m => {
                if (!gruplar[m.bankaAdi]) gruplar[m.bankaAdi] = [];
                gruplar[m.bankaAdi].push(m);
            });
        } else if (gruplama === "durum") {
            ["Aktif", "İade Edildi", "Tazmin Edildi"].forEach(d => {
                const list = mektuplar.filter(m => m.durum === d);
                if (list.length > 0) gruplar[d] = list;
            });
        } else {
            gruplar["Tüm Teminat Mektupları"] = mektuplar;
        }

        let genelToplam = mektuplar.reduce((s, m) => s + (parseFloat(m.tutar) || 0), 0);

        let tabloHtml = "";
        for (const [grupAdi, liste] of Object.entries(gruplar)) {
            const grupToplam = liste.reduce((s, m) => s + (parseFloat(m.tutar) || 0), 0);

            tabloHtml += `
                <h4 style="font-size:0.95rem; margin:20px 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <span class="badge badge-info">${grupAdi}</span>
                    <span style="color:var(--text-secondary); font-size:0.8rem;">(${liste.length} Adet — <strong>${utils.formatPara(grupToplam)}</strong>)</span>
                </h4>
                <div class="table-responsive" style="margin-bottom:16px;">
                    <table class="custom-table">
                        <thead><tr>
                            ${tm.mektupNo ? '<th>Mektup No</th>' : ''}
                            ${tm.banka ? '<th>Banka</th>' : ''}
                            ${tm.tur ? '<th>Tür</th>' : ''}
                            ${tm.tutar ? '<th>Tutar</th>' : ''}
                            ${tm.baslangic ? '<th>Başlangıç Tarihi</th>' : ''}
                            ${tm.bitis ? '<th>Bitiş/Vade Tarihi</th>' : ''}
                            ${tm.lehtar ? '<th>Lehtar</th>' : ''}
                            ${tm.durum ? '<th>Durum</th>' : ''}
                        </tr></thead>
                        <tbody>
                            ${liste.map(m => `
                                <tr>
                                    ${tm.mektupNo ? `<td><strong>${m.mektupNo}</strong></td>` : ''}
                                    ${tm.banka ? `<td>${m.bankaAdi}</td>` : ''}
                                    ${tm.tur ? `<td><span class="badge ${m.tur === 'Süresiz' ? 'badge-info' : 'badge-warning'}">${m.tur}</span></td>` : ''}
                                    ${tm.tutar ? `<td><strong class="text-warning">${utils.formatPara(m.tutar)}</strong></td>` : ''}
                                    ${tm.baslangic ? `<td>${utils.formatTarih(m.baslangicTarihi)}</td>` : ''}
                                    ${tm.bitis ? `<td>${m.tur === 'Süreli' && m.bitisTarihi ? utils.formatTarih(m.bitisTarihi) : '-'}</td>` : ''}
                                    ${tm.lehtar ? `<td>${m.lehtar}</td>` : ''}
                                    ${tm.durum ? `<td><span class="badge ${m.durum === 'Aktif' ? 'badge-success' : (m.durum === 'İade Edildi' ? 'badge-info' : 'badge-danger')}">${m.durum}</span></td>` : ''}
                                </tr>
                            `).join("")}
                            <tr style="background:rgba(255,255,255,0.02); font-weight:700;">
                                <td colspan="99">TOPLAM — ${grupAdi} : <strong style="float:right;">${utils.formatPara(grupToplam)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        return `
            <div class="card" id="rapor-yazdirma-alani">
                <div class="card-title-area">
                    <h3 class="card-title"><i data-lucide="file-signature"></i> ${this.ayarlar.raporAltBaslik || 'Banka Teminat Mektupları Raporu'}</h3>
                </div>
                ${tabloHtml}
                <div style="background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(16,185,129,0.1) 100%); border:1px solid rgba(245,158,11,0.2); border-radius:var(--radius-md); padding:20px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.8rem; text-transform:uppercase; color:var(--text-secondary); font-weight:600;">Listelenen Mektup Toplamı</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${mektuplar.length} adet mektup</div>
                    </div>
                    <strong class="text-warning" style="font-size:1.6rem; font-family:var(--font-display);">${utils.formatPara(genelToplam)}</strong>
                </div>
                ${mektuplar.length === 0 ? '<div class="empty-state"><i data-lucide="file-x"></i><h4>Kayıt Bulunamadı</h4><p>Seçtiğiniz filtrelere uygun teminat mektubu kaydı yok.</p></div>' : ''}
            </div>
        `;
    },

    // =========================================================================
    // 📊 GENEL FİNANSAL ÖZET (Kısa değişiklik)
    // =========================================================================
    async renderGenelOzet() {
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();
        const cekler = await DBService.getCekler();
        const mektuplar = await DBService.getTeminatMektuplari();

        let bchT = 0, dbsT = 0, spotT = 0, taksitK = 0, taksitO = 0;
        krediler.forEach(k => {
            if (k.krediTuru === "BCH") bchT += parseFloat(k.tutar) || 0;
            else if (k.krediTuru === "DBS") dbsT += parseFloat(k.tutar) || 0;
            else if (k.krediTuru === "Spot") spotT += parseFloat(k.tutar) || 0;
        });
        odemeler.forEach(o => { if (o.odendiMi) taksitO += parseFloat(o.tutar) || 0; else taksitK += parseFloat(o.tutar) || 0; });
        const topBorc = bchT + dbsT + spotT + taksitK;

        let portfoy = 0, tahsilde = 0, teminatta = 0;
        cekler.forEach(c => {
            const t = parseFloat(c.tutar) || 0;
            if (c.durum === "Portföyde") portfoy += t;
            else if (c.durum === "Tahsilde") tahsilde += t;
            else if (c.durum === "Teminatta") teminatta += t;
        });
        const aktifCek = portfoy + tahsilde + teminatta;
        const net = aktifCek - topBorc;

        const tarih = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());

        let aktifMektuplar = 0;
        mektuplar.forEach(m => {
            if (m.durum === 'Aktif') aktifMektuplar += parseFloat(m.tutar) || 0;
        });

        return `
            <div class="card" id="rapor-yazdirma-alani">
                <div class="card-title-area">
                    <h3 class="card-title"><i data-lucide="bar-chart-3"></i> Genel Finansal Durum Özet Raporu</h3>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                    <strong>Rapor Tarihi:</strong> ${tarih}
                </div>
                <div class="table-responsive" style="margin-bottom:24px;">
                    <table class="custom-table">
                        <thead><tr><th>Kalem</th><th style="text-align:right;">Tutar</th><th>Detay</th></tr></thead>
                        <tbody>
                            <tr><td>BCH Krediler</td><td style="text-align:right;"><strong class="text-warning">${utils.formatPara(bchT)}</strong></td><td>${krediler.filter(k=>k.krediTuru==="BCH").length} adet</td></tr>
                            <tr><td>DBS Krediler</td><td style="text-align:right;"><strong class="text-warning">${utils.formatPara(dbsT)}</strong></td><td>${krediler.filter(k=>k.krediTuru==="DBS").length} adet</td></tr>
                            <tr><td>Spot Krediler</td><td style="text-align:right;"><strong class="text-info">${utils.formatPara(spotT)}</strong></td><td>${krediler.filter(k=>k.krediTuru==="Spot").length} adet</td></tr>
                            <tr><td>Taksitli — Kalan Borç</td><td style="text-align:right;"><strong class="text-danger">${utils.formatPara(taksitK)}</strong></td><td>${odemeler.filter(o=>!o.odendiMi).length} taksit</td></tr>
                            <tr><td>Taksitli — Ödenen</td><td style="text-align:right;"><strong class="text-success">${utils.formatPara(taksitO)}</strong></td><td>${odemeler.filter(o=>o.odendiMi).length} taksit</td></tr>
                            <tr style="background:rgba(244,63,94,0.08); font-weight:700;"><td>TOPLAM BORÇ RİSKİ</td><td style="text-align:right;"><strong class="text-danger" style="font-size:1.1rem;">${utils.formatPara(topBorc)}</strong></td><td></td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="table-responsive" style="margin-bottom:24px;">
                    <table class="custom-table">
                        <thead><tr><th>Çek Durumu</th><th style="text-align:center;">Adet</th><th style="text-align:right;">Tutar</th></tr></thead>
                        <tbody>
                            <tr><td>Portföyde</td><td style="text-align:center;">${cekler.filter(c=>c.durum==="Portföyde").length}</td><td style="text-align:right;"><strong class="text-success">${utils.formatPara(portfoy)}</strong></td></tr>
                            <tr><td>Tahsilde + Teminatta</td><td style="text-align:center;">${cekler.filter(c=>c.durum==="Tahsilde"||c.durum==="Teminatta").length}</td><td style="text-align:right;"><strong class="text-info">${utils.formatPara(tahsilde+teminatta)}</strong></td></tr>
                            <tr style="background:rgba(16,185,129,0.08); font-weight:700;"><td>AKTİF ÇEK TOPLAMI</td><td style="text-align:center;">${cekler.filter(c=>["Portföyde","Tahsilde","Teminatta"].includes(c.durum)).length}</td><td style="text-align:right;"><strong class="text-success" style="font-size:1.1rem;">${utils.formatPara(aktifCek)}</strong></td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="table-responsive" style="margin-bottom:24px;">
                    <table class="custom-table">
                        <thead><tr><th>Teminat Mektupları</th><th style="text-align:center;">Adet</th><th style="text-align:right;">Tutar</th></tr></thead>
                        <tbody>
                            <tr><td>Aktif Teminat Mektupları</td><td style="text-align:center;">${mektuplar.filter(m=>m.durum==="Aktif").length}</td><td style="text-align:right;"><strong class="text-warning">${utils.formatPara(aktifMektuplar)}</strong></td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.08) 100%); border:1px solid rgba(59,130,246,0.2); border-radius:var(--radius-md); padding:24px; display:flex; justify-content:space-around; align-items:center; text-align:center;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Aktif Çek</div>
                        <strong class="text-success" style="font-size:1.4rem; font-family:var(--font-display);">${utils.formatPara(aktifCek)}</strong>
                    </div>
                    <div style="font-size:1.5rem; color:var(--text-muted);">−</div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Toplam Borç</div>
                        <strong class="text-danger" style="font-size:1.4rem; font-family:var(--font-display);">${utils.formatPara(topBorc)}</strong>
                    </div>
                    <div style="font-size:1.5rem; color:var(--text-muted);">=</div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Net Pozisyon</div>
                        <strong class="${net >= 0 ? 'text-success' : 'text-danger'}" style="font-size:1.6rem; font-family:var(--font-display);">${utils.formatPara(net)}</strong>
                        <div style="font-size:0.7rem; font-weight:600; color:${net >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                            ${net >= 0 ? '✅ Pozitif Denge' : '⚠️ Negatif Denge'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async renderDonemKarsilastirma() {
        const a = this.ayarlar;
        
        // Varsayılan dönem ayarlarını ayarla if not set
        if (!a.donemAYil) a.donemAYil = new Date().getFullYear().toString();
        if (!a.donemACeyrek) a.donemACeyrek = "1";
        if (!a.donemBYil) a.donemBYil = new Date().getFullYear().toString();
        if (!a.donemBCeyrek) a.donemBCeyrek = "2";

        const ceyrekAylar = {
            "1": { basAy: 0, bitAy: 2, isim: "Q1 (Ocak-Mart)" },
            "2": { basAy: 3, bitAy: 5, isim: "Q2 (Nisan-Haziran)" },
            "3": { basAy: 6, bitAy: 8, isim: "Q3 (Temmuz-Eylül)" },
            "4": { basAy: 9, bitAy: 11, isim: "Q4 (Ekim-Aralık)" }
        };

        const getPeriodData = async (yil, ceyrek) => {
            const basTarih = new Date(parseInt(yil), ceyrekAylar[ceyrek].basAy, 1);
            const bitTarih = new Date(parseInt(yil), ceyrekAylar[ceyrek].bitAy + 1, 0, 23, 59, 59);

            const cekler = await DBService.getCekler();
            const krediler = await DBService.getKrediler();
            const odemeler = await DBService.getKrediOdemeleri();
            
            let dbsFaturalar = [];
            let teminatMektuplari = [];
            try { dbsFaturalar = await DBService.getDbsFaturalar(); } catch(e) {}
            try { teminatMektuplari = await DBService.getTeminatMektuplari(); } catch(e) {}

            // Çek Gelirleri
            const pCekler = cekler.filter(c => {
                const vt = new Date(c.vadeTarihi);
                return vt >= basTarih && vt <= bitTarih;
            });
            const toplamCek = pCekler.reduce((sum, c) => sum + (parseFloat(c.tutar) || 0), 0);

            // Kredi Ödemeleri
            const pTaksitler = odemeler.filter(o => {
                const vt = new Date(o.vadeTarihi);
                return vt >= basTarih && vt <= bitTarih;
            });
            const toplamTaksit = pTaksitler.reduce((sum, o) => sum + (parseFloat(o.tutar) || 0), 0);

            const pSpot = krediler.filter(k => {
                if (k.krediTuru !== "Spot") return false;
                const vt = new Date(k.vadeTarihi);
                return vt >= basTarih && vt <= bitTarih;
            });
            const toplamSpot = pSpot.reduce((sum, k) => sum + (parseFloat(k.tutar) || 0), 0);

            // DBS Giderleri
            const pDbs = dbsFaturalar.filter(f => {
                const vt = new Date(f.vadeTarihi);
                return vt >= basTarih && vt <= bitTarih;
            });
            const toplamDbs = pDbs.reduce((sum, f) => sum + (parseFloat(f.faturaTutari || f.tutar) || 0), 0);

            // Teminat mektupları
            const pTeminat = teminatMektuplari.filter(m => {
                const bt = new Date(m.bitisTarihi || m.baslangicTarihi);
                return bt >= basTarih && bt <= bitTarih;
            });
            const toplamTeminat = pTeminat.reduce((sum, m) => sum + (parseFloat(m.tutar) || 0), 0);

            return {
                toplamCek,
                toplamGider: toplamTaksit + toplamSpot + toplamDbs,
                toplamDbs,
                toplamTeminat
            };
        };

        const dataA = await getPeriodData(a.donemAYil, a.donemACeyrek);
        const dataB = await getPeriodData(a.donemBYil, a.donemBCeyrek);

        const formatDegisim = (valA, valB, isGider = false) => {
            if (valA === 0) return valB === 0 ? "0%" : "▲ 100%";
            const diffPct = ((valB - valA) / valA) * 100;
            const diffVal = valB - valA;
            const sign = diffPct > 0 ? "▲" : "▼";
            let color = "var(--accent-emerald)";
            if (diffPct > 0) {
                color = isGider ? "var(--accent-rose)" : "var(--accent-emerald)";
            } else {
                color = isGider ? "var(--accent-emerald)" : "var(--accent-rose)";
            }
            return `<span style="color:${color}; font-weight:700;">${sign} ${Math.abs(diffPct).toFixed(1)}% (${utils.formatPara(diffVal)})</span>`;
        };

        let html = `
            <div class="card" style="margin-bottom:20px; border:1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h4 style="margin:0; font-size:1rem;"><i data-lucide="calendar-days"></i> Karşılaştırılacak Dönemleri Seçin</h4>
                </div>
                <div class="grid-cols-4">
                    <div class="form-group">
                        <label class="form-label">Dönem A - Yıl</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.donemAYil = this.value; RaporlarModule.render();">
                            <option value="2025" ${a.donemAYil === '2025' ? 'selected' : ''}>2025</option>
                            <option value="2026" ${a.donemAYil === '2026' ? 'selected' : ''}>2026</option>
                            <option value="2027" ${a.donemAYil === '2027' ? 'selected' : ''}>2027</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dönem A - Çeyrek</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.donemACeyrek = this.value; RaporlarModule.render();">
                            <option value="1" ${a.donemACeyrek === '1' ? 'selected' : ''}>Q1 (Oca - Mar)</option>
                            <option value="2" ${a.donemACeyrek === '2' ? 'selected' : ''}>Q2 (Nis - Haz)</option>
                            <option value="3" ${a.donemACeyrek === '3' ? 'selected' : ''}>Q3 (Tem - Eyl)</option>
                            <option value="4" ${a.donemACeyrek === '4' ? 'selected' : ''}>Q4 (Eki - Ara)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dönem B - Yıl</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.donemBYil = this.value; RaporlarModule.render();">
                            <option value="2025" ${a.donemBYil === '2025' ? 'selected' : ''}>2025</option>
                            <option value="2026" ${a.donemBYil === '2026' ? 'selected' : ''}>2026</option>
                            <option value="2027" ${a.donemBYil === '2027' ? 'selected' : ''}>2027</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dönem B - Çeyrek</label>
                        <select class="form-control" onchange="RaporlarModule.ayarlar.donemBCeyrek = this.value; RaporlarModule.render();">
                            <option value="1" ${a.donemBCeyrek === '1' ? 'selected' : ''}>Q1 (Oca - Mar)</option>
                            <option value="2" ${a.donemBCeyrek === '2' ? 'selected' : ''}>Q2 (Nis - Haz)</option>
                            <option value="3" ${a.donemBCeyrek === '3' ? 'selected' : ''}>Q3 (Tem - Eyl)</option>
                            <option value="4" ${a.donemBCeyrek === '4' ? 'selected' : ''}>Q4 (Eki - Ara)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Rapor Şablon Alanı -->
            <div class="card" id="rapor-pdf-container" style="background:var(--bg-secondary); border:1px solid var(--border-color); padding: 30px;">
                <div style="text-align:center; border-bottom:2px solid var(--border-color); padding-bottom:20px; margin-bottom:30px;">
                    <h2 style="font-family:var(--font-display); color:var(--text-primary); font-size:1.6rem; margin-bottom:6px;">${a.raporBasligi}</h2>
                    <h3 style="color:var(--text-muted); font-size:1rem; font-weight:500;">DÖNEM KARŞILAŞTIRMA VE HAREKET RAPORU</h3>
                    <small style="color:var(--text-muted);">Dönem A: ${a.donemAYil} ${ceyrekAylar[a.donemACeyrek].isim} | Dönem B: ${a.donemBYil} ${ceyrekAylar[a.donemBCeyrek].isim}</small>
                </div>

                <div class="table-responsive">
                    <table class="custom-table" style="font-size:0.9rem;">
                        <thead>
                            <tr>
                                <th>Finansal Metrik</th>
                                <th>Dönem A (${a.donemAYil} ${ceyrekAylar[a.donemACeyrek].isim.split(' ')[0]})</th>
                                <th>Dönem B (${a.donemBYil} ${ceyrekAylar[a.donemBCeyrek].isim.split(' ')[0]})</th>
                                <th style="text-align:right;">Değişim Analizi (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Çek Portföy Gelirleri (Hacim)</strong></td>
                                <td><strong class="text-success">${utils.formatPara(dataA.toplamCek)}</strong></td>
                                <td><strong class="text-success">${utils.formatPara(dataB.toplamCek)}</strong></td>
                                <td style="text-align:right;">${formatDegisim(dataA.toplamCek, dataB.toplamCek, false)}</td>
                            </tr>
                            <tr>
                                <td><strong>Kredi Ödemeleri Gideri</strong></td>
                                <td><strong class="text-danger">${utils.formatPara(dataA.toplamGider)}</strong></td>
                                <td><strong class="text-danger">${utils.formatPara(dataB.toplamGider)}</strong></td>
                                <td style="text-align:right;">${formatDegisim(dataA.toplamGider, dataB.toplamGider, true)}</td>
                            </tr>
                            <tr>
                                <td><strong>DBS Ödemeleri Detayı</strong></td>
                                <td><strong>${utils.formatPara(dataA.toplamDbs)}</strong></td>
                                <td><strong>${utils.formatPara(dataB.toplamDbs)}</strong></td>
                                <td style="text-align:right;">${formatDegisim(dataA.toplamDbs, dataB.toplamDbs, true)}</td>
                            </tr>
                            <tr>
                                <td><strong>Teminat Mektupları Risk Yükü</strong></td>
                                <td><strong class="text-warning">${utils.formatPara(dataA.toplamTeminat)}</strong></td>
                                <td><strong class="text-warning">${utils.formatPara(dataB.toplamTeminat)}</strong></td>
                                <td style="text-align:right;">${formatDegisim(dataA.toplamTeminat, dataB.toplamTeminat, true)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-top:30px; border-top:1px dashed var(--border-color); padding-top:20px; font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                    <span>Raporlama Tarihi: ${new Date().toLocaleDateString('tr-TR')}</span>
                    <span>İs-Yil Finans ve Muhasebe Sistemi</span>
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
                <button class="btn btn-secondary" onclick="window.print()"><i data-lucide="printer"></i> Yazdır</button>
                <button class="btn btn-primary" onclick="RaporlarModule.pdfIndir()"><i data-lucide="file-down"></i> PDF Olarak İndir</button>
            </div>
        `;

        return html;
    },

    async renderTedarikciAnalizi() {
        const a = this.ayarlar;
        const krediler = await DBService.getKrediler();
        
        let dbsFaturalar = [];
        try { dbsFaturalar = await DBService.getDbsFaturalar(); } catch(e) {}

        const tedarikciler = {};

        krediler.forEach(k => {
            if (k.krediTuru === "DBS" && k.tedarikciFirma) {
                const firma = k.tedarikciFirma.trim();
                if (!tedarikciler[firma]) {
                    tedarikciler[firma] = { limit: parseFloat(k.tutar) || 0, faturalar: [], faizOrani: parseFloat(k.faizOrani) || 0, banka: k.bankaAdi };
                } else {
                    tedarikciler[firma].limit += parseFloat(k.tutar) || 0;
                }
            }
        });

        dbsFaturalar.forEach(f => {
            if (f.tedarikciFirma) {
                const firma = f.tedarikciFirma.trim();
                if (!tedarikciler[firma]) {
                    tedarikciler[firma] = { limit: 0, faturalar: [], faizOrani: 0, banka: "-" };
                }
                tedarikciler[firma].faturalar.push(f);
            }
        });

        const tedarikciListesi = Object.keys(tedarikciler).map(firma => {
            const t = tedarikciler[firma];
            const toplamFatura = t.faturalar.reduce((sum, f) => sum + (parseFloat(f.faturaTutari || f.tutar) || 0), 0);
            const bekleyenFatura = t.faturalar.filter(f => f.durum === "Bekliyor").reduce((sum, f) => sum + (parseFloat(f.faturaTutari || f.tutar) || 0), 0);
            const odenenFatura = t.faturalar.filter(f => f.durum === "Ödendi").reduce((sum, f) => sum + (parseFloat(f.faturaTutari || f.tutar) || 0), 0);
            
            const faizMaliyeti = bekleyenFatura * (t.faizOrani / 100);

            return {
                firma,
                banka: t.banka,
                limit: t.limit,
                toplamFatura,
                bekleyenFatura,
                odenenFatura,
                faizOrani: t.faizOrani,
                faizMaliyeti
            };
        });

        tedarikciListesi.sort((a, b) => b.toplamFatura - a.toplamFatura);

        let html = `
            <div class="card" id="rapor-pdf-container" style="background:var(--bg-secondary); border:1px solid var(--border-color); padding: 30px; margin-bottom:20px;">
                <div style="text-align:center; border-bottom:2px solid var(--border-color); padding-bottom:20px; margin-bottom:30px;">
                    <h2 style="font-family:var(--font-display); color:var(--text-primary); font-size:1.6rem; margin-bottom:6px;">${a.raporBasligi}</h2>
                    <h3 style="color:var(--text-muted); font-size:1rem; font-weight:500;">TEDARİKÇİ / FİRMA BAZLI GİDER VE MALİYET ANALİZİ</h3>
                    <small style="color:var(--text-muted);">DBS Limitleri, Fatura Dağılımları ve Tahmini Faiz Finansman Maliyetleri</small>
                </div>

                <div class="table-responsive">
                    <table class="custom-table" style="font-size:0.85rem;">
                        <thead>
                            <tr>
                                <th>Tedarikçi Firma</th>
                                <th>Finansman Bankası</th>
                                <th>DBS Tahsis Limit</th>
                                <th>Toplam Hacim</th>
                                <th>Ödenen Tutar</th>
                                <th>Bekleyen Borç</th>
                                <th>Faiz Oranı</th>
                                <th style="text-align:right;">Finansman Yükü</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tedarikciListesi.length === 0 ? `
                                <tr>
                                    <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">
                                        Sistemde tanımlı DBS limiti veya DBS faturası bulunmuyor.
                                    </td>
                                </tr>
                            ` : tedarikciListesi.map((t, idx) => `
                                <tr style="${idx === 0 && t.toplamFatura > 0 ? 'background:rgba(244,63,94,0.03);' : ''}">
                                    <td><strong>${t.firma}</strong> ${idx === 0 && t.toplamFatura > 0 ? '<span class="badge badge-danger" style="font-size:0.65rem; padding:1px 4px; margin-left:6px;">En Yüksek Gider</span>' : ''}</td>
                                    <td>${t.banka}</td>
                                    <td><strong>${utils.formatPara(t.limit)}</strong></td>
                                    <td><strong>${utils.formatPara(t.toplamFatura)}</strong></td>
                                    <td class="text-success">${utils.formatPara(t.odenenFatura)}</td>
                                    <td class="text-danger">${utils.formatPara(t.bekleyenFatura)}</td>
                                    <td>%${t.faizOrani}</td>
                                    <td style="text-align:right; font-weight:700;" class="text-danger">${utils.formatPara(t.faizMaliyeti)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top:30px; border-top:1px dashed var(--border-color); padding-top:20px; font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                    <span>Raporlama Tarihi: ${new Date().toLocaleDateString('tr-TR')}</span>
                    <span>İs-Yil Finans ve Muhasebe Sistemi</span>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px;">
                <button class="btn btn-secondary" onclick="window.print()"><i data-lucide="printer"></i> Yazdır</button>
                <button class="btn btn-primary" onclick="RaporlarModule.pdfIndir()"><i data-lucide="file-down"></i> PDF Olarak İndir</button>
            </div>
        `;

        return html;
    },

    pdfIndir() {
        const element = document.getElementById("rapor-pdf-container") || document.getElementById("rapor-cikti-alani");
        if (!element) {
            App.showToast("İndirilecek rapor içeriği bulunamadı!", "error");
            return;
        }

        const baslik = this.ayarlar.raporBasligi.replace(/[^a-zA-Z0-9]/g, "_");
        const tur = this.ayarlar.raporTuru.replace(/[^a-zA-Z0-9]/g, "_");
        const dosyaAdi = `IsYil_${baslik}_${tur}_${new Date().toISOString().slice(0, 10)}.pdf`;

        const opt = {
            margin:       10,
            filename:     dosyaAdi,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0b1319' },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        App.showToast("PDF Raporu hazırlanıyor, lütfen bekleyin...");
        
        html2pdf().set(opt).from(element).save()
            .then(() => {
                App.showToast("PDF Raporu başarıyla indirildi!");
            })
            .catch(err => {
                console.error("PDF oluşturma hatası:", err);
                App.showToast("PDF indirilemedi: " + err.message, "error");
            });
    },

    // =========================================================================
    // 🖨️ YAZDIRMA
    // =========================================================================
    yazdir() {
        const tarih = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
        const baslik = this.ayarlar.raporBasligi || "İSMAİL FİNANS MERKEZİ";
        const altBaslik = this.ayarlar.raporAltBaslik || "Finansal Rapor";

        const icerik = document.getElementById("rapor-yazdirma-alani");
        if (!icerik) { App.showToast("Yazdırılacak rapor bulunamadı.", "error"); return; }

        const w = window.open('', '_blank', 'width=1100,height=800');
        w.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${altBaslik} — ${baslik}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Inter',sans-serif;color:#1e293b;background:#fff;padding:30px 40px;font-size:11px;line-height:1.5}
            .rapor-baslik{text-align:center;border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:24px}
            .rapor-baslik h1{font-family:'Outfit',sans-serif;font-size:22px;color:#0f172a;letter-spacing:-0.5px}
            .rapor-baslik .alt{font-size:13px;color:#64748b;margin-top:4px}
            .rapor-baslik .tarih{font-size:11px;color:#94a3b8;margin-top:8px}
            table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px}
            th{background:#f1f5f9;color:#334155;font-weight:600;padding:7px 10px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:9.5px;text-transform:uppercase;letter-spacing:.5px}
            td{padding:6px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
            tr:nth-child(even){background:#fafbfc}
            h4{font-size:12px;margin:16px 0 8px;padding:6px 10px;background:#f8fafc;border-left:4px solid #3b82f6;border-radius:4px}
            .badge{display:inline-block;padding:2px 8px;font-size:9px;font-weight:600;border-radius:4px}
            .badge-success{background:#dcfce7;color:#15803d}.badge-danger{background:#fee2e2;color:#b91c1c}
            .badge-warning{background:#fef3c7;color:#a16207}.badge-info{background:#dbeafe;color:#1d4ed8}
            .text-danger{color:#dc2626}.text-success{color:#16a34a}.text-warning{color:#d97706}.text-info{color:#2563eb}
            .installment-list{background:#f8fafc;border:1px dashed #e2e8f0;border-radius:6px;padding:10px;margin:4px 0}
            .installment-item{display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:10px}
            .card-title-area button,.empty-state i[data-lucide],.kpi-icon-box{display:none!important}
            .card-title-area{margin-bottom:12px}
            .card-title{font-size:14px;font-family:'Outfit',sans-serif}
            .alt-bilgi{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8}
            @media print{body{padding:15px 20px}table{page-break-inside:auto}tr{page-break-inside:avoid}}
        </style></head><body>
        <div class="rapor-baslik"><h1>${baslik}</h1><div class="alt">${altBaslik}</div><div class="tarih">Rapor Tarihi: ${tarih}</div></div>
        ${icerik.innerHTML}
        <div class="alt-bilgi">Bu rapor ${baslik} yazılımı tarafından otomatik oluşturulmuştur. • ${tarih}</div>
        </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    }
};
