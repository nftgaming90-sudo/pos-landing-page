window.cacheSupplier = JSON.parse(localStorage.getItem(`poskita_cache_sup_${window.currentUid}`)) || [];
window.isKritisMode = false; // Defaultnya mode normal
window.pelangganList = [];
const updateTime = () => {
        const now = new Date();
        const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
        const dateStr = now.toLocaleDateString('id-ID', dateOpts);
        const timeOpts = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const timeStr = now.toLocaleTimeString('id-ID', timeOpts).replace(/\./g, ':');
        
        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-time');
        if(dateEl) dateEl.innerText = dateStr;
        if(timeEl) timeEl.innerText = timeStr;
    };
    setInterval(updateTime, 1000);
    updateTime(); 

    window.formatAngka = (angka) => {
        if (!angka) return "";
        return angka.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    window.showUpgradeModal = (reason) => {
        if(reason) document.getElementById('upgrade-reason').innerText = reason;
        document.getElementById('modal-upgrade').classList.remove('hidden');
    };

 window.switchPage = (pageId, btn) => {
    // 1. 🔥 PAKSA SEMBUNYI FLOATING BAR (Anti-Gentayangan)
    // Langsung sembunyikan dulu tanpa kompromi saat pindah halaman
    const floatingCart = document.getElementById('floating-cart-btn');
    const floatingKulakan = document.getElementById('floating-kulakan-btn');
    
    if (floatingCart) floatingCart.classList.add('hidden');
    if (floatingKulakan) floatingKulakan.classList.add('hidden');

    if (pageId === 'kasir' && !window.kasirAktif) {
        // Jika mau masuk kasir tapi belum aktif (belum isi modal)
        alert("⚠️ Akses Ditolak! Anda harus Buka Kasir dan isi Modal dulu.");
        
        // Munculkan modal buka kasir secara otomatis
        const modalBuka = document.getElementById('modal-buka-kasir');
        if (modalBuka) modalBuka.classList.remove('hidden');
        
        return; // STOP! Jangan lanjut ke kode pindah halaman di bawah
    }

    // 2. BERSIHKAN SEMUA HALAMAN
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.setProperty('display', 'none', 'important');
        p.classList.remove('page-active');
    });

    // 3. TAMPILKAN HALAMAN YANG DIPILIH
    const target = document.getElementById('menu-' + pageId);
    if (target) {
        target.style.setProperty('display', 'flex', 'important');
        target.classList.add('page-active');
    }
    
    // 4. UPDATE WARNA TOMBOL NAVIGASI
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('nav-active', 'text-white', 'border-white');
        b.classList.add('text-blue-300', 'border-transparent');
    });
    
    if(!btn) btn = document.getElementById('nav-' + pageId);
    if(btn) {
        btn.classList.add('nav-active', 'text-white', 'border-white');
    }

    // 5. TUTUP DRAWER STOK (Khusus PC agar tidak menutupi laporan)
    if (pageId !== 'stok') {
        const kulakan = document.getElementById('kulakan-section');
        if(kulakan) kulakan.classList.remove('active');
    }

    // 6. TRIGGER ULANG RENDER (Kasih jeda dikit biar DOM page-active sudah terbaca)
    setTimeout(() => {
        // Hanya akan muncul kembali jika logic di dalam render masing-masing terpenuhi
        // (Misal: Harus di halaman Kasir DAN keranjang > 0)
        window.renderCart?.(); 
        window.renderCartKulakan?.();
    }, 50);

    // 7. TRIGGER DATA PER HALAMAN
    if (pageId === 'stok') {
        if (typeof window.renderSelectSupplier === 'function') window.renderSelectSupplier();

        if (window.isKritisMode) {
            window.filterStokKritis();
        } else {
            window.renderStokTable(window.masterData);
            setTimeout(() => { window.renderRekomendasiKulakan?.(); }, 150);
        }
    }
    
    if(pageId === 'laporan') {
        window.updateReports(); 
        window.setReportFilter(window.currentReportFilter);
    }
    
    if(pageId === 'pelanggan') window.renderHutang();
};

window.toggleKulakanDrawer = () => {
    const el = document.getElementById('kulakan-section');
    const isActive = el.classList.toggle('active');
    if (isActive) history.pushState({ kulakanOpen: true }, "");
};

// Fungsi untuk kembali ke tabel stok
window.tutupKulakan = () => {
    document.getElementById('area-kulakan').classList.add('hidden');
    document.getElementById('tabel-stok-utama').classList.remove('hidden');
    window.cartKulakan = []; // Reset keranjang pas keluar
};

// Modifikasi fungsi buka halaman kulakan Mas biar daftar barangnya langsung muncul
window.bukaHalamanKulakan = () => {
    document.getElementById('tabel-stok-utama').classList.add('hidden');
    document.getElementById('area-kulakan').classList.remove('hidden');
    window.renderSelectSupplier();
    window.renderListPilihKulakan(); // <--- Panggil ini biar list muncul
};

window.toggleCart = () => {
        const cartSection = document.getElementById('cart-section');
        const isActive = cartSection.classList.toggle('active');

        if (isActive) {
            // Tambahkan "status" di history browser saat keranjang buka
            history.pushState({ cartOpen: true }, "");
        } else {
            // Jika ditutup manual lewat tombol UX, pastikan history dibersihkan
            if (history.state && history.state.cartOpen) {
                history.back();
            }
        }
    };

window.closeModal = () => document.getElementById('modal-barang').classList.add('hidden');
    
    window.openAddModal = () => {
        if (!window.isPro && window.masterData.length >= window.FREE_ITEM_LIMIT) {
            return window.showUpgradeModal(`Batas penyimpanan maksimal ${window.FREE_ITEM_LIMIT} item untuk pengguna FREE telah tercapai.`);
        }

        window.renderKategoriSelect(); 

        document.getElementById('modal-title').innerText = "TAMBAH BARANG";
        document.getElementById('barang-id').value = "";
        document.getElementById('barang-nama').value = "";
        document.getElementById('barang-kategori').value = "Umum";
        document.getElementById('barang-stok').value = "";
        document.getElementById('barang-modal').value = "";
        document.getElementById('barang-harga').value = "";
        document.getElementById('modal-barang').classList.remove('hidden');
        setTimeout(() => document.getElementById('barang-nama').focus(), 100);
    };

    window.openEditModal = (id, n, s, h, m, kat) => {
    // 1. Segarkan dulu isi dropdown kategorinya
    window.renderKategoriSelect(); 

    // 2. Masukkan datanya ke form modal
    document.getElementById('modal-title').innerText = "EDIT BARANG";
    document.getElementById('barang-id').value = id;
    document.getElementById('barang-nama').value = n;
    document.getElementById('barang-stok').value = s;
    document.getElementById('barang-harga').value = window.formatAngka(h);
    document.getElementById('barang-modal').value = window.formatAngka(m);
    
    // 3. Set kategorinya, kalau ga ketemu default ke Umum
    const selectKat = document.getElementById('barang-kategori');
    if (selectKat) {
        selectKat.value = kat || "Umum";
    }
    
    // 4. Munculkan modalnya
    document.getElementById('modal-barang').classList.remove('hidden');
};

    window.renderSelectSupplier = () => {
    const selectSup = document.getElementById('select-supplier');
    if (!selectSup) return;

    let data = window.cacheSupplier;

    let html = '<option value="">-- Pilih Supplier --</option>';
    let dataSupplier = [];

    // TRICK 1: Ambil dari Cache LocalStorage dulu buat "Pemanasan"
    const cached = localStorage.getItem(`cache_supplier_${window.currentUid}`);
    if (cached) {
        dataSupplier = JSON.parse(cached);
    }

    // TRICK 2: Kalau Database sudah ready, ambil data asli & update cache
    if (window.db) {
        const res = window.db.exec("SELECT id, nama FROM supplier ORDER BY nama ASC");
        if (res.length > 0 && res[0].values) {
            dataSupplier = res[0].values.map(row => ({ id: row[0], nama: row[1] }));
            window.cacheSupplier = data;
            // Simpan ke cache biar kalau di-refresh datanya langsung ada
            localStorage.setItem(`cache_supplier_${window.currentUid}`, JSON.stringify(dataSupplier));
        }
    }

    // Gabung ke HTML
    dataSupplier.forEach(s => {
        html += `<option value="${s.id}">${s.nama}</option>`;
    });
    
    selectSup.innerHTML = html;

    // Aktifkan Smart Dropdown jika DB sudah siap
    if (window.db) {
        window.initSmartDropdown({
            selectId: 'select-supplier',
            table: 'supplier',
            placeholder: '🔍 Cari Supplier...',
            onSyncSuccess: () => window.renderSelectSupplier()
        });
    }
};

