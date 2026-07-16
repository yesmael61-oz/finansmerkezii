/* ==========================================================================
   🏦 İS-YIL FİNANS VE MUHASEBE PROGRAMI - BANKALAR VE TEMİNAT MEKTUPLARI (BANKALAR.JS)
   ========================================================================== */

const BankalarModule = {
    activeDetailId: null,
    activeDetailTab: 'krediler', // krediler | tahsil | teminat | mektuplar

    async render() {
        if (this.activeDetailId) {
            await this.renderBankaDetay();
            return;
        }

        const container = document.getElementById("page-container");
        const bankalar = await DBService.getBankalar();
        const krediler = await DBService.getKrediler();
        const cekler = await DBService.getCekler();
        const mektuplar = await DBService.getTeminatMektuplari();

        let bankalarHtml = "";

        if (bankalar.length === 0) {
            bankalarHtml = `
                <div class="empty-state">
                    <i data-lucide="building-2"></i>
                    <h4>Henüz Banka Eklenmemiş</h4>
                    <p>Finansal işlemlerinizi merkezi olarak yönetmek için ilk bankanızı ekleyin.</p>
                </div>
            `;
        } else {
            bankalarHtml = `<div class="grid-cols-3">`;
            
            bankalar.forEach(b => {
                // Hesaplamalar
                const bKrediler = krediler.filter(k => k.bankaAdi === b.bankaAdi);
                const bKrediBorc = bKrediler.reduce((sum, k) => sum + (parseFloat(k.tutar) || 0), 0);
                
                const bCekler = cekler.filter(c => c.verilenBanka === b.bankaAdi && (c.durum === 'Tahsilde' || c.durum === 'Teminatta'));
                const bCekTutar = bCekler.reduce((sum, c) => sum + (parseFloat(c.tutar) || 0), 0);

                const bMektuplar = mektuplar.filter(m => m.bankaId === b.id && m.durum === 'Aktif');
                const bMektupTutar = bMektuplar.reduce((sum, m) => sum + (parseFloat(m.tutar) || 0), 0);

                const toplamRisk = bKrediBorc + bMektupTutar;

                // Risk Limiti ve Progress Bar Hesaplamaları
                let limitHtml = "";
                let cardShakeClass = "";
                if (b.riskLimiti) {
                    const pct = Math.round((toplamRisk / b.riskLimiti) * 100);
                    let barColor = "var(--accent-emerald)";
                    let textColor = "var(--accent-emerald)";
                    if (pct >= 100) {
                        barColor = "var(--accent-rose)";
                        textColor = "var(--accent-rose)";
                        cardShakeClass = "shake-anim";
                    } else if (pct >= 80) {
                        barColor = "var(--accent-amber)";
                        textColor = "var(--accent-amber)";
                    }
                    
                    limitHtml = `
                        <div style="margin-top:12px; border-top:1px dashed var(--border-color); padding-top:10px; font-size:0.8rem;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <span style="color:var(--text-secondary);">Risk Limiti Kullanımı</span>
                                <strong style="color:${textColor}; font-weight:700;">%${pct} (${utils.formatPara(b.riskLimiti)})</strong>
                            </div>
                            <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                                <div style="width:${Math.min(100, pct)}%; height:100%; background:${barColor}; border-radius:3px; transition:width 0.3s;"></div>
                            </div>
                        </div>
                    `;
                }

                bankalarHtml += `
                    <div class="card ${cardShakeClass}" style="cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden;" onclick="BankalarModule.showBankaDetay(${b.id})" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent-blue)'" onmouseout="this.style.transform='none'; this.style.borderColor='var(--border-color)'">
                        <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--accent-blue);"></div>
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                            <div>
                                <h3 style="font-size:1.2rem; font-family:var(--font-display); color:var(--text-primary); margin-bottom:4px;">${b.bankaAdi}</h3>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">${b.subeAdi || 'Merkez Şube'}</div>
                            </div>
                            <i data-lucide="building" style="color:rgba(255,255,255,0.1); width:40px; height:40px;"></i>
                        </div>
                        
                        <div style="margin-bottom:16px; font-size:0.85rem; color:var(--text-secondary);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                                <span>Kredi Riski (${bKrediler.length})</span>
                                <strong class="text-danger">${utils.formatPara(bKrediBorc)}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                                <span>Teminat Mektubu (${bMektuplar.length})</span>
                                <strong class="text-warning">${utils.formatPara(bMektupTutar)}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>Bankadaki Çekler (${bCekler.length})</span>
                                <strong class="text-info">${utils.formatPara(bCekTutar)}</strong>
                            </div>
                        </div>

                        <div style="border-top:1px solid var(--border-color); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">Toplam Banka Riski</span>
                            <strong style="font-size:1.1rem; color:#fff;">${utils.formatPara(toplamRisk)}</strong>
                        </div>
                        ${limitHtml}
                    </div>
                `;
            });
            
            bankalarHtml += `</div>`;
        }

        let html = `
            <div class="page-title-area" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <div>
                    <h1>Bankalarım</h1>
                    <p class="page-subtitle">Tüm banka hesapları, kredi riskleri ve teminat mektupları</p>
                </div>
                <button class="btn btn-primary" onclick="BankalarModule.showBankaEkleModal()">
                    <i data-lucide="plus-circle"></i> Yeni Banka Ekle
                </button>
            </div>
            ${bankalarHtml}
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    // --- 🏦 BANKA EKLE / DÜZENLE MODAL ---
    async showBankaEkleModal(id = null) {
        let b = { bankaAdi: "", subeAdi: "", hesapNo: "", iban: "", yetkiliKisi: "", riskLimiti: "", notlar: "" };
        let title = "Yeni Banka Ekle";

        if (id) {
            const bankalar = await DBService.getBankalar();
            const found = bankalar.find(x => x.id === id);
            if (found) {
                b = found;
                title = "Bankayı Düzenle";
            }
        }

        const formHtml = `
            <form onsubmit="BankalarModule.bankaKaydet(event, ${id})">
                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Banka Adı *</label>
                        <input type="text" id="bnk-adi" class="form-control" placeholder="Örn: Garanti BBVA" value="${b.bankaAdi}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Şube Adı</label>
                        <input type="text" id="bnk-sube" class="form-control" placeholder="Örn: Kadıköy Şubesi" value="${b.subeAdi}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">IBAN Numarası</label>
                    <input type="text" id="bnk-iban" class="form-control" placeholder="TR..." value="${b.iban}">
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Hesap Numarası</label>
                        <input type="text" id="bnk-hesap" class="form-control" placeholder="Örn: 1234567-8" value="${b.hesapNo}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Müşteri Temsilcisi / Yetkili</label>
                        <input type="text" id="bnk-yetkili" class="form-control" placeholder="Kişi Adı ve Telefon" value="${b.yetkiliKisi}">
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Banka Risk Limiti (₺)</label>
                        <input type="number" id="bnk-risk-limiti" class="form-control" placeholder="Limit tutarı yazın" value="${b.riskLimiti || ''}">
                    </div>
                    <div class="form-group">
                        <!-- Boşluk -->
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Notlar</label>
                    <textarea id="bnk-notlar" class="form-control" placeholder="Banka ile ilgili özel notlar...">${b.notlar}</textarea>
                </div>

                <div class="modal-footer" style="padding-bottom: 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
                    <button type="submit" class="btn btn-primary">${id ? 'Güncelle' : 'Kaydet'}</button>
                </div>
            </form>
        `;
        openModal(title, formHtml);
    },

    async bankaKaydet(e, id) {
        e.preventDefault();
        try {
            const b = {
                bankaAdi: document.getElementById("bnk-adi").value,
                subeAdi: document.getElementById("bnk-sube").value,
                hesapNo: document.getElementById("bnk-hesap").value,
                iban: document.getElementById("bnk-iban").value,
                yetkiliKisi: document.getElementById("bnk-yetkili").value,
                riskLimiti: document.getElementById("bnk-risk-limiti").value ? parseFloat(document.getElementById("bnk-risk-limiti").value) : "",
                notlar: document.getElementById("bnk-notlar").value
            };

            if (id) {
                // Eski banka adını bul, krediler ve çeklerdeki adını da güncellemek gerekir (Gelişmiş senaryo)
                await DBService.updateBanka(id, b);
                App.showToast("Banka başarıyla güncellendi.");
            } else {
                await DBService.addBanka(b);
                App.showToast("Yeni banka başarıyla eklendi.");
            }

            closeModal();
            this.render();
        } catch (error) {
            alert("Kayıt sırasında hata oluştu: " + error.message);
        }
    },

    async bankaSilConfirm(id) {
        if (!confirm("Bu bankayı silmek istediğinize emin misiniz? Bankaya ait tüm teminat mektupları da silinecektir!")) return;
        
        setTimeout(async () => {
            const pwd = prompt("Güvenlik onayı: Lütfen yönetici şifrenizi girin:");
            if (!pwd) return;
            
            const isOk = await Security.verifyPassword(pwd);
            if (!isOk) {
                alert("Hatalı şifre! Silme işlemi iptal edildi.");
                return;
            }

            try {
                await DBService.deleteBanka(id);
                App.showToast("Banka başarıyla silindi.", "success");
                this.activeDetailId = null;
                this.render();
            } catch(e) {
                alert("Silme hatası: " + e.message);
            }
        }, 100);
    },

    // --- 🏦 BANKA DETAY SAYFASI ---
    async showBankaDetay(id) {
        this.activeDetailId = id;
        this.activeDetailTab = 'krediler';
        this.render();
    },

    async renderBankaDetay() {
        const container = document.getElementById("page-container");
        const bankalar = await DBService.getBankalar();
        const b = bankalar.find(x => x.id === this.activeDetailId);

        if (!b) {
            this.activeDetailId = null;
            this.render();
            return;
        }

        const krediler = await DBService.getKrediler();
        const bKrediler = krediler.filter(k => k.bankaAdi === b.bankaAdi);

        const cekler = await DBService.getCekler();
        const bTahsilCekler = cekler.filter(c => c.verilenBanka === b.bankaAdi && c.durum === 'Tahsilde');
        const bTeminatCekler = cekler.filter(c => c.verilenBanka === b.bankaAdi && c.durum === 'Teminatta');

        const mektuplar = await DBService.getTeminatMektuplari();
        const bMektuplar = mektuplar.filter(m => m.bankaId === b.id);

        let html = `
            <div style="margin-bottom:20px;">
                <button class="btn btn-secondary btn-sm" onclick="BankalarModule.activeDetailId = null; BankalarModule.render()">
                    <i data-lucide="arrow-left"></i> Bankalar Listesine Dön
                </button>
            </div>

            <div class="card" style="border-left: 4px solid var(--accent-blue); display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="font-size:1.5rem; font-family:var(--font-display); margin-bottom:8px;">${b.bankaAdi} ${b.subeAdi ? `- ${b.subeAdi}` : ''}</h2>
                    <div style="display:flex; gap:20px; font-size:0.85rem; color:var(--text-secondary);">
                        ${b.iban ? `<span><strong>IBAN:</strong> ${b.iban}</span>` : ''}
                        ${b.hesapNo ? `<span><strong>Hesap No:</strong> ${b.hesapNo}</span>` : ''}
                        ${b.yetkiliKisi ? `<span><strong>Yetkili:</strong> ${b.yetkiliKisi}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-info btn-sm" onclick="BankalarModule.showBankaEkleModal(${b.id})"><i data-lucide="edit"></i> Düzenle</button>
                    <button class="btn btn-danger btn-sm" onclick="BankalarModule.bankaSilConfirm(${b.id})"><i data-lucide="trash-2"></i> Sil</button>
                </div>
            </div>

            <!-- TABS -->
            <div class="tab-container" style="margin-top:24px;">
                <button class="tab-btn ${this.activeDetailTab === 'krediler' ? 'active' : ''}" onclick="BankalarModule.activeDetailTab='krediler'; BankalarModule.renderBankaDetay()">Krediler (${bKrediler.length})</button>
                <button class="tab-btn ${this.activeDetailTab === 'tahsil' ? 'active' : ''}" onclick="BankalarModule.activeDetailTab='tahsil'; BankalarModule.renderBankaDetay()">Tahsildeki Çekler (${bTahsilCekler.length})</button>
                <button class="tab-btn ${this.activeDetailTab === 'teminat' ? 'active' : ''}" onclick="BankalarModule.activeDetailTab='teminat'; BankalarModule.renderBankaDetay()">Teminattaki Çekler (${bTeminatCekler.length})</button>
                <button class="tab-btn ${this.activeDetailTab === 'mektuplar' ? 'active' : ''}" onclick="BankalarModule.activeDetailTab='mektuplar'; BankalarModule.renderBankaDetay()">Teminat Mektupları (${bMektuplar.length})</button>
            </div>

            <div id="tab-icerik">
                ${this.renderTabIcerik(b, bKrediler, bTahsilCekler, bTeminatCekler, bMektuplar)}
            </div>
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    renderTabIcerik(banka, krediler, tahsil, teminat, mektuplar) {
        if (this.activeDetailTab === 'krediler') {
            if (krediler.length === 0) return this._emptyStateHtml('wallet', 'Bu bankada aktif kredi bulunmuyor');
            let rows = krediler.map(k => `
                <tr>
                    <td><span class="badge badge-info">${k.krediTuru}</span></td>
                    <td><strong class="text-danger">${utils.formatPara(k.tutar)}</strong></td>
                    <td>%${k.faizOrani}</td>
                    <td>${k.vadeTarihi ? utils.formatTarih(k.vadeTarihi) : '-'}</td>
                    <td><span class="badge ${k.durum === 'Aktif' ? 'badge-success' : 'badge-danger'}">${k.durum}</span></td>
                </tr>
            `).join('');
            return `<div class="card"><div class="table-responsive"><table class="custom-table"><thead><tr><th>Tür</th><th>Tutar</th><th>Faiz</th><th>Vade</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }

        if (this.activeDetailTab === 'tahsil') {
            if (tahsil.length === 0) return this._emptyStateHtml('file-text', 'Tahsile verilmiş çek bulunmuyor');
            return this._cekTablosuHtml(tahsil);
        }

        if (this.activeDetailTab === 'teminat') {
            if (teminat.length === 0) return this._emptyStateHtml('shield', 'Teminata verilmiş çek bulunmuyor');
            return this._cekTablosuHtml(teminat);
        }

        if (this.activeDetailTab === 'mektuplar') {
            let baslikAlani = `
                <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
                    <button class="btn btn-primary btn-sm" onclick="BankalarModule.showMektupModal()"><i data-lucide="plus"></i> Yeni Teminat Mektubu</button>
                </div>
            `;
            if (mektuplar.length === 0) return baslikAlani + this._emptyStateHtml('file-signature', 'Teminat mektubu bulunmuyor');
            
            let rows = mektuplar.map(m => `
                <tr>
                    <td><strong>${m.mektupNo}</strong></td>
                    <td><strong class="text-warning">${utils.formatPara(m.tutar)}</strong></td>
                    <td><span class="badge ${m.tur === 'Süresiz' ? 'badge-info' : 'badge-warning'}">${m.tur}</span></td>
                    <td>${utils.formatTarih(m.baslangicTarihi)}</td>
                    <td>${m.tur === 'Süreli' && m.bitisTarihi ? utils.formatTarih(m.bitisTarihi) : 'Süresiz'}</td>
                    <td>${m.lehtar}</td>
                    <td>
                        <span class="badge ${m.durum === 'Aktif' ? 'badge-success' : (m.durum === 'İade Edildi' ? 'badge-info' : 'badge-danger')}">${m.durum}</span>
                    </td>
                    <td>
                        <button class="btn btn-icon-only btn-secondary" onclick="BankalarModule.showMektupModal(${m.id})"><i data-lucide="edit"></i></button>
                        <button class="btn btn-icon-only btn-danger" onclick="BankalarModule.mektupSilConfirm(${m.id})"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `).join('');

            return baslikAlani + `<div class="card"><div class="table-responsive"><table class="custom-table"><thead><tr><th>Mektup No</th><th>Tutar</th><th>Tür</th><th>Başlangıç</th><th>Bitiş</th><th>Lehtar</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
    },

    _cekTablosuHtml(cekler) {
        let rows = cekler.map(c => `
            <tr>
                <td><strong>${c.cekNo}</strong></td>
                <td>${c.kesideci}</td>
                <td><strong class="text-info">${utils.formatPara(c.tutar)}</strong></td>
                <td>${utils.formatTarih(c.vadeTarihi)}</td>
                <td>${utils.formatKalanGun(c.vadeTarihi)}</td>
            </tr>
        `).join('');
        return `<div class="card"><div class="table-responsive"><table class="custom-table"><thead><tr><th>Çek No</th><th>Keşideci</th><th>Tutar</th><th>Vade</th><th>Kalan</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    },

    _emptyStateHtml(icon, text) {
        return `<div class="empty-state"><i data-lucide="${icon}"></i><h4>Kayıt Bulunamadı</h4><p>${text}</p></div>`;
    },

    // --- 📜 TEMİNAT MEKTUPLARI ---
    async showMektupModal(id = null) {
        let m = { mektupNo: "", tutar: "", tur: "Süresiz", baslangicTarihi: new Date().toISOString().slice(0,10), bitisTarihi: "", lehtar: "", aciklama: "", durum: "Aktif" };
        let title = "Yeni Teminat Mektubu Ekle";

        if (id) {
            const mektuplar = await DBService.getTeminatMektuplari();
            const found = mektuplar.find(x => x.id === id);
            if (found) { m = found; title = "Teminat Mektubu Düzenle"; }
        }

        const formHtml = `
            <form onsubmit="BankalarModule.mektupKaydet(event, ${id})">
                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Mektup Referans No *</label>
                        <input type="text" id="tm-no" class="form-control" value="${m.mektupNo}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tutar (₺) *</label>
                        <input type="number" step="0.01" id="tm-tutar" class="form-control" value="${m.tutar}" required>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Tür *</label>
                        <select id="tm-tur" class="form-control" onchange="BankalarModule.handleTmTurDegisim()" required>
                            <option value="Süresiz" ${m.tur === 'Süresiz' ? 'selected' : ''}>Süresiz</option>
                            <option value="Süreli" ${m.tur === 'Süreli' ? 'selected' : ''}>Süreli</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Durum *</label>
                        <select id="tm-durum" class="form-control" required>
                            <option value="Aktif" ${m.durum === 'Aktif' ? 'selected' : ''}>Aktif</option>
                            <option value="İade Edildi" ${m.durum === 'İade Edildi' ? 'selected' : ''}>İade Edildi</option>
                            <option value="Tazmin Edildi" ${m.durum === 'Tazmin Edildi' ? 'selected' : ''}>Tazmin Edildi</option>
                        </select>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Başlangıç Tarihi *</label>
                        <input type="date" id="tm-bas" class="form-control" value="${m.baslangicTarihi}" required>
                    </div>
                    <div class="form-group" id="tm-bitis-alani" style="display:${m.tur === 'Süreli' ? 'block' : 'none'}">
                        <label class="form-label">Bitiş/Vade Tarihi *</label>
                        <input type="date" id="tm-bitis" class="form-control" value="${m.bitisTarihi}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Lehtar (Kime Verildi) *</label>
                    <input type="text" id="tm-lehtar" class="form-control" placeholder="Örn: Gümrük Müdürlüğü, X Firması" value="${m.lehtar}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Açıklama / Notlar</label>
                    <input type="text" id="tm-aciklama" class="form-control" value="${m.aciklama || ''}">
                </div>

                <div class="modal-footer" style="padding-bottom: 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
                    <button type="submit" class="btn btn-primary">${id ? 'Güncelle' : 'Kaydet'}</button>
                </div>
            </form>
        `;
        openModal(title, formHtml);
    },

    handleTmTurDegisim() {
        const tur = document.getElementById("tm-tur").value;
        const bitisAlani = document.getElementById("tm-bitis-alani");
        const bitisInput = document.getElementById("tm-bitis");
        if (tur === 'Süreli') {
            bitisAlani.style.display = 'block';
            bitisInput.setAttribute('required', 'true');
        } else {
            bitisAlani.style.display = 'none';
            bitisInput.removeAttribute('required');
        }
    },

    async mektupKaydet(e, id) {
        e.preventDefault();
        try {
            const bankalar = await DBService.getBankalar();
            const b = bankalar.find(x => x.id === this.activeDetailId);

            const tm = {
                bankaId: b.id,
                bankaAdi: b.bankaAdi,
                mektupNo: document.getElementById("tm-no").value,
                tutar: parseFloat(document.getElementById("tm-tutar").value),
                tur: document.getElementById("tm-tur").value,
                baslangicTarihi: document.getElementById("tm-bas").value,
                bitisTarihi: document.getElementById("tm-tur").value === 'Süreli' ? document.getElementById("tm-bitis").value : null,
                lehtar: document.getElementById("tm-lehtar").value,
                aciklama: document.getElementById("tm-aciklama").value,
                durum: document.getElementById("tm-durum").value
            };

            if (id) {
                await DBService.updateTeminatMektubu(id, tm);
                App.showToast("Teminat mektubu güncellendi.");
            } else {
                await DBService.addTeminatMektubu(tm);
                App.showToast("Yeni teminat mektubu eklendi.");
            }

            closeModal();
            this.renderBankaDetay();
        } catch (error) {
            alert("Hata: " + error.message);
        }
    },

    async mektupSilConfirm(id) {
        if (!confirm("Bu teminat mektubunu silmek istediğinize emin misiniz?")) return;
        
        setTimeout(async () => {
            const pwd = prompt("Güvenlik onayı: Lütfen yönetici şifrenizi girin:");
            if (!pwd) return;
            
            const isOk = await Security.verifyPassword(pwd);
            if (!isOk) {
                alert("Hatalı şifre! Silme işlemi iptal edildi.");
                return;
            }

            try {
                await DBService.deleteTeminatMektubu(id);
                App.showToast("Teminat mektubu başarıyla silindi.", "success");
                this.renderBankaDetay();
            } catch(e) {
                alert("Silme hatası: " + e.message);
            }
        }, 100);
    }
};
