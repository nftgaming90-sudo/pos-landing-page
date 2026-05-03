window.minQty = (id) => {
        const el = document.getElementById(id);
        let val = parseInt(el.value) || 1;
        if(val > 1) el.value = val - 1;
    };

    window.plusQty = (id, max) => {
        const el = document.getElementById(id);
        let val = parseInt(el.value) || 1;
        if(val < max) el.value = val + 1;
    };

    window.addQtyToCart = (id, nama, harga, stok, modal, inputId) => {
        const el = document.getElementById(inputId);
        const qtyToAdd = parseInt(el.value) || 1;
        
        if (stok < qtyToAdd) return alert("Stok gudang tidak mencukupi!");
        
        const exist = window.cart.find(i => i.id === id);
        if (exist) { 
            if (exist.qty + qtyToAdd > stok) return alert("Total di keranjang melebihi sisa stok!"); 
            exist.qty += qtyToAdd; 
        } else { 
            window.cart.push({ 
                id, nama, harga, modal, qty: qtyToAdd, 
                diskon: 0, 
                tipeDiskon: 'nominal'
            }); 
        }
        
        el.value = 1; 
        window.renderCart();
    };

window.updateCartQty = (index, delta) => {
        const item = window.cart[index];
        const masterItem = window.masterData.find(x => x[4] === item.id);
        const maxStok = masterItem ? masterItem[1] : 0;
        const newQty = item.qty + delta;
        
        if (newQty <= 0) {
            if(confirm("Keluarkan item ini dari keranjang?")) {
                window.cart.splice(index, 1);
            }
        } else if (newQty > maxStok) {
            alert("Maksimal stok di gudang hanya " + maxStok);
        } else {
            item.qty = newQty;
        }
        window.renderCart();
    };

    window.manualUpdateQty = (index, val) => {
    const item = window.cart[index];
    const masterItem = window.masterData.find(x => x[4] === item.id);
    const maxStok = masterItem ? masterItem[1] : 0;
    let newQty = parseInt(val) || 0;

    if (newQty <= 0) {
        if(confirm("Keluarkan item ini dari keranjang?")) {
            window.cart.splice(index, 1);
        } else {
            item.qty = 1; // Balikin ke 1 kalau batal hapus
        }
    } else if (newQty > maxStok) {
        alert("Waduh Mas, stok di gudang cuma ada " + maxStok);
        item.qty = maxStok; // Set ke maksimal stok yang ada
    } else {
        item.qty = newQty;
    }
    
    window.renderCart();
};

    window.updateCartPrice = (index, val) => {
        const num = parseInt(val.toString().replace(/\D/g, ''));
        if(!isNaN(num) && num >= 0) {
            window.cart[index].harga = num;
        }
        window.renderCart();
    };

    window.hapusCartItem = (index) => {
        window.cart.splice(index, 1);
        window.renderCart();
    };

    window.clearCart = () => { if(confirm("Kosongkan keranjang?")) { window.cart = []; window.renderCart(); } };

window.hitungSubtotalItem = (item) => {
    const qty = Number(item.qty) || 0;
    const harga = Number(item.harga) || 0;
    const diskon = Number(item.diskon) || 0;
    
    const subtotalKotor = harga * qty;
    let nilaiPotongan = 0;

    if (item.tipeDiskon === 'persen') {
        // Diskon persen (misal 10%)
        nilaiPotongan = subtotalKotor * (diskon / 100);
    } else {
        // FIX: Diskon nominal (misal 10.000) langsung memotong total kotor per baris
        nilaiPotongan = diskon; 
    }

    const hasil = subtotalKotor - nilaiPotongan;
    
    // Debugging di console (tekan F12 untuk melihat)
    console.log(`Logika Aktif - Item: ${item.nama}, Kotor: ${subtotalKotor}, Diskon: ${nilaiPotongan}, Hasil: ${hasil}`);
    
    return Math.max(0, hasil);
};

window.formatDiskonLive = (el, index) => {
    const tipe = window.cart[index].tipeDiskon;
    let val = el.value.replace(/\D/g, ''); 
    
    if (tipe === 'persen') {
        if (parseInt(val) > 100) val = '100';
        return val;
    } else {
        return window.formatAngka(val);
    }
};

// Update Nilai Diskon
    window.updateCartDiscount = (index, val) => {
        // Pastikan val adalah string dan hapus semua titik (.) agar "2.000" jadi "2000"
        const cleanVal = val.toString().replace(/\./g, '');
        const num = parseInt(cleanVal) || 0;
        
        // Simpan angka murni ke dalam data cart
        window.cart[index].diskon = num;
        
        // Render ulang untuk memperbarui total belanja
        window.renderCart();
    };

    window.updateCartDiscountType = (index, val) => {
        // Kalau tipe ganti (Rp ke %), ini aman langsung render karena pake <select>
        window.cart[index].tipeDiskon = val;
        window.cart[index].diskon = 0;
        window.renderCart();
    };

