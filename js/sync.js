window.updateSyncUI = () => {
    // Gunakan tanda ?. dan || [] supaya kalau undefined tidak crash
    const barangCount = (window.offlineQueue?.barang || []).length;
    const trxCount = (window.offlineQueue?.transaksi || []).length;
    const delBarangCount = (window.offlineQueue?.hapus_barang || []).length;
    const delTrxCount = (window.offlineQueue?.hapus_transaksi || []).length;
    const shiftCount = (window.offlineQueue?.shift || []).length;
    const plgCount = (window.offlineQueue?.pelanggan || []).length;
    const hutangCount = (window.offlineQueue?.hutang || []).length;
    const cicilanCount = (window.offlineQueue?.cicilan || []).length;

    const totalCount = barangCount + trxCount + delBarangCount + delTrxCount + shiftCount + plgCount + hutangCount + cicilanCount;
    
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
    if (!navigator.onLine) return;
    
    const btn = document.getElementById('btn-download');
    if (btn) btn.innerText = "UPLOADING...";

    // Pastikan objek offlineQueue ada agar tidak error .length
    if (!window.offlineQueue) return;

    try {
        // --- 1. PROSES PENGHAPUSAN (DELETE) ---
        if (window.offlineQueue.hapus_barang?.length > 0) {
            for (let id of [...window.offlineQueue.hapus_barang]) {
                try {
                    const { error } = await supabase.from('barang').delete().eq('id', id).eq('user_id', window.currentUid);
                    if (!error) window.offlineQueue.hapus_barang = window.offlineQueue.hapus_barang.filter(i => i !== id);
                } catch(e) { console.error("Gagal hapus barang cloud:", e); }
            }
        }

        if (window.offlineQueue.hapus_transaksi?.length > 0) {
            for (let id of [...window.offlineQueue.hapus_transaksi]) {
                try {
                    await supabase.from('transaksi_detail').delete().eq('transaksi_id', id).eq('user_id', window.currentUid);
                    const { error } = await supabase.from('transaksi').delete().eq('id', id).eq('user_id', window.currentUid);
                    if (!error) window.offlineQueue.hapus_transaksi = window.offlineQueue.hapus_transaksi.filter(i => i !== id);
                } catch(e) { console.error("Gagal hapus transaksi cloud:", e); }
            }
        }

        // --- 2. PROSES UPDATE/INSERT (UPSERT) ---

       // Supplier (SINKRONISASI LEBIH AMAN)
if (window.offlineQueue.supplier?.length > 0) {
    // Mapping data untuk memastikan tidak ada field yang rusak/kosong
    const finalData = window.offlineQueue.supplier.map(s => ({
        id: String(s.id), 
        nama: s.nama || '',
        hp: s.hp || '',
        alamat: s.alamat || '',
        user_id: "51yX4BW2PKWA8cc1kujAr4Dm2bo1" // Pastikan ID ini string
    }));

    const { error } = await supabase
        .from('supplier')
        .upsert(finalData, { onConflict: 'id' });

    if (!error) {
        console.log("✅ Supplier berhasil disinkronkan ke Cloud");
        window.offlineQueue.supplier = [];
        // Jangan lupa simpan perubahan queue ke storage
        localStorage.setItem('offlineQueue', JSON.stringify(window.offlineQueue));
    } else {
        console.error("❌ Masih Error:", error.message);
    }
}

        // Barang
        if (window.offlineQueue.barang?.length > 0) {
            const { error } = await supabase.from('barang').upsert(window.offlineQueue.barang);
            if (!error) window.offlineQueue.barang = []; 
        }

        // Pembelian (Induk)
        if (window.offlineQueue.pembelian?.length > 0) {
            const { error } = await supabase.from('pembelian').upsert(window.offlineQueue.pembelian);
            if (!error) window.offlineQueue.pembelian = [];
        }

        // Pembelian Detail
        if (window.offlineQueue.pembelian_detail?.length > 0) {
            const { error } = await supabase.from('pembelian_detail').upsert(window.offlineQueue.pembelian_detail);
            if (!error) window.offlineQueue.pembelian_detail = [];
        }

        // Pelanggan
        if (window.offlineQueue.pelanggan?.length > 0) {
            const { error } = await supabase.from('pelanggan').upsert(window.offlineQueue.pelanggan);
            if (!error) window.offlineQueue.pelanggan = []; 
        }

        // Hutang
        if (window.offlineQueue.hutang?.length > 0) {
            const { error } = await supabase.from('hutang').upsert(window.offlineQueue.hutang);
            if (!error) window.offlineQueue.hutang = []; 
        }

        // Cicilan
        if (window.offlineQueue.cicilan?.length > 0) {
            const dataToPush = window.offlineQueue.cicilan.map(item => ({
                id: item.id,
                hutang_id: item.hutang_id,
                jumlah: item.jumlah,
                tanggal: item.tanggal,
                user_id: window.currentUid 
            }));
            const { error } = await supabase.from('cicilan').upsert(dataToPush);
            if (!error) window.offlineQueue.cicilan = []; 
        }

        // Shift Kasir
        if (window.offlineQueue.shift?.length > 0) {
            const { error } = await supabase.from('shift_kasir').upsert(window.offlineQueue.shift);
            if (!error) window.offlineQueue.shift = [];
        }

        // Transaksi Penjualan (Iterasi Satu per Satu via pushTransaksiToCloud)
        if (window.offlineQueue.transaksi?.length > 0) {
            let pendingTrx = [];
            for (let payload of window.offlineQueue.transaksi) {
                try {
                    await window.pushTransaksiToCloud(payload);
                } catch(e) { 
                    pendingTrx.push(payload); 
                }
            }
            window.offlineQueue.transaksi = pendingTrx;
        }

        // --- 3. FINISH ---
        window.saveQueue(); // Simpan sisa antrean (jika ada yang gagal) ke LocalStorage
        console.log("🚀 Background Sync Selesai");

    } catch(e) {
        console.error("Gagal sinkronisasi background:", e);
    } finally {
        if (typeof window.updateSyncUI === 'function') {
            window.updateSyncUI();
        } else if (btn) {
            btn.innerText = "ONLINE"; // Fallback jika fungsi UI tidak ada
        }
    }
};

