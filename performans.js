/* ==========================================================================
   📊 İSMAİL FİNANS MERKEZİ - KEŞİDECİ ÇEK PERFORMANS ANALİZİ (PERFORMANS.JS)
   ========================================================================== */

const PerformansModule = {
    aramaKelimesi: "",
    siralama: "performans-desc", // performans-desc | performans-asc | tutar-desc | adet-desc

    getPerformansSnapshot(cekler, kesideci, kayitTarihi, cekId) {
        if (!kesideci) return null;
        
        // Filter checks for this drawer that were recorded BEFORE this check
        const gecmisCekler = cekler.filter(c => {
            if (c.kesideci.trim().toLowerCase() !== kesideci.trim().toLowerCase()) return false;
            if (c.id === cekId) return false; // Exclude current check itself
            
            const cKayit = c.kayitTarihi || "";
            const currentKayit = kayitTarihi || "";
            
            if (cKayit && currentKayit) {
                if (cKayit < currentKayit) return true;
                if (cKayit === currentKayit && c.id < cekId) return true;
                return false;
            }
            
            // Fallback if registration dates are missing
            return c.id < cekId;
        });

        const toplamAdet = gecmisCekler.length;
        const toplamTutar = gecmisCekler.reduce((sum, c) => sum + parseFloat(c.tutar || 0), 0);
        
        const odenenCekler = gecmisCekler.filter(c => c.durum === "Ödendi");
        const odenenAdet = odenenCekler.length;
        const odenenTutar = odenenCekler.reduce((sum, c) => sum + parseFloat(c.tutar || 0), 0);
        
        const karsiliksizCekler = gecmisCekler.filter(c => c.durum === "Karşılıksız");
        const karsiliksizAdet = karsiliksizCekler.length;
        const karsiliksizTutar = karsiliksizCekler.reduce((sum, c) => sum + parseFloat(c.tutar || 0), 0);

        const bekleyenCekler = gecmisCekler.filter(c => c.durum !== "Ödendi" && c.durum !== "Karşılıksız");
        const bekleyenAdet = bekleyenCekler.length;
        const bekleyenTutar = bekleyenCekler.reduce((sum, c) => sum + parseFloat(c.tutar || 0), 0);

        const sonuclanan = odenenAdet + karsiliksizAdet;
        const performans = sonuclanan > 0 ? Math.round((odenenAdet / sonuclanan) * 100) : -1;

        return {
            toplamAdet,
            toplamTutar,
            odenenAdet,
            odenenTutar,
            karsiliksizAdet,
            karsiliksizTutar,
            bekleyenAdet,
            bekleyenTutar,
            performans
        };
    },

    async render() {
        const container = document.getElementById("page-container");
        const cekler = await DBService.getCekler();

        // Keşidecilere göre grupla
        const kesideciMap = {};
        cekler.forEach(c => {
            const isim = c.kesideci.trim();
            if (!kesideciMap[isim]) {
                kesideciMap[isim] = {
                    isim,
                    cekler: [],
                    toplamAdet: 0,
                    toplamTutar: 0,
                    odenenAdet: 0,
                    odenenTutar: 0,
                    karsilisizsizAdet: 0,
                    karsilisizsizTutar: 0,
                    bekleyenAdet: 0,
                    bekleyenTutar: 0,
                    ciroAdet: 0,
                    ciroTutar: 0,
                    sonRiskNotu: "",
                    sonIstihbaratNotu: ""
                };
            }
            const k = kesideciMap[isim];
            k.cekler.push(c);
            k.toplamAdet++;
            k.toplamTutar += parseFloat(c.tutar) || 0;

            if (c.durum === "Ödendi") {
                k.odenenAdet++;
                k.odenenTutar += parseFloat(c.tutar) || 0;
            } else if (c.durum === "Karşılıksız") {
                k.karsilisizsizAdet++;
                k.karsilisizsizTutar += parseFloat(c.tutar) || 0;
            } else if (c.durum === "Ciro Edildi") {
                k.ciroAdet++;
                k.ciroTutar += parseFloat(c.tutar) || 0;
            } else {
                k.bekleyenAdet++;
                k.bekleyenTutar += parseFloat(c.tutar) || 0;
            }

            // En son risk notu
            if (c.riskNotu && !k.sonRiskNotu) k.sonRiskNotu = c.riskNotu;
            if (c.istihbaratNotu && !k.sonIstihbaratNotu) k.sonIstihbaratNotu = c.istihbaratNotu;
        });

        // Performans hesapla
        let liste = Object.values(kesideciMap).map(k => {
            // Sonuçlanmış çekler (Ödendi + Karşılıksız)
            const sonuclanan = k.odenenAdet + k.karsilisizsizAdet;
            // Performans = Ödenen / (Ödenen + Karşılıksız) * 100
            k.performans = sonuclanan > 0 ? Math.round((k.odenenAdet / sonuclanan) * 100) : -1; // -1 = henüz sonuçlanmamış
            return k;
        });

        // Arama filtresi
        if (this.aramaKelimesi.trim()) {
            const q = this.aramaKelimesi.toLowerCase();
            liste = liste.filter(k => k.isim.toLowerCase().includes(q));
        }

        // Sıralama
        if (this.siralama === "performans-desc") liste.sort((a, b) => b.performans - a.performans);
        else if (this.siralama === "performans-asc") liste.sort((a, b) => a.performans - b.performans);
        else if (this.siralama === "tutar-desc") liste.sort((a, b) => b.toplamTutar - a.toplamTutar);
        else if (this.siralama === "adet-desc") liste.sort((a, b) => b.toplamAdet - a.toplamAdet);

        // GENEL İSTATİSTİKLER
        const genelToplam = liste.reduce((s, k) => s + k.toplamTutar, 0);
        const genelOdenen = liste.reduce((s, k) => s + k.odenenTutar, 0);
        const genelKarsilisizsiz = liste.reduce((s, k) => s + k.karsilisizsizTutar, 0);
        const genelBekleyen = liste.reduce((s, k) => s + k.bekleyenTutar, 0);
        const toplamKesideci = liste.length;
        const riskliKesideci = liste.filter(k => k.performans >= 0 && k.performans < 70).length;
        const guvenilirKesideci = liste.filter(k => k.performans >= 90).length;

        let html = `
            <!-- KPI Kartları -->
            <div class="grid-cols-4" style="margin-bottom:24px;">
                <div class="kpi-card">
                    <div class="kpi-icon-box green"><i data-lucide="users" style="width:26px;height:26px;"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Toplam Keşideci</div>
                        <div class="kpi-value">${toplamKesideci}</div>
                        <div class="kpi-trend">çek yazan firma/kişi</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon-box blue"><i data-lucide="check-circle-2" style="width:26px;height:26px;"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Güvenilir Keşideci</div>
                        <div class="kpi-value text-success">${guvenilirKesideci}</div>
                        <div class="kpi-trend">%90+ ödeme performansı</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon-box rose"><i data-lucide="alert-triangle" style="width:26px;height:26px;"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Riskli Keşideci</div>
                        <div class="kpi-value text-danger">${riskliKesideci}</div>
                        <div class="kpi-trend">%70 altı performans</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon-box gold"><i data-lucide="banknote" style="width:26px;height:26px;"></i></div>
                    <div class="kpi-content">
                        <div class="kpi-label">Karşılıksız Risk</div>
                        <div class="kpi-value text-danger">${utils.formatPara(genelKarsilisizsiz)}</div>
                        <div class="kpi-trend">toplam karşılıksız tutar</div>
                    </div>
                </div>
            </div>

            <!-- Filtre & Sıralama -->
            <div class="card" style="padding:16px 20px; margin-bottom:24px; display:flex; gap:16px; align-items:center; flex-wrap:wrap; justify-content:space-between;">
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <input type="text" class="form-control" id="perf-arama" placeholder="Keşideci ara..." value="${this.aramaKelimesi}" onkeyup="PerformansModule.aramaYap()" style="width:240px; padding:10px 14px;">
                    <select class="form-control" style="width:220px; padding:10px 14px;" onchange="PerformansModule.siralamaYap(this.value)">
                        <option value="performans-desc" ${this.siralama === 'performans-desc' ? 'selected' : ''}>Performans (Yüksek → Düşük)</option>
                        <option value="performans-asc" ${this.siralama === 'performans-asc' ? 'selected' : ''}>Performans (Düşük → Yüksek)</option>
                        <option value="tutar-desc" ${this.siralama === 'tutar-desc' ? 'selected' : ''}>Toplam Tutar (Büyük → Küçük)</option>
                        <option value="adet-desc" ${this.siralama === 'adet-desc' ? 'selected' : ''}>Çek Adedi (Çok → Az)</option>
                    </select>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${liste.length} keşideci listeleniyor</div>
            </div>

            <!-- Keşideci Kartları -->
            ${liste.length === 0 ? `
                <div class="card">
                    <div class="empty-state">
                        <i data-lucide="users-round"></i>
                        <h4>Keşideci Bulunamadı</h4>
                        <p>Henüz sisteme çek kaydı girilmemiş veya arama kriterinize uygun sonuç yok.</p>
                    </div>
                </div>
            ` : ''}

            ${liste.map(k => this._renderKesideciCard(k)).join("")}
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    aramaYap() {
        this.aramaKelimesi = document.getElementById("perf-arama").value;
        this.render();
    },

    siralamaYap(val) {
        this.siralama = val;
        this.render();
    },

    // =========================================================================
    // 🃏 KEŞİDECİ PERFORMANS KARTI
    // =========================================================================
    _renderKesideciCard(k) {
        // Performans rengi ve seviyesi
        let perfRenk, perfSeviye, perfBg, barRenk;
        if (k.performans < 0) {
            perfRenk = "var(--text-muted)";
            perfSeviye = "Henüz Sonuçlanmadı";
            perfBg = "rgba(100,116,139,0.06)";
            barRenk = "#64748b";
        } else if (k.performans >= 90) {
            perfRenk = "var(--accent-emerald)";
            perfSeviye = "★ Mükemmel";
            perfBg = "rgba(16,185,129,0.06)";
            barRenk = "#10b981";
        } else if (k.performans >= 70) {
            perfRenk = "var(--accent-blue)";
            perfSeviye = "● İyi";
            perfBg = "rgba(59,130,246,0.06)";
            barRenk = "#3b82f6";
        } else if (k.performans >= 50) {
            perfRenk = "var(--accent-gold)";
            perfSeviye = "⚠ Riskli";
            perfBg = "rgba(245,158,11,0.06)";
            barRenk = "#f59e0b";
        } else {
            perfRenk = "var(--accent-rose)";
            perfSeviye = "✖ Tehlikeli";
            perfBg = "rgba(244,63,94,0.06)";
            barRenk = "#f43f5e";
        }

        const perfYuzde = k.performans >= 0 ? k.performans : 0;

        // Risk notu badge
        let riskBadge = '';
        if (k.sonRiskNotu) {
            const rn = parseInt(k.sonRiskNotu);
            if (rn >= 1500) riskBadge = `<span class="badge badge-success" style="font-size:0.7rem;">Findeks: ${k.sonRiskNotu}</span>`;
            else if (rn >= 1000) riskBadge = `<span class="badge badge-warning" style="font-size:0.7rem;">Findeks: ${k.sonRiskNotu}</span>`;
            else riskBadge = `<span class="badge badge-danger" style="font-size:0.7rem;">Findeks: ${k.sonRiskNotu}</span>`;
        }

        return `
            <div class="card" style="border-left: 4px solid ${barRenk}; padding:24px; margin-bottom:20px;">
                <!-- Üst Bölüm: İsim + Performans Puanı -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
                            <div style="width:44px; height:44px; border-radius:12px; background:${perfBg}; border:1px solid ${barRenk}33; display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:700; color:${perfRenk};">
                                ${k.isim.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style="font-size:1.1rem; margin-bottom:2px;">${k.isim}</h3>
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <span style="font-size:0.75rem; color:var(--text-muted);">${k.toplamAdet} çek — ${utils.formatPara(k.toplamTutar)}</span>
                                    ${riskBadge}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Performans Göstergesi -->
                    <div style="text-align:center; min-width:180px;">
                        <div style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; margin-bottom:4px;">Ödeme Performansı</div>
                        <div style="font-size:2.2rem; font-family:var(--font-display); font-weight:800; color:${perfRenk}; line-height:1;">
                            ${k.performans >= 0 ? '%' + k.performans : '—'}
                        </div>
                        <div style="font-size:0.75rem; font-weight:600; color:${perfRenk};">${perfSeviye}</div>
                    </div>
                </div>

                <!-- İlerleme Çubuğu -->
                <div style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:6px;">
                        <span>Ödenen: ${k.odenenAdet} çek</span>
                        <span>Karşılıksız: ${k.karsilisizsizAdet} çek</span>
                    </div>
                    <div style="width:100%; height:10px; background:rgba(255,255,255,0.04); border-radius:99px; overflow:hidden; display:flex;">
                        ${k.odenenAdet > 0 ? `<div style="width:${(k.odenenAdet / k.toplamAdet) * 100}%; background:var(--accent-emerald); border-radius:99px 0 0 99px; transition: width 0.5s ease;" title="Ödenen"></div>` : ''}
                        ${k.bekleyenAdet > 0 ? `<div style="width:${(k.bekleyenAdet / k.toplamAdet) * 100}%; background:var(--accent-blue); transition: width 0.5s ease;" title="Bekleyen"></div>` : ''}
                        ${k.ciroAdet > 0 ? `<div style="width:${(k.ciroAdet / k.toplamAdet) * 100}%; background:var(--accent-gold); transition: width 0.5s ease;" title="Ciro Edilen"></div>` : ''}
                        ${k.karsilisizsizAdet > 0 ? `<div style="width:${(k.karsilisizsizAdet / k.toplamAdet) * 100}%; background:var(--accent-rose); border-radius:0 99px 99px 0; transition: width 0.5s ease;" title="Karşılıksız"></div>` : ''}
                    </div>
                    <div style="display:flex; gap:16px; margin-top:8px; flex-wrap:wrap;">
                        <span style="font-size:0.7rem; display:flex; align-items:center; gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent-emerald);display:inline-block;"></span> Ödenen</span>
                        <span style="font-size:0.7rem; display:flex; align-items:center; gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent-blue);display:inline-block;"></span> Bekleyen</span>
                        <span style="font-size:0.7rem; display:flex; align-items:center; gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent-gold);display:inline-block;"></span> Ciro Edilen</span>
                        <span style="font-size:0.7rem; display:flex; align-items:center; gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent-rose);display:inline-block;"></span> Karşılıksız</span>
                    </div>
                </div>

                <!-- Detay Metrikleri -->
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; margin-bottom:16px;">
                    <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.12); border-radius:var(--radius-sm); padding:12px; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--accent-emerald); font-weight:600; text-transform:uppercase;">Ödenen</div>
                        <div style="font-size:1.1rem; font-family:var(--font-display); font-weight:700; color:var(--accent-emerald);">${k.odenenAdet}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${utils.formatPara(k.odenenTutar)}</div>
                    </div>
                    <div style="background:rgba(59,130,246,0.05); border:1px solid rgba(59,130,246,0.12); border-radius:var(--radius-sm); padding:12px; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--accent-blue); font-weight:600; text-transform:uppercase;">Bekleyen</div>
                        <div style="font-size:1.1rem; font-family:var(--font-display); font-weight:700; color:var(--accent-blue);">${k.bekleyenAdet}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${utils.formatPara(k.bekleyenTutar)}</div>
                    </div>
                    <div style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.12); border-radius:var(--radius-sm); padding:12px; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--accent-gold); font-weight:600; text-transform:uppercase;">Ciro Edilen</div>
                        <div style="font-size:1.1rem; font-family:var(--font-display); font-weight:700; color:var(--accent-gold);">${k.ciroAdet}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${utils.formatPara(k.ciroTutar)}</div>
                    </div>
                    <div style="background:rgba(244,63,94,0.05); border:1px solid rgba(244,63,94,0.12); border-radius:var(--radius-sm); padding:12px; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--accent-rose); font-weight:600; text-transform:uppercase;">Karşılıksız</div>
                        <div style="font-size:1.1rem; font-family:var(--font-display); font-weight:700; color:var(--accent-rose);">${k.karsilisizsizAdet}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${utils.formatPara(k.karsilisizsizTutar)}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:600; text-transform:uppercase;">Toplam</div>
                        <div style="font-size:1.1rem; font-family:var(--font-display); font-weight:700;">${k.toplamAdet}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${utils.formatPara(k.toplamTutar)}</div>
                    </div>
                </div>

                <!-- Çek Detay Tablosu (Collapse) -->
                <div>
                    <button class="btn btn-secondary btn-sm" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('span').textContent = this.nextElementSibling.style.display === 'none' ? 'Çek Geçmişini Göster' : 'Çek Geçmişini Gizle';" style="margin-bottom:12px;">
                        <i data-lucide="list"></i> <span>Çek Geçmişini Göster</span>
                    </button>
                    <div style="display:none;">
                        <div class="table-responsive">
                            <table class="custom-table">
                                <thead>
                                    <tr>
                                        <th>Çek No</th>
                                        <th>Ciro Eden</th>
                                        <th>Banka</th>
                                        <th>Vade Tarihi</th>
                                        <th>Tutar</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${k.cekler.sort((a, b) => (a.vadeTarihi || '').localeCompare(b.vadeTarihi || '')).map(c => {
                                        let badgeClass = "badge-info";
                                        if (c.durum === "Portföyde" || c.durum === "Ödendi") badgeClass = "badge-success";
                                        else if (c.durum === "Ciro Edildi") badgeClass = "badge-warning";
                                        else if (c.durum === "Karşılıksız") badgeClass = "badge-danger";
                                        return `
                                            <tr>
                                                <td><strong>${c.cekNo}</strong></td>
                                                <td>${c.ciroEden || '<span style="color:var(--text-muted);font-style:italic;">Kendisi</span>'}</td>
                                                <td>${c.bankaAdi}<br><small style="color:var(--text-muted);">${c.sube}</small></td>
                                                <td>${utils.formatTarih(c.vadeTarihi)}</td>
                                                <td><strong>${utils.formatPara(c.tutar)}</strong></td>
                                                <td>
                                                     <span class="badge ${badgeClass}">${c.durum}</span>
                                                     ${c.durum === 'Ciro Edildi' && c.ciroEdilenYer ? `<br><small style="color:var(--accent-gold); font-size:0.7rem;">Ciro: ${c.ciroEdilenYer}</small>` : ''}
                                                     ${(c.durum === 'Tahsilde' || c.durum === 'Teminatta') && c.verilenBanka ? `<br><small style="color:var(--accent-blue); font-size:0.7rem;">Banka: ${c.verilenBanka}</small>` : ''}
                                                </td>
                                            </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        </div>
                        ${k.sonIstihbaratNotu ? `
                            <div style="margin-top:12px; padding:12px 16px; background:rgba(59,130,246,0.04); border:1px solid rgba(59,130,246,0.1); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--text-secondary);">
                                <strong>📝 İstihbarat Notu:</strong> ${k.sonIstihbaratNotu}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
};