window.showPaymentModal = () => {
    const total = document.getElementById('cart-total').innerText;
    const pelangganId = document.getElementById('select-pelanggan').value;
    
    // Langsung tembak modalnya muncul
    document.getElementById('pay-total-display').innerText = total;
    document.getElementById('input-uang-bayar').value = "";
    document.getElementById('modal-metode-bayar').value = "Tunai";
    document.getElementById('modal-pembayaran').classList.remove('hidden');

    // Fokus input
    setTimeout(() => document.getElementById('input-uang-bayar').focus(), 100);

    // Cek tombol hutang
    const optHutang = document.getElementById('opt-hutang');
    if (!pelangganId) {
        optHutang.disabled = true;
        optHutang.innerText = "⛔ Hutang (Pilih Pelanggan!)";
    } else {
        optHutang.disabled = false;
        optHutang.innerText = "📒 Masuk Hutang (Piutang)";
    }
};

    window.eksekusiBayar = async (metode) => {
    try {

        // --- 🔥 LOGIKA TANGGAL BARU ---
        const inputBackdate = document.getElementById('cart-backdate')?.value;
        const sekarang = new Date();
        let ts; 

        if (inputBackdate) {
            // Kalau user pilih tanggal mundur
            const tglPilihan = new Date(inputBackdate);
            // Tetap kasih jam menit detik sekarang biar urutan laporan rapi
            tglPilihan.setHours(sekarang.getHours(), sekarang.getMinutes(), sekarang.getSeconds());
            ts = tglPilihan.getTime();
        } else {
            // Kalau kosong, ya normal pakai detik ini
            ts = sekarang.getTime();
        }
        
        const tsStr = ts.toString(); // Buat kolom tanggal di DB

        // 1. IDENTIFIKASI PELANGGAN (Kunci agar tidak jadi "Umum")
        const inputPlg = document.getElementById('input-select-pelanggan'); 
const pelangganNama = inputPlg ? inputPlg.value.trim() : "";
        let pelangganId = document.getElementById('select-pelanggan').value || null;

        // Jika user ngetik nama tapi gak klik dropdown, paksa cari ID-nya di DB lokal
        if (pelangganNama && !pelangganId) {
            const resId = window.db.exec("SELECT id FROM pelanggan WHERE nama = ?", [pelangganNama]);
            if (resId && resId.length > 0) {
                pelangganId = resId[0].values[0][0];
            }
        }

        // Ambil nominal uang (Tunai atau DP)
        const valBayar = document.getElementById('input-uang-bayar').value.replace(/\./g, '');
        const uangBayar = parseInt(valBayar) || 0;

        // 2. HITUNG TOTAL & LABA
        let totalB = 0, totalL = 0;
        window.cart.forEach(i => { 
            const subtotal = window.hitungSubtotalItem(i); 
            const totalModal = (Number(i.modal) || 0) * i.qty;
            totalB += subtotal; 
            totalL += (subtotal - totalModal); 
        });

        // Validasi Dasar
        if (metode === 'Tunai' && uangBayar > 0 && uangBayar < totalB) {
            return alert("⚠️ Uang tunai kurang! Gunakan metode 'Hutang' jika bayar sebagian.");
        }
        if (metode === 'Hutang' && !pelangganId) {
            return alert("⚠️ Transaksi Hutang wajib memilih Pelanggan terdaftar!");
        }

        

        // 3. SIMPAN TRANSAKSI KE SQLITE LOKAL
        window.db.run("INSERT INTO transaksi (id, tanggal, total, laba, metode_bayar, pelanggan_id) VALUES (?,?,?,?,?,?)", 
            [ts, tsStr, totalB, totalL, metode, pelangganId]);

        // 4. LOGIKA KHUSUS HUTANG
        if (metode === 'Hutang') {
            const hutangId = "H-" + ts;
            
            // 🔥 PAKSA JADI ANGKA: Pastikan sisaHutang bersih dari teks/titik
            const murniTotal = Number(totalB);
            const murniBayar = Number(uangBayar);
            const sisaHutang = murniTotal - murniBayar;

            // 1. Simpan ke tabel hutang lokal
            window.db.run("INSERT INTO hutang (id, pelanggan_id, transaksi_id, total, sisa, tanggal) VALUES (?,?,?,?,?,?)", 
                [hutangId, pelangganId, ts, murniTotal, sisaHutang, tsStr]);
            
            // 2. Update saldo hutang di tabel pelanggan (Gunakan IFNULL agar tidak NULL)
            window.db.run(`
                UPDATE pelanggan 
                SET total_hutang = IFNULL(total_hutang, 0) + ?, 
                    sisa_hutang = IFNULL(sisa_hutang, 0) + ? 
                WHERE id = ?`, 
                [murniTotal, sisaHutang, pelangganId]
            );
            
            // 3. Masukkan ke antrean Cloud Hutang (Gunakan Number() agar Supabase tidak anggap 0)
            if (!window.offlineQueue.hutang) window.offlineQueue.hutang = [];
            window.offlineQueue.hutang.push({
                id: hutangId, 
                pelanggan_id: pelangganId, 
                transaksi_id: ts, 
                total: Number(murniTotal), 
                sisa: Number(sisaHutang), // <--- INI KUNCINYA MAS
                tanggal: tsStr, 
                user_id: window.currentUid
            });

            // 4. Jika ada DP, catat sebagai cicilan pertama
            if (murniBayar > 0) {
                const cicilanId = "C-" + ts + "-DP";
                window.db.run("INSERT INTO cicilan (id, hutang_id, jumlah, tanggal) VALUES (?,?,?,?)", [cicilanId, hutangId, murniBayar, tsStr]);
                
                if (!window.offlineQueue.cicilan) window.offlineQueue.cicilan = [];
                window.offlineQueue.cicilan.push({
                    id: cicilanId, 
                    hutang_id: hutangId, 
                    jumlah: Number(murniBayar), // <--- PAKSA ANGKA
                    tanggal: tsStr, 
                    user_id: window.currentUid
                });
            }
            
            // 🔥 Tambahkan log singkat di console biar Mas bisa pantau pas testing
            console.log(`Hutang tercatat: Total=${murniTotal}, DP=${murniBayar}, Sisa=${sisaHutang}`);
        }

        // 5. SIMPAN DETAIL & POTONG STOK
        let detailIndex = 1;
        for (let i of window.cart) {
            const subPerItem = window.hitungSubtotalItem(i); 
            window.db.run("UPDATE barang SET stok = stok - ? WHERE id = ?", [i.qty, i.id]);
            window.db.run("INSERT INTO transaksi_detail (id, transaksi_id, barang_id, qty, harga, modal) VALUES (?,?,?,?,?,?)", 
                         [ts + detailIndex, ts, i.id, i.qty, (subPerItem / i.qty), i.modal]);
            detailIndex++;
        }

        // 6. PERSISTENCE (Kunci data ke LocalStorage sebelum proses sinkron)
        if (typeof window.simpanDB === 'function') window.simpanDB();

        // 7. PREPARE PAYLOAD UNTUK CLOUD
        const payload = { 
            ts: ts, 
            totalB: totalB, 
            totalL: totalL, 
            metode: metode, 
            pelanggan_id: pelangganId, 
            uid: window.currentUid, 
            cart: [...window.cart] 
        };

        // 8. RESET UI
        window.cart = [];

        if (window.innerWidth < 768 && typeof window.toggleCart === 'function') {
            const cartSection = document.getElementById('cart-section');
            if (cartSection && cartSection.classList.contains('active')) {
                cartSection.classList.remove('active');
            }
        }

        if (inputPlg) inputPlg.value = ""; 
document.getElementById('select-pelanggan').value = ""; 
        document.getElementById('modal-pembayaran').classList.add('hidden');
        
        window.renderCart();
        window.refreshDataUI(); 

        if(document.getElementById('cart-backdate')) {
             document.getElementById('cart-backdate').value = ""; 
        }
        
        // Render ulang menu hutang agar data terbaru muncul di tab Pelanggan
        if (typeof window.renderHutang === 'function') window.renderHutang();
        
        

        // 9. SINKRONISASI CLOUD
        if (navigator.onLine && window.currentUid) {
            try {
                await window.pushTransaksiToCloud(payload);
                if (typeof window.processOfflineQueue === 'function') await window.processOfflineQueue(); 
            } catch(e) {
                console.error("Gagal Sync, masuk queue:", e);
                window.offlineQueue.transaksi.push(payload);
            }
        } else {
            window.offlineQueue.transaksi.push(payload);
        }
        
        window.saveQueue(); // Simpan sisa antrean ke LocalStorage

        // 10. NOTIFIKASI AKHIR
        if (metode === 'Hutang') {
            alert(`📒 HUTANG DICATAT!\nPelanggan: ${pelangganNama}\nSisa: Rp ${(totalB - uangBayar).toLocaleString('id-ID')}`);
        } else {
            const kembalian = uangBayar - totalB;
            if (kembalian > 0) {
                alert(`✅ LUNAS!\nKembalian: Rp ${kembalian.toLocaleString('id-ID')}`);
            } else {
                alert("✅ TRANSAKSI BERHASIL!");
            }
        }

    } catch (error) {
        console.error("Bug Eksekusi Bayar:", error);
        alert("Terjadi kesalahan sistem: " + error.message);
    }
};