window.pushTransaksiToCloud = async (payload) => {
        const { error: trxError } = await supabase.from('transaksi').upsert({
            id: payload.ts, tanggal: payload.ts.toString(), total: payload.totalB, laba: payload.totalL, metode_bayar: payload.metode, user_id: payload.uid 
        });
        if(trxError) throw trxError;

        const detailData = payload.cart.map((i, index) => ({
            id: payload.ts + index + 1, transaksi_id: payload.ts, barang_id: i.id, qty: i.qty, harga: i.harga, modal: i.modal, user_id: payload.uid 
        }));
        const { error: detError } = await supabase.from('transaksi_detail').upsert(detailData);
        if(detError) throw detError;

        for (let i of payload.cart) {
            const {data: currentData} = await supabase.from('barang').select('stok').eq('id', i.id).eq('user_id', payload.uid).single();
            if(currentData) {
                await supabase.from('barang').update({stok: currentData.stok - i.qty}).eq('id', i.id).eq('user_id', payload.uid);
            }
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
        const shiftCount = (window.offlineQueue.shift || []).length;
        const plgCount = (window.offlineQueue.pelanggan || []).length;
        if (window.offlineQueue.barang.length > 0 || window.offlineQueue.transaksi.length > 0 || window.offlineQueue.hapus_barang.length > 0 || window.offlineQueue.hapus_transaksi.length > 0 || shiftCount > 0 || plgCount > 0) {
            window.processOfflineQueue();
        }
    });