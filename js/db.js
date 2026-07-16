/* ==========================================================================
   📦 İS-YIL FİNANS VE MUHASEBE PROGRAMI - VERİTABANI & GÜVENLİK ALTYAPISI (DB.JS)
   ========================================================================== */

// 1. Dexie Veritabanı Tanımı
const db = new Dexie("IsmailFinansDB");

// Tablo Şemaları (v4)
db.version(4).stores({
    ayarlar: 'anahtar',          // anahtar, deger (Örn: şifre hashi)
    krediler: '++id',            // { id, payload }
    cekler: '++id',              // { id, payload }
    krediOdemeleri: '++id',      // { id, payload }
    bankalar: '++id',            // { id, payload }
    teminatMektuplari: '++id',   // { id, payload }
    dbsFaturalar: '++id',        // { id, payload }
    islemGecmisi: '++id'         // { id, payload }
});

// 2. Güvenlik ve Şifreleme Motoru (AES-256)
let MASTER_PASSWORD = ""; // Oturum boyunca hafızada tutulacak şifre

const Security = {
    // Master Şifreyi Ayarla (Oturum Açıldığında)
    setPassword(password) {
        MASTER_PASSWORD = password;
    },

    // Şifreyi Sıfırla (Çıkış Yapıldığında)
    clearPassword() {
        MASTER_PASSWORD = "";
    },

    // Şifre belirlenmiş mi kontrol et
    isPasswordLoaded() {
        return MASTER_PASSWORD !== "";
    },

    // Veriyi Şifrele (AES-256)
    encrypt(object) {
        if (!this.isPasswordLoaded()) {
            throw new Error("Veritabanı şifresi yüklenmedi! Lütfen giriş yapın.");
        }
        const plainText = JSON.stringify(object);
        return CryptoJS.AES.encrypt(plainText, MASTER_PASSWORD).toString();
    },

    // Şifreli Veriyi Çöz
    decrypt(cipherText) {
        if (!this.isPasswordLoaded()) {
            throw new Error("Veritabanı şifresi yüklenmedi! Lütfen giriş yapın.");
        }
        try {
            const bytes = CryptoJS.AES.decrypt(cipherText, MASTER_PASSWORD);
            const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedText) {
                throw new Error("Hatalı şifre veya bozuk veri!");
            }
            return JSON.parse(decryptedText);
        } catch (e) {
            throw new Error("Veri şifresi çözülemedi! Giriş şifreniz hatalı olabilir.");
        }
    },

    // Şifre doğrulama için Hash üret (SHA-256)
    hashPassword(password) {
        return CryptoJS.SHA256(password).toString();
    },

    // İlk kurulum kontrolü
    async isSetupRequired() {
        const hashObj = await db.ayarlar.get("password_hash");
        return hashObj === undefined;
    },

    // İlk kez şifre tanımlama
    async setupMasterPassword(password) {
        const hash = this.hashPassword(password);
        await db.ayarlar.put({ anahtar: "password_hash", deger: hash });
        this.setPassword(password);
    },

    // Şifre doğrulama
    async verifyPassword(password) {
        const hashObj = await db.ayarlar.get("password_hash");
        if (!hashObj) return false;
        
        const testHash = this.hashPassword(password);
        if (hashObj.deger === testHash) {
            this.setPassword(password);
            return true;
        }
        return false;
    }
};

