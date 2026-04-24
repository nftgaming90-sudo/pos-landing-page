// ==========================================
// db.js - LabaGo Database & Sync Engine
// ==========================================

// --- FUNGSI PERSISTENCE (PENYELAMAT DATA LOKAL) ---

// --- FUNGSI PERSISTENCE (VERSI TAHAN BANTING) ---

window.simpanDB = () => {
    if (!window.db || !window.currentUid) return;
    try {
        const data = window.db.export();
        
        // Ganti String.fromCharCode.apply yang bikin crash dengan loop ini:
        let binary = "";
        const bytes = new Uint8Array(data);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        const base64 = btoa(binary);
        localStorage.setItem(`poskita_db_file_${window.currentUid}`, base64);
        console.log("💾 Database berhasil dikunci ke Storage (Aman dari Stack Overflow).");
    } catch (e) {
        console.error("Gagal simpan ke storage:", e.message);
        // Jika LocalStorage penuh (biasanya 5MB), ini akan kena error QuotaExceeded
    }
};

window.muatDB = (SQL) => {
    if (!window.currentUid) return new SQL.Database();
    const savedData = localStorage.getItem(`poskita_db_file_${window.currentUid}`);
    if (savedData) {
        try {
            const binary = atob(savedData);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            console.log("📂 Memuat database lama...");
            return new SQL.Database(bytes);
        } catch (e) {
            console.error("Gagal muat DB:", e);
            return new SQL.Database();
        }
    }
    return new SQL.Database();
};

