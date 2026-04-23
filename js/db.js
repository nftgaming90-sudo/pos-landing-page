window.startAutoSync = async () => {
    const btn = document.getElementById('btn-download');
    if (btn) btn.innerText = "LOADING...";

    try {
        // --- 1. INISIALISASI ENGINE SQL ---
        if (!window.db) {
            const SQL = await window.initSqlJs({ 
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` 
            });
            window.db = new SQL.Database();
            
            window.db.run(`
                CREATE TABLE IF NOT EXISTS barang (id TEXT PRIMARY KEY, nama TEXT, kategori TEXT, stok INTEGER, harga_jual NUMERIC, modal NUMERIC);
                CREATE TABLE IF NOT EXISTS transaksi (id BIGINT PRIMARY KEY, tanggal TEXT, total NUMERIC, laba NUMERIC, metode_bayar TEXT, pelanggan_id TEXT);
                CREATE TABLE IF NOT EXISTS transaksi_detail (id BIGINT PRIMARY KEY, transaksi_id BIGINT, barang_id TEXT, qty INTEGER, harga NUMERIC, modal NUMERIC);
                CREATE TABLE IF NOT EXISTS shift_kasir (id TEXT PRIMARY KEY, waktu_buka BIGINT, waktu_tutup BIGINT, modal_awal NUMERIC, omzet NUMERIC, laba NUMERIC);
                CREATE TABLE IF NOT EXISTS pelanggan (id TEXT PRIMARY KEY, nama TEXT, hp TEXT, total_hutang NUMERIC, sisa_hutang NUMERIC);
                CREATE TABLE IF NOT EXISTS hutang (id TEXT PRIMARY KEY, pelanggan_id TEXT, transaksi_id BIGINT, total NUMERIC, sisa NUMERIC, tanggal TEXT);
                CREATE TABLE IF NOT EXISTS cicilan (id TEXT PRIMARY KEY, hutang_id TEXT, jumlah NUMERIC, tanggal TEXT);
                CREATE TABLE IF NOT EXISTS kategori (id TEXT PRIMARY KEY, nama TEXT);
                
                -- Tabel Supplier & Pembelian --
                CREATE TABLE IF NOT EXISTS supplier (id TEXT PRIMARY KEY, nama TEXT, kontak TEXT); 
                CREATE TABLE IF NOT EXISTS pembelian (id TEXT PRIMARY KEY, supplier_id TEXT, total NUMERIC, tanggal TEXT, status TEXT);
                CREATE TABLE IF NOT EXISTS pembelian_detail (id TEXT PRIMARY KEY, pembelian_id TEXT, barang_id TEXT, qty INTEGER, harga_beli NUMERIC);
            `);

            // --- 2. PATCH KOLOM (Untuk user lama yang tabelnya sudah terlanjur ada) ---
            
            // Cek apakah kolom 'kontak' ada, kalau nggak ada (masih pakai kolom 'hp'), kita tambahkan
            try {
                window.db.run("ALTER TABLE supplier ADD COLUMN kontak TEXT DEFAULT '-'");
            } catch (e) { /* sudah ada */ }

            try {
                window.db.run("ALTER TABLE supplier ADD COLUMN alamat TEXT DEFAULT '-'");
            } catch (e) { /* sudah ada */ }
        }

        // --- 2. LOGIKA FETCH PENGATURAN ---
        if (navigator.onLine && window.currentUid) {
            try {
                const { data: settingData, error: errSetting } = await supabase.from('pengaturan').select('*').eq('user_id', window.currentUid).single();
                
                if (settingData) {
                    window.fonnteToken = settingData.fonnte_token || "";
                    window.waOwner = settingData.wa_owner || "";
                    window.namaToko = settingData.nama_toko || "PosKita";
                    localStorage.setItem(`poskita_setting_${window.currentUid}`, JSON.stringify({ fonnteToken: window.fonnteToken, waOwner: window.waOwner, namaToko: window.namaToko }));
                } else if (errSetting && errSetting.code === 'PGRST116') {
                    const defaultToko = "Toko " + (window.userEmail ? window.userEmail.split('@')[0] : "Baru");
                    await supabase.from('pengaturan').insert({
                        user_id: window.currentUid,
                        fonnte_token: "",
                        wa_owner: "",
                        nama_toko: defaultToko
                    });
                }
            } catch (settingError) {
                console.warn("Tabel pengaturan belum siap:", settingError);
            }
        }

        // --- 3. PROSES OFFLINE QUEUE ---
        if (navigator.onLine) await window.processOfflineQueue();

        // --- 4. PULL DATA DARI CLOUD KE SQL LOKAL ---
        if (navigator.onLine && window.currentUid) {
            // Pull Barang
            const { data: barangData } = await supabase.from('barang').select('*').eq('user_id', window.currentUid);
            if (barangData) {
                barangData.forEach(b => {
                    window.db.run("INSERT OR REPLACE INTO barang (id, nama, kategori, stok, harga_jual, modal) VALUES (?,?,?,?,?,?)", 
                    [b.id, b.nama, b.kategori || 'Umum', b.stok, b.harga_jual, b.modal]);
                });
            }

            // Pull Pelanggan
            const { data: pelangganData } = await supabase.from('pelanggan').select('*').eq('user_id', window.currentUid);
            if (pelangganData) {
                pelangganData.forEach(p => {
                    window.db.run("INSERT OR REPLACE INTO pelanggan (id, nama, hp, total_hutang, sisa_hutang) VALUES (?,?,?,?,?)", 
                    [p.id, p.nama, p.hp, p.total_hutang, p.sisa_hutang]);
                });
            }

            // Pull Hutang
            const { data: hutangData } = await supabase.from('hutang').select('*').eq('user_id', window.currentUid);
            if (hutangData) {
                hutangData.forEach(h => {
                    window.db.run("INSERT OR REPLACE INTO hutang (id, pelanggan_id, transaksi_id, total, sisa, tanggal) VALUES (?,?,?,?,?,?)", 
                    [h.id, h.pelanggan_id, h.transaksi_id, h.total, h.sisa, h.tanggal]);
                });
            }
            
            // Pull Transaksi
            const { data: trxData } = await supabase.from('transaksi').select('*').eq('user_id', window.currentUid);
            if (trxData) {
                trxData.forEach(t => {
                    window.db.run("INSERT OR REPLACE INTO transaksi (id, tanggal, total, laba, metode_bayar, pelanggan_id) VALUES (?,?,?,?,?,?)", 
                    [t.id, t.tanggal, t.total, t.laba, t.metode_bayar, t.pelanggan_id]);
                });
            }

            // Pull Detail Transaksi
            const { data: detailData } = await supabase.from('transaksi_detail').select('*').eq('user_id', window.currentUid);
            if (detailData) {
                detailData.forEach(td => {
                    window.db.run("INSERT OR REPLACE INTO transaksi_detail (id, transaksi_id, barang_id, qty, harga, modal) VALUES (?,?,?,?,?,?)", 
                    [td.id, td.transaksi_id, td.barang_id, td.qty, td.harga, td.modal]);
                });
            }

            // Pull Shift
            const { data: shiftData } = await supabase.from('shift_kasir').select('*').eq('user_id', window.currentUid);
            if (shiftData) {
                shiftData.forEach(s => {
                    window.db.run("INSERT OR REPLACE INTO shift_kasir (id, waktu_buka, waktu_tutup, modal_awal, omzet, laba) VALUES (?,?,?,?,?,?)", 
                    [s.id, s.waktu_buka, s.waktu_tutup, s.modal_awal, s.omzet, s.laba]);
                });
            }

            // Pull Supplier (Jembatan antara 'hp' di Cloud dan 'kontak' di Lokal)
const { data: supplierData } = await supabase.from('supplier').select('*').eq('user_id', window.currentUid);
if (supplierData) {
    supplierData.forEach(sup => {
        // Ambil 'sup.hp' dari Supabase, masukkan ke kolom 'kontak' di SQLite
        window.db.run("INSERT OR REPLACE INTO supplier (id, nama, kontak, alamat) VALUES (?,?,?,?)", 
        [sup.id, sup.nama, sup.hp, sup.alamat]);
    });
    
    // Simpan perubahan ke database lokal
    if (typeof window.simpanDB === 'function') window.simpanDB();
    
    // Update tampilan dropdown supplier
    if (typeof window.renderSelectSupplier === 'function') {
        window.renderSelectSupplier();
    }
}
        }

        window.refreshDataUI();
        if (btn) btn.innerText = "SINKRON";

    } catch (err) { 
        console.error("Gagal startAutoSync:", err); 
        if (btn) btn.innerText = "ERROR DB"; 
    }
};

window.refreshDataUI = () => {
    if (!window.db) {
        console.warn("Database belum siap, refresh UI dibatalkan.");
        return;
    }
    
    try {
        // 1. Ambil data terbaru dari SQLite
        const res = window.db.exec("SELECT nama, stok, harga_jual, modal, id, kategori FROM barang ORDER BY nama ASC");
        
        if (res && res.length > 0) { 
            window.masterData = res[0].values; 
        } else {
            window.masterData = [];
        }

        // 2. Simpan ke Cache agar saat offline data tetap aman
        if (window.currentUid) {
            localStorage.setItem(`poskita_master_cache_${window.currentUid}`, JSON.stringify(window.masterData));
        }

        // 3. Pastikan Filter Kategori tidak hilang
        if (!window.currentCategoryFilter) {
            window.currentCategoryFilter = "Semua";
        }

        // 4. Update Counter Stok (Teks jumlah barang)
        const stokCounter = document.getElementById('stok-counter');
        if (stokCounter) {
            stokCounter.innerText = `${window.masterData.length} Item Barang`;
        }

        // 5. EKSEKUSI RENDER UI
        // Kita gunakan data yang sudah difilter kategori agar tampilan konsisten
        const dataToRender = window.currentCategoryFilter === "Semua" 
            ? window.masterData 
            : window.masterData.filter(item => item[5] === window.currentCategoryFilter);

        window.renderTable?.(dataToRender);     // Tabel Kasir
        window.renderStokTable?.(dataToRender); // Tabel Stok
        window.updateReports?.();               // Laporan Laba/Rugi
        window.renderPelangganSelect?.();       // Dropdown Pelanggan
        window.renderCategoryTabs?.();          // Tab Kategori (Atas)
        window.renderKategoriSelect?.();        // Dropdown Kategori di Modal

        // 6. FORCE RENDER REKOMENDASI KULAKAN (Kunci Utamanya di sini)
        // Kita kasih delay sedikit agar DOM 'menu-stok' sudah siap/dirender browser
        setTimeout(() => {
            if (typeof window.renderRekomendasiKulakan === 'function') {
                window.renderRekomendasiKulakan();
            } else {
                console.warn("Fungsi window.renderRekomendasiKulakan tidak ditemukan.");
            }
        }, 150);

    } catch (e) {
        console.error("Gagal refresh UI LabaGo:", e);
    }
};