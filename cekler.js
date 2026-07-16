/* ==========================================================================
   🎫 İSMAİL FİNANS MERKEZİ - MÜŞTERİ ÇEKLERİ YÖNETİM MODÜLÜ (CEKLER.JS)
   ========================================================================== */

const CeklerModule = {
    filtreDurum: "Tümü",
    aramaKelimesi: "",

    async render() {
        const container = document.getElementById("page-container");
        
        const cekler = await DBService.getCekler();

        // Filtreleme ve Arama Uygula
        let filtrelenmisCekler = cekler;
        if (this.filtreDurum !== "Tümü") {
            filtrelenmisCekler = filtrelenmisCekler.filter(c => c.durum === this.filtreDurum);
        }
        if (this.aramaKelimesi.trim() !== "") {
            const query = this.aramaKelimesi.toLowerCase();
            filtrelenmisCekler = filtrelenmisCekler.filter(c => 
                c.cekNo.toLowerCase().includes(query) || 
                c.kesideci.toLowerCase().includes(query) ||
                (c.ciroEden && c.ciroEden.toLowerCase().includes(query)) ||
                c.bankaAdi.toLowerCase().includes(query)
            );
        }

        // Toplam İstatistikler
        const portfoyTop = cekler.filter(c => c.durum === "Portföyde").reduce((sum, c) => sum + parseFloat(c.tutar), 0);
        const tahsilTop = cekler.filter(c => c.durum === "Tahsilde").reduce((sum, c) => sum + parseFloat(c.tutar), 0);
        const ciroTop = cekler.filter(c => c.durum === "Ciro Edildi").reduce((sum, c) => sum + parseFloat(c.tutar), 0);
        const karsiliksizTop = cekler.filter(c => c.durum === "Karşılıksız").reduce((sum, c) => sum + parseFloat(c.tutar), 0);

        let html = `
            <!-- Mini Çek Dashboard -->
            <div class="grid-cols-4" style="margin-bottom:24px;">
                <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); padding:16px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--accent-emerald); font-weight:600; text-transform:uppercase;">Kasadaki Portföy</div>
                    <strong style="font-size:1.25rem; font-family:var(--font-display);" class="text-success">${utils.formatPara(portfoyTop)}</strong>
                </div>
                <div style="background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.15); padding:16px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--accent-blue); font-weight:600; text-transform:uppercase;">Tahsildeki Çekler</div>
                    <strong style="font-size:1.25rem; font-family:var(--font-display);" class="text-info">${utils.formatPara(tahsilTop)}</strong>
                </div>
                <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.15); padding:16px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--accent-gold); font-weight:600; text-transform:uppercase;">Ciro Edilen Çekler</div>
                    <strong style="font-size:1.25rem; font-family:var(--font-display);" class="text-warning">${utils.formatPara(ciroTop)}</strong>
                </div>
                <div style="background:rgba(244,63,94,0.06); border:1px solid rgba(244,63,94,0.15); padding:16px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--accent-rose); font-weight:600; text-transform:uppercase;">Karşılıksız Risk</div>
                    <strong style="font-size:1.25rem; font-family:var(--font-display);" class="text-danger">${utils.formatPara(karsiliksizTop)}</strong>
                </div>
            </div>

            <!-- Çek Listesi Filtreleme Alanı -->
            <div class="card" style="padding: 20px; margin-bottom: 24px; display:flex; gap:16px; align-items:center; flex-wrap:wrap; justify-content:space-between;">
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <select id="flt-durum" class="form-control" style="width:160px; padding:8px 12px;" onchange="CeklerModule.filtreDegistir()">
                        <option value="Tümü" ${this.filtreDurum === 'Tümü' ? 'selected' : ''}>Tüm Çekler</option>
                        <option value="Portföyde" ${this.filtreDurum === 'Portföyde' ? 'selected' : ''}>Portföyde</option>
                        <option value="Tahsilde" ${this.filtreDurum === 'Tahsilde' ? 'selected' : ''}>Tahsilde</option>
                        <option value="Teminatta" ${this.filtreDurum === 'Teminatta' ? 'selected' : ''}>Teminatta</option>
                        <option value="Ciro Edildi" ${this.filtreDurum === 'Ciro Edildi' ? 'selected' : ''}>Ciro Edildi</option>
                        <option value="Ödendi" ${this.filtreDurum === 'Ödendi' ? 'selected' : ''}>Ödendi / Tahsil Edildi</option>
                        <option value="Karşılıksız" ${this.filtreDurum === 'Karşılıksız' ? 'selected' : ''}>Karşılıksız</option>
                    </select>

                    <input type="text" id="flt-arama" class="form-control" style="width:240px; padding:8px 12px;" placeholder="Keşideci, Ciro Eden veya Çek No..." value="${this.aramaKelimesi}" oninput="CeklerModule.aramaYap()">
                </div>

                <button class="btn btn-primary btn-sm" onclick="CeklerModule.showCekEkleModal()">
                    <i data-lucide="plus"></i> Yeni Çek Girişi
                </button>
            </div>

            <!-- Çek Tablosu -->
            <div class="card">
                ${filtrelenmisCekler.length === 0 ? `
                    <div class="empty-state">
                        <i data-lucide="receipt"></i>
                        <h4>Kayıtlı Çek Bulunmuyor</h4>
                        <p>Filtreye uygun veya aradığınız kriterlerde herhangi bir müşteri çeki kaydı bulunamadı.</p>
                    </div>
                ` : `
                    <div class="table-responsive">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Çek No</th>
                                    <th>Çek Sahibi (Keşideci)</th>
                                    <th>Ciro Detayı</th>
                                    <th>Banka / Şube</th>
                                    <th>Vade Tarihi</th>
                                    <th>Kalan Gün</th>
                                    <th>Tutar (₺)</th>
                                    <th>Risk Notu</th>
                                    <th>Çek Durumu</th>
                                    <th style="text-align: right;">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtrelenmisCekler.reverse().map(c => {
                                    const kalanGun = utils.formatKalanGun(c.vadeTarihi);
                                    let badgeClass = "badge-info";
                                    if (c.durum === "Portföyde") badgeClass = "badge-success";
                                    else if (c.durum === "Ödendi") badgeClass = "badge-success";
                                    else if (c.durum === "Ciro Edildi") badgeClass = "badge-warning";
                                    else if (c.durum === "Karşılıksız") badgeClass = "badge-danger";

                                    // Risk notu badge
                                    let riskBadge = '<span style="color:var(--text-muted); font-style:italic; font-size:0.7rem;">—</span>';
                                    if (c.riskNotu) {
                                        const rn = parseInt(c.riskNotu);
                                        if (rn >= 1500) riskBadge = `<span class="badge badge-success" style="font-size:0.7rem;">${c.riskNotu} ★</span>`;
                                        else if (rn >= 1000) riskBadge = `<span class="badge badge-warning" style="font-size:0.7rem;">${c.riskNotu} ⚠</span>`;
                                        else riskBadge = `<span class="badge badge-danger" style="font-size:0.7rem;">${c.riskNotu} ✖</span>`;
                                    }

                                    return `
                                        <tr>
                                            <td><strong>${c.cekNo}</strong></td>
                                            <td><strong>${c.kesideci}</strong></td>
                                            <td>
                                                <div style="font-size:0.8rem;">
                                                    <span style="color:var(--text-muted);">Gelen:</span> <strong>${c.ciroEden || 'Kendisi'}</strong><br>
                                                    ${c.durum === 'Ciro Edildi' ? `<span style="color:var(--text-muted);">Giden:</span> <strong style="color:var(--accent-gold);">${c.ciroEdilenYer}</strong>` : '<span style="color:var(--text-muted); font-style:italic;">Bizde</span>'}
                                                </div>
                                            </td>
                                            <td>
                                                ${c.bankaAdi}<br>
                                                <small style="color:var(--text-muted);">${c.sube}</small>
                                            </td>
                                            <td><strong>${utils.formatTarih(c.vadeTarihi)}</strong></td>
                                            <td>${c.durum === 'Ödendi' ? '<span class="badge badge-success">Tahsil Edildi</span>' : kalanGun}</td>
                                            <td><strong class="text-success">${utils.formatPara(c.tutar)}</strong></td>
                                            <td>${riskBadge}</td>
                                            <td>
                                                <span class="badge ${badgeClass}">
                                                    ${c.durum}
                                                </span>
                                                ${c.durum === 'Ciro Edildi' ? `<br><small style="color:var(--accent-gold); font-size:0.7rem;">Ciro: ${c.ciroEdilenYer}</small>` : ''}
                                                ${(c.durum === 'Tahsilde' || c.durum === 'Teminatta') && c.verilenBanka ? `<br><small style="color:var(--accent-blue); font-size:0.7rem;">Banka: ${c.verilenBanka}</small>` : ''}
                                            </td>
                                            <td style="text-align: right; white-space:nowrap;">
                                                <button class="btn btn-info btn-sm btn-icon-only" onclick="CeklerModule.showIstihbaratModal(${c.id})" title="İstihbarat Sorgula" style="margin-right:4px;">
                                                    <i data-lucide="search-check"></i>
                                                </button>
                                                <button class="btn btn-secondary btn-sm btn-icon-only" onclick="CeklerModule.showDurumModal(${c.id})" title="Durum Değiştir" style="margin-right:4px;">
                                                    <i data-lucide="edit-2"></i>
                                                </button>
                                                <button class="btn btn-danger btn-sm btn-icon-only" onclick="CeklerModule.cekSil(${c.id})" title="Çeki Sil">
                                                    <i data-lucide="trash-2"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    filtreDegistir() {
        this.filtreDurum = document.getElementById("flt-durum").value;
        this.render();
    },

    aramaYap() {
        this.aramaKelimesi = document.getElementById("flt-arama").value;
        this.render();
    },

    // --- ➕ YENİ ÇEK GİRİŞ MODALI ---
    showCekEkleModal() {
        const bugun = new Date().toISOString().split('T')[0];
        const formHtml = `
            <form id="cek-ekle-form" onsubmit="CeklerModule.cekKaydet(event)">
                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Çek Numarası *</label>
                        <input type="text" id="ck-no" class="form-control" placeholder="Çek numarasını yazın" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Çek Sahibi (Keşideci Firma/Kişi) *</label>
                        <input type="text" id="ck-kesideci" class="form-control" placeholder="Çeki düzenleyen müşteri" required>
                    </div>
                </div>

                <div class="grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Bize Ciro Eden (Çeki Aldığımız Yer)</label>
                        <input type="text" id="ck-ciro-eden" class="form-control" placeholder="Kendisi ise boş bırakın" oninput="document.getElementById('ck-ciro-tarihi-gr').style.display = this.value ? 'block' : 'none'">
                    </div>
                    <div class="form-group" id="ck-ciro-tarihi-gr" style="display:none;">
                        <label class="form-label">Ciro Tarihi</label>
                        <input type="date" id="ck-ciro-tarihi" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Banka Adı *</label>
                        <input type="text" id="ck-banka" class="form-control" placeholder="Örn: Akbank" required>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Banka Şubesi *</label>
                        <input type="text" id="ck-sube" class="form-control" placeholder="Banka şubesi" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tutar (₺) *</label>
                        <input type="number" step="0.01" id="ck-tutar" class="form-control" placeholder="Çek tutarı" required>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Vade Tarihi *</label>
                        <input type="date" id="ck-vade" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sisteme Kayıt Tarihi *</label>
                        <input type="date" id="ck-kayit" class="form-control" value="${bugun}" required>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Risk Notu (Findeks Puanı)</label>
                        <input type="number" id="ck-risk-notu" class="form-control" placeholder="Ör: 1750" min="0" max="1900">
                        <small style="color:var(--text-muted); font-size:0.7rem;">0-999: Yüksek Risk | 1000-1499: Orta | 1500+: Düşük Risk</small>
                    </div>
                    <div class="form-group">
                        <!-- Boşluk -->
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">İstihbarat Notu (Opsiyonel)</label>
                    <textarea id="ck-istihbarat-notu" class="form-control" rows="2" placeholder="Müşteri hakkında bilgi notlarınız..."></textarea>
                </div>

                <div class="modal-footer" style="padding-bottom: 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
                    <button type="submit" class="btn btn-primary">Çeki Portföye Kaydet</button>
                </div>
            </form>
        `;
        openModal("Müşteriden Alınan Çek Girişi", formHtml);
    },

    async cekKaydet(e) {
        e.preventDefault();
        try {
            await DBService.addCek({
                cekNo: document.getElementById("ck-no").value,
                kesideci: document.getElementById("ck-kesideci").value,
                ciroEden: document.getElementById("ck-ciro-eden").value,
                ciroTarihi: document.getElementById("ck-ciro-tarihi") ? document.getElementById("ck-ciro-tarihi").value : "",
                bankaAdi: document.getElementById("ck-banka").value,
                sube: document.getElementById("ck-sube").value,
                tutar: parseFloat(document.getElementById("ck-tutar").value),
                vadeTarihi: document.getElementById("ck-vade").value,
                kayitTarihi: document.getElementById("ck-kayit").value,
                durum: "Portföyde",
                ciroEdilenYer: "",
                ciroEdilenTarih: "",
                riskNotu: document.getElementById("ck-risk-notu").value || "",
                istihbaratNotu: document.getElementById("ck-istihbarat-notu").value || ""
            });

            closeModal();
            App.showToast("Müşteri çeki başarıyla portföye kaydedildi!");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    // --- 🔄 DURUM DEĞİŞTİRME MODALI (CİRO ETME, TAHSİL EDİLDİ YAPMA) ---
    async showDurumModal(id) {
        const cekler = await DBService.getCekler();
        const c = cekler.find(x => x.id === id);

        // Kayıtlı bankaları yükle
        let bankaOptions = '<option value="">— Banka Seçin —</option>';
        try {
            const bankalar = await DBService.getBankalar();
            bankalar.forEach(b => {
                bankaOptions += `<option value="${b.bankaAdi}" ${c.verilenBanka === b.bankaAdi ? 'selected' : ''}>${b.bankaAdi}${b.subeAdi ? ' - ' + b.subeAdi : ''}</option>`;
            });
        } catch(e) {}
        bankaOptions += '<option value="__yeni__">➕ Yeni Banka Adı Yaz...</option>';

        const formHtml = `
            <form onsubmit="CeklerModule.durumKaydet(event, ${id})">
                <div style="margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                    <div style="font-size:0.8rem; color:var(--text-secondary);">Çek Detayı:</div>
                    <strong>No: ${c.cekNo} | ${c.kesideci}</strong><br>
                    <strong style="color:var(--accent-emerald); font-size:1.15rem;">${utils.formatPara(c.tutar)}</strong>
                </div>

                <div class="form-group">
                    <label class="form-label">Çek Yeni Durumu *</label>
                    <select id="ck-durum-select" class="form-control" onchange="CeklerModule.handleDurumSecimDegisim()" required>
                        <option value="Portföyde" ${c.durum === 'Portföyde' ? 'selected' : ''}>Portföyde (Kasadaki Çek)</option>
                        <option value="Tahsilde" ${c.durum === 'Tahsilde' ? 'selected' : ''}>Tahsilde (Bankaya Tahsile Verildi)</option>
                        <option value="Teminatta" ${c.durum === 'Teminatta' ? 'selected' : ''}>Teminatta (Bankaya Teminata Verildi)</option>
                        <option value="Ciro Edildi" ${c.durum === 'Ciro Edildi' ? 'selected' : ''}>Ciro Edildi (Toptancıya / Alacaklıya Ödendi)</option>
                        <option value="Ödendi" ${c.durum === 'Ödendi' ? 'selected' : ''}>Ödendi / Tahsil Edildi (Hesaba Geçti)</option>
                        <option value="Karşılıksız" ${c.durum === 'Karşılıksız' ? 'selected' : ''}>Karşılıksız (Karşılığı Çıkmadı)</option>
                    </select>
                </div>

                <div class="grid-cols-2" id="ciro-firma-alani" style="display:none;">
                    <div class="form-group">
                        <label class="form-label">Ciro Edilen Firma / Kişi Adı *</label>
                        <input type="text" id="ck-ciro-firma" class="form-control" placeholder="Çekin verildiği firma" value="${c.ciroEdilenYer || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ciro Tarihi *</label>
                        <input type="date" id="ck-ciro-edilen-tarih" class="form-control" value="${c.ciroEdilenTarih || new Date().toISOString().split('T')[0]}">
                    </div>
                </div>

                <div class="form-group" id="tahsil-teminat-banka-alani" style="display:none;">
                    <label class="form-label" id="ck-banka-label">Tahsile / Teminata Verilen Banka Adı *</label>
                    <select id="ck-tahsil-teminat-banka" class="form-control" onchange="CeklerModule.handleTahsilBankaSecim()">
                        ${bankaOptions}
                    </select>
                    <input type="text" id="ck-tahsil-teminat-banka-manual" class="form-control" placeholder="Bankanın adını yazın" value="${c.verilenBanka && !bankaOptions.includes('value="'+c.verilenBanka+'"') ? c.verilenBanka : ''}" style="display:${c.verilenBanka && !bankaOptions.includes('value="'+c.verilenBanka+'"') ? 'block' : 'none'}; margin-top:8px;">
                </div>

                <div class="modal-footer" style="padding-bottom: 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
                    <button type="submit" class="btn btn-primary">Durumu Güncelle</button>
                </div>
            </form>
        `;

        openModal("Çek Durumu Değiştir", formHtml);
        this.handleDurumSecimDegisim();
    },

    handleDurumSecimDegisim() {
        const select = document.getElementById("ck-durum-select");
        const ciroAlani = document.getElementById("ciro-firma-alani");
        const ciroInput = document.getElementById("ck-ciro-firma");
        
        const bankaAlani = document.getElementById("tahsil-teminat-banka-alani");
        const bankaInput = document.getElementById("ck-tahsil-teminat-banka");
        const bankaLabel = document.getElementById("ck-banka-label");

        if (select.value === "Ciro Edildi") {
            ciroAlani.style.display = "grid";
            ciroInput.setAttribute("required", "true");
            document.getElementById("ck-ciro-edilen-tarih").setAttribute("required", "true");
            
            bankaAlani.style.display = "none";
            bankaInput.removeAttribute("required");
        } else if (select.value === "Tahsilde" || select.value === "Teminatta") {
            ciroAlani.style.display = "none";
            ciroInput.removeAttribute("required");
            
            bankaAlani.style.display = "block";
            bankaInput.setAttribute("required", "true");
            bankaLabel.innerText = select.value === "Tahsilde" ? "Tahsile Verilen Banka Adı *" : "Teminata Verilen Banka Adı *";
            bankaInput.setAttribute("placeholder", select.value === "Tahsilde" ? "Tahsile verilen banka" : "Teminata verilen banka");
        } else {
            ciroAlani.style.display = "none";
            ciroInput.removeAttribute("required");
            
            bankaAlani.style.display = "none";
            bankaInput.removeAttribute("required");
            document.getElementById("ck-tahsil-teminat-banka-manual").removeAttribute("required");
        }
    },

    handleTahsilBankaSecim() {
        const select = document.getElementById('ck-tahsil-teminat-banka');
        const manual = document.getElementById('ck-tahsil-teminat-banka-manual');
        if (select.value === '__yeni__') {
            manual.style.display = 'block';
            manual.setAttribute('required', 'true');
            manual.focus();
        } else {
            manual.style.display = 'none';
            manual.removeAttribute('required');
        }
    },

    async durumKaydet(e, id) {
        e.preventDefault();
        try {
            const select = document.getElementById("ck-durum-select").value;
            const ciroFirma = document.getElementById("ck-ciro-firma").value;
            let verilenBanka = document.getElementById("ck-tahsil-teminat-banka").value;
            if (verilenBanka === '__yeni__') {
                verilenBanka = document.getElementById("ck-tahsil-teminat-banka-manual").value;
            }

            const cekler = await DBService.getCekler();
            const c = cekler.find(x => x.id === id);

            c.durum = select;
            c.ciroEdilenYer = (select === "Ciro Edildi") ? ciroFirma : "";
            c.ciroEdilenTarih = (select === "Ciro Edildi") ? document.getElementById("ck-ciro-edilen-tarih").value : "";
            c.verilenBanka = (select === "Tahsilde" || select === "Teminatta") ? verilenBanka : "";

            delete c.id;
            await DBService.updateCek(id, c);

            closeModal();
            App.showToast("Çek durum bilgisi başarıyla güncellendi!");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    // --- ❌ ÇEK SİLME ---
    async cekSil(id) {
        const password = prompt("Güvenlik Uyarısı!\nBu çeki silmek için lütfen giriş şifrenizi girin:");
        if (password === null) return; // Kullanıcı iptal etti
        
        const verified = await Security.verifyPassword(password);
        if (!verified) {
            App.showToast("Hatalı şifre! Silme işlemi iptal edildi.", "error");
            return;
        }

        if (confirm("Bu çeki tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
            await DBService.deleteCek(id);
            App.showToast("Çek başarıyla silindi.");
            this.render();
        }
    },

    // =========================================================================
    // 🔍 İSTİHBARAT SORGULAMA MODÜLÜ
    // =========================================================================
    async showIstihbaratModal(id) {
        const cekler = await DBService.getCekler();
        const c = cekler.find(x => x.id === id);

        // Risk notu badge
        let riskDisplay = '<span style="color:var(--accent-gold); font-weight:600;">Henüz sorgulanmadı</span>';
        if (c.riskNotu) {
            const rn = parseInt(c.riskNotu);
            if (rn >= 1500) riskDisplay = `<span style="color:var(--accent-emerald); font-weight:700; font-size:1.3rem;">${c.riskNotu}</span> <span class="badge badge-success">★ Düşük Risk — Güvenilir</span>`;
            else if (rn >= 1000) riskDisplay = `<span style="color:var(--accent-gold); font-weight:700; font-size:1.3rem;">${c.riskNotu}</span> <span class="badge badge-warning">⚠ Orta Risk — Dikkatli Olun</span>`;
            else riskDisplay = `<span style="color:var(--accent-rose); font-weight:700; font-size:1.3rem;">${c.riskNotu}</span> <span class="badge badge-danger">✖ Yüksek Risk — TEHLİKE</span>`;
        }

        // Çekin kaydedildiği tarihe kadarki keşideci performansı
        const snapshot = PerformansModule.getPerformansSnapshot(cekler, c.kesideci, c.kayitTarihi, c.id);

        const formHtml = `
            <div style="margin-bottom:20px;">
                <div style="background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.15); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600; margin-bottom:4px;">Çek Bilgileri</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem;">
                        <div><strong>Çek No:</strong> ${c.cekNo}</div>
                        <div><strong>Tutar:</strong> <span class="text-success">${utils.formatPara(c.tutar)}</span></div>
                        <div><strong>Keşideci:</strong> ${c.kesideci}</div>
                        <div><strong>Ciro Eden:</strong> ${c.ciroEden || 'Kendisi'}</div>
                        <div><strong>Banka:</strong> ${c.bankaAdi} / ${c.sube}</div>
                        <div><strong>Vade / Kayıt:</strong> ${utils.formatTarih(c.vadeTarihi)} / ${utils.formatTarih(c.kayitTarihi || '—')}</div>
                        <div><strong>Çek Durumu:</strong> <strong>${c.durum}</strong></div>
                        ${c.durum === 'Ciro Edildi' ? `<div><strong>Ciro Edilen:</strong> <strong>${c.ciroEdilenYer}</strong></div>` : ''}
                        ${(c.durum === 'Tahsilde' || c.durum === 'Teminatta') && c.verilenBanka ? `<div><strong>Teslim Edilen Banka:</strong> <strong>${c.verilenBanka}</strong></div>` : ''}
                    </div>
                </div>

                <!-- 🔗 CİRO ZİNCİRİ GÖRSELLEŞTİRMESİ -->
                <div style="background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="git-commit" style="width:16px;height:16px;color:var(--accent-gold);"></i>
                        Çek Ciro Zinciri (Flowchart)
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:0.8rem;">
                        
                        <div style="text-align:center; flex:1; min-width:80px; padding:8px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">Keşideci</div>
                            <strong style="color:var(--text-primary);">${c.kesideci}</strong>
                        </div>
                        
                        <div style="color:var(--text-muted); font-weight:bold;">➡</div>

                        <div style="text-align:center; flex:1; min-width:80px; padding:8px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                            <div style="font-size:0.7rem; color:var(--text-muted);">Ciro Eden</div>
                            <strong style="color:var(--text-primary);">${c.ciroEden || 'Kendisi'}</strong>
                            ${c.ciroTarihi ? `<br><small style="color:var(--text-muted); font-size:0.65rem;">${utils.formatTarih(c.ciroTarihi)}</small>` : ''}
                        </div>

                        <div style="color:var(--text-muted); font-weight:bold;">➡</div>

                        <div style="text-align:center; flex:1; min-width:80px; padding:8px; background:rgba(59,130,246,0.1); border-radius:6px; border:1px solid var(--accent-blue);">
                            <div style="font-size:0.7rem; color:var(--accent-blue); font-weight:bold;">Biz (Portföy)</div>
                            <strong style="color:var(--text-primary);">İs-Yil Finans</strong>
                        </div>

                        ${c.durum === 'Ciro Edildi' ? `
                            <div style="color:var(--text-muted); font-weight:bold;">➡</div>
                            <div style="text-align:center; flex:1; min-width:80px; padding:8px; background:rgba(251,191,36,0.1); border-radius:6px; border:1px solid var(--accent-gold);">
                                <div style="font-size:0.7rem; color:var(--accent-gold); font-weight:bold;">Ciro Edilen</div>
                                <strong style="color:var(--text-primary);">${c.ciroEdilenYer}</strong>
                                ${c.ciroEdilenTarih ? `<br><small style="color:var(--text-muted); font-size:0.65rem;">${utils.formatTarih(c.ciroEdilenTarih)}</small>` : ''}
                            </div>
                        ` : ''}

                        ${c.durum === 'Tahsilde' || c.durum === 'Teminatta' ? `
                            <div style="color:var(--text-muted); font-weight:bold;">➡</div>
                            <div style="text-align:center; flex:1; min-width:80px; padding:8px; background:rgba(16,185,129,0.1); border-radius:6px; border:1px solid var(--accent-emerald);">
                                <div style="font-size:0.7rem; color:var(--accent-emerald); font-weight:bold;">Banka (${c.durum})</div>
                                <strong style="color:var(--text-primary);">${c.verilenBanka || 'Banka'}</strong>
                            </div>
                        ` : ''}
                        
                    </div>
                </div>

                <!-- 📊 Çek Kayıt Tarihinde Keşideci Performansı -->
                <div style="background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="line-chart" style="width:16px;height:16px;color:var(--accent-blue);"></i>
                        Kayıt Tarihi İtibariyle Keşideci Ödeme Performansı
                    </div>
                    ${snapshot && snapshot.toplamAdet > 0 ? `
                        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px; align-items:center; margin-bottom:12px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
                                    <span>Ödenen: ${snapshot.odenenAdet} / ${snapshot.toplamAdet} Çek</span>
                                    <span>Karşılıksız: ${snapshot.karsiliksizAdet}</span>
                                </div>
                                <div style="width:100%; height:8px; background:rgba(255,255,255,0.04); border-radius:99px; overflow:hidden; display:flex;">
                                    ${snapshot.odenenAdet > 0 ? `<div style="width:${(snapshot.odenenAdet / snapshot.toplamAdet) * 100}%; background:var(--accent-emerald);"></div>` : ''}
                                    ${snapshot.bekleyenAdet > 0 ? `<div style="width:${(snapshot.bekleyenAdet / snapshot.toplamAdet) * 100}%; background:var(--accent-blue);"></div>` : ''}
                                    ${snapshot.karsiliksizAdet > 0 ? `<div style="width:${(snapshot.karsiliksizAdet / snapshot.toplamAdet) * 100}%; background:var(--accent-rose);"></div>` : ''}
                                </div>
                                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px;">
                                    * Bu çeki <strong>${utils.formatTarih(c.kayitTarihi || '—')}</strong> tarihinde sisteme kaydettiğiniz güne kadarki performanstır.
                                </div>
                            </div>
                            <div style="text-align:center; border-left:1px solid var(--border-color); padding-left:12px;">
                                <div style="font-size:1.8rem; font-family:var(--font-display); font-weight:800; color:${
                                    snapshot.performans < 0 ? 'var(--text-muted)' :
                                    snapshot.performans >= 90 ? 'var(--accent-emerald)' :
                                    snapshot.performans >= 70 ? 'var(--accent-blue)' :
                                    snapshot.performans >= 50 ? 'var(--accent-gold)' : 'var(--accent-rose)'
                                }; line-height: 1.1;">
                                    ${snapshot.performans >= 0 ? '%' + snapshot.performans : '—'}
                                </div>
                                <div style="font-size:0.65rem; font-weight:600; text-transform:uppercase; color:var(--text-secondary); margin-top:2px;">Ödeme Performansı</div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:0.75rem;">
                            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:4px; padding:6px; text-align:center;">
                                <span style="color:var(--text-muted); display:block; font-size:0.6rem; text-transform:uppercase;">Toplam Çek</span>
                                <strong>${snapshot.toplamAdet} adet</strong><br>
                                <span style="font-size:0.65rem; color:var(--text-muted);">${utils.formatPara(snapshot.toplamTutar)}</span>
                            </div>
                            <div style="background:rgba(16,185,129,0.03); border:1px solid rgba(16,185,129,0.1); border-radius:4px; padding:6px; text-align:center;">
                                <span style="color:var(--accent-emerald); display:block; font-size:0.6rem; text-transform:uppercase;">Ödenen</span>
                                <strong class="text-success">${snapshot.odenenAdet} adet</strong><br>
                                <span style="font-size:0.65rem; color:var(--text-muted);">${utils.formatPara(snapshot.odenenTutar)}</span>
                            </div>
                            <div style="background:rgba(244,63,94,0.03); border:1px solid rgba(244,63,94,0.1); border-radius:4px; padding:6px; text-align:center;">
                                <span style="color:var(--accent-rose); display:block; font-size:0.6rem; text-transform:uppercase;">Karşılıksız</span>
                                <strong class="text-danger">${snapshot.karsiliksizAdet} adet</strong><br>
                                <span style="font-size:0.65rem; color:var(--text-muted);">${utils.formatPara(snapshot.karsiliksizTutar)}</span>
                            </div>
                            <div style="background:rgba(59,130,246,0.03); border:1px solid rgba(59,130,246,0.1); border-radius:4px; padding:6px; text-align:center;">
                                <span style="color:var(--accent-blue); display:block; font-size:0.6rem; text-transform:uppercase;">Bekleyen</span>
                                <strong class="text-info">${snapshot.bekleyenAdet} adet</strong><br>
                                <span style="font-size:0.65rem; color:var(--text-muted);">${utils.formatPara(snapshot.bekleyenTutar)}</span>
                            </div>
                        </div>
                    ` : `
                        <div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px;">
                            <i data-lucide="info" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>
                            Bu keşidecinin sisteme girilen ilk çekidir. Kayıt tarihinden önce ödenmiş veya yazılmış çek geçmişi bulunmamaktadır.
                        </div>
                    `}
                </div>

                <!-- Mevcut Risk Durumu -->
                <div style="background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.1); border-radius:var(--radius-md); padding:16px; margin-bottom:20px; text-align:center;">
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600; margin-bottom:8px;">Mevcut Risk / Findeks Durumu</div>
                    ${riskDisplay}
                    ${c.istihbaratNotu ? `<div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border-color); font-size:0.8rem; color:var(--text-secondary); text-align:left;"><strong>İstihbarat Notu:</strong> ${c.istihbaratNotu}</div>` : ''}
                </div>

                <!-- 🌐 Hızlı İstihbarat Sorgulama Bağlantıları -->
                <div style="margin-bottom:20px;">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary); margin-bottom:12px;">🌐 Hızlı İstihbarat Sorgulama</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <a href="https://www.findeks.com/" target="_blank" class="istihbarat-link" style="display:flex; align-items:center; gap:10px; padding:14px; background:linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08)); border:1px solid rgba(59,130,246,0.2); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition: all 0.2s;">
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.1rem;">F</div>
                            <div>
                                <div style="font-weight:600; font-size:0.85rem;">Findeks Risk Raporu</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">Kredi notu ve risk analizi</div>
                            </div>
                        </a>
                        <a href="https://www.kkb.com.tr/" target="_blank" class="istihbarat-link" style="display:flex; align-items:center; gap:10px; padding:14px; background:linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.08)); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition: all 0.2s;">
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#22c55e);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.75rem;">KKB</div>
                            <div>
                                <div style="font-weight:600; font-size:0.85rem;">KKB Risk Merkezi</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">Kredi kayıt bürosu sorgusu</div>
                            </div>
                        </a>
                        <a href="https://www.ticaretsicil.gov.tr/" target="_blank" class="istihbarat-link" style="display:flex; align-items:center; gap:10px; padding:14px; background:linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,179,8,0.08)); border:1px solid rgba(245,158,11,0.2); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition: all 0.2s;">
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#eab308);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.65rem;">TSG</div>
                            <div>
                                <div style="font-weight:600; font-size:0.85rem;">Ticaret Sicil Gazetesi</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">Firma sicil ve ortaklık bilgileri</div>
                            </div>
                        </a>
                        <a href="https://www.tobb.org.tr/" target="_blank" class="istihbarat-link" style="display:flex; align-items:center; gap:10px; padding:14px; background:linear-gradient(135deg, rgba(244,63,94,0.08), rgba(239,68,68,0.08)); border:1px solid rgba(244,63,94,0.2); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition: all 0.2s;">
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f43f5e,#ef4444);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.6rem;">TOBB</div>
                            <div>
                                <div style="font-weight:600; font-size:0.85rem;">TOBB Firma Sorgu</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">Oda kaydı ve vergi bilgileri</div>
                            </div>
                        </a>
                        <a href="https://www.turkiye.gov.tr/" target="_blank" class="istihbarat-link" style="display:flex; align-items:center; gap:10px; padding:14px; background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08)); border:1px solid rgba(99,102,241,0.2); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition: all 0.2s;">
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.6rem;">e-Dev</div>
                            <div>
                                <div style="font-weight:600; font-size:0.85rem;">e-Devlet Sorgulama</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">İcra, haciz, yasaklılık sorguları</div>
                            </div>
                        </a>
                        <a href="https://www.isbasvuru.gov.tr/" target="_blank" class="istihbarat-link" style="display:flex; align-items:center; gap:10px; padding:14px; background:linear-gradient(135deg, rgba(14,165,233,0.08), rgba(6,182,212,0.08)); border:1px solid rgba(14,165,233,0.2); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition: all 0.2s;">
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.6rem;">SGK</div>
                            <div>
                                <div style="font-weight:600; font-size:0.85rem;">SGK İşveren Sorgu</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">İşyeri aktiflik kontrolü</div>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Risk Notu Güncelleme Formu -->
                <form onsubmit="CeklerModule.riskGuncelle(event, ${id})">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary); margin-bottom:12px;">📝 Risk / İstihbarat Notunu Güncelle</div>
                    <div class="grid-cols-2">
                        <div class="form-group">
                            <label class="form-label">Findeks / Risk Puanı</label>
                            <input type="number" id="ist-risk-notu" class="form-control" placeholder="Ör: 1650" min="0" max="1900" value="${c.riskNotu || ''}">
                            <small style="color:var(--text-muted); font-size:0.7rem;">0-999: Yüksek Risk | 1000-1499: Orta | 1500+: Düşük Risk</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">İstihbarat Değerlendirme Notu</label>
                            <textarea id="ist-not" class="form-control" rows="3" placeholder="Müşteri veya firma hakkında edindiğiniz istihbarat bilgilerini buraya yazın...">${c.istihbaratNotu || ''}</textarea>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding-bottom: 0;">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Kapat</button>
                        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Risk Notunu Kaydet</button>
                    </div>
                </form>
            </div>
        `;
        openModal("🔍 Çek İstihbarat Merkezi — " + c.kesideci, formHtml);
    },

    async riskGuncelle(e, id) {
        e.preventDefault();
        try {
            const cekler = await DBService.getCekler();
            const c = cekler.find(x => x.id === id);

            c.riskNotu = document.getElementById("ist-risk-notu").value || "";
            c.istihbaratNotu = document.getElementById("ist-not").value || "";

            delete c.id;
            await DBService.updateCek(id, c);

            closeModal();
            App.showToast("İstihbarat / risk notu başarıyla güncellendi!");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    }
};