// Fungsi untuk menampilkan daftar barang yang bisa dipilih pas mau kulakan
window.renderListPilihKulakan = (keyword = "") => {
    const container = document.getElementById('list-pilih-barang-kulakan');
    if (!container) return;

    const filterData = window.masterData.filter(item => 
        item[0].toLowerCase().includes(keyword.toLowerCase())
    );

    container.innerHTML = filterData.map(item => `
        <div onclick="window.tambahKeKulakan('${item[4]}')" class="p-3 flex justify-between items-center hover:bg-orange-50 active:bg-orange-100 cursor-pointer transition-colors">
            <div class="flex flex-col">
                <span class="text-xs font-bold text-slate-700 uppercase">${item[0]}</span>
                <span class="text-[10px] text-slate-400 font-medium">Stok saat ini: ${item[1]}</span>
            </div>
            <div class="text-right">
                <span class="text-[10px] font-black text-orange-600">+ TAMBAH</span>
            </div>
        </div>
    `).join('');
};

window.renderCartKulakan = () => {
    const container = document.getElementById('kulakan-items');
    const floatBtn = document.getElementById('floating-kulakan-btn');
    const mobCount = document.getElementById('mobile-kulakan-count');

    if (window.cartKulakan.length === 0) {
        container.innerHTML = `<div class="py-20 text-center opacity-20 text-[10px] font-black uppercase">Belum ada barang dipilih</div>`;
        floatBtn?.classList.add('hidden');
        if (document.getElementById('total-nominal-kulakan')) {
            document.getElementById('total-nominal-kulakan').innerText = "Rp 0";
        }
    } else {
        const currentPage = document.querySelector('.page-active')?.id;

if (window.cartKulakan.length > 0 && currentPage === 'menu-stok') {
    floatBtn?.classList.remove('hidden');
} else {
    floatBtn?.classList.add('hidden');
}
        if(mobCount) mobCount.innerText = `${window.cartKulakan.length} Items`;
        
        container.innerHTML = window.cartKulakan.map((item, index) => `
            <div class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-black text-slate-700 uppercase leading-tight">${item.nama}</span>
                    <button onclick="window.cartKulakan.splice(${index}, 1); window.renderCartKulakan();" class="text-rose-500 text-xs">✕</button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[8px] font-black text-slate-400 uppercase">Qty Baru</label>
                        <input type="number" value="${item.qty}" 
                            onchange="window.cartKulakan[${index}].qty = parseInt(this.value)||1; window.hitungTotalKulakan();"
                            class="w-full bg-slate-50 border-none rounded-lg p-2 text-[11px] font-black outline-none focus:ring-1 focus:ring-orange-500">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[8px] font-black text-slate-400 uppercase">Harga Modal (Rp)</label>
                        <input type="text" value="${window.formatAngka(item.hargaBeli)}" 
                            oninput="this.value=window.formatAngka(this.value); window.cartKulakan[${index}].hargaBeli=parseInt(this.value.replace(/\\./g,''))||0; window.hitungTotalKulakan();"
                            class="w-full bg-slate-50 border-none rounded-lg p-2 text-[11px] font-black text-right outline-none focus:ring-1 focus:ring-orange-500">
                    </div>
                </div>
            </div>
        `).join('');
        
        // Langsung hitung total setiap kali render
        window.hitungTotalKulakan();
    }
};