// --- FUNGSI TAMBAH SUPPLIER ---
window.tambahSupplierBaru = async () => {
    const nama = prompt("Masukkan Nama Supplier Baru:");
    if (!nama || nama.trim() === "") return;

    const sId = "SUP-" + Date.now();
    const hpInput = prompt("Masukkan No. HP / Kontak (Opsional):") || "-"; 
    const alamat = prompt("Masukkan Alamat (Opsional):") || "-";

    try {
        // 1. Simpan ke SQLite Lokal (PENTING: Pakai 'hp' agar tidak error)
        window.db.run("INSERT INTO supplier (id, nama, hp, alamat) VALUES (?, ?, ?, ?)", 
                     [sId, nama.trim(), hpInput, alamat]);

        // 2. Masukkan ke Antrean Sinkronisasi Cloud
        if (!window.offlineQueue.supplier) window.offlineQueue.supplier = [];
        window.offlineQueue.supplier.push({
            id: sId,
            nama: nama.trim(),
            hp: hpInput, // Supabase pakai 'hp'
            alamat: alamat,
            user_id: window.currentUid
        });

        // 3. Simpan state & jalankan sinkronisasi
        if (typeof window.simpanDB === 'function') window.simpanDB();
        window.saveQueue();
        
        if (navigator.onLine && typeof window.processOfflineQueue === 'function') {
            setTimeout(() => { window.processOfflineQueue(); }, 500);
        }

        // 4. REFRESH DROPDOWN
        window.renderSelectSupplier(); // Panggil fungsi di atas
            
        // 5. Otomatis pilih supplier yang baru dibuat
        setTimeout(() => {
            const selectSup = document.getElementById('select-supplier');
            if (selectSup) {
                selectSup.value = sId;
                selectSup.dispatchEvent(new Event('change'));
            }
        }, 300);

        alert(`✅ Supplier "${nama}" berhasil ditambahkan!`);

    } catch (error) {
        console.error("Gagal tambah supplier:", error);
        alert("Waduh, gagal simpan: " + error.message);
    }
};