// 3. Veritabanı Yardımcı Fonksiyonları (CRUD)
const DBService = {
    // --- İŞLEM GEÇMİŞİ LOG ---
    async getIslemGecmisi(limit = 15) {
        try {
            const raw = await db.islemGecmisi.reverse().limit(limit).toArray();
            return raw.map(item => {
                const decrypted = Security.decrypt(item.payload);
                decrypted.id = item.id;
                return decrypted;
            });
        } catch (e) {
            console.error("İşlem geçmişi okunamadı:", e);
            return [];
        }
    },

    async addIslemLog(log) {
        try {
            if (!Security.isPasswordLoaded()) return; // Şifre girilmemişse loglama yapma
            const payload = Security.encrypt(log);
            await db.islemGecmisi.add({ payload });
        } catch (e) {
            console.error("İşlem logu eklenemedi:", e);
        }
    },

    // --- KREDİLER ---
    async getKrediler() {
        const raw = await db.krediler.toArray();
        return raw.map(item => {
            const decrypted = Security.decrypt(item.payload);
            decrypted.id = item.id; // Gerçek ID'yi ekle
            return decrypted;
        });
    },

    async addKredi(kredi) {
        const payload = Security.encrypt(kredi);
        const id = await db.krediler.add({ payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Ekle",
            modul: "Krediler",
            aciklama: `Yeni Kredi Eklendi: ${kredi.bankaAdi} - ${kredi.krediTuru || ''} (${kredi.tutar} ${kredi.dovizCinsi || '₺'})`
        });
        return id;
    },

    async updateKredi(id, kredi) {
        const payload = Security.encrypt(kredi);
        await db.krediler.update(id, { payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Güncelle",
            modul: "Krediler",
            aciklama: `Kredi Güncellendi: ${kredi.bankaAdi} - ${kredi.krediTuru || ''} (${kredi.tutar} ${kredi.dovizCinsi || '₺'})`
        });
    },

    async deleteKredi(id) {
        const target = await db.krediler.get(id);
        let desc = `Kredi Silindi (ID: ${id})`;
        if (target) {
            try {
                const decrypted = Security.decrypt(target.payload);
                desc = `Kredi Silindi: ${decrypted.bankaAdi} - ${decrypted.krediTuru || ''} (${decrypted.tutar} ${decrypted.dovizCinsi || '₺'})`;
            } catch(e) {}
        }

        await db.krediler.delete(id);
        // Bu krediye bağlı tüm taksitleri sil
        const odemeler = await this.getKrediOdemeleri();
        for (let o of odemeler) {
            if (o.krediId === id) {
                await db.krediOdemeleri.delete(o.id);
            }
        }
        // Bu krediye (DBS limitine) bağlı tüm faturaları sil
        try {
            const faturalar = await this.getDbsFaturalar();
            for (let f of faturalar) {
                if (f.krediId === id) {
                    await db.dbsFaturalar.delete(f.id);
                }
            }
        } catch(e) { /* v3 öncesi hata fırlatabilir, yoksay */ }

        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Sil",
            modul: "Krediler",
            aciklama: desc
        });
    },

    // --- KREDİ ÖDEMELERİ (TAKSİTLER) ---
    async getKrediOdemeleri() {
        const raw = await db.krediOdemeleri.toArray();
        return raw.map(item => {
            const decrypted = Security.decrypt(item.payload);
            decrypted.id = item.id;
            return decrypted;
        });
    },

    async addKrediOdemesi(odeme) {
        const payload = Security.encrypt(odeme);
        await db.krediOdemeleri.add({ payload });
    },

    async updateKrediOdemesi(id, odeme) {
        const payload = Security.encrypt(odeme);
        await db.krediOdemeleri.update(id, { payload });
    },

    // --- MÜŞTERİ ÇEKLERİ ---
    async getCekler() {
        const raw = await db.cekler.toArray();
        return raw.map(item => {
            const decrypted = Security.decrypt(item.payload);
            decrypted.id = item.id;
            return decrypted;
        });
    },

    async addCek(cek) {
        const payload = Security.encrypt(cek);
        const id = await db.cekler.add({ payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Ekle",
            modul: "Çekler",
            aciklama: `Yeni Çek Eklendi: No: ${cek.cekNo}, Keşideci: ${cek.kesideci}, Vade: ${cek.vadeTarihi || ''} (${cek.tutar} ₺)`
        });
        return id;
    },

    async updateCek(id, cek) {
        const payload = Security.encrypt(cek);
        await db.cekler.update(id, { payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Güncelle",
            modul: "Çekler",
            aciklama: `Çek Güncellendi: No: ${cek.cekNo}, Durum: ${cek.durum} (${cek.tutar} ₺)`
        });
    },

    async deleteCek(id) {
        const target = await db.cekler.get(id);
        let desc = `Çek Silindi (ID: ${id})`;
        if (target) {
            try {
                const decrypted = Security.decrypt(target.payload);
                desc = `Çek Silindi: No: ${decrypted.cekNo}, Keşideci: ${decrypted.kesideci} (${decrypted.tutar} ₺)`;
            } catch(e) {}
        }

        await db.cekler.delete(id);

        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Sil",
            modul: "Çekler",
            aciklama: desc
        });
    },

    // --- BANKALAR ---
    async getBankalar() {
        const raw = await db.bankalar.toArray();
        return raw.map(item => {
            const decrypted = Security.decrypt(item.payload);
            decrypted.id = item.id;
            return decrypted;
        });
    },

    async addBanka(banka) {
        const payload = Security.encrypt(banka);
        const id = await db.bankalar.add({ payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Ekle",
            modul: "Bankalar",
            aciklama: `Yeni Banka Eklendi: ${banka.bankaAdi} (${banka.subeAdi || ''})`
        });
        return id;
    },

    async updateBanka(id, banka) {
        const payload = Security.encrypt(banka);
        await db.bankalar.update(id, { payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Güncelle",
            modul: "Bankalar",
            aciklama: `Banka Hesabı Güncellendi: ${banka.bankaAdi} (${banka.subeAdi || ''})`
        });
    },

    async deleteBanka(id) {
        const target = await db.bankalar.get(id);
        let desc = `Banka Silindi (ID: ${id})`;
        if (target) {
            try {
                const decrypted = Security.decrypt(target.payload);
                desc = `Banka Silindi: ${decrypted.bankaAdi} (${decrypted.subeAdi || ''})`;
            } catch(e) {}
        }

        await db.bankalar.delete(id);
        // Bu bankaya bağlı tüm teminat mektuplarını da sil
        const mektuplar = await this.getTeminatMektuplari();
        for (let m of mektuplar) {
            if (m.bankaId === id) {
                await db.teminatMektuplari.delete(m.id);
            }
        }

        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Sil",
            modul: "Bankalar",
            aciklama: desc
        });
    },

    // --- TEMİNAT MEKTUPLARI ---
    async getTeminatMektuplari() {
        const raw = await db.teminatMektuplari.toArray();
        return raw.map(item => {
            const decrypted = Security.decrypt(item.payload);
            decrypted.id = item.id;
            return decrypted;
        });
    },

    async addTeminatMektubu(tm) {
        const payload = Security.encrypt(tm);
        const id = await db.teminatMektuplari.add({ payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Ekle",
            modul: "Teminat Mektupları",
            aciklama: `Yeni Teminat Mektubu Eklendi: No: ${tm.mektupNo}, Lehtar: ${tm.lehtar} (${tm.tutar} ${tm.doviz || '₺'})`
        });
        return id;
    },

    async updateTeminatMektubu(id, tm) {
        const payload = Security.encrypt(tm);
        await db.teminatMektuplari.update(id, { payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Güncelle",
            modul: "Teminat Mektupları",
            aciklama: `Teminat Mektubu Güncellendi: No: ${tm.mektupNo}, Durum: ${tm.durum} (${tm.tutar} ${tm.doviz || '₺'})`
        });
    },

    async deleteTeminatMektubu(id) {
        const target = await db.teminatMektuplari.get(id);
        let desc = `Teminat Mektubu Silindi (ID: ${id})`;
        if (target) {
            try {
                const decrypted = Security.decrypt(target.payload);
                desc = `Teminat Mektubu Silindi: No: ${decrypted.mektupNo}, Lehtar: ${decrypted.lehtar} (${decrypted.tutar} ${decrypted.doviz || '₺'})`;
            } catch(e) {}
        }

        await db.teminatMektuplari.delete(id);

        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Sil",
            modul: "Teminat Mektupları",
            aciklama: desc
        });
    },

    // --- DBS FATURALARI ---
    async getDbsFaturalar() {
        const raw = await db.dbsFaturalar.toArray();
        return raw.map(item => {
            const decrypted = Security.decrypt(item.payload);
            decrypted.id = item.id;
            return decrypted;
        });
    },

    async addDbsFatura(fatura) {
        const payload = Security.encrypt(fatura);
        const id = await db.dbsFaturalar.add({ payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Ekle",
            modul: "DBS Faturaları",
            aciklama: `Yeni DBS Faturası Eklendi: No: ${fatura.faturaNo}, Tedarikçi: ${fatura.tedarikciFirma} (${fatura.faturaTutari} ₺)`
        });
        return id;
    },

    async updateDbsFatura(id, fatura) {
        const payload = Security.encrypt(fatura);
        await db.dbsFaturalar.update(id, { payload });
        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Güncelle",
            modul: "DBS Faturaları",
            aciklama: `DBS Faturası Güncellendi: No: ${fatura.faturaNo}, Durum: ${fatura.durum || 'Bekliyor'} (${fatura.faturaTutari} ₺)`
        });
    },

    async deleteDbsFatura(id) {
        const target = await db.dbsFaturalar.get(id);
        let desc = `DBS Faturası Silindi (ID: ${id})`;
        if (target) {
            try {
                const decrypted = Security.decrypt(target.payload);
                desc = `DBS Faturası Silindi: No: ${decrypted.faturaNo}, Tedarikçi: ${decrypted.tedarikciFirma} (${decrypted.faturaTutari} ₺)`;
            } catch(e) {}
        }

        await db.dbsFaturalar.delete(id);

        await this.addIslemLog({
            tarih: new Date().toISOString(),
            islemTipi: "Sil",
            modul: "DBS Faturaları",
            aciklama: desc
        });
    }
};
