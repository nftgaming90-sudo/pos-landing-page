window.updateSyncUI = () => {
    const q = window.offlineQueue || {};
    const barangCount = (q.barang || []).length;
    const trxCount = (q.transaksi || []).length;
    const delBarangCount = (q.hapus_barang || []).length;
    const delTrxCount = (q.hapus_transaksi || []).length;
    const shiftCount = (q.shift || []).length;
    const plgCount = (q.pelanggan || []).length;
    const hutangCount = (q.hutang || []).length;
    const cicilanCount = (q.cicilan || []).length;
    const supCount = (q.supplier || []).length;

    const totalCount = barangCount + trxCount + delBarangCount + delTrxCount + shiftCount + plgCount + hutangCount + cicilanCount + supCount;
    
    const btn = document.getElementById('btn-download');
    if (!btn) return;

    if (totalCount > 0) {
        btn.innerText = `SYNC (${totalCount} PENDING)`;
        btn.classList.add('bg-amber-100', 'text-amber-700', 'border-amber-300', 'animate-pulse');
    } else {
        btn.innerText = "SINKRON";
        btn.classList.remove('bg-amber-100', 'text-amber-700', 'border-amber-300', 'animate-pulse');
    }
};

window.saveQueue = () => {
    if(window.currentUid) {
        localStorage.setItem(`poskita_offline_queue_${window.currentUid}`, JSON.stringify(window.offlineQueue));
    }
    window.updateSyncUI();
};