window.renderRiwayatKulakan = () => {
    const container = document.getElementById('riwayat-kulakan-body'); 
    if (!container || !window.db) return;

    const res = window.db.exec(`
        SELECT p.id, p.tanggal, p.total, p.status, s.nama 
        FROM pembelian p
        LEFT JOIN supplier s ON p.supplier_id = s.id
        ORDER BY p.tanggal DESC
    `);

    if (res.length > 0 && res[0].values.length > 0) {
        container.innerHTML = res[0].values.map(row => {
            const [id, tgl, total, status, supplier] = row;
            
            // 1. FIX: Samakan nama variabel warna (badgeColor)
            const badgeColor = status === 'DRAFT' 
                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                : 'bg-emerald-100 text-emerald-700 border-emerald-200';

            // 2. FIX: Format tanggal agar tidak undefined (tglStr)
            const tglStr = new Date(parseInt(tgl)).toLocaleDateString('id-ID', {
                day: 'numeric', 
                month: 'short', 
                year: 'numeric'
            });

            // 3. FIX: Pastikan nama supplier terambil (supplierName)
            const supplierName = supplier || 'Umum';

            return `
            <tr onclick="window.lihatDetailAtauEdit('${id}', '${status}')" 
                class="cursor-pointer hover:bg-slate-50 border-b border-slate-50 transition-all active:bg-slate-100 group">
                <td class="p-3">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="text-[7px] font-black px-1.5 py-0.5 rounded border ${badgeColor} uppercase">
                                ${status}
                            </span>
                            <span class="text-[9px] font-bold text-slate-400">#${id.slice(-6)}</span>
                        </div>
                        <p class="text-[11px] font-black text-slate-700 uppercase leading-tight">${supplierName}</p>
                        <p class="text-[9px] text-slate-400 font-bold">${tglStr}</p>
                    </div>
                </td>
                <td class="p-3 text-right">
                    <p class="text-[11px] font-black text-slate-800">Rp ${total.toLocaleString('id-ID')}</p>
                    <div class="mt-1 flex justify-end">
                        <span class="text-[8px] font-black ${status === 'DRAFT' ? 'text-amber-600' : 'text-blue-600'} uppercase tracking-tighter">
                            ${status === 'DRAFT' ? '✎ EDIT' : '👁 DETAIL'}
                        </span>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } else {
        container.innerHTML = `<div class="py-20 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">Belum ada riwayat</div>`;
    }
};

// Fungsi pembantu biar rapi
window.hitungTotalKulakan = () => {
    const total = window.cartKulakan.reduce((sum, item) => sum + (item.qty * item.hargaBeli), 0);
    const el = document.getElementById('total-nominal-kulakan');
    if (el) el.innerText = "Rp " + window.formatAngka(total.toString());
};

window.renderPelangganSelect = () => {
    if (!window.db) return;
    
    // Ambil data terbaru dari DB
    const res = window.db.exec("SELECT id, nama FROM pelanggan ORDER BY nama ASC");
    const select = document.getElementById('select-pelanggan');
    if (!select) return;

    let options = '<option value="">-- Pelanggan Umum --</option>';
    if (res.length > 0) {
        res[0].values.forEach(row => {
            options += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }
    select.innerHTML = options;
    
    window.initSmartDropdown({
        selectId: 'select-pelanggan',
        table: 'pelanggan', // Sesuai nama tabel di Supabase
        placeholder: '🔍 Cari Pelanggan...',
        onSyncSuccess: () => {
            // Setelah tambah/hapus sukses di Cloud, render ulang selecnya
            window.renderPelangganSelect(); 
            // Pastikan list pelanggan untuk pencarian kasir juga update
            if (typeof window.syncPelangganDariSelect === 'function') {
                window.syncPelangganDariSelect();
            }
        }
    });
    
    console.log("✅ Select & List Pelanggan Berhasil Disinkronkan");
};

window.renderHutang = (sortBy = 'baru') => {
    if (!window.db) return;
    
    // Query diperbaiki untuk memastikan sinkronisasi data sisa_hutang pelanggan
    let query = `
        SELECT p.id, p.nama, p.hp, p.sisa_hutang, 
               (SELECT MAX(CAST(tanggal AS UNSIGNED)) FROM hutang WHERE pelanggan_id = p.id AND sisa > 0) as tgl_lama
        FROM pelanggan p 
        WHERE p.sisa_hutang > 0 
    `;

    if (sortBy === 'terbanyak') query += ` ORDER BY p.sisa_hutang DESC`;
    else if (sortBy === 'terlama') query += ` ORDER BY tgl_lama ASC`;
    else query += ` ORDER BY tgl_lama DESC`;

    try {
        const res = window.db.exec(query);
        const container = document.getElementById('list-hutang');
        let totalSemua = 0;

        if (res.length > 0 && res[0].values) {
            container.innerHTML = res[0].values.map(row => {
                const [id, nama, hp, sisa, tgl_lama] = row;
                totalSemua += sisa;
                const d = tgl_lama ? new Date(parseInt(tgl_lama)).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-';
                
                return `
<div class="w-full bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden mb-0">

    <!-- HEADER -->
    <div class="px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition"
        onclick="window.toggleDetailHutang('${id}')">

        <div class="flex-1 min-w-0 pr-2">

            <h3 class="text-sm font-semibold text-slate-800 flex items-center gap-1.5 leading-snug tracking-tight">
    <span class="truncate">
        ${nama}
    </span> 
    <span id="icon-pelanggan-${id}"
        class="text-[10px] text-slate-400 flex items-center">
        ▼
    </span>
</h3>

            <p class="text-[11px] text-slate-400 mt-0.5">
                📞 ${hp || '-'}
            </p>

        </div>

        <div class="text-right">
            <p class="text-[10px] text-slate-400 leading-none">Sisa</p>
            <p class="text-lg md:text-xl font-bold text-rose-600 leading-tight">
                Rp ${sisa.toLocaleString('id-ID')}
            </p>
        </div>

    </div>

    <!-- DETAIL -->
    <div id="detail-hutang-${id}" class="hidden bg-slate-50/50 border-t border-slate-100">
        <div id="isi-hutang-${id}" class="px-3 py-2"></div>
    </div>

    <!-- FOOTER -->
    <div class="flex justify-between items-center px-3 py-2 bg-slate-50/40 border-t border-slate-100">

        <span class="text-[11px] text-slate-400">
            ${d}
        </span>

        <button onclick="window.bukaModalCicilan('${id}', 'ALL', ${sisa}, '${nama.replace(/'/g, "\\'")}')" 
            class="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-95 transition">
            Bayar
        </button>

    </div>

</div>
`;
            }).join('');
        } else {
            container.innerHTML = `<div class="py-16 text-center opacity-40"><div class="text-6xl mb-4">🎉</div><p class="text-xs font-black uppercase text-slate-500">Bebas Hutang!</p></div>`;
        }
        document.getElementById('total-semua-hutang').innerText = `Total Piutang: Rp ${totalSemua.toLocaleString('id-ID')}`;
    } catch (e) { console.error("Gagal load hutang:", e); }
};

window.toggleDetailHutang = (pId) => {
        const targetEl = document.getElementById(`detail-hutang-${pId}`);
        const targetIcon = document.getElementById(`icon-pelanggan-${pId}`);
        
        // Cek status saat ini: apakah elemen yang diklik sedang tertutup?
        const isCurrentlyHidden = targetEl.classList.contains('hidden');

        // 1. TUTUP SEMUA card detail hutang & kembalikan posisi panah
        document.querySelectorAll('[id^="detail-hutang-"]').forEach(el => {
            el.classList.add('hidden');
        });
        document.querySelectorAll('[id^="icon-pelanggan-"]').forEach(icon => {
            icon.style.transform = 'rotate(0deg)';
        });

        // 2. BUKA HANYA card yang diklik (jika sebelumnya statusnya tertutup)
        if (isCurrentlyHidden) {
            targetEl.classList.remove('hidden');
            targetIcon.style.transform = 'rotate(180deg)';
            window.loadIsiDetailHutang(pId);
        }
    };

window.loadIsiDetailHutang = (pId) => {
        const container = document.getElementById(`isi-hutang-${pId}`);
        if(!container || !window.db) return;

        // 1. Ambil daftar nota belum lunas milik pelanggan ini
        const qHutang = `SELECT h.id, h.transaksi_id, h.total, h.sisa, h.tanggal FROM hutang h WHERE h.pelanggan_id = '${pId}' AND h.sisa > 0 ORDER BY CAST(h.tanggal AS UNSIGNED) ASC`;
        const resH = window.db.exec(qHutang);

        let htmlNota = '';
        if(resH.length > 0) {
            resH[0].values.forEach(row => {
    const [hId, tId, hTotal, hSisa, hTglMs] = row;
    const hTgl = new Date(parseInt(hTglMs)).toLocaleString('id-ID', {dateStyle:'medium', timeStyle:'short'});

    // Ambil rincian item
    const resDet = window.db.exec(`SELECT b.nama, td.qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id = ${tId}`);
    let htmlItem = '';
    if(resDet.length > 0) {
        resDet[0].values.forEach(item => {
            htmlItem += `
                <div class="flex justify-between text-[10px] text-slate-500 border-b border-dashed border-slate-200 py-2 last:border-0">
                    <span class="truncate pr-2">${item[1]}x ${item[0] || '(Terhapus)'}</span>
                    <span class="whitespace-nowrap font-bold">Rp ${(item[1]*item[2]).toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    // PEMPERBAIKAN STRUKTUR DI SINI:
    htmlNota += `
<div class="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden">

    <!-- HEADER -->
    <div class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onclick="document.getElementById('items-${hId}').classList.toggle('hidden')">

        <div>
            <p class="text-sm font-semibold text-slate-800">
                Nota #${tId.toString().slice(-6)}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">
                ${hTgl}
            </p>
        </div>

        <div class="text-right">
            <p class="text-[10px] text-slate-400">
                Sisa
            </p>
            <p class="text-base md:text-lg font-bold text-rose-600 leading-tight">
                Rp ${hSisa.toLocaleString('id-ID')}
            </p>
        </div>
    </div>

    <!-- DETAIL -->
    <div id="items-${hId}" class="hidden px-4 py-3 border-t border-slate-100 bg-slate-50/50">

        <p class="text-xs text-slate-400 mb-2 uppercase tracking-wide">
            Rincian Belanja
        </p>

        ${htmlItem}

    </div>

    <!-- ACTION -->
    <div class="px-4 pb-4 pt-2 flex flex-col gap-2">

        <div class="flex gap-2">

            <button onclick="window.printStrukHutangPerNota('${hId}')" 
                class="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold active:scale-95 transition">
                🖨️ Print
            </button>

            <button onclick="window.previewHutangImage('${hId}')" 
                class="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold active:scale-95 transition">
                📸 Gambar
            </button>

        </div>

        <button onclick="window.bukaModalCicilan('${pId}', '${hId}', ${hSisa}, 'Nota #${tId.toString().slice(-6)}')" 
            class="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold active:scale-95 transition">
            💰 Bayar / Cicil Nota Ini
        </button>

    </div>

</div>
`;
});
        }

        
        // 2. Ambil riwayat cicilan pelanggan ini
// Gunakan LEFT JOIN agar kalau ada data yang miss, transaksi_id tetap bisa dicari
const qCicil = `
    SELECT c.jumlah, c.tanggal, t.id
    FROM cicilan c
    JOIN hutang h ON c.hutang_id = h.id
    JOIN transaksi t ON h.transaksi_id = t.id
    WHERE h.pelanggan_id = '${pId}'
    ORDER BY CAST(c.tanggal AS UNSIGNED) DESC
`;
        const resC = window.db.exec(qCicil);
        console.log("Data Cicilan Ketemu:", resC);
        let htmlCicil = '';
        
        if(resC.length > 0) {
            resC[0].values.forEach(row => {
                const cTgl = new Date(parseInt(row[1])).toLocaleString('id-ID', {dateStyle:'medium', timeStyle:'short'});
                htmlCicil += `
                <div class="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-emerald-600">+ Rp ${row[0].toLocaleString('id-ID')}</span>
                        <span class="text-[8px] text-slate-500 font-bold mt-0.5">Nota #${row[2].toString().slice(-6)}</span>
                    </div>
                    <span class="text-[8px] font-bold text-slate-400 text-right w-20 leading-tight">${cTgl.replace(', ', '<br>')}</span>
                </div>`;
            });
        } else {
            htmlCicil = `<p class="text-[9px] italic text-slate-400 text-center py-3">Belum ada riwayat pembayaran/cicilan.</p>`;
        }

        // 3. Inject HTML ke layar
        container.innerHTML = `
            <div class="mt-2 border-t border-slate-200 pt-3">
                <h4 class="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2">📑 Rincian Nota Belum Lunas</h4>
                ${htmlNota}
            </div>
            <div class="mt-4 border-t border-slate-200 pt-3 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50">
                <h4 class="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700 mb-2 flex items-center gap-1.5"><span>🗓️</span> History Pembayaran</h4>
                <div class="max-h-40 overflow-y-auto pr-1">
                    ${htmlCicil}
                </div>
            </div>
        `;
    };

    window.renderTable = (dataArray) => {
        const tbody = document.getElementById('table-body');
        
        if (!dataArray || (dataArray.length === 0 && window.masterData.length === 0)) {
            tbody.innerHTML = `
                <tr class="animate-pulse">
                    <td class="p-4"><div class="h-4 bg-slate-200 rounded w-3/4"></div></td>
                    <td class="p-4"><div class="h-8 bg-slate-200 rounded-full w-12 mx-auto"></div></td>
                    <td class="p-4"><div class="h-8 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
                </tr>
                <tr class="animate-pulse opacity-50">
                    <td class="p-4"><div class="h-4 bg-slate-200 rounded w-2/4"></div></td>
                    <td class="p-4"><div class="h-8 bg-slate-200 rounded-full w-12 mx-auto"></div></td>
                    <td class="p-4"><div class="h-8 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
                </tr>
                <tr class="animate-pulse opacity-20">
                    <td class="p-4"><div class="h-4 bg-slate-200 rounded w-3/4"></div></td>
                    <td class="p-4"><div class="h-8 bg-slate-200 rounded-full w-12 mx-auto"></div></td>
                    <td class="p-4"><div class="h-8 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = dataArray.map(row => `
            <tr class="tr-item border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td class="p-3 md:p-4 pl-4 md:pl-5" style="width: 50%;">
    <p class="font-bold text-slate-700 text-xs md:text-sm capitalize break-words leading-tight" 
       style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
        ${row[0]}
    </p>
    <p class="text-[10px] md:text-xs text-blue-600 font-bold mt-1">Rp ${row[2].toLocaleString('id-ID')}</p>
</td>
                <td class="p-3 md:p-4 text-center whitespace-nowrap">
                    <span class="px-2.5 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black shadow-sm border ${row[1] < 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}">
                        ${row[1]}
                    </span>
                </td>
                <td class="p-2 text-right" style="width: 33%;">
    <div class="flex items-center justify-end gap-1.5" style="height: 32px;">
        
        <div class="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm" style="height: 32px;">
            <button onclick="window.minQty('qty-${row[4]}')" 
                    class="w-8 h-full flex items-center justify-center text-slate-500 font-black active:bg-slate-100">-</button>
            
            <input id="qty-${row[4]}" type="number" value="1" readonly
                   class="w-7 h-full text-center text-[11px] font-extrabold outline-none border-x border-slate-50 text-slate-700 bg-slate-50/30">
            
            <button onclick="window.plusQty('qty-${row[4]}', ${row[1]})" 
                    class="w-8 h-full flex items-center justify-center text-slate-500 font-black active:bg-slate-100">+</button>
        </div>

        <button onclick="window.addQtyToCart('${row[4]}', '${row[0].replace(/'/g, "\\'")}', ${row[2]}, ${row[1]}, ${row[3]}, 'qty-${row[4]}')" 
                class="bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-transform"
                style="width: 32px; height: 32px; min-width: 32px; border: none;">
            <span style="font-weight: 800; font-size: 20px; line-height: 1;">+</span>
        </button>
        
    </div>
</td>
            </tr>`).join('');
    };

window.renderStokTable = (dataArray) => {
    const tbody = document.getElementById('stok-table-body');
    if (!tbody) return;

    tbody.innerHTML = dataArray.map(row => {
        const stok = parseInt(row[1]) || 0;

        // 🔥 LOGIC INDIKATOR (Punya Mas tetap utuh)
        let badgeClass = "bg-emerald-50 text-emerald-600";
        let label = stok;

        if (stok === 0) {
            badgeClass = "bg-rose-100 text-rose-600";
            label = "Habis";
        } else if (stok <= 5) {
            badgeClass = "bg-amber-100 text-amber-600";
            label = stok + " ⚠";
        }

        // 🔥 OPTIONAL: highlight baris
        const rowClass = stok === 0 
            ? "bg-rose-50" 
            : stok <= 5 
            ? "bg-amber-50" 
            : "";

        return `
        <tr class="tr-item border-b border-slate-50 hover:bg-slate-50 ${rowClass}">
            <td class="p-3 pl-4">
                <div class="flex flex-col">
                    <span class="text-[7px] font-black text-blue-500 uppercase tracking-widest">${row[5] || 'Umum'}</span>
                    <p class="font-bold text-slate-800 text-xs md:text-sm capitalize">${row[0]}</p>
                    <p class="text-[10px] text-slate-400 font-bold">Harga: Rp ${parseInt(row[2] || 0).toLocaleString('id-ID')}</p>
                </div>
            </td>

            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded-full text-[9px] font-black ${badgeClass}">
                    ${label}
                </span>
            </td>

            <td class="p-3 pr-4 text-right">
                <div class="flex justify-end gap-2">
                    ${window.isKritisMode ? `
                        <button onclick="window.tambahKeKulakan('${row[4]}')" 
                                class="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-90 transition-all">
                            + KULAK
                        </button>
                    ` : ''}
                    
                    <button onclick="window.openEditModal('${row[4]}','${row[0]}',${row[1]},${row[2]},${row[3]},'${row[5]}')" 
                            class="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                        ✏️
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    // Update counter text (Opsional biar tetep sinkron)
    const counter = document.getElementById('stok-counter');
    if (counter) counter.innerText = `${dataArray.length} Item Tersedia`;
};