// Fungsi masukkan barang ke keranjang kulakan
window.tambahKeKulakan = (id) => {
    const barang = window.masterData.find(x => x[4] === id);
    if (!barang) return;

    // --- LOGIC TAMBAHAN UNTUK HP ---
    const isMobile = window.innerWidth <= 768;
    const selectSup = document.getElementById('select-supplier');
    const supplierBelumDipilih = selectSup && selectSup.value === "";

    // Jika di HP dan belum pilih supplier, arahkan fokus ke supplier dulu
    if (isMobile && supplierBelumDipilih) {
        alert("Pilih Supplier dulu ya, biar tercatat di nota.");
        window.toggleKulakanDrawer(); // Buka drawer kulakan otomatis
        setTimeout(() => {
            const inputSup = document.getElementById('input-select-supplier'); // ID dari smart dropdown
            if(inputSup) inputSup.focus();
        }, 500);
        return; // Stop dulu, biar user pilih supplier
    }

    const existing = window.cartKulakan.find(item => item.id === id);
    if (existing) {
        existing.qty++;
    } else {
        const hargaModalDB = parseInt(barang[3]) || 0;
        window.cartKulakan.push({ 
            id: id, 
            nama: barang[0], 
            qty: 1, 
            hargaBeli: hargaModalDB,     
            hargaBeliLama: hargaModalDB  
        });
    }
    
    window.renderCartKulakan();
    
    // Feedback visual/getar
    if(navigator.vibrate) navigator.vibrate(50);

    // Kalau di HP, kasih notifikasi kecil kalau barang berhasil masuk
    if (isMobile) {
        // Bisa pakai toast atau sekedar log
        console.log("Barang masuk keranjang kulakan");
    }
};

window.eksekusiKulakan = async (statusBaru) => {
    // --- PROTEKSI ANTI-ERROR: Inisialisasi queue jika belum ada ---
    if (!window.offlineQueue) window.offlineQueue = {};
    if (!window.offlineQueue.barang) window.offlineQueue.barang = [];
    if (!window.offlineQueue.pembelian) window.offlineQueue.pembelian = [];
    if (!window.offlineQueue.pembelian_detail) window.offlineQueue.pembelian_detail = [];

    const sId = document.getElementById('select-supplier')?.value;
    
    // 1. Validasi Supplier & Keranjang
    if (!sId && window.cartKulakan.length > 0) {
        alert("Pilih supplier dulu, Mas!");
        return;
    }

    if (window.cartKulakan.length === 0) {
        alert("Daftar kulakan masih kosong!");
        return;
    }

    const pId = "PO-" + Date.now();
    const tglSekarang = new Date().toISOString();
    let grandTotal = 0;

    try {
        // 2. Loop items di keranjang kulakan
        for (const item of window.cartKulakan) {
            const qty = Number(item.qty) || 0;
            const hargaBeli = Number(item.hargaBeli) || 0;
            grandTotal += (qty * hargaBeli);

            // --- LOGIKA UPDATE STOK (Hanya jika COMPLETED) ---
            if (statusBaru === 'COMPLETED') {
                // Update SQLite Lokal
                window.db.run("UPDATE barang SET stok = stok + ?, modal = ? WHERE id = ?", [qty, hargaBeli, item.id]);

                // Ambil data terbaru untuk sinkron ke Cloud
                const res = window.db.exec("SELECT nama, kategori, stok, harga_jual FROM barang WHERE id = ?", [item.id]);
                if (res.length > 0) {
                    const b = res[0].values[0];
                    window.offlineQueue.barang.push({ 
                        id: item.id, 
                        nama: b[0], 
                        kategori: b[1], 
                        stok: b[2], 
                        harga_jual: b[3], 
                        modal: hargaBeli, 
                        user_id: window.currentUid 
                    });
                }
            }
            
            // 3. Simpan rincian ke SQLite Lokal
            const detailId = "PD-" + Date.now() + Math.random().toString(36).substr(2, 5);
            window.db.run("INSERT INTO pembelian_detail (id, pembelian_id, barang_id, qty, harga_beli) VALUES (?,?,?,?,?)",
                         [detailId, pId, item.id, qty, hargaBeli]);

            // 4. Masukkan detail barang ke queue Cloud
            window.offlineQueue.pembelian_detail.push({
                id: detailId,
                pembelian_id: pId,
                barang_id: item.id,
                qty: qty,
                harga_beli: hargaBeli,
                user_id: window.currentUid
            });
        }

        // 5. Simpan nota induk ke SQLite Lokal
        window.db.run("INSERT INTO pembelian (id, supplier_id, total, tanggal, status) VALUES (?,?,?,?,?)",
                     [pId, sId, grandTotal, tglSekarang, statusBaru]);

        // 6. Masukkan induk ke Antrean Sinkronisasi Cloud
        window.offlineQueue.pembelian.push({
            id: pId,
            supplier_id: sId,
            total: grandTotal,
            tanggal: tglSekarang,
            status: statusBaru,
            user_id: window.currentUid
        });

        // 7. Simpan State & Jalankan Antrean
        if (typeof window.simpanDB === 'function') window.simpanDB(); 
        
        window.saveQueue(); // Simpan antrean ke localStorage agar tidak hilang saat refresh
        
        if (navigator.onLine && typeof window.processOfflineQueue === 'function') {
            window.processOfflineQueue();
        }

        // Notifikasi ke User
        if (statusBaru === 'DRAFT') {
            alert("✅ Draft Berhasil Disimpan!\nStok barang tidak berubah. Bisa cek di Riwayat.");
        } else {
            alert(`🚀 Kulakan Selesai!\nTotal: Rp ${grandTotal.toLocaleString('id-ID')}\nStok sudah bertambah.`);
        }
        
        // 8. Bersihkan UI
        window.cartKulakan = [];
        if (typeof window.refreshDataUI === 'function') window.refreshDataUI();
        if (typeof window.renderCartKulakan === 'function') window.renderCartKulakan();
        
        if (window.innerWidth < 768 && typeof window.toggleKulakanDrawer === 'function') {
            window.toggleKulakanDrawer();
        }

    } catch (error) {
        console.error("Gagal eksekusi kulakan:", error);
        alert("Waduh, ada masalah pas simpan data: " + error.message);
    }
};