window.processOfflineQueue = async () => {
    if (!navigator.onLine || !window.offlineQueue) return;
    
    const btn = document.getElementById('btn-download');
    if (btn) btn.innerText = "UPLOADING...";

    try {
        const uid = window.currentUid;

        // --- 1. PROSES DELETE (Barang & Transaksi) ---
        if (window.offlineQueue.hapus_barang?.length > 0) {
            for (let id of [...window.offlineQueue.hapus_barang]) {
                const { error } = await supabase.from('barang').delete().eq('id', id).eq('user_id', uid);
                if (!error) window.offlineQueue.hapus_barang = window.offlineQueue.hapus_barang.filter(i => i !== id);
            }
        }
        if (window.offlineQueue.hapus_transaksi?.length > 0) {
            for (let id of [...window.offlineQueue.hapus_transaksi]) {
                await supabase.from('transaksi_detail').delete().eq('transaksi_id', id).eq('user_id', uid);
                const { error } = await supabase.from('transaksi').delete().eq('id', id).eq('user_id', uid);
                if (!error) window.offlineQueue.hapus_transaksi = window.offlineQueue.hapus_transaksi.filter(i => i !== id);
            }
        }

        // --- 2. PROSES UPSERT (Urutan Sangat Penting) ---

        // A. Pelanggan (Wajib Pertama)
        // A. Pelanggan
        if (window.offlineQueue.pelanggan?.length > 0) {
            const data = window.offlineQueue.pelanggan.map(p => ({ ...p, user_id: uid }));
            const { error } = await supabase.from('pelanggan').upsert(data);
            if (!error) window.offlineQueue.pelanggan = []; 
        }

        // B. Hutang (Kunci utama sinkronisasi sisa hutang)
        if (window.offlineQueue.hutang?.length > 0) {
            const data = window.offlineQueue.hutang.map(h => ({
                id: String(h.id),
                pelanggan_id: String(h.pelanggan_id),
                transaksi_id: Number(h.transaksi_id),
                total: Number(h.total) || 0,
                sisa: Number(h.sisa) || 0,
                tanggal: String(h.tanggal),
                user_id: uid
            }));
            const { error } = await supabase.from('hutang').upsert(data);
            if (!error) window.offlineQueue.hutang = []; 
        }

        // C. Cicilan
        if (window.offlineQueue.cicilan?.length > 0) {
            const data = window.offlineQueue.cicilan.map(c => ({
                id: String(c.id),
                hutang_id: String(c.hutang_id),
                jumlah: Number(c.jumlah) || 0,
                tanggal: String(c.tanggal),
                user_id: uid
            }));
            const { error } = await supabase.from('cicilan').upsert(data);
            if (!error) window.offlineQueue.cicilan = []; 
        }

        // D. Supplier & Barang
        if (window.offlineQueue.supplier?.length > 0) {
            const data = window.offlineQueue.supplier.map(s => ({ ...s, user_id: uid }));
            const { error } = await supabase.from('supplier').upsert(data);
            if (!error) window.offlineQueue.supplier = [];
        }
        if (window.offlineQueue.barang?.length > 0) {
            const data = window.offlineQueue.barang.map(b => ({ ...b, user_id: uid }));
            const { error } = await supabase.from('barang').upsert(data);
            if (!error) window.offlineQueue.barang = []; 
        }

        // --- 2. E. Kulakan (Pembelian) ---
if (window.offlineQueue.pembelian?.length > 0) {
    const dataP = window.offlineQueue.pembelian.map(p => ({
        id: String(p.id),
        supplier_id: String(p.supplier_id),
        total: Number(p.total) || 0,
        tanggal: p.tanggal,
        status: p.status,
        user_id: uid // Pastikan UID masuk ke induk
    }));
    const { error } = await supabase.from('pembelian').upsert(dataP);
    if (!error) window.offlineQueue.pembelian = [];
}

if (window.offlineQueue.pembelian_detail?.length > 0) {
    const dataPD = window.offlineQueue.pembelian_detail.map(pd => ({
        id: String(pd.id).trim(), // Paksa string & bersihkan spasi
        pembelian_id: String(pd.pembelian_id).trim(),
        barang_id: String(pd.barang_id).trim(),
        qty: Math.round(Number(pd.qty)) || 0, // Paksa angka bulat
        harga_beli: Math.round(Number(pd.harga_beli)) || 0, // Paksa angka bulat
        user_id: uid 
    }));

    // Pakai try catch biar kalau satu baris error, Mas bisa lihat alasannya
    try {
        const { error } = await supabase.from('pembelian_detail').upsert(dataPD);
        if (error) {
            console.error("Detail Error Detail:", error.message, error.details);
            throw error;
        }
        window.offlineQueue.pembelian_detail = [];
    } catch (err) {
        console.error("Gagal Upsert Detail:", err);
    }
}

        // F. Shift
        if (window.offlineQueue.shift?.length > 0) {
            await supabase.from('shift_kasir').upsert(window.offlineQueue.shift);
            window.offlineQueue.shift = [];
        }

        // G. Transaksi Penjualan (Terakhir)
        if (window.offlineQueue.transaksi?.length > 0) {
            let pendingTrx = [];
            for (let payload of window.offlineQueue.transaksi) {
                try {
                    // Buat fungsi push versi ringan khusus offline queue
                    // agar tidak mengulangi update stok/hutang yang sudah diproses di bagian B & D
                    const { error: trxErr } = await supabase.from('transaksi').upsert({
                        id: payload.ts, 
                        tanggal: payload.ts.toString(), 
                        total: payload.totalB, 
                        laba: payload.totalL, 
                        metode_bayar: payload.metode,
                        pelanggan_id: payload.pelanggan_id || null, 
                        user_id: uid 
                    });

                    if (trxErr) throw trxErr;

                    // Upload detailnya saja
                    if (payload.cart?.length > 0) {
                        const detailData = payload.cart.map((i, index) => ({
                            id: (payload.ts + (index + 1)).toString(),
                            transaksi_id: payload.ts, 
                            barang_id: i.id, 
                            qty: i.qty, 
                            harga: Math.round(window.hitungSubtotalItem(i) / i.qty), 
                            modal: i.modal, 
                            user_id: uid 
                        }));
                        await supabase.from('transaksi_detail').upsert(detailData);
                    }
                } catch(e) { 
                    pendingTrx.push(payload); 
                }
            }
            window.offlineQueue.transaksi = pendingTrx;
        }

        window.saveQueue();
        console.log("✅ Sinkronisasi Cloud Berhasil");

    } catch(e) {
        console.error("❌ Gagal total sinkronisasi:", e);
    } finally {
        if (typeof window.updateSyncUI === 'function') window.updateSyncUI();
        if (btn) btn.innerText = "SINKRON";
    }
};