window.renderKategoriSelect = () => {
    if (!window.db) return;
    try {
        // Ambil kategori dari tabel kategori DAN kategori yang sudah nempel di barang
        // Biar nggak ada kategori yang "hilang" dari pilihan
        const res = window.db.exec(`
            SELECT DISTINCT kategori_nama FROM (
                SELECT nama AS kategori_nama FROM kategori 
                UNION 
                SELECT kategori AS kategori_nama FROM barang
            ) WHERE kategori_nama IS NOT NULL AND kategori_nama != '' 
            ORDER BY kategori_nama ASC
        `);

        const select = document.getElementById('barang-kategori');
        if (!select) return;

        // Reset dan kasih opsi default
        let options = '<option value="Umum">Umum</option>';
        
        if (res.length > 0) {
            res[0].values.forEach(row => {
                const namaKat = row[0];
                // 'Umum' sudah kita hardcode di atas, jadi skip kalau ada di database
                if (namaKat.toLowerCase() !== 'umum') { 
                    options += `<option value="${namaKat}">${namaKat}</option>`;
                }
            });
        }
        
        // Tambahkan opsi spesial untuk tambah kategori baru
        options += '<option value="TAMBAH_BARU" class="font-bold text-blue-600">+ Tambah Kategori Baru...</option>';
        select.innerHTML = options;
    } catch (e) {
        console.error("Gagal render kategori select:", e);
    }
};

window.renderCategoryTabs = () => {
    if (!window.db) return;
    
    try {
        const resBarang = window.db.exec("SELECT DISTINCT kategori FROM barang WHERE kategori IS NOT NULL AND kategori != ''");
        let kategoriList = ["Semua"];
        
        if (resBarang.length > 0) {
            resBarang[0].values.forEach(row => {
                if (row[0] !== "Semua") kategoriList.push(row[0]);
            });
        }

        const containers = ['filter-kategori-kasir', 'filter-kategori-stok'];
        containers.forEach(containerId => {
            const el = document.getElementById(containerId);
            if (!el) return;

            // 🔥 Kita pastikan overflow-x-auto ada biar BISA DIGESER
            // 🔥 Kita kasih px-4 biar tombol paling kiri & kanan ada jarak (nggak kepotong)
            el.className = "flex gap-2 overflow-x-auto hide-scrollbar py-2 px-4 items-center";

            el.innerHTML = kategoriList.map(kat => {
                const isActive = window.currentCategoryFilter === kat;
                return `
    <button onclick="window.applyCategoryFilter('${kat.replace(/'/g, "\\'")}')" 
        class="shrink-0 px-4 py-0 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
        ${isActive 
            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
            : 'bg-white text-slate-500 border-slate-200'}">
        ${kat}
    </button>
`;
            }).join('');
        });
    } catch (e) {
        console.error("Gagal render tabs:", e);
    }
};