window.editDraftKulakan = async (pembelianId) => {
    if (!window.db) return;

    // 1. Query SQL dengan JOIN untuk mendapatkan supplier_id dari tabel pembelian
    // Pastikan kolom di tabel pembelian kamu namanya 'supplier_id'
    const res = window.db.exec(`
        SELECT b.id, b.nama, pd.qty, pd.harga_beli, p.supplier_id 
        FROM pembelian_detail pd
        JOIN barang b ON pd.barang_id = b.id
        JOIN pembelian p ON pd.pembelian_id = p.id
        WHERE pd.pembelian_id = ?
    `, [pembelianId]);

    if (res.length > 0 && res[0].values.length > 0) {
        if (!confirm("Muat draft ini ke keranjang? Keranjang saat ini akan diganti.")) return;

        const rows = res[0].values;
        
        // Ambil supplier_id dari kolom ke-5 (index 4) hasil query
        const draftSupplierId = rows[0][4]; 

        // 2. Masukkan data barang ke variabel keranjang
        window.cartKulakan = rows.map(row => ({
            id: row[0],
            nama: row[1],
            qty: row[2],
            hargaBeli: row[3]
        }));

        // 3. ISI OTOMATIS DROPDOWN SUPPLIER (Berdasarkan ID di HTML kamu)
        const selectSup = document.getElementById('select-supplier');
        if (selectSup && draftSupplierId) {
            selectSup.value = draftSupplierId;
        }

        // 4. Hapus draft lama di DB agar tidak double saat disimpan ulang
        try {
            window.db.run("DELETE FROM pembelian WHERE id = ?", [pembelianId]);
            window.db.run("DELETE FROM pembelian_detail WHERE pembelian_id = ?", [pembelianId]);

            if (navigator.onLine && window.supabase) {
                await window.supabase.from('pembelian').delete().eq('id', pembelianId);
                await window.supabase.from('pembelian_detail').delete().eq('pembelian_id', pembelianId);
            }

            if (window.offlineQueue) {
                window.offlineQueue.pembelian = (window.offlineQueue.pembelian || []).filter(p => p.id !== pembelianId);
                window.offlineQueue.pembelian_detail = (window.offlineQueue.pembelian_detail || []).filter(pd => pd.pembelian_id !== pembelianId);
                window.saveQueue();
            }
        } catch (err) {
            console.error("Gagal sinkronisasi hapus draft:", err);
        }

        // 5. UPDATE UI & BUKA HALAMAN CART KULAKAN
        window.renderCartKulakan();
        
        // Tutup modal riwayat
        const modalRiwayat = document.getElementById('modal-riwayat-kulakan');
        if (modalRiwayat) modalRiwayat.classList.add('hidden');
        
        // PAKSA BUKA DRAWER KULAKAN (Full Screen Mobile)
        const drawer = document.getElementById('kulakan-section');
        if (drawer) {
            // Hapus sembunyi, tambah aktif
            drawer.classList.remove('translate-x-full');
            drawer.classList.add('translate-x-0', 'active');
            
            // Beri feedback ke body agar tidak scroll background
            document.body.classList.add('overflow-hidden');
        }
        
        alert("Draft dan Supplier berhasil dimuat!");
    } else {
        alert("Data draft tidak ditemukan!");
    }
};

