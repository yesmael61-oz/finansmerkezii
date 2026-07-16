/* ==========================================================================
   💰 İS-YIL FİNANS VE MUHASEBE PROGRAMI - BANKA KREDİLERİ YÖNETİM MODÜLÜ (KREDILER.JS)
   ========================================================================== */

const KredilerModule = {
    activeTab: "BCH",
    secilenBchDonem: "2",
    secilenBchYil: new Date().getFullYear().toString(),

    async render() {
        const container = document.getElementById("page-container");
        
        const krediler = await DBService.getKrediler();
        const odemeler = await DBService.getKrediOdemeleri();

        // Kredileri türlerine göre filtrele
        const bchKrediler = krediler.filter(k => k.krediTuru === "BCH");
        const spotKrediler = krediler.filter(k => k.krediTuru === "Spot");
        const taksitliKrediler = krediler.filter(k => k.krediTuru === "Taksitli");
        const dbsKrediler = krediler.filter(k => k.krediTuru === "DBS");

        let html = `
            <!-- Tab Butonları -->
            <div class="tab-container">
                <button class="tab-btn ${this.activeTab === 'BCH' ? 'active' : ''}" onclick="KredilerModule.switchTab('BCH')">BCH (Rotatif) Kredileri</button>
                <button class="tab-btn ${this.activeTab === 'DBS' ? 'active' : ''}" onclick="KredilerModule.switchTab('DBS')">DBS Limitleri</button>
                <button class="tab-btn ${this.activeTab === 'Spot' ? 'active' : ''}" onclick="KredilerModule.switchTab('Spot')">Spot Krediler</button>
                <button class="tab-btn ${this.activeTab === 'Taksitli' ? 'active' : ''}" onclick="KredilerModule.switchTab('Taksitli')">Taksitli Krediler</button>
            </div>

            <!-- Ekleme Butonu ve Rapor Üst Alanı -->
            <div class="card-title-area" style="margin-bottom: 24px;">
                <div>
                    <h3 style="font-family:var(--font-display);">${this.activeTab} Kredileriniz</h3>
                </div>
                <button class="btn btn-primary" onclick="KredilerModule.showKrediEkleModal()">
                    <i data-lucide="plus"></i> Yeni Kredi Girişi Yap
                </button>
            </div>
        `;

        if (this.activeTab === "BCH") {
            html += this.renderBCHTab(bchKrediler);
        } else if (this.activeTab === "Spot") {
            html += this.renderSpotTab(spotKrediler);
        } else if (this.activeTab === "Taksitli") {
            html += this.renderTaksitliTab(taksitliKrediler, odemeler);
        } else if (this.activeTab === "DBS") {
            html += await this.renderDBSTab(dbsKrediler);
        }

        container.innerHTML = html;
        lucide.createIcons();
    },

    switchTab(tabName) {
        this.activeTab = tabName;
        this.render();
    },

    // --- 🔹 BCH (ROTATİF) KREDİLER TABLOSU ---
    renderBCHTab(krediler) {
        if (krediler.length === 0) {
            return `
                <div class="empty-state card">
                    <i data-lucide="help-circle"></i>
                    <h4>BCH Kredisi Bulunmuyor</h4>
                    <p>Henüz tanımlanmış bir Borçlu Cari Hesap (BCH) krediniz bulunmamaktadır. Kredi ekleyerek limit ve risk takibine başlayabilirsiniz.</p>
                </div>
            `;
        }

        const donem = this.secilenBchDonem;
        const yil = this.secilenBchYil;
        
        let bas = "", bit = "";
        let donemMetni = "";
        if (donem === "1") { bas = `${yil}-01-01`; bit = `${yil}-03-31`; donemMetni = "1. Çeyrek (1 Ocak - 31 Mart)"; }
        else if (donem === "2") { bas = `${yil}-04-01`; bit = `${yil}-06-30`; donemMetni = "2. Çeyrek (1 Nisan - 30 Haziran)"; }
        else if (donem === "3") { bas = `${yil}-07-01`; bit = `${yil}-09-30`; donemMetni = "3. Çeyrek (1 Temmuz - 30 Eylül)"; }
        else if (donem === "4") { bas = `${yil}-10-01`; bit = `${yil}-12-31`; donemMetni = "4. Çeyrek (1 Ekim - 31 Aralık)"; }
        else if (donem === "5") { bas = `${yil}-01-01`; bit = `${yil}-12-31`; donemMetni = "Tüm Yıl (1 Ocak - 31 Aralık)"; }

        let faizSatirları = "";
        let toplamNetFaiz = 0;
        let toplamBsmv = 0;
        let genelToplamFaiz = 0;

        krediler.forEach(k => {
            const res = this.calculateBchInterestForPeriod(k, bas, bit);
            toplamNetFaiz += res.netFaiz;
            toplamBsmv += res.bsmv;
            genelToplamFaiz += res.toplam;

            const gunler = res.detayi.reduce((sum, d) => sum + d.gun, 0);

            faizSatirları += `
                <tr>
                    <td><strong>${k.bankaAdi}</strong></td>
                    <td>% ${k.faizOrani}</td>
                    <td><span class="badge badge-info">${gunler} gün</span></td>
                    <td><strong class="text-danger">${utils.formatPara(res.netFaiz)}</strong></td>
                    <td>${utils.formatPara(res.bsmv)}</td>
                    <td><strong class="text-danger" style="font-size:0.95rem;">${utils.formatPara(res.toplam)}</strong></td>
                    <td style="text-align: right;">
                        <button class="btn btn-sm btn-secondary" onclick="KredilerModule.showFaizDetayModal(${k.id}, '${bas}', '${bit}')">
                            <i data-lucide="eye"></i> Detay Gör
                        </button>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="card" style="margin-bottom:24px;">
                <div class="table-responsive">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Banka Adı</th>
                                <th>Kullanılan Limit / Borç</th>
                                <th>Faiz Oranı (%)</th>
                                <th>Kredi Durumu</th>
                                <th style="text-align: right;">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${krediler.map(k => {
                                const komTut = k.komisyonTutari || 0;
                                const masTut = k.krediMasrafi || 0;
                                return `
                                    <tr>
                                        <td>
                                            <strong>${k.bankaAdi}</strong><br>
                                            <small style="color:var(--text-secondary); font-size:0.75rem;">
                                                Komisyon: ${utils.formatPara(komTut)} | Masraf: ${utils.formatPara(masTut)}
                                            </small>
                                        </td>
                                        <td><strong class="text-danger" style="font-size:1rem;">${utils.formatPara(k.tutar)}</strong></td>
                                        <td><span class="badge badge-info">% ${k.faizOrani}</span></td>
                                        <td>
                                            <span class="badge ${k.durum === 'Aktif' ? 'badge-success' : 'badge-danger'}">
                                                ${k.durum}
                                            </span>
                                        </td>
                                        <td style="text-align: right;">
                                            <button class="btn btn-sm btn-info" onclick="KredilerModule.showBchOdemeModal(${k.id})" style="margin-right:6px;">
                                                <i data-lucide="arrow-right-left"></i> Borç Azalt/Ekle
                                            </button>
                                            <button class="btn btn-danger btn-sm btn-icon-only" onclick="KredilerModule.krediSilConfirm(${k.id})" title="Krediyi Sil">
                                                <i data-lucide="trash-2"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="5" style="padding:0 24px; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.01);">
                                            <div style="margin-bottom:8px; margin-top:4px;">
                                                <button class="btn btn-secondary btn-sm" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('span').textContent = this.nextElementSibling.style.display === 'none' ? 'BCH Ekstre Geçmişini Göster' : 'BCH Ekstre Geçmişini Gizle';" style="font-size:0.7rem; padding:3px 6px;">
                                                    <i data-lucide="list"></i> <span>BCH Ekstre Geçmişini Göster</span>
                                                </button>
                                                <div style="display:none; margin-top:8px; margin-bottom:12px; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px; background:rgba(0,0,0,0.15);">
                                                    <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:6px;"><i data-lucide="book-open" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i> BCH Hesap Ekstresi (İşlem & Valör Detayı)</div>
                                                    <div class="table-responsive">
                                                        <table class="custom-table" style="font-size:0.75rem; margin-bottom:0;">
                                                            <thead>
                                                                <tr>
                                                                    <th>İşlem Tarihi</th>
                                                                    <th>Valör Tarihi</th>
                                                                    <th>İşlem Tipi</th>
                                                                    <th>İşlem Tutarı</th>
                                                                    <th>Hesap Bakiyesi</th>
                                                                    <th>Açıklama</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${(k.hareketler || [
                                                                    {
                                                                        tarih: k.baslangicTarihi,
                                                                        tip: "kullanim",
                                                                        tutar: k.tutar,
                                                                        bakiye: k.tutar,
                                                                        aciklama: "Kredi Giriş Başlangıç"
                                                                    }
                                                                ]).map(h => {
                                                                    const valorT = utils.getValorTarihi(h.tarih, h.tip);
                                                                    const isKayma = valorT !== h.tarih;
                                                                    return `
                                                                        <tr>
                                                                            <td>${utils.formatTarih(h.tarih)}</td>
                                                                            <td><strong>${utils.formatTarih(valorT)}</strong> ${isKayma ? '<span class="badge badge-warning" style="font-size:0.6rem; padding:1px 4px; font-weight:600;">Hafta Sonu Valör Kayması</span>' : ''}</td>
                                                                            <td><span class="badge ${h.tip === 'odeme' ? 'badge-success' : 'badge-danger'}">${h.tip === 'odeme' ? 'Ödeme (Bakiye Azalışı)' : 'Kullanım (Bakiye Artışı)'}</span></td>
                                                                            <td><strong>${utils.formatPara(h.tutar)}</strong></td>
                                                                            <td><strong>${utils.formatPara(h.bakiye)}</strong></td>
                                                                            <td style="color:var(--text-secondary);">${h.aciklama || ''}</td>
                                                                        </tr>
                                                                    `;
                                                                }).join("")}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="border-left: 4px solid var(--accent-rose);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
                    <div>
                        <h4 style="font-size:1.1rem; font-family:var(--font-display);"><i data-lucide="calculator"></i> BCH Dönem Sonu Faiz Tahakkuk Analizi</h4>
                        <small style="color:var(--text-muted);">Günlük valör dengesi ve %5 BSMV dahil bankacılık standartlarında faiz hesaplama</small>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <select class="form-control" style="width:120px; padding:6px 12px; font-size:0.85rem;" onchange="KredilerModule.changeBchFaizPeriod(this.value, 'yil')">
                            <option value="2025" ${yil === '2025' ? 'selected' : ''}>2025 Yılı</option>
                            <option value="2026" ${yil === '2026' ? 'selected' : ''}>2026 Yılı</option>
                            <option value="2027" ${yil === '2027' ? 'selected' : ''}>2027 Yılı</option>
                        </select>
                        <select class="form-control" style="width:230px; padding:6px 12px; font-size:0.85rem;" onchange="KredilerModule.changeBchFaizPeriod(this.value, 'donem')">
                            <option value="1" ${donem === '1' ? 'selected' : ''}>1. Çeyrek (1 Ocak - 31 Mart)</option>
                            <option value="2" ${donem === '2' ? 'selected' : ''}>2. Çeyrek (1 Nisan - 30 Haziran)</option>
                            <option value="3" ${donem === '3' ? 'selected' : ''}>3. Çeyrek (1 Temmuz - 30 Eylül)</option>
                            <option value="4" ${donem === '4' ? 'selected' : ''}>4. Çeyrek (1 Ekim - 31 Aralık)</option>
                            <option value="5" ${donem === '5' ? 'selected' : ''}>Tüm Yıl (1 Ocak - 31 Aralık)</option>
                        </select>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="custom-table" style="font-size:0.85rem;">
                        <thead>
                            <tr>
                                <th>Banka Adı</th>
                                <th>Yıllık Faiz (%)</th>
                                <th>Toplam Gün</th>
                                <th>Net Faiz</th>
                                <th>BSMV (%5)</th>
                                <th>Toplam Tahakkuk Borcu</th>
                                <th style="text-align: right;">Hesaplama</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${faizSatirları}
                            <tr style="background:rgba(255,255,255,0.02); font-weight:700; font-size:0.9rem;">
                                <td colspan="3">GENEL TOPLAM</td>
                                <td><strong class="text-danger">${utils.formatPara(toplamNetFaiz)}</strong></td>
                                <td>${utils.formatPara(toplamBsmv)}</td>
                                <td><strong class="text-danger" style="font-size:1.05rem;">${utils.formatPara(genelToplamFaiz)}</strong></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // --- 🔹 DBS KREDİLER TABLOSU ---
    async renderDBSTab(krediler) {
        if (krediler.length === 0) {
            return `
                <div class="empty-state card">
                    <i data-lucide="help-circle"></i>
                    <h4>DBS Limiti Bulunmuyor</h4>
                    <p>Henüz tanımlanmış bir Doğrudan Borçlandırma Sistemi (DBS) limitiniz bulunmamaktadır. Limit ekleyerek fatura takibine başlayabilirsiniz.</p>
                </div>
            `;
        }

        const faturalar = await DBService.getDbsFaturalar();

        return `
            <div class="card">
                <div class="table-responsive">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Banka / Tedarikçi</th>
                                <th>Toplam Limit</th>
                                <th>Bekleyen Faturalar (Risk)</th>
                                <th>Kullanılabilir Limit</th>
                                <th>Komisyon & Masraf</th>
                                <th>Durum</th>
                                <th style="text-align: right;">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${krediler.map(k => {
                                const limitFaturalari = faturalar.filter(f => f.krediId === k.id);
                                const bekleyenTutar = limitFaturalari
                                    .filter(f => f.durum === 'Bekliyor')
                                    .reduce((sum, f) => sum + (parseFloat(f.tutar) || 0), 0);
                                const kullanilabilirLimit = Math.max(0, k.tutar - bekleyenTutar);
                                const komisyon = k.komisyonTutari || 0;
                                const masraf = k.krediMasrafi || 0;

                                return `
                                    <tr>
                                        <td>
                                            <strong>${k.bankaAdi}</strong><br>
                                            <small style="color:var(--text-secondary);">${k.tedarikciFirma || 'Belirtilmemiş'}</small>
                                        </td>
                                        <td><strong>${utils.formatPara(k.tutar)}</strong></td>
                                        <td><strong class="text-warning">${utils.formatPara(bekleyenTutar)}</strong></td>
                                        <td><strong class="text-success">${utils.formatPara(kullanilabilirLimit)}</strong></td>
                                        <td>
                                            <small style="color:var(--text-secondary);">
                                                Kom: ${utils.formatPara(komisyon)}<br>Masraf: ${utils.formatPara(masraf)}
                                            </small>
                                        </td>
                                        <td><span class="badge badge-success">${k.durum}</span></td>
                                        <td style="text-align: right;">
                                            <button class="btn btn-sm btn-secondary" onclick="KredilerModule.showDbsFaturalarModal(${k.id})" style="margin-right:6px;">
                                                <i data-lucide="file-text"></i> Faturaları Yönet
                                            </button>
                                            <button class="btn btn-danger btn-sm btn-icon-only" onclick="KredilerModule.krediSilConfirm(${k.id})" title="Limiti Sil">
                                                <i data-lucide="trash-2"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // --- 🔹 SPOT KREDİLER TABLOSU ---
    renderSpotTab(krediler) {
        if (krediler.length === 0) {
            return `
                <div class="empty-state card">
                    <i data-lucide="help-circle"></i>
                    <h4>Spot Kredi Bulunmuyor</h4>
                    <p>Tanımlanmış tek vadeli (Spot) krediniz bulunmamaktadır.</p>
                </div>
            `;
        }

        return `
            <div class="card">
                <div class="table-responsive">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Banka Adı</th>
                                <th>Kredi Tutarı</th>
                                <th>Faiz Oranı (%)</th>
                                <th>Vade Tarihi</th>
                                <th>Kalan Gün</th>
                                <th>Durum</th>
                                <th style="text-align: right;">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${krediler.map(k => {
                                const komTut = k.komisyonTutari || 0;
                                const masTut = k.krediMasrafi || 0;
                                return `
                                    <tr>
                                        <td>
                                            <strong>${k.bankaAdi}</strong><br>
                                            <small style="color:var(--text-secondary); font-size:0.75rem;">
                                                Komisyon: ${utils.formatPara(komTut)} | Masraf: ${utils.formatPara(masTut)}
                                            </small>
                                        </td>
                                        <td><strong class="text-danger">${utils.formatPara(k.tutar)}</strong></td>
                                        <td><span class="badge badge-info">% ${k.faizOrani}</span></td>
                                        <td><strong>${utils.formatTarih(k.vadeTarihi)}</strong></td>
                                        <td>${utils.formatKalanGun(k.vadeTarihi)}</td>
                                        <td>
                                            <span class="badge ${k.durum === 'Aktif' ? 'badge-success' : 'badge-danger'}">
                                                ${k.durum}
                                            </span>
                                        </td>
                                        <td style="text-align: right;">
                                            ${k.durum === 'Aktif' ? `
                                                <button class="btn btn-sm btn-primary" onclick="KredilerModule.krediKapat(${k.id})" style="margin-right:6px;">
                                                    <i data-lucide="check"></i> Ödendi İşaretle
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-danger btn-sm btn-icon-only" onclick="KredilerModule.krediSilConfirm(${k.id})" title="Krediyi Sil">
                                                <i data-lucide="trash-2"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // --- 🔹 TAKSİTLİ KREDİLER TABLOSU & TAKSİT TAKİBİ ---
    renderTaksitliTab(krediler, tumOdemeler) {
        if (krediler.length === 0) {
            return `
                <div class="empty-state card">
                    <i data-lucide="help-circle"></i>
                    <h4>Taksitli Kredi Bulunmuyor</h4>
                    <p>Otomatik taksit planına sahip taksitli tüketici/ticari krediniz bulunmamaktadır.</p>
                </div>
            `;
        }

        return krediler.map(k => {
            const odemeler = tumOdemeler.filter(o => o.krediId === k.id);
            const odenenler = odemeler.filter(o => o.odendiMi);
            const odenmeyenler = odemeler.filter(o => !o.odendiMi);
            
            // Kalan Toplam Borç
            const kalanBorc = odenmeyenler.reduce((sum, o) => sum + parseFloat(o.tutar), 0);
            
            return `
                <div class="card" style="margin-bottom:30px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:16px; margin-bottom:16px;">
                        <div>
                            <h4 style="font-size:1.15rem; font-family:var(--font-display);">${k.bankaAdi} - Taksitli Kredisi</h4>
                            <small style="color:var(--text-secondary); font-size:0.75rem;">
                                Başlangıç: ${utils.formatTarih(k.baslangicTarihi)} | Faiz Oranı: %${k.faizOrani} | 
                                Komisyon: ${utils.formatPara(k.komisyonTutari || 0)} | Masraf: ${utils.formatPara(k.krediMasrafi || 0)}
                            </small>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">Kalan Borç Riski</div>
                            <strong class="text-danger" style="font-size:1.3rem;">${utils.formatPara(kalanBorc)}</strong>
                        </div>
                    </div>

                    <div class="grid-main-side">
                        <!-- Taksit Ödeme Tablosu -->
                        <div>
                            <h5 style="margin-bottom:12px; font-size:0.9rem; color:var(--text-secondary);"><i data-lucide="list-ordered"></i> Taksit Ödeme Planı</h5>
                            <div class="table-responsive" style="max-height: 250px; overflow-y:auto;">
                                <table class="custom-table" style="font-size:0.8rem;">
                                    <thead>
                                        <tr>
                                            <th>Taksit No</th>
                                            <th>Vade Tarihi</th>
                                            <th>Tutar</th>
                                            <th>Durum</th>
                                            <th style="text-align:right;">Ödeme</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${odemeler.map(o => `
                                            <tr style="${o.odendiMi ? 'opacity:0.6;' : ''}">
                                                <td><strong>${o.taksitNo} / ${odemeler.length}</strong></td>
                                                <td><strong>${utils.formatTarih(o.vadeTarihi)}</strong></td>
                                                <td><strong class="${o.odendiMi ? 'text-success' : 'text-danger'}">${utils.formatPara(o.tutar)}</strong></td>
                                                <td>
                                                    <span class="badge ${o.odendiMi ? 'badge-success' : 'badge-danger'}">
                                                        ${o.odendiMi ? 'Ödendi' : 'Ödenmedi'}
                                                    </span>
                                                </td>
                                                <td style="text-align:right;">
                                                    ${!o.odendiMi ? `
                                                        <button class="btn btn-sm btn-primary" onclick="KredilerModule.taksitOde(${o.id}, ${k.id})">
                                                            Öde
                                                        </button>
                                                    ` : `
                                                        <button class="btn btn-sm btn-secondary" onclick="KredilerModule.taksitIptal(${o.id}, ${k.id})">
                                                            İptal Et
                                                        </button>
                                                    `}
                                                </td>
                                            </tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Kredi Özeti -->
                        <div style="background:rgba(0,0,0,0.15); border-radius:var(--radius-md); padding:20px; display:flex; flex-direction:column; justify-content:space-between; border:1px solid var(--border-color);">
                            <div>
                                <h5 style="margin-bottom:12px; font-size:0.9rem; color:var(--text-secondary);">Kredi Özet Durumu</h5>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                                    <span>İlk Alınan Tutar:</span>
                                    <strong>${utils.formatPara(k.tutar)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                                    <span>Komisyon Tutarı:</span>
                                    <strong>${utils.formatPara(k.komisyonTutari || 0)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                                    <span>Kredi Masrafı:</span>
                                    <strong>${utils.formatPara(k.krediMasrafi || 0)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                                    <span>Taksit Adedi:</span>
                                    <strong>${odemeler.length} Ay</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                                    <span>Ödenen Taksit:</span>
                                    <strong class="text-success">${odenenler.length} Taksit</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                                    <span>Kalan Taksit:</span>
                                    <strong class="text-warning">${odenmeyenler.length} Taksit</strong>
                                </div>
                            </div>

                            <button class="btn btn-danger btn-block btn-sm" onclick="KredilerModule.krediSilConfirm(${k.id})" style="margin-top:20px;">
                                <i data-lucide="trash-2"></i> Krediyi Kapat ve Tamamen Sil
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    },

    // --- ➕ KREDİ EKLEME MODALI ---
    async showKrediEkleModal() {
        let bankaOptions = '<option value="">— Banka Seçin —</option>';
        try {
            const bankalar = await DBService.getBankalar();
            bankalar.forEach(b => {
                bankaOptions += `<option value="${b.bankaAdi}">${b.bankaAdi}${b.subeAdi ? ' - ' + b.subeAdi : ''}</option>`;
            });
        } catch(e) { }
        bankaOptions += '<option value="__yeni__">➕ Yeni Banka Ekle...</option>';

        const formHtml = `
            <form id="kredi-ekle-form" onsubmit="KredilerModule.krediKaydet(event)">
                <div class="form-group">
                    <label class="form-label">Kredi Türü *</label>
                    <select id="kr-tur" class="form-control" onchange="KredilerModule.handleModalTurDegisim()" required>
                        <option value="BCH">BCH (Borçlu Cari Hesap / Rotatif)</option>
                        <option value="DBS">DBS (Doğrudan Borçlandırma Sistemi)</option>
                        <option value="Spot">Spot (Tek Vadeli)</option>
                        <option value="Taksitli">Taksitli (Eşit Ödemeli)</option>
                    </select>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Banka Adı *</label>
                        <select id="kr-banka" class="form-control" onchange="KredilerModule.handleBankaSecim()" required>
                            ${bankaOptions}
                        </select>
                        <input type="text" id="kr-banka-manual" class="form-control" placeholder="Banka adını yazın" style="display:none; margin-top:8px;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kredi Tutarı (Limit / Anapara) *</label>
                        <input type="number" step="0.01" id="kr-tutar" class="form-control" placeholder="Tutar girin" required>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Yıllık Faiz Oranı (%) <span id="kr-faiz-yildiz">*</span></label>
                        <input type="number" step="0.01" id="kr-faiz" class="form-control" placeholder="Örn: 45">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Başlangıç Tarihi *</label>
                        <input type="date" id="kr-baslangic" class="form-control" value="${new Date().toISOString().slice(0,10)}" required>
                    </div>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Kredi Komisyon Tutarı (₺)</label>
                        <input type="number" step="0.01" id="kr-komisyon" class="form-control" placeholder="Varsa komisyon tutarı" min="0">
                    </div>
                    <div class="form-group" id="kr-masraf-alani">
                        <label class="form-label">Kredi Masrafı / Dosya Ücreti (₺)</label>
                        <input type="number" step="0.01" id="kr-masraf" class="form-control" placeholder="Varsa masraf tutarı" min="0">
                    </div>
                </div>

                <div class="form-group" id="dbs-fields" style="display:none;">
                    <label class="form-label">Tedarikçi Firma Adı *</label>
                    <input type="text" id="kr-tedarikci" class="form-control" placeholder="Örn: Petrol Ofisi">
                </div>

                <div class="form-group" id="spot-fields" style="display:none;">
                    <label class="form-label">Vade Sonu Tarihi *</label>
                    <input type="date" id="kr-vade" class="form-control">
                </div>

                <div class="form-group" id="taksitli-fields" style="display:none;">
                    <label class="form-label">Taksit Sayısı (Ay) *</label>
                    <input type="number" id="kr-taksit-sayisi" class="form-control" placeholder="Örn: 12">
                </div>

                <div class="modal-footer" style="padding-bottom: 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
                    <button type="submit" class="btn btn-primary">Krediyi Kaydet</button>
                </div>
            </form>
        `;
        openModal("Yeni Banka Kredisi Ekle", formHtml);
        this.handleModalTurDegisim();
    },

    handleBankaSecim() {
        const select = document.getElementById('kr-banka');
        const manual = document.getElementById('kr-banka-manual');
        if (select.value === '__yeni__') {
            manual.style.display = 'block';
            manual.setAttribute('required', 'true');
            manual.focus();
        } else {
            manual.style.display = 'none';
            manual.removeAttribute('required');
        }
    },

    handleModalTurDegisim() {
        const tur = document.getElementById("kr-tur").value;
        const spotFields = document.getElementById("spot-fields");
        const taksitFields = document.getElementById("taksitli-fields");
        const dbsFields = document.getElementById("dbs-fields");
        const faizInput = document.getElementById("kr-faiz");
        const faizYildiz = document.getElementById("kr-faiz-yildiz");

        if (tur === "Spot") {
            spotFields.style.display = "block";
            taksitFields.style.display = "none";
            dbsFields.style.display = "none";
            document.getElementById("kr-vade").setAttribute("required", "true");
            document.getElementById("kr-taksit-sayisi").removeAttribute("required");
            document.getElementById("kr-tedarikci").removeAttribute("required");
            faizInput.setAttribute("required", "true");
            faizYildiz.style.display = "inline";
        } else if (tur === "Taksitli") {
            spotFields.style.display = "none";
            taksitFields.style.display = "block";
            dbsFields.style.display = "none";
            document.getElementById("kr-vade").removeAttribute("required");
            document.getElementById("kr-taksit-sayisi").setAttribute("required", "true");
            document.getElementById("kr-tedarikci").removeAttribute("required");
            faizInput.setAttribute("required", "true");
            faizYildiz.style.display = "inline";
        } else if (tur === "DBS") {
            spotFields.style.display = "none";
            taksitFields.style.display = "none";
            dbsFields.style.display = "block";
            document.getElementById("kr-vade").removeAttribute("required");
            document.getElementById("kr-taksit-sayisi").removeAttribute("required");
            document.getElementById("kr-tedarikci").setAttribute("required", "true");
            faizInput.removeAttribute("required");
            faizYildiz.style.display = "none";
        } else {
            spotFields.style.display = "none";
            taksitFields.style.display = "none";
            dbsFields.style.display = "none";
            document.getElementById("kr-vade").removeAttribute("required");
            document.getElementById("kr-taksit-sayisi").removeAttribute("required");
            document.getElementById("kr-tedarikci").removeAttribute("required");
            faizInput.setAttribute("required", "true");
            faizYildiz.style.display = "inline";
        }
    },

    // --- 💾 KREDİ KAYIT MOTORU ---
    async krediKaydet(e) {
        e.preventDefault();
        try {
            const tur = document.getElementById("kr-tur").value;
            const banka = document.getElementById("kr-banka").value === '__yeni__'
                ? document.getElementById("kr-banka-manual").value
                : document.getElementById("kr-banka").value;
            const tutar = parseFloat(document.getElementById("kr-tutar").value);
            const faiz = parseFloat(document.getElementById("kr-faiz").value);
            const baslangic = document.getElementById("kr-baslangic").value;
            const komisyon = parseFloat(document.getElementById("kr-komisyon").value) || 0;
            const masraf = parseFloat(document.getElementById("kr-masraf").value) || 0;

            const krediObj = {
                krediTuru: tur,
                bankaAdi: banka,
                tutar: tutar,
                faizOrani: faiz || 0,
                baslangicTarihi: baslangic,
                komisyonTutari: komisyon,
                krediMasrafi: masraf,
                durum: "Aktif",
                tedarikciFirma: document.getElementById("kr-tedarikci") ? document.getElementById("kr-tedarikci").value : ""
            };

            if (tur === "Spot") {
                krediObj.vadeTarihi = document.getElementById("kr-vade").value;
            }

            if (tur === "BCH") {
                krediObj.hareketler = [{
                    tarih: baslangic,
                    tip: "kullanim",
                    tutar: tutar,
                    bakiye: tutar,
                    aciklama: "İlk Giriş Kredi Kullanımı"
                }];
            }

            const krediId = await DBService.addKredi(krediObj);

            if (tur === "Taksitli") {
                const taksitSayisi = parseInt(document.getElementById("kr-taksit-sayisi").value);
                const aylikFaiz = (faiz / 12) / 100;
                let aylikTaksit = aylikFaiz > 0 ? tutar * (aylikFaiz * Math.pow(1 + aylikFaiz, taksitSayisi)) / (Math.pow(1 + aylikFaiz, taksitSayisi) - 1) : tutar / taksitSayisi;
                
                const baslangicTarihi = new Date(baslangic);
                for (let i = 1; i <= taksitSayisi; i++) {
                    const vadeTarihi = new Date(baslangicTarihi.getFullYear(), baslangicTarihi.getMonth() + i, baslangicTarihi.getDate());
                    await DBService.addKrediOdemesi({
                        krediId: krediId,
                        taksitNo: i,
                        vadeTarihi: vadeTarihi.toISOString().slice(0,10),
                        tutar: Math.round(aylikTaksit * 100) / 100,
                        odendiMi: false
                    });
                }
            }

            closeModal();
            App.showToast("Kredi başarıyla tanımlandı!");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    async showBchOdemeModal(id) {
        const krediler = await DBService.getKrediler();
        const k = krediler.find(x => x.id === id);
        const bugun = new Date().toISOString().slice(0, 10);

        const formHtml = `
            <form onsubmit="KredilerModule.bchOdemeKaydet(event, ${id})">
                <div style="margin-bottom:16px;">
                    <div style="font-size:0.8rem; color:var(--text-secondary);">Mevcut BCH Risk/Borç:</div>
                    <strong style="font-size:1.3rem; color:var(--accent-rose);">${utils.formatPara(k.tutar)}</strong>
                </div>

                <div class="form-group">
                    <label class="form-label">Aksiyon Tipi *</label>
                    <select id="bch-aksiyon" class="form-control" required>
                        <option value="azalt">Borç Ödemesi Yap (Borcu Azalt)</option>
                        <option value="arttir">Yeni Kredi Kullanımı Yap (Borcu Arttır)</option>
                    </select>
                </div>

                <div class="grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">İşlem Tutarı (₺) *</label>
                        <input type="number" step="0.01" id="bch-tutar" class="form-control" placeholder="Tutar girin" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">İşlem Tarihi *</label>
                        <input type="date" id="bch-tarih" class="form-control" value="${bugun}" required>
                    </div>
                </div>

                <div class="modal-footer" style="padding-bottom: 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                </div>
            </form>
        `;
        openModal(`${k.bankaAdi} - BCH Risk Yönetimi`, formHtml);
    },

    async bchOdemeKaydet(e, id) {
        e.preventDefault();
        try {
            const aksiyon = document.getElementById("bch-aksiyon").value;
            const tutar = parseFloat(document.getElementById("bch-tutar").value);
            const islemTarihi = document.getElementById("bch-tarih").value;

            const krediler = await DBService.getKrediler();
            const k = krediler.find(x => x.id === id);

            if (!k.hareketler) {
                const baslangicBakiye = k.tutar + (aksiyon === "azalt" ? tutar : -tutar);
                k.hareketler = [{
                    tarih: k.baslangicTarihi,
                    tip: "kullanim",
                    tutar: baslangicBakiye,
                    bakiye: baslangicBakiye,
                    aciklama: "İlk Giriş Kredi Kullanımı"
                }];
            }

            let yeniTutar = aksiyon === "azalt" ? Math.max(0, k.tutar - tutar) : k.tutar + tutar;
            k.hareketler.push({
                tarih: islemTarihi,
                tip: aksiyon === "azalt" ? "odeme" : "kullanim",
                tutar: tutar,
                bakiye: yeniTutar,
                aciklama: aksiyon === "azalt" ? "Borç Ödemesi" : "Yeni Kredi Kullanımı"
            });

            k.tutar = yeniTutar;
            delete k.id;
            await DBService.updateKredi(id, k);

            closeModal();
            App.showToast("BCH limit bakiyesi güncellendi!");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    async krediKapat(id) {
        if (confirm("Bu spot kredinin tamamen ödendiğini onaylıyor musunuz?")) {
            try {
                const krediler = await DBService.getKrediler();
                const k = krediler.find(x => x.id === id);
                k.durum = "Kapatıldı";
                const dbId = k.id;
                delete k.id;
                await DBService.updateKredi(dbId, k);
                App.showToast("Spot kredi başarıyla kapatıldı.");
                this.render();
            } catch (err) {
                App.showToast("Hata: " + err.message, "error");
            }
        }
    },

    async taksitOde(taksitId, krediId) {
        try {
            const odemeler = await DBService.getKrediOdemeleri();
            const o = odemeler.find(x => x.id === taksitId);
            o.odendiMi = true;
            o.odemeTarihi = new Date().toISOString().slice(0,10);
            const dbId = o.id;
            delete o.id;
            await DBService.updateKrediOdemesi(dbId, o);
            App.showToast("Taksit ödemesi yapıldı.");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    async taksitIptal(taksitId, krediId) {
        try {
            const odemeler = await DBService.getKrediOdemeleri();
            const o = odemeler.find(x => x.id === taksitId);
            o.odendiMi = false;
            o.odemeTarihi = "";
            const dbId = o.id;
            delete o.id;
            await DBService.updateKrediOdemesi(dbId, o);
            App.showToast("Taksit ödemesi iptal edildi.");
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    changeBchFaizPeriod(val, type) {
        if (type === 'donem') {
            this.secilenBchDonem = val;
        } else {
            this.secilenBchYil = val;
        }
        this.render();
    },

    async showFaizDetayModal(id, start, end) {
        const krediler = await DBService.getKrediler();
        const k = krediler.find(x => x.id === id);
        const res = this.calculateBchInterestForPeriod(k, start, end);
        
        let detailsHtml = `
            <div style="margin-bottom:20px; font-size:0.85rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:var(--radius-sm);">
                <strong>🏦 Kredi Bankası:</strong> ${k.bankaAdi}<br>
                <strong>📈 Yıllık Faiz Oranı:</strong> %${k.faizOrani}<br>
                <strong>📅 Hesaplama Dönemi:</strong> ${utils.formatTarih(start)} — ${utils.formatTarih(end)}
            </div>
            
            <div class="table-responsive" style="max-height:220px; overflow-y:auto; margin-bottom:16px; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                <table class="custom-table" style="font-size:0.8rem; margin-bottom:0;">
                    <thead>
                        <tr>
                            <th>Günlük Valör Aralığı</th>
                            <th>Bakiye</th>
                            <th>Gün</th>
                            <th style="text-align:right;">Net Faiz</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${res.detayi.map(d => `
                            <tr>
                                <td>${utils.formatTarih(d.baslangic)} — ${utils.formatTarih(d.bitis)}</td>
                                <td><strong>${utils.formatPara(d.bakiye)}</strong></td>
                                <td><span class="badge badge-info">${d.gun} gün</span></td>
                                <td style="text-align:right;"><strong class="text-danger">${utils.formatPara(d.faiz)}</strong></td>
                            </tr>
                        `).join("")}
                        ${res.detayi.length === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Bu dönemde bakiye hareketi veya borç bulunmamaktadır.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
            
            <div style="padding:16px; background:rgba(244,63,94,0.06); border:1px solid rgba(244,63,94,0.15); border-radius:var(--radius-md); font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>Hesaplanan Net Faiz:</span>
                    <strong>${utils.formatPara(res.netFaiz)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>Gider Vergisi (BSMV %5):</span>
                    <strong>${utils.formatPara(res.bsmv)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid var(--border-color); padding-top:8px; font-size:0.95rem;">
                    <span>TOPLAM FAİZ BORCU:</span>
                    <span class="text-danger">${utils.formatPara(res.toplam)}</span>
                </div>
            </div>
            
            <div class="modal-footer" style="padding-bottom: 0;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Kapat</button>
            </div>
        `;
        
        openModal(`${k.bankaAdi} - Faiz Hesaplama Detayı`, detailsHtml);
    },

    // --- ❌ KREDİ / LİMİT SİLME (ŞİFRE KORUMALI) ---
    async krediSilConfirm(id) {
        const password = prompt("Güvenlik Uyarısı!\nBu kredi kaydını veya DBS limitini, ona bağlı tüm hareketleriyle birlikte silmek için lütfen giriş şifrenizi girin:");
        if (password === null) return; // İptal
        
        const verified = await Security.verifyPassword(password);
        if (!verified) {
            App.showToast("Hatalı şifre! Silme işlemi iptal edildi.", "error");
            return;
        }

        if (confirm("Bu krediyi/limiti ve buna bağlı tüm kayıtları tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
            await DBService.deleteKredi(id);
            App.showToast("Kredi/Limit başarıyla silindi.");
            this.render();
        }
    },

    // --- 📑 DBS FATURA YÖNETİM MODAL VE HAREKETLERİ ---
    async showDbsFaturalarModal(krediId) {
        const krediler = await DBService.getKrediler();
        const k = krediler.find(x => x.id === krediId);
        const faturalar = await DBService.getDbsFaturalar();
        const limitFaturalari = faturalar.filter(f => f.krediId === krediId);

        const bekleyenTutar = limitFaturalari
            .filter(f => f.durum === 'Bekliyor')
            .reduce((sum, f) => sum + (parseFloat(f.tutar) || 0), 0);
        const kullanilabilirLimit = Math.max(0, k.tutar - bekleyenTutar);

        let faturaSatirlari = "";
        if (limitFaturalari.length === 0) {
            faturaSatirlari = `
                <tr>
                    <td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">
                        Kayıtlı fatura bulunmuyor.
                    </td>
                </tr>
            `;
        } else {
            limitFaturalari.sort((a, b) => new Date(a.vadeTarihi) - new Date(b.vadeTarihi));
            faturaSatirlari = limitFaturalari.map(f => {
                let aksiyonlar = "";
                let durumBadge = "";

                if (f.durum === "Bekliyor") {
                    durumBadge = `<span class="badge badge-warning">Bekliyor</span>`;
                    aksiyonlar = `
                        <button class="btn btn-sm btn-success" onclick="KredilerModule.odeDbsFatura(${f.id}, ${krediId}, false)" title="Biz Ödedik" style="padding:4px 8px; margin-right:4px;">
                            <i data-lucide="check"></i> Biz Ödedik
                        </button>
                        <button class="btn btn-sm btn-info" onclick="KredilerModule.odeDbsFatura(${f.id}, ${krediId}, true)" title="Banka Ödedi" style="padding:4px 8px; margin-right:4px;">
                            <i data-lucide="percent"></i> Banka Ödedi
                        </button>
                    `;
                } else if (f.durum === "Biz Ödedik") {
                    durumBadge = `<span class="badge badge-success">Biz Ödedik</span>`;
                    aksiyonlar = `<small style="color:var(--text-muted);">Biz Ödedik (Sıfır Maliyet)</small>`;
                } else if (f.durum === "Banka Ödedi") {
                    durumBadge = `<span class="badge badge-danger">Banka Ödedi</span>`;
                    aksiyonlar = `
                        <div style="font-size:0.75rem; color:var(--accent-rose); font-weight:600; margin-bottom:2px;">
                            BCH Faiz: %${f.uygulananFaizOrani}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td><strong>${f.faturaNo}</strong></td>
                        <td><strong>${utils.formatPara(f.tutar)}</strong></td>
                        <td><strong>${utils.formatTarih(f.vadeTarihi)}</strong></td>
                        <td>${durumBadge}</td>
                        <td style="text-align:right;">
                            <div style="display:flex; justify-content:flex-end; align-items:center;">
                                ${aksiyonlar}
                                <button class="btn btn-danger btn-sm btn-icon-only" onclick="KredilerModule.deleteDbsFatura(${f.id}, ${krediId})" title="Faturayı Sil" style="margin-left:8px; width:28px; height:28px; min-width:28px;">
                                    <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        const bodyHtml = `
            <div style="margin-bottom:20px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); font-size:0.85rem;">
                <div class="grid-cols-3" style="gap:12px; margin-bottom:8px;">
                    <div>🏦 <strong>Banka:</strong> ${k.bankaAdi}</div>
                    <div>🏢 <strong>Tedarikçi:</strong> ${k.tedarikciFirma || 'Belirtilmemiş'}</div>
                    <div>💰 <strong>Toplam Limit:</strong> ${utils.formatPara(k.tutar)}</div>
                </div>
                <div class="grid-cols-2" style="gap:12px;">
                    <div>⚠️ <strong>Toplam Risk (Bekleyen):</strong> <span class="text-warning">${utils.formatPara(bekleyenTutar)}</span></div>
                    <div>✅ <strong>Kullanılabilir Limit:</strong> <span class="text-success">${utils.formatPara(kullanilabilirLimit)}</span></div>
                </div>
            </div>

            <!-- Fatura Ekleme Formu -->
            <div class="card" style="padding:15px; margin-bottom:20px; border-color: rgba(255,255,255,0.08); background: rgba(0,0,0,0.1);">
                <h4 style="font-size:0.9rem; font-family:var(--font-display); margin-bottom:12px;"><i data-lucide="plus" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Yeni DBS Faturası Ekle</h4>
                <form onsubmit="KredilerModule.addDbsFatura(event, ${krediId})">
                    <div class="grid-cols-3" style="gap:10px;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label" style="font-size:0.75rem;">Fatura No *</label>
                            <input type="text" id="dbs-f-no" class="form-control" style="font-size:0.8rem; padding:6px 10px;" required>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label" style="font-size:0.75rem;">Fatura Tutarı (₺) *</label>
                            <input type="number" step="0.01" id="dbs-f-tutar" class="form-control" style="font-size:0.8rem; padding:6px 10px;" required>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label" style="font-size:0.75rem;">Vade Tarihi *</label>
                            <input type="date" id="dbs-f-vade" class="form-control" style="font-size:0.8rem; padding:6px 10px;" required>
                        </div>
                    </div>
                    <div style="margin-top:12px; text-align:right;">
                        <button type="submit" class="btn btn-primary btn-sm">
                            <i data-lucide="plus"></i> Faturayı DBS Sistemine Yükle
                        </button>
                    </div>
                </form>
            </div>

            <!-- Fatura Listesi -->
            <div style="font-size:0.85rem; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">
                📑 DBS Fatura Girişleri ve Limit Hareketleri
            </div>
            <div class="table-responsive" style="max-height:280px; overflow-y:auto; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                <table class="custom-table" style="font-size:0.8rem; margin-bottom:0;">
                    <thead>
                        <tr>
                            <th>Fatura No</th>
                            <th>Tutar</th>
                            <th>Vade Tarihi</th>
                            <th>Durum</th>
                            <th style="text-align:right;">Aksiyonlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${faturaSatirlari}
                    </tbody>
                </table>
            </div>
        `;

        openModal(`DBS Fatura ve Limit Yönetimi`, bodyHtml);
        lucide.createIcons();
    },

    async addDbsFatura(event, krediId) {
        event.preventDefault();
        try {
            const faturaNo = document.getElementById("dbs-f-no").value;
            const tutar = parseFloat(document.getElementById("dbs-f-tutar").value);
            const vadeTarihi = document.getElementById("dbs-f-vade").value;

            // Limit kontrolü
            const krediler = await DBService.getKrediler();
            const k = krediler.find(x => x.id === krediId);
            const faturalar = await DBService.getDbsFaturalar();
            const limitFaturalari = faturalar.filter(f => f.krediId === krediId);
            const bekleyenTutar = limitFaturalari
                .filter(f => f.durum === 'Bekliyor')
                .reduce((sum, f) => sum + (parseFloat(f.tutar) || 0), 0);
            
            if (bekleyenTutar + tutar > k.tutar) {
                if (!confirm(`Uyarı: Bu faturayı eklediğinizde toplam riskiniz (${utils.formatPara(bekleyenTutar + tutar)}) DBS limitinizi (${utils.formatPara(k.tutar)}) aşacaktır! Devam etmek istiyor musunuz?`)) {
                    return;
                }
            }

            const faturaObj = {
                krediId: krediId,
                faturaNo: faturaNo,
                tutar: tutar,
                vadeTarihi: vadeTarihi,
                durum: "Bekliyor",
                uygulananFaizOrani: 0
            };

            await DBService.addDbsFatura(faturaObj);
            App.showToast("DBS faturası başarıyla eklendi!");
            
            await this.showDbsFaturalarModal(krediId);
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    async odeDbsFatura(faturaId, krediId, bankaOdedi) {
        try {
            const faturalar = await DBService.getDbsFaturalar();
            const f = faturalar.find(x => x.id === faturaId);

            if (bankaOdedi) {
                const faizOrani = prompt("Banka ödemesi yapıldı. Bu ödeme BCH kredilendirmesine dönüştürülecektir.\nLütfen uygulanacak BCH Faiz Oranını (%) giriniz:", "40");
                if (faizOrani === null) return; // İptal
                const oran = parseFloat(faizOrani);
                if (isNaN(oran) || oran <= 0) {
                    App.showToast("Geçersiz faiz oranı!", "error");
                    return;
                }
                f.durum = "Banka Ödedi";
                f.uygulananFaizOrani = oran;
            } else {
                if (confirm("Faturanın vadesinde firma tarafınızdan ödendiğini ve DBS limitinin açıldığını onaylıyor musunuz?")) {
                    f.durum = "Biz Ödedik";
                    f.uygulananFaizOrani = 0;
                } else {
                    return;
                }
            }

            const dbId = f.id;
            delete f.id;
            await DBService.updateDbsFatura(dbId, f);
            App.showToast("DBS faturası durumu başarıyla güncellendi!");
            
            await this.showDbsFaturalarModal(krediId);
            this.render();
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    async deleteDbsFatura(faturaId, krediId) {
        try {
            if (confirm("Bu DBS faturasını tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
                await DBService.deleteDbsFatura(faturaId);
                App.showToast("DBS faturası silindi.");
                await this.showDbsFaturalarModal(krediId);
                this.render();
            }
        } catch (err) {
            App.showToast("Hata: " + err.message, "error");
        }
    },

    // --- 📊 BCH DÖNEM SONU FAİZ HESAPLAMA MOTORU (BANKACILIK STANDARDI) ---
    calculateBchInterestForPeriod(kredi, periodStart, periodEnd) {
        // Ensure hareketler exists
        const hareketler = kredi.hareketler || [
            {
                tarih: kredi.baslangicTarihi,
                tip: "kullanim",
                tutar: kredi.tutar,
                bakiye: kredi.tutar,
                aciklama: "Kredi Giriş Başlangıç"
            }
        ];

        // Reconstruct/map movements to have a valorTarihi (considering Friday weekend shift for payments)
        const mappedHareketler = hareketler.map(h => {
            return {
                ...h,
                valorTarihi: utils.getValorTarihi(h.tarih, h.tip)
            };
        });

        // Sort movements by valorTarihi
        const sorted = [...mappedHareketler].sort((a, b) => a.valorTarihi.localeCompare(b.valorTarihi));

        // Let's build a timeline of balance changes for the selected period [periodStart, periodEnd]
        // Balance on periodStart is the balance after the last transaction before periodStart
        let balanceAtStart = 0;
        sorted.forEach(h => {
            if (h.valorTarihi < periodStart) {
                balanceAtStart = h.bakiye;
            }
        });

        // Collect all movements within the period
        const periodMovements = sorted.filter(h => h.valorTarihi >= periodStart && h.valorTarihi <= periodEnd);

        // Build the list of key dates and the balance active from that date
        const timeline = [];
        
        // Initial entry
        // The active date starts at either periodStart or baslangicTarihi (whichever is later)
        const activeStart = kredi.baslangicTarihi > periodStart ? kredi.baslangicTarihi : periodStart;
        
        const todayStr = new Date().toISOString().slice(0, 10);
        const actualEnd = periodEnd > todayStr ? todayStr : periodEnd;

        if (activeStart <= actualEnd) {
            timeline.push({
                tarih: activeStart,
                bakiye: activeStart === kredi.baslangicTarihi ? (sorted[0] ? sorted[0].bakiye : kredi.tutar) : balanceAtStart
            });
        }

        // Add movements
        periodMovements.forEach(h => {
            if (h.valorTarihi <= actualEnd) {
                const existing = timeline.find(t => t.tarih === h.valorTarihi);
                if (existing) {
                    existing.bakiye = h.bakiye;
                } else {
                    timeline.push({
                        tarih: h.valorTarihi,
                        bakiye: h.bakiye
                    });
                }
            }
        });

        // Sort timeline
        timeline.sort((a, b) => a.tarih.localeCompare(b.tarih));

        // Now calculate intervals
        let toplamFaiz = 0;
        let detayi = [];
        
        for (let i = 0; i < timeline.length; i++) {
            const current = timeline[i];
            const activeDate = current.tarih;
            
            // Next date is either the date of the next transaction or the day AFTER actualEnd
            let nextDate;
            if (i < timeline.length - 1) {
                nextDate = timeline[i + 1].tarih;
            } else {
                const d = new Date(actualEnd);
                d.setDate(d.getDate() + 1);
                nextDate = d.toISOString().slice(0, 10);
            }

            // Calculate days between activeDate and nextDate
            const diffTime = new Date(nextDate) - new Date(activeDate);
            const gun = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            if (gun > 0 && current.bakiye > 0) {
                // Faiz = (Bakiye * Gun * FaizOrani) / 36000
                const faiz = (current.bakiye * gun * (kredi.faizOrani / 100)) / 360;
                toplamFaiz += faiz;
                
                // Bitis tarihi = nextDate - 1 day
                const bitisTarihiObj = new Date(nextDate);
                bitisTarihiObj.setDate(bitisTarihiObj.getDate() - 1);
                const bitisTarihi = bitisTarihiObj.toISOString().slice(0, 10);

                detayi.push({
                    baslangic: activeDate,
                    bitis: bitisTarihi,
                    bakiye: current.bakiye,
                    gun: gun,
                    faiz: faiz
                });
            }
        }

        const bsmv = toplamFaiz * 0.05;
        const toplam = toplamFaiz + bsmv;

        return {
            netFaiz: Math.round(toplamFaiz * 100) / 100,
            bsmv: Math.round(bsmv * 100) / 100,
            toplam: Math.round(toplam * 100) / 100,
            detayi: detayi
        };
    }
};