window.applyCategoryFilter = (kat) => {
    window.currentCategoryFilter = kat;
    window.renderCategoryTabs(); // Re-render biar tombol yang aktif berubah warna
    
    // Filter data master
    const filteredData = window.currentCategoryFilter === "Semua" 
        ? window.masterData 
        : window.masterData.filter(item => item[5] === window.currentCategoryFilter);

    // Update kedua tabel
    window.renderTable(filteredData);
    window.renderStokTable(filteredData);
};

window.renderCart = () => {
    if(window.currentUid) localStorage.setItem(`poskita_cart_${window.currentUid}`, JSON.stringify(window.cart));
    
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const badge = document.getElementById('mobile-cart-count');
    const count = window.cart.reduce((sum, i) => sum + i.qty, 0);
    
    if(badge) badge.innerText = count;

    if (window.cart.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full min-h-[140px] opacity-30"><span class="text-4xl mb-2.5 grayscale">🛒</span><p class="text-[9px] font-black uppercase tracking-widest text-slate-500">Keranjang Kosong</p></div>`;
        totalEl.innerText = "Rp 0";
        document.getElementById('btn-proses-bayar').disabled = true;
        return;
    }

    let totalGlobal = 0;
    container.innerHTML = window.cart.map((item, index) => {
        const subtotalKotor = item.harga * item.qty;
        let nilaiPotongan = 0;
        
        if (item.tipeDiskon === 'persen') {
            nilaiPotongan = subtotalKotor * (item.diskon / 100);
        } else {
            nilaiPotongan = item.diskon;
        }
        
        const subtotalBersih = Math.max(0, subtotalKotor - nilaiPotongan);
        totalGlobal += subtotalBersih;

        const displayDiskon = item.tipeDiskon === 'persen' ? item.diskon : window.formatAngka(item.diskon);

        return `
        <div class="bg-white p-3 rounded-xl flex flex-col gap-2 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            
            <div class="flex justify-between items-start pl-2">
                <div class="flex-1">
                    <p class="font-black text-slate-700 text-[10px] uppercase tracking-tight">${item.nama}</p>
                    
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <span class="text-[9px] text-slate-400 font-bold">${item.qty}x Rp${window.formatAngka(item.harga)}</span>
                        
                        <div class="flex items-center bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            <span class="text-[8px] font-black text-amber-500 mr-1">DISC</span>
                            <input type="text" 
                                inputmode="numeric"
                                value="${displayDiskon}" 
                                onfocus="this.select()" 
                                oninput="this.value = window.formatDiskonLive(this, ${index})"
                                onblur="window.updateCartDiscount(${index}, this.value)"
                                class="w-12 text-[10px] font-black text-amber-600 bg-transparent outline-none">
                            <select onchange="window.updateCartDiscountType(${index}, this.value)" class="bg-transparent text-[9px] font-black text-amber-600 outline-none">
                                <option value="nominal" ${item.tipeDiskon === 'nominal' ? 'selected' : ''}>Rp</option>
                                <option value="persen" ${item.tipeDiskon === 'persen' ? 'selected' : ''}>%</option>
                            </select>
                        </div>
                    </div>
                </div>
                <button onclick="window.hapusCartItem(${index})" class="text-slate-300 hover:text-rose-500 text-lg">✕</button>
            </div>

            <div class="flex justify-between items-center pl-2 border-t border-slate-50 pt-2">
                <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button onclick="window.updateCartQty(${index}, -1)" class="w-6 h-6 flex items-center justify-center text-slate-500 font-black">-</button>
                    <input type="number" 
    value="${item.qty}" 
    onfocus="this.select()"
    onblur="window.manualUpdateQty(${index}, this.value)"
    onkeydown="if(event.key==='Enter') window.manualUpdateQty(${index}, this.value)"
    class="w-10 text-center text-[11px] font-black text-slate-700 bg-white outline-none border-x border-slate-200">
                    <button onclick="window.updateCartQty(${index}, 1)" class="w-6 h-6 flex items-center justify-center text-slate-500 font-black">+</button>
                </div>
                <div class="text-right">
                    <span class="font-black text-blue-700 text-xs">
                        Rp ${subtotalBersih.toLocaleString('id-ID')}
                    </span>
                </div>
            </div>
        </div>`;
    }).join('');

    totalEl.innerText = "Rp " + totalGlobal.toLocaleString('id-ID');
    document.getElementById('btn-proses-bayar').disabled = false;

        // --- UPDATE FLOATING BAR (Versi Mobile HP) ---
        const mobileItemText = document.getElementById('mobile-item-count');
        const mobileTotalText = document.getElementById('mobile-cart-total');
        const floatingBar = document.getElementById('floating-cart-btn');

        if(mobileItemText) mobileItemText.innerText = `${count} Items`;
        if(mobileTotalText) mobileTotalText.innerText = `Rp ${totalGlobal.toLocaleString('id-ID')}`;

        // Logika Pintar: Hanya munculkan Floating Bar jika di halaman KASIR dan keranjang ada isinya
        if (floatingBar) {
    // 1. Hitung jumlah item asli (pastikan beneran kosong)
    const itemCount = window.cart.length; 
    
    // 2. Cek apakah halaman yang sedang aktif BENERAN menu kasir
    const activePage = document.querySelector('.page-active');
    const isKasirPage = activePage && activePage.id === 'menu-kasir';

    // 3. Syarat mutlak: Item harus > 0 DAN harus di halaman kasir
    if (itemCount > 0 && isKasirPage) {
        floatingBar.classList.remove('hidden');
        // Update teks angkanya sekalian
        if(document.getElementById('mobile-cart-count')) {
            document.getElementById('mobile-cart-count').innerText = window.cart.reduce((s, i) => s + i.qty, 0);
        }
    } else {
        // Kalau salah satu syarat gak terpenuhi, WAJIB sembunyi
        floatingBar.classList.add('hidden');
    }
}
    };

// --- LOGIC PENCARIAN KASIR ---
const inputBarang = document.getElementById('search-barang');
if (inputBarang) {
    inputBarang.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = window.masterData.filter(r => {
            const matchText = r[0].toLowerCase().includes(val);
            // Cek apakah kategori cocok dengan yang sedang di-filter
            const matchKat = window.currentCategoryFilter === "Semua" || r[5] === window.currentCategoryFilter;
            return matchText && matchKat;
        });
        window.renderTable(filtered);
    };
    inputBarang.onfocus = (e) => {
        // Saat fokus, bersihkan input tapi tetap tampilkan data sesuai kategori aktif
        e.target.value = ''; 
        const baseData = window.currentCategoryFilter === "Semua" 
            ? window.masterData 
            : window.masterData.filter(r => r[5] === window.currentCategoryFilter);
        window.renderTable(baseData); 
    };
}