window.lihatDetailAtauEdit = (id, status) => {
    console.log("Membuka riwayat ID:", id, "Status:", status); // Cek di console
    
    if (status === 'DRAFT') {
        // Kalau masih draft, kita lempar ke fungsi edit kulakan
        if (typeof window.editDraftKulakan === 'function') {
            window.editDraftKulakan(id);
        } else {
            alert("Fungsi editDraftKulakan belum dibuat, Mas!");
        }
    } else {
        // Kalau sudah selesai, kita buka modal detail rincian barangnya
        if (typeof window.bukaDetailKulakan === 'function') {
            window.bukaDetailKulakan(id);
        } else {
            alert("Fungsi bukaDetailKulakan belum dibuat, Mas!");
        }
    }
};

window.bukaDetailKulakan = (pembelianId) => {
    // 1. Tutup modal riwayat dulu biar gak numpuk di depan
    const modalRiwayat = document.getElementById('modal-riwayat-kulakan');
    if (modalRiwayat) modalRiwayat.classList.add('hidden');

    // 2. Ambil rincian barang dari database
    const res = window.db.exec(`
        SELECT b.nama, pd.qty, pd.harga_beli 
        FROM pembelian_detail pd
        JOIN barang b ON pd.barang_id = b.id
        WHERE pd.pembelian_id = ?
    `, [pembelianId]);

    const tbody = document.getElementById('detail-barang-kulakan');
    const modalDetail = document.getElementById('modal-detail-kulakan');

    if (res.length > 0 && res[0].values.length > 0) {
        let total = 0;
        tbody.innerHTML = res[0].values.map(row => {
            const [nama, qty, harga] = row;
            const subtotal = qty * harga;
            total += subtotal;
            return `
                <tr class="border-b border-slate-50">
                    <td class="p-3 text-[10px] font-bold text-slate-700 uppercase">${nama}</td>
                    <td class="p-3 text-center text-[10px] font-black text-slate-600">${qty}</td>
                    <td class="p-3 text-right text-[10px] font-black text-slate-800">Rp ${subtotal.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }).join('');

        // Update Header & Total
        document.getElementById('detail-kulakan-nota').innerText = "NOTA #" + pembelianId.slice(-6).toUpperCase();
        document.getElementById('detail-kulakan-total').innerText = "Rp " + total.toLocaleString('id-ID');

        // Munculkan modal detail
        modalDetail.classList.remove('hidden');
    } else {
        alert("Waduh Mas, data barangnya nggak ketemu di database!");
    }
};

window.simpanPelangganBaru = async () => {
    // 1. CEK APAKAH DATABASE SIAP
    if (!window.db) {
        return alert("Sistem sedang menyiapkan data, mohon tunggu sebentar...");
    }

    const nama = document.getElementById('input-nama-pelanggan').value;
    const hp = document.getElementById('input-hp-pelanggan').value;

    if (!nama) return alert("Nama pelanggan wajib diisi!");

    const id = "P-" + Date.now();
    const payload = { 
        id: id, 
        nama: nama, 
        hp: hp, 
        total_hutang: 0, 
        sisa_hutang: 0, 
        user_id: window.currentUid 
    };

    try {
        // 2. Simpan ke SQLite Lokal
        window.db.run("INSERT INTO pelanggan (id, nama, hp, total_hutang, sisa_hutang) VALUES (?,?,?,?,?)", 
                      [id, nama, hp, 0, 0]);

        // 3. Masukkan ke Antrean Offline (Pastikan array-nya ada)
        if (!window.offlineQueue.pelanggan) window.offlineQueue.pelanggan = [];
        window.offlineQueue.pelanggan.push(payload);
        window.saveQueue();

        // 4. Update UI Select di Kasir
        window.renderPelangganSelect();
        
        // 5. Otomatis pilih pelanggan yang baru dibuat
        setTimeout(() => {
            const selectPlg = document.getElementById('select-pelanggan');
            if(selectPlg) selectPlg.value = id;
        }, 100);

        // 6. Bersihkan dan Tutup Modal
        document.getElementById('input-nama-pelanggan').value = "";
        document.getElementById('input-hp-pelanggan').value = "";
        document.getElementById('modal-tambah-pelanggan').classList.add('hidden');

        // 7. Coba sinkron kalau online
        if (navigator.onLine) {
            window.processOfflineQueue();
        } else {
            alert("Pelanggan tersimpan secara offline. Data akan disinkron saat internet aktif.");
        }

    } catch (err) {
        console.error("Gagal simpan pelanggan:", err);
        alert("Gagal menyimpan data pelanggan. Coba cek koneksi atau restart aplikasi.");
    }
};

window.bukaModalCicilan = (pId, hutangId, sisa, namaInfo) => {
        document.getElementById('cicil-pelanggan-id').value = pId;
        document.getElementById('cicil-hutang-id').value = hutangId;
        document.getElementById('cicil-sisa-max').value = sisa;
        
        document.getElementById('nama-pelanggan-cicil').innerText = namaInfo;
        document.getElementById('sisa-hutang-display').innerText = "Rp " + sisa.toLocaleString('id-ID');
        document.getElementById('input-bayar-cicilan').value = "";
        document.getElementById('modal-cicilan').classList.remove('hidden');
        setTimeout(() => document.getElementById('input-bayar-cicilan').focus(), 100);
    };

    window.prosesCicilan = () => {
        const pId = document.getElementById('cicil-pelanggan-id').value;
        const hutangId = document.getElementById('cicil-hutang-id').value;
        const maxSisa = parseInt(document.getElementById('cicil-sisa-max').value);
        let bayar = parseInt(document.getElementById('input-bayar-cicilan').value.replace(/\./g, ''));

        if (!bayar || isNaN(bayar) || bayar <= 0) return alert("Masukkan nominal uang yang valid!");
        if (bayar > maxSisa) return alert("Nominal bayar tidak boleh melebihi sisa tagihan!");

        const ts = Date.now();
        let sisaUangBayar = bayar;

        // Logika Pintar: Cek apakah bayar SEMUA nota atau bayar SATU nota spesifik
        let qSelect = "";
        let params = [];
        if (hutangId === 'ALL') {
            qSelect = "SELECT id, sisa FROM hutang WHERE pelanggan_id = ? AND sisa > 0 ORDER BY CAST(tanggal AS UNSIGNED) ASC";
            params = [pId];
        } else {
            qSelect = "SELECT id, sisa FROM hutang WHERE id = ? AND sisa > 0";
            params = [hutangId];
        }

        const resHutang = window.db.exec(qSelect, params);
        
        if (resHutang.length > 0) {
            resHutang[0].values.forEach(row => {
                if (sisaUangBayar <= 0) return;
                
                let hId = row[0];
                let hSisa = row[1];
                let potong = Math.min(sisaUangBayar, hSisa); 
                
                window.db.run("UPDATE hutang SET sisa = sisa - ? WHERE id = ?", [potong, hId]);
                
                const cicilanId = "C-" + ts + "-" + Math.floor(Math.random() * 1000);
                window.db.run("INSERT INTO cicilan (id, hutang_id, jumlah, tanggal) VALUES (?,?,?,?)", [cicilanId, hId, potong, ts.toString()]);
                
                window.offlineQueue.cicilan.push({ id: cicilanId, hutang_id: hId, jumlah: potong, tanggal: ts.toString(), user_id: window.currentUid });
                
                const resH = window.db.exec("SELECT pelanggan_id, transaksi_id, total, sisa, tanggal FROM hutang WHERE id=?", [hId]);
                if(resH.length>0) {
                    const [p_id, t_id, tot, s, tgl] = resH[0].values[0];
                    window.offlineQueue.hutang = window.offlineQueue.hutang.filter(x => x.id !== hId);
                    window.offlineQueue.hutang.push({ id: hId, pelanggan_id: p_id, transaksi_id: t_id, total: tot, sisa: s, tanggal: tgl, user_id: window.currentUid });
                }
                sisaUangBayar -= potong;
            });
        }

        window.db.run("UPDATE pelanggan SET sisa_hutang = sisa_hutang - ? WHERE id = ?", [bayar, pId]);
        
        const resP = window.db.exec("SELECT nama, hp, total_hutang, sisa_hutang FROM pelanggan WHERE id=?", [pId]);
        if(resP.length>0) {
            const [nm, hp, th, sh] = resP[0].values[0];
            window.offlineQueue.pelanggan = window.offlineQueue.pelanggan.filter(x => x.id !== pId);
            window.offlineQueue.pelanggan.push({ id: pId, nama: nm, hp: hp, total_hutang: th, sisa_hutang: sh, user_id: window.currentUid });
        }

        window.saveQueue();
        if(navigator.onLine) window.processOfflineQueue();
        
        document.getElementById('modal-cicilan').classList.add('hidden');
        window.renderHutang(document.getElementById('sort-hutang').value); 
        window.renderPelangganSelect(); 
        
        alert(`Sukses! Pembayaran sebesar Rp ${bayar.toLocaleString('id-ID')} telah diproses.`);
    };

     document.getElementById('btn-simpan-barang').onclick = async () => {
        const id = document.getElementById('barang-id').value;
        const n = document.getElementById('barang-nama').value;
        const kat = document.getElementById('barang-kategori').value;
        const s = Number(document.getElementById('barang-stok').value);
        const m = Number(document.getElementById('barang-modal').value.replace(/\./g, ''));
        const h = Number(document.getElementById('barang-harga').value.replace(/\./g, ''));
        
        if(!n) return alert("Nama tidak boleh kosong!");
        
        if (!id && !window.isPro && window.masterData.length >= window.FREE_ITEM_LIMIT) {
            window.closeModal();
            return window.showUpgradeModal(`Batas penyimpanan maksimal ${FREE_ITEM_LIMIT} item tercapai.`);
        }

        const finalId = id ? id : Date.now().toString();
        
        const payload = { id: finalId, nama: n, kategori: kat, stok: s, harga_jual: h, modal: m, user_id: window.currentUid };

        if (id) {
    window.db.run("UPDATE barang SET nama=?, kategori=?, stok=?, harga_jual=?, modal=? WHERE id=?", [n, kat, s, h, m, id]);
} else {
    window.db.run("INSERT INTO barang (id, nama, kategori, stok, harga_jual, modal) VALUES (?,?,?,?,?,?)", [finalId, n, kat, s, h, m]);
} 
        
        window.closeModal();
        window.refreshDataUI(); 

        if (navigator.onLine) {
            try {
                const { error } = await supabase.from('barang').upsert(payload);
                if(error) throw error;
            } catch(e) {
                window.offlineQueue.barang.push(payload);
                window.saveQueue();
            }
        } else {
            window.offlineQueue.barang.push(payload);
            window.saveQueue();
        }
    };

    document.getElementById('barang-kategori').onchange = async (e) => {
    const val = e.target.value;
    
    if (val === 'TAMBAH_BARU') {
        const namaBaru = prompt("Masukkan Nama Kategori Baru:");
        
        if (namaBaru && namaBaru.trim() !== "") {
            const cleanNama = namaBaru.trim();
            const idKat = "KAT-" + Date.now();

            try {
                // 1. Simpan ke SQLite Lokal
                window.db.run("INSERT INTO kategori (id, nama) VALUES (?,?)", [idKat, cleanNama]);
                
                // 2. Refresh Dropdown
                window.renderKategoriSelect();
                
                // 3. Otomatis pilih kategori yang baru dibuat
                document.getElementById('barang-kategori').value = cleanNama;

                // 4. Sinkron ke Supabase jika online
                if (navigator.onLine) {
                    await supabase.from('kategori').upsert({ 
                        id: idKat, 
                        nama: cleanNama, 
                        user_id: window.currentUid 
                    });
                }
            } catch (err) {
                console.error("Gagal simpan kategori baru:", err);
                e.target.value = "Umum"; // Fallback ke Umum kalau error
            }
        } else {
            e.target.value = "Umum"; // Balikin ke Umum kalau dibatalkan
        }
    }
};

function updateRowSelection(rows) {
        rows.forEach((row, idx) => {
            if (idx === window.selectedIndex) {
                row.classList.add('bg-blue-100', 'ring-2', 'ring-blue-400', 'ring-inset');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                row.classList.remove('bg-blue-100', 'ring-2', 'ring-blue-400', 'ring-inset');
            }
        });
    }

    window.hapusBarang = async (id, nama) => {
        if(!confirm(`YAKIN HAPUS BARANG:\n\n"${nama}" ?\n\nBarang yang dihapus tidak bisa dikembalikan.`)) return;

        window.db.run("DELETE FROM barang WHERE id = ?", [id]);
        window.refreshDataUI();

        if(navigator.onLine) {
            try {
                await supabase.from('barang').delete().eq('id', id).eq('user_id', window.currentUid);
            } catch(e) {
                window.offlineQueue.hapus_barang.push(id);
                window.saveQueue();
            }
        } else {
            window.offlineQueue.hapus_barang.push(id);
            window.saveQueue();
        }
    };

window.eksekusiHapusKategori = async (id, nama) => {
    // 1. Konfirmasi (Supaya tidak salah pencet)
    if (!confirm(`Hapus kategori "${nama}"?\n\nKategori pada barang yang sudah ada akan otomatis berubah jadi "Umum".`)) return;

    try {
        // 2. Eksekusi Hapus di SQLite Lokal
        window.db.run("DELETE FROM kategori WHERE id = ?", [id]);
        
        // 3. Amankan data barang: Kategori yang dihapus balik ke 'Umum'
        window.db.run("UPDATE barang SET kategori = 'Umum' WHERE kategori = ?", [nama]);

        // 4. Sinkronisasi ke Supabase (Jika Online)
        if (navigator.onLine && window.currentUid) {
            // Hapus kategorinya di Cloud
            await supabase.from('kategori').delete().eq('id', id).eq('user_id', window.currentUid);
            // Update massal barang di Cloud agar tetap sinkron dengan lokal
            await supabase.from('barang').update({ kategori: 'Umum' }).eq('kategori', nama).eq('user_id', window.currentUid);
        }

        // 5. REFRESH SEMUA TAMPILAN (Bagian Paling Penting)
        window.refreshDataUI();       // Update data master
        window.renderCategoryTabs();  // <--- TAMBAHKAN INI: Update tombol filter Kasir/Stok
        window.bukaKelolaKategori();  // Update list di dalam modal kelola (biar itemnya langsung hilang)
        
        alert("Kategori berhasil dihapus!");
        
    } catch (err) {
        console.error("Gagal hapus kategori:", err);
        alert("Aduh Mas, gagal hapus kategori. Coba cek koneksi internet ya.");
    }
};

window.bukaKelolaKategori = () => {
    if (!window.db) return;
    const container = document.getElementById('list-kelola-kategori');
    const res = window.db.exec("SELECT id, nama FROM kategori ORDER BY nama ASC");
    
    document.getElementById('modal-kelola-kategori').classList.remove('hidden');

    if (res.length > 0) {
        container.innerHTML = res[0].values.map(row => {
            const [id, nama] = row;
            if (nama === 'Umum') return ''; // Kategori 'Umum' jangan bisa dihapus
            return `
                <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <span class="text-xs font-bold text-slate-700">${nama}</span>
                    <button onclick="window.eksekusiHapusKategori('${id}', '${nama.replace(/'/g, "\\'")}')" 
                        class="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors text-sm">🗑️</button>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-5">Belum ada kategori tambahan.</p>';
    }
};