window.startAutoSync = async () => {
    const btn = document.getElementById('btn-download');
    if (btn) btn.innerText = "LOADING...";

    try {
        // --- 1. INISIALISASI ENGINE SQL ---
        if (!window.db) {
            const SQL = await window.initSqlJs({ 
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` 
            });
            
            // 🔥 MUAT DATA LAMA (Agar tidak hilang saat refresh)
            window.db = window.muatDB(SQL);
            
            window.db.run(`
                CREATE TABLE IF NOT EXISTS barang (id TEXT PRIMARY KEY, nama TEXT, kategori TEXT, stok INTEGER, harga_jual NUMERIC, modal NUMERIC);
                CREATE TABLE IF NOT EXISTS transaksi (id BIGINT PRIMARY KEY, tanggal TEXT, total NUMERIC, laba NUMERIC, metode_bayar TEXT, pelanggan_id TEXT);
                CREATE TABLE IF NOT EXISTS transaksi_detail (id BIGINT PRIMARY KEY, transaksi_id BIGINT, barang_id TEXT, qty INTEGER, harga NUMERIC, modal NUMERIC);
                CREATE TABLE IF NOT EXISTS shift_kasir (id TEXT PRIMARY KEY, waktu_buka BIGINT, waktu_tutup BIGINT, modal_awal NUMERIC, omzet NUMERIC, laba NUMERIC);
                CREATE TABLE IF NOT EXISTS pelanggan (id TEXT PRIMARY KEY, nama TEXT, hp TEXT, total_hutang NUMERIC, sisa_hutang NUMERIC);
                CREATE TABLE IF NOT EXISTS hutang (id TEXT PRIMARY KEY, pelanggan_id TEXT, transaksi_id BIGINT, total NUMERIC, sisa NUMERIC, tanggal TEXT);
                CREATE TABLE IF NOT EXISTS cicilan (id TEXT PRIMARY KEY, hutang_id TEXT, jumlah NUMERIC, tanggal TEXT);
                CREATE TABLE IF NOT EXISTS kategori (id TEXT PRIMARY KEY, nama TEXT);
                CREATE TABLE IF NOT EXISTS supplier (id TEXT PRIMARY KEY, nama TEXT, kontak TEXT, alamat TEXT); 
                CREATE TABLE IF NOT EXISTS pembelian (id TEXT PRIMARY KEY, supplier_id TEXT, total NUMERIC, tanggal TEXT, status TEXT);
                CREATE TABLE IF NOT EXISTS pembelian_detail (id TEXT PRIMARY KEY, pembelian_id TEXT, barang_id TEXT, qty INTEGER, harga_beli NUMERIC);
            `);

            // Patch Kolom Supplier
            try { window.db.run("ALTER TABLE supplier ADD COLUMN kontak TEXT DEFAULT '-'"); } catch (e) {}
            try { window.db.run("ALTER TABLE supplier ADD COLUMN alamat TEXT DEFAULT '-'"); } catch (e) {}
        }

        // --- 2. FETCH PENGATURAN ---
        if (navigator.onLine && window.currentUid) {
            try {
                const { data: settingData, error: errSetting } = await supabase.from('pengaturan').select('*').eq('user_id', window.currentUid).single();
                if (settingData) {
                    window.fonnteToken = settingData.fonnte_token || "";
                    window.waOwner = settingData.wa_owner || "";
                    window.namaToko = settingData.nama_toko || "PosKita";
                    localStorage.setItem(`poskita_setting_${window.currentUid}`, JSON.stringify({ fonnteToken: window.fonnteToken, waOwner: window.waOwner, namaToko: window.namaToko }));
                }
            } catch (e) { console.warn("Pengaturan skip."); }
        }

        // --- 3. PROSES OFFLINE QUEUE (Kirim data lokal ke Cloud) ---
        if (navigator.onLine) await window.processOfflineQueue();

        // --- 4. PULL DATA DARI CLOUD (Update dari perangkat lain) ---
        if (navigator.onLine && window.currentUid) {
            console.log("☁️ Menarik data terbaru dari Cloud...");

            const tables = ['barang', 'pelanggan', 'hutang', 'transaksi', 'transaksi_detail', 'shift_kasir', 'supplier', 'cicilan', 'kategori'];
            
            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*').eq('user_id', window.currentUid);
                if (!error && data) {
                    data.forEach(item => {
                        if (table === 'supplier') {
                            window.db.run("INSERT OR REPLACE INTO supplier (id, nama, kontak, alamat) VALUES (?,?,?,?)", 
                            [item.id, item.nama, item.hp || item.kontak, item.alamat]);
                        } else {
                            const keys = Object.keys(item).filter(k => k !== 'user_id' && k !== 'created_at');
                            const placeholders = keys.map(() => "?").join(",");
                            const values = keys.map(k => item[k]);
                            window.db.run(`INSERT OR REPLACE INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`, values);
                        }
                    });
                }
            }

            const { data: trxData } = await supabase.from('transaksi').select('*').eq('user_id', window.currentUid);
if (trxData) {
    // 🔥 KUNCINYA DI SINI: Bersihkan data lama di lokal sebelum ditimpa data terbaru dari Cloud
    window.db.run("DELETE FROM transaksi"); 
    window.db.run("DELETE FROM transaksi_detail");
    
    trxData.forEach(t => {
        window.db.run("INSERT INTO transaksi (id, tanggal, total, laba, metode_bayar, pelanggan_id) VALUES (?,?,?,?,?,?)", 
        [t.id, t.tanggal, t.total, t.laba, t.metode_bayar, t.pelanggan_id]);
    });
}

// 2. Pull Detail Transaksi
const { data: detailData } = await supabase.from('transaksi_detail').select('*').eq('user_id', window.currentUid);
if (detailData) {
    detailData.forEach(td => {
        window.db.run("INSERT INTO transaksi_detail (id, transaksi_id, barang_id, qty, harga, modal) VALUES (?,?,?,?,?,?)", 
        [td.id, td.transaksi_id, td.barang_id, td.qty, td.harga, td.modal]);
    });
}

// 3. Pull Hutang (SINKRONISASI HAPUS)
const { data: hutangData } = await supabase.from('hutang').select('*').eq('user_id', window.currentUid);
if (hutangData) {
    // 🔥 Bersihkan tabel hutang lokal biar yang sudah lunas/dihapus di HP lain ikut hilang
    window.db.run("DELETE FROM hutang");
    
    hutangData.forEach(h => {
        window.db.run("INSERT INTO hutang (id, pelanggan_id, transaksi_id, total, sisa, tanggal) VALUES (?,?,?,?,?,?)", 
        [h.id, h.pelanggan_id, h.transaksi_id, h.total, h.sisa, h.tanggal]);
    });
}

            window.simpanDB();
        }

        window.refreshDataUI();
        if (btn) btn.innerText = "SINKRON";

    } catch (err) { 
        console.error("Gagal startAutoSync:", err); 
        if (btn) btn.innerText = "ERROR DB"; 
    }
};

window.refreshDataUI = () => {
    if (!window.db) return;
    try {
        const res = window.db.exec("SELECT nama, stok, harga_jual, modal, id, kategori FROM barang ORDER BY nama ASC");
        window.masterData = (res && res.length > 0) ? res[0].values : [];

        if (window.currentUid) {
            localStorage.setItem(`poskita_master_cache_${window.currentUid}`, JSON.stringify(window.masterData));
        }

        const dataToRender = window.currentCategoryFilter === "Semua" 
            ? window.masterData 
            : window.masterData.filter(item => item[5] === window.currentCategoryFilter);

        let finalData = dataToRender;
        if (window.isKritisMode) {
            finalData = dataToRender.filter(item => (parseInt(item[1]) || 0) <= 5);
        }

        // Render UI
        window.renderTable?.(dataToRender);
        window.renderStokTable?.(finalData);
        window.updateReports?.();
        window.renderPelangganSelect?.();
        window.renderCategoryTabs?.();
        window.renderKategoriSelect?.();
        
        const stokCounter = document.getElementById('stok-counter');
        if (stokCounter) stokCounter.innerText = `${window.masterData.length} Item Barang`;

        setTimeout(() => { window.renderRekomendasiKulakan?.(); }, 150);
    } catch (e) { console.error("Refresh UI Error:", e); }
};