// --- LOGIC PENCARIAN STOK/GUDANG ---
const inputStok = document.getElementById('search-stok');
if (inputStok) {
    inputStok.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = window.masterData.filter(r => {
            const matchText = r[0].toLowerCase().includes(val);
            const matchKat = window.currentCategoryFilter === "Semua" || r[5] === window.currentCategoryFilter;
            return matchText && matchKat;
        });
        window.renderStokTable(filtered);
    };
    inputStok.onfocus = (e) => {
        e.target.value = '';
        const baseData = window.currentCategoryFilter === "Semua" 
            ? window.masterData 
            : window.masterData.filter(r => r[5] === window.currentCategoryFilter);
        window.renderStokTable(baseData);
    };
}

    // --- LOGIC NAVIGASI KEYBOARD KASIR ---
    window.selectedIndex = -1;

    document.addEventListener('keydown', (e) => {
        const activePage = document.querySelector('.page-active')?.id;
        if (activePage !== 'menu-kasir') return;

        const rows = document.querySelectorAll('#table-body tr');
        if (rows.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            window.selectedIndex = Math.min(window.selectedIndex + 1, rows.length - 1);
            updateRowSelection(rows);
        } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            window.selectedIndex = Math.max(window.selectedIndex - 1, 0);
            updateRowSelection(rows);
        } 
        else if (e.key === 'Enter') {
            if (window.selectedIndex >= 0) {
                const selectedRow = rows[window.selectedIndex];
                const qtyInput = selectedRow.querySelector('input[type="number"]');
                const addBtn = selectedRow.querySelector('button[onclick*="addQtyToCart"]');

                if (document.activeElement !== qtyInput) {
                    e.preventDefault();
                    qtyInput.focus();
                    qtyInput.select();
                } else {
                    e.preventDefault();
                    addBtn.click();
                    window.selectedIndex = -1;
                    document.getElementById('search-barang').focus();
                }
            }
        }
        else if (e.key === 'Escape') {
            window.selectedIndex = -1;
            updateRowSelection(rows);
            document.getElementById('search-barang').focus();
        }
    });

document.addEventListener("DOMContentLoaded", () => {
    window.renderSelectSupplier();
    const input = document.getElementById("input-pelanggan");
    const dropdown = document.getElementById("dropdown-pelanggan");
    const select = document.getElementById("select-pelanggan");

    // 1. Fungsi Sinkronisasi (Jadikan Global agar bisa dipanggil fungsi simpan)
    window.syncPelangganDariSelect = () => {
        window.pelangganList = [];
        const options = document.querySelectorAll("#select-pelanggan option");
        options.forEach(opt => {
            if (opt.value !== "") {
                window.pelangganList.push({ id: opt.value, nama: opt.textContent });
            }
        });
    };

    // 2. Load Keranjang saat Refresh
    if (window.currentUid) {
        const savedCart = localStorage.getItem(`poskita_cart_${window.currentUid}`);
        if (savedCart) {
            window.cart = JSON.parse(savedCart);
            setTimeout(() => window.renderCart(), 500); 
        }
    }

    if (typeof window.renderSelectSupplier === 'function') {
        window.renderSelectSupplier();
    }
});

window.currentReportFilter = 'hari_ini';
    window.currentCustomDate = '';
window.currentCategoryFilter = "Semua";

window.getRekomendasiKulakan = () => {
    // Pastikan masterData ada isinya
    if (!window.masterData || window.masterData.length === 0) return [];

    return window.masterData
        .map(item => {
            const stok = parseInt(item[1]) || 0;
            let prioritas = "aman";
            
            // LOGIKANYA KITA PERKETAT:
            if (stok === 0) prioritas = "habis";
            else if (stok <= 2) prioritas = "urgent";
            else if (stok <= 5) prioritas = "menipis"; // Kita naikin ke 5 buat ngetes

            return { nama: item[0], stok, prioritas };
        })
        .filter(item => item.prioritas !== "aman")
        .sort((a, b) => a.stok - b.stok);
};

window.renderRekomendasiKulakan = () => {
    const el = document.getElementById('rekomendasi-kulakan');
    if (!el) return;

    const rekom = window.getRekomendasiKulakan();

    if (rekom.length === 0) {
        el.classList.add('hidden');
    } else {
        el.classList.remove('hidden');
        // Tambahkan cursor-pointer dan hover agar user tahu ini bisa diklik
        el.className = "mt-3 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-200 shadow-sm cursor-pointer hover:bg-orange-100 transition-all";
        el.innerHTML = `
            <div class="flex justify-between items-center" onclick="window.filterStokKritis()">
                <div class="flex items-center gap-2">
                    <span class="animate-bounce">⚠️</span>
                    <span>Ada <b>${rekom.length}</b> barang kritis. Klik untuk lihat detail.</span>
                </div>
                <span class="text-[8px] bg-orange-200 px-1.5 py-0.5 rounded">LIHAT</span>
            </div>
        `;
    }
};

window.filterStokKritis = () => {
    window.isKritisMode = true; 
    window.isFilterKritis = true; 
    
    // 🔥 Ambil data kritis dulu (0-5)
    const dataKritis = window.masterData.filter(item => (parseInt(item[1]) || 0) <= 5);
    
    // 🔥 Kirim dataKritis ke fungsi render (Jangan kosong!)
    window.renderStokTable(dataKritis);

    const indicator = document.getElementById('kritis-indicator');
    if (indicator) {
        indicator.innerHTML = `
            <div class="mt-3 flex items-center justify-between bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg border border-rose-500">
                <span class="text-[10px] font-black uppercase tracking-wider">⚠️ Mode Kulakan Kritis</span>
                <button onclick="window.resetFilterStok()" 
                        class="bg-white/20 hover:bg-white text-white hover:text-rose-600 text-[9px] font-black px-3 py-1.5 rounded-lg transition-all active:scale-90">
                    KEMBALI
                </button>
            </div>
        `;
    }

    // Pindah ke halaman stok
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('page-active'));
    document.getElementById('menu-stok').classList.add('page-active');
};

