/* ==========================================================================
   📊 İS-YIL FİNANS VE MUHASEBE PROGRAMI - TOPLU İÇE AKTARMA MODÜLÜ (TOPLUGIRIS.JS)
   ========================================================================== */

const TopluGirisModule = {
    activeTab: "cek", // "cek" veya "kredi"
    loadedData: [],    // Ayrıştırılmış ve doğrulanmış satırlar
    hasErrors: false,  // Yüklenen veride kritik hata var mı?

    async render() {
        const container = document.getElementById("page-container");

        let inputAreaHtml = "";
        if (this.activeTab === "cek") {
            inputAreaHtml = this.renderCekInputSection();
        } else {
            inputAreaHtml = this.renderKrediInputSection();
        }

        let previewHtml = "";
        if (this.loadedData.length > 0) {
            previewHtml = this.renderPreviewTable();
        }

        let html = `
            <!-- Sekme Seçimi -->
            <div class="tab-container" style="margin-bottom: 24px;">
                <button class="tab-btn ${this.activeTab === 'cek' ? 'active' : ''}" onclick="TopluGirisModule.switchTab('cek')">
                    <i data-lucide="receipt" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Toplu Müşteri Çeki Girişi
                </button>
                <button class="tab-btn ${this.activeTab === 'kredi' ? 'active' : ''}" onclick="TopluGirisModule.switchTab('kredi')">
                    <i data-lucide="wallet" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Toplu Kredi & DBS Girişi
                </button>
            </div>

            <div class="grid-cols-2" style="gap:24px; margin-bottom:24px; display: grid;">
                <!-- Sol Panel: Dosya Yükleme & Kopyala Yapıştır -->
                <div class="card" style="margin-bottom:0;">
                    <div class="card-title-area" style="margin-bottom: 16px;">
                        <h4 class="card-title"><i data-lucide="upload-cloud"></i> Veri Giriş Yöntemi</h4>
                    </div>
                    
                    ${inputAreaHtml}
                </div>

                <!-- Sağ Panel: Şablon & Açıklamalar -->
                <div class="card" style="margin-bottom:0; border-left: 4px solid var(--accent-emerald);">
                    <h4 class="card-title" style="color:var(--accent-emerald); margin-bottom:12px;">
                        <i data-lucide="info"></i> Nasıl Yüklenir?
                    </h4>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px; line-height:1.5;">
                        Excel verilerinizi sisteme hatasız aktarmak için sütun adlarının ve veri biçimlerinin uyumlu olması gerekir. 
                        Aşağıdaki butonla önceden hazırlanmış **örnek Excel şablonunu** indirip kullanabilirsiniz.
                    </p>

                    <button class="btn btn-secondary btn-sm btn-block" onclick="TopluGirisModule.downloadTemplate()" style="margin-bottom:20px; justify-content:center;">
                        <i data-lucide="file-spreadsheet" class="text-success"></i> Örnek Excel Şablonu İndir (.xlsx)
                    </button>

                    <div style="font-size:0.75rem; background:rgba(255,255,255,0.02); border:1px dashed var(--border-color); padding:12px; border-radius:var(--radius-sm);">
                        <strong style="color:#fff;">💡 Veri Biçimi İpuçları:</strong>
                        <ul style="margin-left:16px; margin-top:6px; display:flex; flex-direction:column; gap:4px; color:var(--text-secondary);">
                            <li><strong>Tarih:</strong> <code>GG.AA.YYYY</code> (örn: 15.06.2026) veya Excel tarih formatı.</li>
                            <li><strong>Tutar:</strong> Binlik ayıraç olmadan <code>150000.50</code> veya Türkçe biçimli <code>150.000,50</code> olabilir.</li>
                            <li><strong>Kredi Türü:</strong> <code>BCH</code>, <code>DBS</code>, <code>Spot</code> veya <code>Taksitli</code> yazılmalıdır.</li>
                            <li><strong>Otomatik Eşleştirme:</strong> Dosyada yazan banka adı sistemde kayıtlı değilse, içe aktarma anında **otomatik oluşturulur**.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Önizleme ve İçe Aktarma Bölümü -->
            ${previewHtml}
        `;

        container.innerHTML = html;
        lucide.createIcons();
    },

    switchTab(tab) {
        this.activeTab = tab;
        this.loadedData = [];
        this.hasErrors = false;
        this.render();
    },

    // --- 🎫 ÇEK GİRİŞ PANELİ ---
    renderCekInputSection() {
        return `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <!-- Dosya Sürükleme -->
                <div style="border: 2px dashed rgba(255,255,255,0.15); border-radius:var(--radius-md); padding:24px; text-align:center; background:rgba(0,0,0,0.15); cursor:pointer; position:relative;"
                     onchange="TopluGirisModule.handleFileSelect(event)"
                     onclick="document.getElementById('excel-file-input').click();">
                    <i data-lucide="file-down" style="width:36px;height:36px;color:var(--accent-emerald);margin-bottom:8px;"></i>
                    <div style="font-size:0.85rem; font-weight:600;">Excel / CSV Dosyası Yükleyin</div>
                    <small style="color:var(--text-muted);">Sürükleyip bırakın veya seçmek için tıklayın</small>
                    <input type="file" id="excel-file-input" style="display:none;" accept=".xlsx, .xls, .csv">
                </div>

                <div style="text-align:center; font-size:0.8rem; color:var(--text-muted); font-weight:600; margin:4px 0;">
                    —— VEYA HIZLICA EXCEL'DEN KOPYALAYIP YAPIŞTIRIN ——
                </div>

                <!-- Kopyala Yapıştır Metin Alanı -->
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-size:0.75rem;">Excel'den Kopyaladığınız Alanı Yapıştırın *</label>
                    <textarea id="paste-textbox" class="form-control" style="height:110px; font-family:monospace; font-size:0.75rem;" placeholder="Çek No\tKeşideci\tCiro Eden\tBanka Adı\tŞube\tVade\tTutar\tRisk Notu&#10;123456\tYılmaz İnşaat\tDemir Ltd\tAkbank\tKartal\t25.08.2026\t150.000,00\t1420"></textarea>
                </div>

                <button class="btn btn-primary" onclick="TopluGirisModule.handlePasteText()">
                    <i data-lucide="play"></i> Verileri Çöz ve Önizle
                </button>
            </div>
        `;
    },

    // --- 💰 KREDİ GİRİŞ PANELİ ---
    renderKrediInputSection() {
        return `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <!-- Dosya Sürükleme -->
                <div style="border: 2px dashed rgba(255,255,255,0.15); border-radius:var(--radius-md); padding:24px; text-align:center; background:rgba(0,0,0,0.15); cursor:pointer; position:relative;"
                     onchange="TopluGirisModule.handleFileSelect(event)"
                     onclick="document.getElementById('excel-file-input').click();">
                    <i data-lucide="file-down" style="width:36px;height:36px;color:var(--accent-blue);margin-bottom:8px;"></i>
                    <div style="font-size:0.85rem; font-weight:600;">Excel / CSV Dosyası Yükleyin</div>
                    <small style="color:var(--text-muted);">Sürükleyip bırakın veya seçmek için tıklayın</small>
                    <input type="file" id="excel-file-input" style="display:none;" accept=".xlsx, .xls, .csv">
                </div>

                <div style="text-align:center; font-size:0.8rem; color:var(--text-muted); font-weight:600; margin:4px 0;">
                    —— VEYA HIZLICA EXCEL'DEN KOPYALAYIP YAPIŞTIRIN ——
                </div>

                <!-- Kopyala Yapıştır Metin Alanı -->
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-size:0.75rem;">Excel'den Kopyaladığınız Alanı Yapıştırın *</label>
                    <textarea id="paste-textbox" class="form-control" style="height:110px; font-family:monospace; font-size:0.75rem;" placeholder="Kredi Türü\tBanka\tLimit\tFaiz\tBaşlangıç\tVade\tTaksit\tTedarikçi\tKomisyon\tMasraf&#10;DBS\tGaranti\t500000\t\t01.06.2026\t\t\tPetrol Ofisi\t2500\t150"></textarea>
                </div>

                <button class="btn btn-primary" onclick="TopluGirisModule.handlePasteText()">
                    <i data-lucide="play"></i> Verileri Çöz ve Önizle
                </button>
            </div>
        `;
    },

    // --- 📥 DOSYA YÜKLEME VE OKUMA MANTIĞI (SHEETJS) ---
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Raw array formatında oku (header: 1 satır bazlı array verir)
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (rows.length < 2) {
                    throw new Error("Yüklenen dosyada veri bulunamadı! Lütfen en az bir başlık satırı ve bir veri satırı girin.");
                }

                this.parseRawRows(rows);
            } catch (err) {
                App.showToast("Excel okuma hatası: " + err.message, "error");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    // --- ⌨️ KOPYALA YAPIŞTIR METNİ ÇÖZME ---
    handlePasteText() {
        const text = document.getElementById("paste-textbox").value.trim();
        if (!text) {
            App.showToast("Lütfen yapıştırılacak veri alanını boş bırakmayın!", "error");
            return;
        }

        const lines = text.split("\n");
        const rows = lines.map(line => line.split("\t"));

        if (rows.length < 2) {
            App.showToast("Hatalı veri yapısı! En az bir başlık satırı ve bir veri satırı yapıştırılmalıdır.", "error");
            return;
        }

        this.parseRawRows(rows);
    },

    // --- 🔍 SATIRLARI DÖNÜŞTÜRME & DOĞRULAMA MOTORU ---
    parseRawRows(rawRows) {
        this.loadedData = [];
        this.hasErrors = false;

        const headers = rawRows[0].map(h => String(h).trim().toLowerCase());
        const dataRows = rawRows.slice(1);

        dataRows.forEach((row, idx) => {
            // Tamamen boş satırları yoksay
            if (row.length === 0 || row.every(cell => cell === undefined || String(cell).trim() === "")) {
                return;
            }

            let parsedObj = {};
            if (this.activeTab === "cek") {
                parsedObj = this.parseCheckRow(row, headers, idx + 2);
            } else {
                parsedObj = this.parseCreditRow(row, headers, idx + 2);
            }

            if (!parsedObj.isValid) {
                this.hasErrors = true;
            }

            this.loadedData.push(parsedObj);
        });

        App.showToast(`Çözümleme tamamlandı! ${this.loadedData.length} satır yüklendi.`);
        this.render();
    },

    // --- 🎫 ÇEK VERİSİ AYRIŞTIRMA VE DOĞRULAMA ---
    parseCheckRow(row, headers, lineNo) {
        // Excel / Copy-paste sütun haritalama helper
        const getVal = (colNames) => {
            for (let name of colNames) {
                const idx = headers.indexOf(name.toLowerCase());
                if (idx !== -1 && row[idx] !== undefined) return String(row[idx]).trim();
            }
            return "";
        };

        const rawCekNo = getVal(["cek no", "çek no", "çek numarası", "cekno"]);
        const rawKesideci = getVal(["keşideci", "kesideci", "çek sahibi", "cek sahibi"]);
        const rawCiroEden = getVal(["ciro eden", "ciroeden", "bize ciro eden"]);
        const rawBanka = getVal(["banka", "banka adı", "banka adi", "keside bankasi"]);
        const rawSube = getVal(["şube", "sube", "banka şubesi"]);
        const rawVade = getVal(["vade", "vade tarihi", "vade_tarihi", "ödeme tarihi"]);
        const rawTutar = getVal(["tutar", "çek tutarı", "tutar (₺)", "miktar"]);
        const rawRiskNotu = getVal(["risk notu", "risknotu", "findeks skoru", "risk"]);

        const errors = {};
        
        // 1. Çek No Doğrulama
        if (!rawCekNo) errors.cekNo = "Çek numarası zorunludur.";

        // 2. Keşideci Doğrulama
        if (!rawKesideci) errors.kesideci = "Çek sahibi (keşideci) zorunludur.";

        // 3. Banka Adı Doğrulama
        if (!rawBanka) errors.banka = "Banka adı zorunludur.";

        // 4. Tutar Ayrıştırma & Doğrulama
        const tutarVal = this.cleanNumber(rawTutar);
        if (isNaN(tutarVal) || tutarVal <= 0) {
            errors.tutar = "Geçersiz tutar! Pozitif bir sayı girmelisiniz.";
        }

        // 5. Vade Tarihi Ayrıştırma & Doğrulama
        const dateVal = this.cleanDate(rawVade);
        if (!dateVal) {
            errors.vade = "Geçersiz tarih! (Örn: 25.08.2026 yazılmalıdır).";
        }

        // 6. Risk Notu Ayrıştırma
        let riskNotuVal = "";
        if (rawRiskNotu) {
            const rn = parseInt(rawRiskNotu);
            if (!isNaN(rn) && rn > 0) riskNotuVal = String(rn);
        }

        const isValid = Object.keys(errors).length === 0;

        return {
            lineNo,
            isValid,
            errors,
            data: {
                cekNo: rawCekNo,
                kesideci: rawKesideci,
                ciroEden: rawCiroEden,
                bankaAdi: rawBanka,
                sube: rawSube,
                tutar: tutarVal,
                vadeTarihi: dateVal || rawVade,
                kayitTarihi: new Date().toISOString().slice(0, 10),
                durum: "Portföyde",
                ciroEdilenYer: "",
                riskNotu: riskNotuVal,
                istihbaratNotu: ""
            }
        };
    },

    // --- 💰 KREDİ VERİSİ AYRIŞTIRMA VE DOĞRULAMA ---
    parseCreditRow(row, headers, lineNo) {
        const getVal = (colNames) => {
            for (let name of colNames) {
                const idx = headers.indexOf(name.toLowerCase());
                if (idx !== -1 && row[idx] !== undefined) return String(row[idx]).trim();
            }
            return "";
        };

        const rawTur = getVal(["kredi türü", "kredi turu", "tür", "tur", "kreditipi"]);
        const rawBanka = getVal(["banka", "banka adı", "banka adi", "kredi bankasi"]);
        const rawTutar = getVal(["limit", "tutar", "limit tutarı", "kredi tutarı", "miktar"]);
        const rawFaiz = getVal(["faiz", "faiz oranı", "faiz orani", "yıllık faiz"]);
        const rawBaslangic = getVal(["başlangıç", "baslangic", "başlangıç tarihi", "baslangic tarihi"]);
        const rawVade = getVal(["vade", "vade tarihi", "vade_tarihi", "son ödeme tarihi"]);
        const rawTaksit = getVal(["taksit", "taksit sayısı", "taksitsayisi", "vade sayısı"]);
        const rawTedarikci = getVal(["tedarikçi", "tedarikci", "tedarikçi firma", "firma adı"]);
        const rawKomisyon = getVal(["komisyon", "komisyon tutarı", "komisyon tutari"]);
        const rawMasraf = getVal(["masraf", "kredi masrafı", "kredi masrafi", "dosya masrafı"]);

        const errors = {};

        // 1. Kredi Türü Kontrolü
        const turUpper = rawTur.toUpperCase();
        const validTypes = ["BCH", "DBS", "SPOT", "TAKSİTLİ", "TAKSITLI"];
        if (!rawTur) {
            errors.tur = "Kredi türü boş bırakılamaz.";
        } else if (!validTypes.includes(turUpper)) {
            errors.tur = "Geçersiz tür! BCH, DBS, Spot veya Taksitli olmalıdır.";
        }

        // Kredi türü standardizasyonu
        let finalTur = "BCH";
        if (turUpper === "DBS") finalTur = "DBS";
        else if (turUpper === "SPOT") finalTur = "Spot";
        else if (turUpper === "TAKSİTLİ" || turUpper === "TAKSITLI") finalTur = "Taksitli";

        // 2. Banka Adı
        if (!rawBanka) errors.banka = "Banka adı zorunludur.";

        // 3. Tutar / Limit
        const tutarVal = this.cleanNumber(rawTutar);
        if (isNaN(tutarVal) || tutarVal <= 0) {
            errors.tutar = "Geçersiz kredi tutarı/limiti!";
        }

        // 4. Başlangıç Tarihi
        const baslangicVal = this.cleanDate(rawBaslangic);
        if (!baslangicVal) {
            errors.baslangic = "Geçersiz başlangıç tarihi!";
        }

        // 5. Tür Bazlı Özel Koşullar
        let faizVal = 0;
        let taksitVal = 0;
        let vadeVal = "";
        let tedarikciVal = "";

        if (finalTur !== "DBS") {
            faizVal = this.cleanNumber(rawFaiz);
            if (isNaN(faizVal) || faizVal <= 0) {
                errors.faiz = "Faiz oranı girilmelidir (örn: 42.5).";
            }
        } else {
            // DBS ise Tedarikçi zorunlu
            tedarikciVal = rawTedarikci;
            if (!tedarikciVal) {
                errors.tedarikci = "DBS kredilerinde Tedarikçi Firma adı zorunludur.";
            }
        }

        if (finalTur === "Spot") {
            vadeVal = this.cleanDate(rawVade);
            if (!vadeVal) {
                errors.vade = "Spot kredide Vade Tarihi zorunludur.";
            }
        } else if (finalTur === "Taksitli") {
            taksitVal = parseInt(rawTaksit);
            if (isNaN(taksitVal) || taksitVal <= 0) {
                errors.taksit = "Taksitli kredide Taksit Sayısı zorunludur.";
            }
        }

        const komisyonVal = this.cleanNumber(rawKomisyon) || 0;
        const masrafVal = this.cleanNumber(rawMasraf) || 0;

        const isValid = Object.keys(errors).length === 0;

        return {
            lineNo,
            isValid,
            errors,
            finalTur,
            taksitSayisi: taksitVal,
            data: {
                krediTuru: finalTur,
                bankaAdi: rawBanka,
                tutar: tutarVal,
                faizOrani: faizVal,
                baslangicTarihi: baslangicVal || rawBaslangic,
                vadeTarihi: vadeVal || rawVade,
                komisyonTutari: komisyonVal,
                krediMasrafi: masrafVal,
                durum: "Aktif",
                tedarikciFirma: tedarikciVal
            }
        };
    },

    // --- 🛠️ DİL VE BİÇİM PARSER YARDIMCILARI ---
    cleanNumber(valStr) {
        if (!valStr) return NaN;
        // Tüm boşlukları ve para sembollerini at
        let clean = valStr.replace(/[\s₺$€TL]/g, "");
        
        // Türkçe format algılama (Örn: 150.000,50 veya 150000,50)
        // Eğer hem nokta hem virgül varsa veya tek virgül varsa
        if (clean.includes(",") && clean.includes(".")) {
            // Noktayı (binlik) kaldır, virgülü noktaya çevir
            clean = clean.replace(/\./g, "").replace(/,/g, ".");
        } else if (clean.includes(",") && !clean.includes(".")) {
            // Sadece virgül varsa (Örn: 150000,50)
            clean = clean.replace(/,/g, ".");
        }
        
        return parseFloat(clean);
    },

    cleanDate(valStr) {
        if (!valStr) return null;
        let str = String(valStr).trim();

        // SheetJS bazen Excel tarihini sayısal seri numarası olarak verir (Örn: 46188)
        const serial = parseFloat(str);
        if (!isNaN(serial) && serial > 30000 && serial < 100000) {
            // Excel başlangıç tarihi: 30 Dec 1899 (hatayı düzeltmek için)
            const date = new Date((serial - 25569) * 86400 * 1000);
            return date.toISOString().slice(0, 10);
        }

        // Format temizle ve kontrol et (GG.AA.YYYY veya GG/AA/YYYY)
        let parts = [];
        if (str.includes(".")) {
            parts = str.split(".");
        } else if (str.includes("/")) {
            parts = str.split("/");
        } else if (str.includes("-")) {
            parts = str.split("-");
            if (parts[0].length === 4) {
                // Zaten YYYY-MM-DD
                return str;
            }
        }

        // Eğer GG.AA.YYYY formatındaysa, YYYY-MM-DD'ye dönüştür
        if (parts.length === 3) {
            let gun = parts[0].padStart(2, "0");
            let ay = parts[1].padStart(2, "0");
            let yil = parts[2];
            if (yil.length === 2) yil = "20" + yil; // 2 haneli yılı 4 haneli yap

            const checkDate = new Date(`${yil}-${ay}-${gun}`);
            if (!isNaN(checkDate.getTime())) {
                return `${yil}-${ay}-${gun}`;
            }
        }

        return null;
    },

    // --- 📋 ÖNİZLEME TABLOSU RENDER MOTORU ---
    renderPreviewTable() {
        let theadHtml = "";
        let tbodyHtml = "";

        if (this.activeTab === "cek") {
            theadHtml = `
                <tr>
                    <th style="width:50px;">Satır</th>
                    <th>Çek No</th>
                    <th>Keşideci / Çek Sahibi</th>
                    <th>Bize Ciro Eden</th>
                    <th>Banka Adı</th>
                    <th>Şube</th>
                    <th>Vade Tarihi</th>
                    <th>Tutar</th>
                    <th>Risk Notu</th>
                    <th style="text-align:right;">Doğrulama</th>
                </tr>
            `;

            tbodyHtml = this.loadedData.map(row => {
                const d = row.data;
                const err = row.errors;

                return `
                    <tr style="${row.isValid ? '' : 'background:rgba(244,63,94,0.05);'}">
                        <td><strong>#${row.lineNo}</strong></td>
                        <td class="${err.cekNo ? 'text-danger font-weight-700' : ''}" title="${err.cekNo || ''}">
                            ${d.cekNo || '<span style="color:var(--text-muted); font-style:italic;">Boş</span>'}
                        </td>
                        <td class="${err.kesideci ? 'text-danger font-weight-700' : ''}" title="${err.kesideci || ''}">
                            ${d.kesideci || '<span style="color:var(--text-muted); font-style:italic;">Boş</span>'}
                        </td>
                        <td>${d.ciroEden || '<span style="color:var(--text-muted); font-style:italic;">—</span>'}</td>
                        <td class="${err.banka ? 'text-danger font-weight-700' : ''}" title="${err.banka || ''}">
                            ${d.bankaAdi || '<span style="color:var(--text-muted); font-style:italic;">Boş</span>'}
                        </td>
                        <td>${d.sube || '<span style="color:var(--text-muted); font-style:italic;">—</span>'}</td>
                        <td class="${err.vade ? 'text-danger font-weight-700' : ''}" title="${err.vade || ''}">
                            ${err.vade ? `<span class="text-danger">${row.errors.vade}</span>` : utils.formatTarih(d.vadeTarihi)}
                        </td>
                        <td class="${err.tutar ? 'text-danger font-weight-700' : ''}" title="${err.tutar || ''}">
                            ${err.tutar ? `<span class="text-danger">${row.errors.tutar}</span>` : utils.formatPara(d.tutar)}
                        </td>
                        <td>${d.riskNotu || '<span style="color:var(--text-muted); font-style:italic;">—</span>'}</td>
                        <td style="text-align:right;">
                            ${row.isValid 
                                ? '<span class="badge badge-success"><i data-lucide="check" style="width:12px;height:12px;vertical-align:middle;"></i> Geçerli</span>' 
                                : `<span class="badge badge-danger" title="${Object.values(err).join(', ')}"><i data-lucide="alert-triangle" style="width:12px;height:12px;vertical-align:middle;"></i> ${Object.keys(err).length} Hata</span>`
                            }
                        </td>
                    </tr>
                `;
            }).join("");

        } else {
            theadHtml = `
                <tr>
                    <th style="width:50px;">Satır</th>
                    <th>Kredi Türü</th>
                    <th>Banka Adı</th>
                    <th>Kredi Tutarı</th>
                    <th>Faiz (%)</th>
                    <th>Başlangıç T.</th>
                    <th>Vade T.</th>
                    <th>Taksit S.</th>
                    <th>Tedarikçi</th>
                    <th>Kom & Masraf</th>
                    <th style="text-align:right;">Doğrulama</th>
                </tr>
            `;

            tbodyHtml = this.loadedData.map(row => {
                const d = row.data;
                const err = row.errors;

                return `
                    <tr style="${row.isValid ? '' : 'background:rgba(244,63,94,0.05);'}">
                        <td><strong>#${row.lineNo}</strong></td>
                        <td class="${err.tur ? 'text-danger font-weight-700' : ''}" title="${err.tur || ''}">
                            <span class="badge badge-info">${d.krediTuru || 'Boş'}</span>
                        </td>
                        <td class="${err.banka ? 'text-danger font-weight-700' : ''}" title="${err.banka || ''}">
                            <strong>${d.bankaAdi || 'Boş'}</strong>
                        </td>
                        <td class="${err.tutar ? 'text-danger font-weight-700' : ''}" title="${err.tutar || ''}">
                            ${err.tutar ? `<span class="text-danger">${err.tutar}</span>` : utils.formatPara(d.tutar)}
                        </td>
                        <td class="${err.faiz ? 'text-danger font-weight-700' : ''}" title="${err.faiz || ''}">
                            ${d.krediTuru === 'DBS' ? '<span style="color:var(--text-muted);">—</span>' : `%${d.faizOrani}`}
                        </td>
                        <td class="${err.baslangic ? 'text-danger font-weight-700' : ''}" title="${err.baslangic || ''}">
                            ${err.baslangic ? `<span class="text-danger">${err.baslangic}</span>` : utils.formatTarih(d.baslangicTarihi)}
                        </td>
                        <td class="${err.vade ? 'text-danger font-weight-700' : ''}" title="${err.vade || ''}">
                            ${d.krediTuru === 'Spot' ? (err.vade ? `<span class="text-danger">${err.vade}</span>` : utils.formatTarih(d.vadeTarihi)) : '<span style="color:var(--text-muted);">—</span>'}
                        </td>
                        <td class="${err.taksit ? 'text-danger font-weight-700' : ''}" title="${err.taksit || ''}">
                            ${d.krediTuru === 'Taksitli' ? (err.taksit ? `<span class="text-danger">${err.taksit}</span>` : `${row.taksitSayisi} Taksit`) : '<span style="color:var(--text-muted);">—</span>'}
                        </td>
                        <td class="${err.tedarikci ? 'text-danger font-weight-700' : ''}" title="${err.tedarikci || ''}">
                            ${d.krediTuru === 'DBS' ? (d.tedarikciFirma || 'Eksik') : '<span style="color:var(--text-muted);">—</span>'}
                        </td>
                        <td>
                            <small style="color:var(--text-secondary);">Kom: ${utils.formatPara(d.komisyonTutari)}<br>Masraf: ${utils.formatPara(d.krediMasrafi)}</small>
                        </td>
                        <td style="text-align:right;">
                            ${row.isValid 
                                ? '<span class="badge badge-success"><i data-lucide="check" style="width:12px;height:12px;vertical-align:middle;"></i> Geçerli</span>' 
                                : `<span class="badge badge-danger" title="${Object.values(err).join(', ')}"><i data-lucide="alert-triangle" style="width:12px;height:12px;vertical-align:middle;"></i> Hata</span>`
                            }
                        </td>
                    </tr>
                `;
            }).join("");
        }

        const validCount = this.loadedData.filter(r => r.isValid).length;
        const invalidCount = this.loadedData.length - validCount;

        return `
            <div class="card" style="margin-top:24px;">
                <div class="card-title-area" style="margin-bottom:16px;">
                    <div>
                        <h4 class="card-title"><i data-lucide="eye"></i> Yüklenen Veri Önizlemesi</h4>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
                            Toplam **${this.loadedData.length}** satır analiz edildi. 
                            <span class="text-success" style="font-weight:700;">${validCount} Geçerli</span>, 
                            <span class="text-danger" style="font-weight:700;">${invalidCount} Hatalı</span> satır var.
                        </p>
                    </div>
                    
                    <div style="display:flex; gap:12px;">
                        <button class="btn btn-secondary" onclick="TopluGirisModule.clearPreview()">
                            <i data-lucide="rotate-ccw"></i> Temizle
                        </button>
                        <button class="btn btn-primary" onclick="TopluGirisModule.importToDatabase()" ${validCount === 0 ? 'disabled' : ''}>
                            <i data-lucide="download"></i> ${validCount} Geçerli Satırı İçe Aktar
                        </button>
                    </div>
                </div>

                ${this.hasErrors ? `
                    <div class="card" style="background:rgba(244,63,94,0.05); border:1px solid rgba(244,63,94,0.15); padding:12px; border-radius:var(--radius-sm); font-size:0.8rem; color:var(--accent-rose); margin-bottom:16px;">
                        <i data-lucide="alert-octagon" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i>
                        <strong>Dikkat!</strong> Bazı satırlarda hatalar tespit edildi. Bu hatalı satırlar içe aktarma işleminde <strong>atlanacaktır</strong>. Sadece yeşil renkli geçerli satırlar sisteme yüklenecektir.
                    </div>
                ` : ''}

                <div class="table-responsive" style="max-height:450px; overflow-y:auto; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                    <table class="custom-table" style="font-size:0.75rem; margin-bottom:0;">
                        <thead>
                            ${theadHtml}
                        </thead>
                        <tbody>
                            ${tbodyHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    clearPreview() {
        this.loadedData = [];
        this.hasErrors = false;
        this.render();
    },

    // --- 💾 VERİTABANINA TOPLU İÇE AKTARMA ---
    async importToDatabase() {
        const validRows = this.loadedData.filter(r => r.isValid);
        if (validRows.length === 0) {
            App.showToast("İçe aktarılacak geçerli satır bulunmuyor!", "error");
            return;
        }

        try {
            // Mevcut bankaları çekelim (otomatik oluşturma için)
            const bankalar = await DBService.getBankalar();
            const bankaAdlari = bankalar.map(b => b.bankaAdi.toLowerCase().trim());

            let importedCount = 0;

            for (let row of validRows) {
                const d = row.data;
                
                // Banka adını standartlaştır ve kontrol et
                const bankaStandart = d.bankaAdi.trim();
                const bankaLower = bankaStandart.toLowerCase();

                // Eğer banka veritabanında yoksa, otomatik olarak yeni banka ekle!
                if (!bankaAdlari.includes(bankaLower)) {
                    const yeniBankaId = await DBService.addBanka({
                        bankaAdi: bankaStandart,
                        subeAdi: d.sube || "Genel Şube",
                        hesapNo: "",
                        iban: "",
                        yetkiliKisi: "",
                        notlar: "Toplu veri girişiyle otomatik oluşturuldu."
                    });
                    bankaAdlari.push(bankaLower);
                    console.log(`Yeni banka otomatik oluşturuldu: ${bankaStandart} (ID: ${yeniBankaId})`);
                }

                if (this.activeTab === "cek") {
                    await DBService.addCek(d);
                } else {
                    // Kredi Ekle
                    const krediId = await DBService.addKredi(d);

                    // Eğer Taksitli kredi ise ödeme planını (taksitleri) hesaplayıp otomatik kaydet!
                    if (d.krediTuru === "Taksitli" && row.taksitSayisi > 0) {
                        const taksitSayisi = row.taksitSayisi;
                        const aylikFaiz = (d.faizOrani / 12) / 100;
                        let aylikTaksit = aylikFaiz > 0 
                            ? d.tutar * (aylikFaiz * Math.pow(1 + aylikFaiz, taksitSayisi)) / (Math.pow(1 + aylikFaiz, taksitSayisi) - 1) 
                            : d.tutar / taksitSayisi;
                        
                        const baslangicTarihi = new Date(d.baslangicTarihi);
                        for (let i = 1; i <= taksitSayisi; i++) {
                            const vadeTarihi = new Date(baslangicTarihi.getFullYear(), baslangicTarihi.getMonth() + i, baslangicTarihi.getDate());
                            await DBService.addKrediOdemesi({
                                krediId: krediId,
                                taksitNo: i,
                                vadeTarihi: vadeTarihi.toISOString().slice(0, 10),
                                tutar: Math.round(aylikTaksit * 100) / 100,
                                odendiMi: false
                            });
                        }
                    }
                }
                importedCount++;
            }

            App.showToast(`Tebrikler! ${importedCount} adet kayıt başarıyla sisteme aktarıldı!`);
            this.clearPreview();
        } catch (err) {
            App.showToast("İçe aktarma hatası: " + err.message, "error");
        }
    },

    // --- 💾 ÖRNEK EXCEL ŞABLONU ÜRETME VE İNDİRME (SHEETJS YEREL YAZICI) ---
    downloadTemplate() {
        try {
            let data = [];
            let fileName = "";

            if (this.activeTab === "cek") {
                fileName = "IsYil_Toplu_Cek_Sablonu.xlsx";
                data = [
                    ["Çek No", "Keşideci / Çek Sahibi", "Bize Ciro Eden", "Banka Adı", "Şube", "Vade Tarihi (GG.AA.YYYY)", "Tutar", "Risk Notu"],
                    ["100254", "Yılmaz Elektrik A.Ş.", "Ahmet Demir", "Yapı Kredi", "Kartal", "25.08.2026", "250000.00", "1450"],
                    ["100255", "Güney Otomotiv Ltd", "", "İş Bankası", "Kadıköy", "10.09.2026", "135000.50", ""],
                    ["100256", "Mavi Lojistik Kardeşler", "Mehmet Kaya", "Garanti Bankası", "Pendik", "18.09.2026", "450.000,00", "980"]
                ];
            } else {
                fileName = "IsYil_Toplu_Kredi_DBS_Sablonu.xlsx";
                data = [
                    ["Kredi Türü (BCH/DBS/Spot/Taksitli)", "Banka Adı", "Limit / Kredi Tutarı", "Faiz Oranı (%)", "Başlangıç Tarihi (GG.AA.YYYY)", "Vade Tarihi (GG.AA.YYYY)", "Taksit Sayısı", "Tedarikçi Firma", "Komisyon Tutarı", "Kredi Masrafı"],
                    ["DBS", "Garanti Bankası", "750000", "", "01.06.2026", "", "", "Petrol Ofisi", "3500", "200"],
                    ["Spot", "Halkbank", "300000", "42.5", "15.06.2026", "15.12.2026", "", "", "", "600"],
                    ["BCH", "Akbank", "1000000", "45.0", "01.06.2026", "", "", "", "5000", "500"],
                    ["Taksitli", "İş Bankası", "600000", "36.0", "01.06.2026", "", "12", "", "", "1000"]
                ];
            }

            // SheetJS ile Workbook ve Sheet oluştur
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Şablon");

            // Dosyayı diske yazdır ve indirmeyi tetikle
            XLSX.writeFile(wb, fileName);
            App.showToast("Örnek yükleme şablonu başarıyla indirildi!");
        } catch (err) {
            App.showToast("Şablon üretilemedi: " + err.message, "error");
        }
    }
};