window.pushTransaksiToCloud = async (payload) => {
    try {
        const uid = payload.uid || window.currentUid;
        
        // 1. INDUK TRANSAKSI
        const { error: trxError } = await supabase.from('transaksi').upsert({
            id: payload.ts, 
            tanggal: payload.ts.toString(), 
            total: payload.totalB, 
            laba: payload.totalL, 
            metode_bayar: payload.metode,
            pelanggan_id: payload.pelanggan_id || null, 
            user_id: uid 
        });
        if (trxError) throw trxError;

        // 2. LOGIKA HUTANG (INI YANG TADI HILANG!)
        if (payload.metode === 'Hutang' && payload.pelanggan_id) {
            // Kita ambil data hutang dari offlineQueue atau hitung ulang dari payload
            const sisaHutang = payload.totalB - (window.uangBayarDiModal || 0); 
            
            // Simpan ke tabel Hutang di Cloud
            const { error: hError } = await supabase.from('hutang').upsert({
                id: "H-" + payload.ts,
                pelanggan_id: payload.pelanggan_id,
                transaksi_id: payload.ts,
                total: payload.totalB,
                sisa: sisaHutang,
                tanggal: payload.ts.toString(),
                user_id: uid
            });
            if (hError) throw hError;

            // Update saldo di tabel Pelanggan Cloud agar sinkron
            const { data: pData } = await supabase.from('pelanggan').select('total_hutang, sisa_hutang').eq('id', payload.pelanggan_id).single();
            if (pData) {
                await supabase.from('pelanggan').update({
                    total_hutang: (pData.total_hutang || 0) + payload.totalB,
                    sisa_hutang: (pData.sisa_hutang || 0) + sisaHutang
                }).eq('id', payload.pelanggan_id);
            }
        }

        // 3. DETAIL TRANSAKSI
        if (payload.cart && payload.cart.length > 0) {
            const detailData = payload.cart.map((i, index) => {
                const sub = window.hitungSubtotalItem(i);
                return {
                    id: (payload.ts + (index + 1)).toString(),
                    transaksi_id: payload.ts, 
                    barang_id: i.id, 
                    qty: i.qty, 
                    harga: Math.round(sub / i.qty), 
                    modal: i.modal, 
                    user_id: uid 
                };
            });
            const { error: detError } = await supabase.from('transaksi_detail').upsert(detailData);
            if (detError) throw detError;
        }

        // 4. UPDATE STOK CLOUD
        for (let i of payload.cart) {
            const { data } = await supabase.from('barang').select('stok').eq('id', i.id).eq('user_id', uid).single();
            if (data) {
                await supabase.from('barang').update({ stok: data.stok - i.qty }).eq('id', i.id).eq('user_id', uid);
            }
        }
        
        console.log("✅ Push Transaksi & Hutang ke Cloud Sukses!");
    } catch (error) {
        console.error("Gagal pushTransaksiToCloud:", error.message);
        throw error;
    }
};