window.resetFilterStok = () => {
    // 1. Matikan saklar mode kulakan & filter
    window.isKritisMode = false;
    window.isFilterKritis = false;

    // 2. Bersihkan indikator badge merah/biru di atas
    const indicator = document.getElementById('kritis-indicator');
    if (indicator) {
        indicator.innerHTML = '';
    }

    // 3. 🔥 RENDER ULANG: Kirim data master agar tombol +KULAK hilang
    // Karena isKritisMode sudah false, tombol oranye otomatis gak bakal digambar
    if (typeof window.renderStokTable === 'function') {
        window.renderStokTable(window.masterData);
    }
    
    // 4. (Opsional) Balikin scroll ke atas biar rapi
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.aktifkanModeBelanja = () => {
    window.isKritisMode = true;
    window.isFilterKritis = false;
    
    // 🔥 Kirim SEMUA data ke tabel
    window.renderStokTable(window.masterData);

    const indicator = document.getElementById('kritis-indicator');
    if (indicator) {
        indicator.innerHTML = `
            <div class="mt-3 flex items-center justify-between bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg border border-blue-500">
                <span class="text-[10px] font-black uppercase tracking-wider">🛒 Mode Belanja Aktif</span>
                <button onclick="window.resetFilterStok()" 
                        class="bg-white/20 hover:bg-white text-white hover:text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-lg transition-all active:scale-90">
                    SELESAI
                </button>
            </div>
        `;
    }
};

// --- FUNGSI GLOBAL UNTUK TUTUP PREVIEW (PENTING!) ---
window.tutupPreview = () => {
    const area = document.getElementById('section-struk');
    if (area) {
        area.classList.remove('show-capture');
        area.innerHTML = '';
        // -- area.style.display = 'none';
    }
};

window.printStrukHutangPerNota = (hutangId) => {
    const area = document.getElementById('section-struk');
    
    // Ambil data
    const resH = window.db.exec(`
        SELECT h.transaksi_id, h.total, h.sisa, h.tanggal, p.nama, p.hp 
        FROM hutang h 
        JOIN pelanggan p ON h.pelanggan_id = p.id 
        WHERE h.id = ?`, [hutangId]);

    if (resH.length === 0) return;
    const [tId, hTotal, hSisa, hTglMs, pNama, pHp] = resH[0].values[0];
    const tglPinjam = new Date(parseInt(hTglMs)).toLocaleString('id-ID', {dateStyle:'medium'});

    // Buat HTML
    let htmlStruk = `
        <div style="width: 58mm; padding: 5px; background: white; color: black; font-family: monospace;">
            <div style="text-align:center; font-weight:bold;">${window.namaToko || 'POSKITA STORE'}</div>
            <div style="text-align:center; font-size:10px;">TAGIHAN #${tId.toString().slice(-6)}</div>
            <div style="border-bottom:1px dashed #000; margin:5px 0;"></div>
            <div style="font-size:10px;">Pelanggan: ${pNama.toUpperCase()}</div>
            <div style="font-size:10px;">Tanggal: ${tglPinjam}</div>
            <div style="border-bottom:1px dashed #000; margin:5px 0;"></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>TOTAL:</span>
                <span>${hTotal.toLocaleString('id-ID')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:red;">
                <span>SISA:</span>
                <span>${hSisa.toLocaleString('id-ID')}</span>
            </div>
            <div style="text-align:center; margin-top:10px;">--- TERIMA KASIH ---</div>
        </div>
    `;

    area.innerHTML = htmlStruk;
    
    // 🔥 TRICK HP: Kasih waktu browser untuk memproses konten ke layar 'belakang'
    setTimeout(() => {
        try {
            window.print();
        } catch (e) {
            console.error("Print error:", e);
            alert("Gagal memanggil fungsi print. Pastikan izin browser aktif.");
        }
        
        // Bersihkan setelah selesai
        setTimeout(() => { 
            if (!area.classList.contains('show-capture')) {
                area.innerHTML = ''; 
            }
        }, 1500);
    }, 600); // 600ms sudah cukup ideal untuk HP menengah kebawah
};

// --- FUNGSI JADIKAN GAMBAR HUTANG ---
window.previewHutangImage = (hutangId) => {
    if (!window.db) return;

    // 1. Ambil Data Hutang & Pelanggan
    const resH = window.db.exec(`
        SELECT h.transaksi_id, h.total, h.sisa, h.tanggal, p.nama, p.hp 
        FROM hutang h 
        JOIN pelanggan p ON h.pelanggan_id = p.id 
        WHERE h.id = ?`, [hutangId]);

    if (resH.length === 0) return alert("Data tidak ditemukan!");
    const [tId, hTotal, hSisa, hTglMs, pNama, pHp] = resH[0].values[0];

    // 2. Ambil Rincian Barang
    const resDet = window.db.exec(`SELECT b.nama, td.qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id = ?`, [tId]);
    const resCicil = window.db.exec(`SELECT jumlah, tanggal FROM cicilan WHERE hutang_id = ? ORDER BY CAST(tanggal AS UNSIGNED) ASC`, [hutangId]);

    let itemsHtml = '';
    if (resDet.length > 0) {
        resDet[0].values.forEach(row => {
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
                    <span style="flex:1; text-align:left;">${row[1]}x ${(row[0] || "Barang").toUpperCase()}</span>
                    <span style="width:75px; text-align:right;">${(row[1]*row[2]).toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    let cicilHtml = '';
    if (resCicil.length > 0) {
        resCicil[0].values.forEach(c => {
            const tglC = new Date(parseInt(c[1])).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit'});
            cicilHtml += `
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#444;">
                    <span>- Bayar (${tglC})</span>
                    <span>-${c[0].toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    const tglPinjam = new Date(parseInt(hTglMs)).toLocaleString('id-ID', {dateStyle:'medium'});

    let htmlContent = `
        <div id="wrapper-preview-rekap" class="flex flex-col items-center gap-4 w-full max-w-[320px] mx-auto p-4">
            <div id="struk-hutang-capture" style="width:300px; background:#fff; padding:25px; color:#000; font-family:monospace; border-radius:8px;">
                <div style="text-align:center; font-weight:900; font-size:16px;">${window.namaToko || 'POSKITA STORE'}</div>
                <div style="text-align:center; font-size:10px; margin-bottom:10px;">TAGIHAN HUTANG #${tId.toString().slice(-6)}</div>
                
                <div style="font-size:9px; margin-bottom:2px;">Pelanggan: ${pNama.toUpperCase()}</div>
                <div style="font-size:9px; margin-bottom:10px;">Tgl Pinjam: ${tglPinjam}</div>
                
                <div style="border-bottom:2px dashed #000; margin:10px 0;"></div>
                ${itemsHtml}
                <div style="text-align:right; font-size:10px; font-weight:bold; margin-top:5px;">Total Awal: Rp ${hTotal.toLocaleString('id-ID')}</div>
                
                <div style="border-top:1px dashed #000; margin:10px 0; padding-top:10px;"></div>
                <div style="font-size:9px; font-weight:bold; margin-bottom:5px;">RIWAYAT BAYAR:</div>
                ${cicilHtml || '<div style="font-size:9px; font-style:italic; color:#888;">Belum ada cicilan</div>'}
                
                <div style="border-top:2px dashed #000; margin:10px 0; padding-top:10px;"></div>
                <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:900; color:#e11d48;">
                    <span>SISA HUTANG:</span>
                    <span>Rp ${hSisa.toLocaleString('id-ID')}</span>
                </div>
                <div style="text-align:center; font-size:9px; margin-top:20px; font-style:italic;">-- Mohon Segera Dilunasi --</div>
            </div>

            <div class="flex flex-col gap-2 w-full px-4 no-capture">
                <button id="btn-share-hutang" class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                    <span>📲</span> Kirim Gambar ke WA
                </button>
                <button onclick="window.tutupPreview()" class="w-full py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[9px] uppercase">Tutup</button>
            </div>
        </div>
    `;

    const printArea = document.getElementById('section-struk');
    printArea.innerHTML = htmlContent;
    printArea.classList.add('show-capture');

    document.getElementById('btn-share-hutang').onclick = async () => {
        const btn = document.getElementById('btn-share-hutang');
        btn.innerText = "MENYIAPKAN...";
        try {
            const area = document.getElementById('struk-hutang-capture');
            const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `Tagihan-${pNama}.png`, { type: "image/png" });
                if (navigator.share) {
                    await navigator.share({ files: [file], title: 'Tagihan Hutang', text: `Halo ${pNama}, ini rincian tagihan hutang Anda.` });
                } else {
                    const link = document.createElement('a');
                    link.download = `Tagihan-${pNama}.png`; 
                    link.href = canvas.toDataURL(); 
                    link.click();
                }
                btn.innerText = "Kirim Gambar ke WA";
            });
        } catch (err) {
            btn.innerText = "Kirim Gambar ke WA";
            alert("Gagal memproses gambar.");
        }
    };
};

window.simpanPelangganBaru = async () => {
    if (!window.db) return alert("Database belum siap!");

    const nama = document.getElementById('input-nama-pelanggan').value;
    const hp = document.getElementById('input-hp-pelanggan').value;

    if (!nama) return alert("Nama pelanggan wajib diisi!");

    const id = "P-" + Date.now();

    try {
        // 1. Simpan ke SQLite Lokal
        window.db.run("INSERT INTO pelanggan (id, nama, hp, total_hutang, sisa_hutang) VALUES (?,?,?,?,?)", 
                      [id, nama, hp, 0, 0]);

        // 🔥 2. RESET LIST PELANGGAN (KUNCI UTAMA)
        // Dengan mengosongkan ini, dropdown dipaksa sinkron ulang saat di-klik nanti
        window.pelangganList = []; 

        // 3. Update UI Select agar option-nya bertambah
        window.renderPelangganSelect();
        
        // 4. Otomatis pilih pelanggan yang baru dibuat di layar Kasir
        const inputPlg = document.getElementById('input-pelanggan');
        const selectPlg = document.getElementById('select-pelanggan');
        if(inputPlg) inputPlg.value = nama;
        if(selectPlg) selectPlg.value = id;

        // 5. Bersihkan form & Tutup Modal
        document.getElementById('input-nama-pelanggan').value = "";
        document.getElementById('input-hp-pelanggan').value = "";
        document.getElementById('modal-tambah-pelanggan').classList.add('hidden');

        // 6. Sinkronisasi Cloud (biarkan jalan di background)
        if (navigator.onLine) window.processOfflineQueue();

        alert(`✅ Pelanggan "${nama}" berhasil disimpan!`);

    } catch (err) {
        console.error("Gagal simpan pelanggan:", err);
    }
};

window.initSmartDropdown = (config) => {
    const selectAsli = document.getElementById(config.selectId);
    if (!selectAsli) return;

    // Sembunyikan select asli agar tidak double
    selectAsli.classList.add('hidden');

    const containerId = `smart-container-${config.selectId}`;
    let container = document.getElementById(containerId);
    
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = "relative w-full mb-3";
        selectAsli.parentNode.insertBefore(container, selectAsli);
    }

    const options = Array.from(selectAsli.options).filter(opt => opt.value !== "");

    container.innerHTML = `
        <div class="relative">
            <input type="text" id="input-${config.selectId}" 
                placeholder="${config.placeholder}"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                autocomplete="off" value="${selectAsli.options[selectAsli.selectedIndex]?.value ? selectAsli.options[selectAsli.selectedIndex].text : ''}">
            <div id="list-${config.selectId}" 
                class="hidden absolute z-[999] w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1">
            </div>
        </div>
    `;

    const input = container.querySelector('input');
    const list = container.querySelector(`#list-${config.selectId}`);

    const renderList = (filter = "") => {
        const filtered = options.filter(opt => opt.text.toLowerCase().includes(filter.toLowerCase()));
        
        // 1. Buat Header Tambah Baru (Tanpa onclick dulu)
        let html = `
            <div id="btn-add-trigger-${config.selectId}" 
                class="p-3 text-orange-600 font-black text-[10px] uppercase cursor-pointer hover:bg-orange-50 rounded-xl flex items-center gap-2 border-b border-slate-50 mb-1">
                <span class="text-base">➕</span> TAMBAH BARU
            </div>
        `;

        // 2. Buat List Item
        filtered.forEach(opt => {
            html += `
                <div class="flex justify-between items-center p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-all item-select" 
                     data-val="${opt.value}" data-txt="${opt.text}">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-slate-700 uppercase">${opt.text}</span>
                    </div>
                    <button class="btn-del-trigger w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-full active:scale-90 transition-all" 
                            data-id="${opt.value}" data-nama="${opt.text}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>`;
        });

        if (filtered.length === 0) {
            html += `<div class="p-4 text-center text-slate-400 text-[10px] font-bold">Data tidak ditemukan</div>`;
        }

        list.innerHTML = html;

        // 🔥 PASANG EVENT CLICK SECARA MANUAL (ANTI-TABRAKAN TANDA KUTIP)
        const btnAdd = list.querySelector(`#btn-add-trigger-${config.selectId}`);
    if (btnAdd) {
        btnAdd.onclick = (e) => {
            e.preventDefault(); // Stop aksi default
            e.stopPropagation(); // Stop agar list tidak menutup duluan
            
            // Paksa tutup list dropdown biar modal kelihatan bersih
            list.classList.add('hidden'); 
            
            console.log("Klik nambah: ", config.table); // Cek di console
            window.triggerAdd(config.selectId, config.table, config.placeholder);
        };
    }

        // Pasang event untuk pilih item
        list.querySelectorAll('.item-select').forEach(el => {
            el.onclick = () => window.selectItem(config.selectId, el.dataset.val, el.dataset.txt);
        });

        // Pasang event untuk hapus item
        list.querySelectorAll('.btn-del-trigger').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                window.triggerDelete(config.selectId, config.table, el.dataset.id, el.dataset.nama);
            };
        });
    };

    input.onfocus = () => { renderList(input.value); input.value = ""; renderList(""); list.classList.remove('hidden'); };
    input.oninput = (e) => renderList(e.target.value);

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) list.classList.add('hidden');
    });
};

// --- FUNGSI GLOBAL (DI LUAR INIT) ---

window.selectItem = (sId, val, txt) => {
    const sel = document.getElementById(sId);
    if(sel) {
        sel.value = val;
        const inp = document.getElementById(`input-${sId}`);
        if(inp) inp.value = txt;
        const lst = document.getElementById(`list-${sId}`);
        if(lst) lst.classList.add('hidden');
        sel.dispatchEvent(new Event('change'));
    }
};

window.triggerAdd = (sId, tableName, placeholder) => {
    const modal = document.getElementById('modal-fast-add');
    const inputNama = document.getElementById('fast-add-input-nama');
    const inputHp = document.getElementById('fast-add-input-hp');
    const hpContainer = document.getElementById('fast-add-hp-container');
    const btn = document.getElementById('fast-add-btn');
    const title = document.getElementById('fast-add-title');
    
    if(!modal) return;

    // 1. Atur Judul
    const cleanTitle = placeholder.replace('🔍 Cari ', '').replace('...', '').toUpperCase();
    title.innerText = `TAMBAH ${cleanTitle}`;
    
    // 2. Sembunyikan HP jika nambah Kategori
    if (tableName === 'kategori') {
        hpContainer.classList.add('hidden');
    } else {
        hpContainer.classList.remove('hidden');
    }
    
    inputNama.value = "";
    inputHp.value = "";
    modal.classList.remove('hidden');
    setTimeout(() => inputNama.focus(), 250);

    btn.onclick = async () => {
    const nama = inputNama.value.trim();
    const noHp = inputHp.value.trim();

    if (!nama) return alert("Nama wajib diisi!");

    btn.innerText = "MENYIMPAN...";
    btn.disabled = true;

    const idNew = (tableName === 'pelanggan' ? 'P-' : 'ID-') + Date.now();
    
    // 1. Siapkan data dasar
    let dataSimpan = { id: idNew, nama: nama };
    
    // 2. Sesuaikan nama kolom HP (Pastikan SQLite & Supabase sudah pakai nama 'hp')
    if (tableName === 'pelanggan' || tableName === 'supplier') {
        dataSimpan.hp = noHp || '-'; 
    }

    // 3. Panggil fungsi save global
    window.universalCloudSync.save(tableName, dataSimpan, () => {
        modal.classList.add('hidden');
        btn.innerText = "Simpan Sekarang";
        btn.disabled = false;
        
        // Refresh UI agar data terbaru muncul di dropdown
        if (tableName === 'supplier') window.renderSelectSupplier?.();
        if (tableName === 'pelanggan') window.renderPelangganSelect?.();
        if (tableName === 'kategori') window.renderKategoriSelect?.();

        // Otomatis pilih item yang baru dibuat di dropdown
        window.selectItem(sId, idNew, nama);
        
        console.log(`✅ Berhasil menambah ${tableName}: ${nama}`);
    });
    };
};

window.triggerDelete = (sId, tableName, id, nama, hasCallback) => {
    if (confirm(`Hapus "${nama}" secara permanen?`)) {
        window.universalCloudSync.delete(tableName, id, () => {
            if (tableName === 'supplier') window.renderSelectSupplier?.();
            if (tableName === 'pelanggan') window.renderPelangganSelect?.();
            if (tableName === 'kategori') window.renderKategoriSelect?.();
        });
    }
};

window.closeFastAdd = () => {
    document.getElementById('modal-fast-add').classList.add('hidden');
};

window.universalCloudSync = {
    // FUNGSI SIMPAN GLOBAL
    save: async (tableName, dataLokal, callback) => {
        const uid = window.currentUid;
        
        try {
            // 1. Simpan ke SQLite Lokal (Wajib ada id dan nama)
            const placeholders = Object.keys(dataLokal).map(() => "?").join(",");
            const columns = Object.keys(dataLokal).join(",");
            const values = Object.values(dataLokal);
            
            window.db.run(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`, values);
            console.log(`✅ ${tableName} tersimpan di Lokal`);

            // 2. Kirim ke Cloud (Supabase) jika online
            if (navigator.onLine && window.supabase) {
                const { error } = await window.supabase
                    .from(tableName)
                    .insert([{ ...dataLokal, user_id: uid }]);
                
                if (error) throw error;
                console.log(`☁️ ${tableName} tersinkron ke Cloud`);
            }
            
            if (callback) callback();
        } catch (e) {
            console.error("Sync Error:", e);
        }
    },

    // FUNGSI HAPUS GLOBAL
    delete: async (tableName, id, callback) => {
        try {
            // 1. Hapus Lokal
            window.db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);

            // 2. Hapus Cloud
            if (navigator.onLine && window.supabase) {
                const { error } = await window.supabase
                    .from(tableName)
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
            }
            
            if (callback) callback();
        } catch (e) {
            console.error("Delete Sync Error:", e);
        }
    }
};

// Tambahkan ini di baris paling akhir file ui.js Mas
window.initSmartDropdown = window.initSmartDropdown;
window.triggerAdd = window.triggerAdd;
window.triggerDelete = window.triggerDelete;
window.closeFastAdd = window.closeFastAdd;
window.selectItem = window.selectItem;