window.sinkronSupplierDariCloud = async () => {
    console.log("🔄 Memulai sinkronisasi supplier dari Supabase...");
    
    try {
        // 1. Ambil data dari tabel 'supplier' di Supabase
        const { data, error } = await supabase
            .from('supplier')
            .select('*')
            .eq('user_id', window.currentUid); // Filter berdasarkan user yang login

        if (error) throw error;

        if (data && data.length > 0) {
            // 2. Masukkan ke SQLite lokal
            data.forEach(s => {
                // Gunakan INSERT OR REPLACE agar tidak dobel jika ID sudah ada
                window.db.run(
                    "INSERT OR REPLACE INTO supplier (id, nama, kontak, alamat) VALUES (?, ?, ?, ?)", 
                    [s.id, s.nama, s.hp || s.kontak, s.alamat]
                );
            });

            // 3. Simpan state DB agar permanen di memori HP
            if (typeof window.simpanDB === 'function') window.simpanDB();

            // 4. Refresh tampilan dropdown supplier
            if (typeof window.renderSelectSupplier === 'function') {
                window.renderSelectSupplier();
            }
            
            console.log(`✅ ${data.length} Supplier berhasil disinkronkan ke HP.`);
        }
    } catch (err) {
        console.error("❌ Gagal sinkron supplier:", err.message);
    }
};

window.checkProStatus = async (uid) => {
        try {
            if (navigator.onLine) {
                const { data, error } = await supabase.from('users').select('is_pro, expired_at').eq('id', uid).single();
                if (data && !error) {
                    const now = new Date();
                    let isValidPro = false;
                    
                    // Perbaikan logika kedaluwarsa (bug JavaScript Date)
                    if (data.is_pro) {
                        if (data.expired_at) {
                            const expired = new Date(data.expired_at);
                            isValidPro = now < expired;
                        } else {
                            // Jika is_pro TRUE tapi expired_at kosong, otomatis dianggap akun PRO Lifetime
                            isValidPro = true; 
                        }
                    }
                    
                    window.isPro = isValidPro;
                    localStorage.setItem(`poskita_pro_${uid}`, window.isPro);
                } else {
                    window.isPro = false;
                    localStorage.setItem(`poskita_pro_${uid}`, false);
                }
            } else {
                window.isPro = JSON.parse(localStorage.getItem(`poskita_pro_${uid}`)) || false;
            }
        } catch (e) {
            console.error("Gagal load status pro", e);
            window.isPro = JSON.parse(localStorage.getItem(`poskita_pro_${uid}`)) || false;
        }

        const badge = document.getElementById('pro-badge');
        const lockIcon = document.getElementById('lock-icon');
        if (window.isPro) {
            badge.innerHTML = '<span class="bg-amber-400 text-amber-900 border border-amber-500 px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(251,191,36,0.5)]">PRO</span>';
            if(lockIcon) lockIcon.classList.add('hidden');
        } else {
            badge.innerHTML = '<span onclick="window.showUpgradeModal(\'Upgrade ke PRO untuk fitur maksimal!\')" class="bg-slate-600 border border-slate-500 hover:bg-slate-500 text-slate-100 px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase cursor-pointer transition-colors shadow-inner">FREE</span>';
            if(lockIcon) lockIcon.classList.remove('hidden');
        }
    };

window.addEventListener('online', () => {
    if(window.currentUid) window.checkProStatus(window.currentUid);

    // 1. Definisikan semua pengecekan
    const hasKulakan = (window.offlineQueue.pembelian?.length > 0 || window.offlineQueue.pembelian_detail?.length > 0);
    const hasShift = (window.offlineQueue.shift?.length > 0);
    const hasPelanggan = (window.offlineQueue.pelanggan?.length > 0);
    const hasHutangAtauCicilan = (window.offlineQueue.hutang?.length > 0 || window.offlineQueue.cicilan?.length > 0);
    const hasBarang = (window.offlineQueue.barang?.length > 0 || window.offlineQueue.hapus_barang?.length > 0);
    const hasTransaksi = (window.offlineQueue.transaksi?.length > 0 || window.offlineQueue.hapus_transaksi?.length > 0);

    // 2. Gabungkan semua syarat di dalam IF
    if (hasBarang || hasTransaksi || hasKulakan || hasShift || hasPelanggan || hasHutangAtauCicilan) {
        console.log("🌐 Internet On! Memulai sinkronisasi otomatis...");
        window.processOfflineQueue();
    }
});