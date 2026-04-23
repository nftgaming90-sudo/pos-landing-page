window.isKritisMode = false; // Defaultnya mode normal
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
    // 1. Cek status kasir
    // 🔥 AUTO HIDE FLOATING SAAT PINDAH PAGE
const floatingCart = document.getElementById('floating-cart-btn');
const floatingKulakan = document.getElementById('floating-kulakan-btn');

// 🔥 trigger ulang floating sesuai halaman
setTimeout(() => {
    window.renderCart?.();
    window.renderCartKulakan?.();
}, 50);

    // 2. BERSIHKAN SEMUA HALAMAN (Paling Penting)
    // 2. Paksa manipulasi style inline (Jalan pintas paling ampuh)
document.querySelectorAll('.page-content').forEach(p => {
    p.style.setProperty('display', 'none', 'important');
    p.classList.remove('page-active');
});

// 3. Tampilkan yang dipilih
const target = document.getElementById('menu-' + pageId);
if (target) {
    target.style.setProperty('display', 'flex', 'important');
    target.classList.add('page-active');
}
    
    // 4. Update warna tombol navigasi
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

    // 6. TRIGER DATA
    if (pageId === 'stok') {
    if (window.isKritisMode) {
        window.filterStokKritis(); // Kalau lagi mode kritis, panggil filternya
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
        if (!window.isPro && window.masterData.length >= FREE_ITEM_LIMIT) {
            return window.showUpgradeModal(`Batas penyimpanan maksimal ${FREE_ITEM_LIMIT} item untuk pengguna FREE telah tercapai.`);
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

    // --- FUNGSI RENDER (Pastikan ini yang terbaru) ---
window.renderSelectSupplier = () => {
    const selectSup = document.getElementById('select-supplier');
    if (!selectSup) return;

    // Ambil data terbaru dari SQLite lokal
    const res = window.db.exec("SELECT id, nama FROM supplier ORDER BY nama ASC");
    
    let html = '<option value="">-- Pilih Supplier --</option>';
    
    if (res.length > 0 && res[0].values) {
        const rows = res[0].values;
        rows.forEach(row => {
            // row[0] = id, row[1] = nama
            html += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }
    
    selectSup.innerHTML = html;
    console.log("🔄 Dropdown Supplier di-refresh dari SQLite");
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

// Fungsi pembantu biar rapi
window.hitungTotalKulakan = () => {
    const total = window.cartKulakan.reduce((sum, item) => sum + (item.qty * item.hargaBeli), 0);
    const el = document.getElementById('total-nominal-kulakan');
    if (el) el.innerText = "Rp " + window.formatAngka(total.toString());
};

window.renderPelangganSelect = () => {
        if(!window.db) return;
        const res = window.db.exec("SELECT id, nama FROM pelanggan ORDER BY nama ASC");
        const select = document.getElementById('select-pelanggan');
        if(!select) return;

        let options = '<option value="">-- Pelanggan Umum --</option>';
        if(res.length > 0) {
            res[0].values.forEach(row => {
                options += `<option value="${row[0]}">${row[1]}</option>`;
            });
        }
        select.innerHTML = options;
    };

window.renderHutang = (sortBy = 'baru') => {
        if (!window.db) return;
        
        let query = `
            SELECT p.id, p.nama, p.hp, p.sisa_hutang, MIN(CAST(h.tanggal AS UNSIGNED)) as tgl_lama 
            FROM pelanggan p 
            LEFT JOIN hutang h ON p.id = h.pelanggan_id AND h.sisa > 0
            WHERE p.sisa_hutang > 0 
            GROUP BY p.id
        `;

        if (sortBy === 'terbanyak') query += ` ORDER BY p.sisa_hutang DESC`;
        else if (sortBy === 'terlama') query += ` ORDER BY tgl_lama ASC`;
        else query += ` ORDER BY tgl_lama DESC`;

        try {
            const res = window.db.exec(query);
            const container = document.getElementById('list-hutang');
            let totalSemua = 0;

            if (res.length > 0) {
                container.innerHTML = res[0].values.map(row => {
                    const [id, nama, hp, sisa, tgl_lama] = row;
                    totalSemua += sisa;
                    const d = tgl_lama ? new Date(tgl_lama).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-';
                    
                    return `
<div class="w-full bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden mb-1">
    <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 z-10"></div>
    
    <div class="p-4 pl-6 cursor-pointer hover:bg-slate-50 flex justify-between items-center" onclick="window.toggleDetailHutang('${id}')">
        <div class="flex-1 min-w-0 pr-2">
            <h3 class="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                <span class="truncate">${nama}</span> 
                <span id="icon-pelanggan-${id}" class="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded transition-transform shrink-0">▼</span>
            </h3>
            <p class="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">📞 ${hp || '-'}</p>
        </div>
        <div class="text-right shrink-0">
            <p class="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Sisa Hutang</p>
            <p class="font-black text-rose-600 text-base">Rp ${sisa.toLocaleString('id-ID')}</p>
        </div>
    </div>

    <div id="detail-hutang-${id}" class="hidden bg-slate-50/50 border-t border-slate-100">
        <div id="isi-hutang-${id}" class="p-4 pt-2">
            </div>
    </div>

    <div class="flex justify-between items-center px-4 py-3 bg-slate-50/30 border-t border-slate-100 border-dashed">
        <span class="text-[9px] text-slate-400 font-bold">Hutang Sejak: ${d}</span>
        <button onclick="window.bukaModalCicilan('${id}', 'ALL', ${sisa}, '${nama.replace(/'/g, "\\'")}')" class="bg-rose-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95">Bayar Semua</button>
    </div>
</div>`;
                }).join('');
            } else {
                container.innerHTML = `<div class="col-span-full py-16 flex flex-col items-center justify-center opacity-40"><div class="text-6xl mb-4 grayscale">🎉</div><p class="text-xs font-black uppercase tracking-widest text-slate-500">Bebas Hutang! Tidak ada tagihan.</p></div>`;
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
    <div class="bg-slate-50 rounded-2xl border border-slate-200 mb-3 overflow-hidden">
        <div class="p-3 bg-white flex justify-between items-center cursor-pointer active:bg-slate-50" onclick="document.getElementById('items-${hId}').classList.toggle('hidden')">
            <div>
                <p class="text-[10px] font-black text-slate-700 tracking-wider">NOTA #${tId.toString().slice(-6)}</p>
                <p class="text-[8px] text-slate-400 mt-0.5 font-bold">${hTgl}</p>
            </div>
            <div class="text-right">
                <p class="text-[8px] font-bold text-slate-400 uppercase">Sisa Tagihan</p>
                <p class="text-xs font-black text-rose-600">Rp ${hSisa.toLocaleString('id-ID')}</p>
            </div>
        </div>
        
        <div id="items-${hId}" class="hidden p-3 border-t border-slate-100 bg-slate-50/50">
            <p class="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-widest">Rincian Belanja:</p>
            ${htmlItem}
        </div>

        
<div class="p-3 pt-0 flex flex-col gap-2">
    <div class="flex gap-2">
        <button onclick="window.printStrukHutangPerNota('${hId}')" 
            class="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-sm">
            🖨️ Print
        </button>
        <button onclick="window.previewHutangImage('${hId}')" 
            class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-sm">
            📸 Gambar
        </button>
    </div>
    <button onclick="window.bukaModalCicilan('${pId}', '${hId}', ${hSisa}, 'Nota #${tId.toString().slice(-6)}')" 
        class="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all">
        💰 Bayar / Cicil Nota Ini
    </button>
</div>
    </div>`;
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
                <td class="p-3 md:p-4 pl-4 md:pl-5 min-w-[120px]">
                    <p class="font-bold text-slate-700 text-xs md:text-sm capitalize whitespace-normal break-words line-clamp-2 leading-tight">
                        ${row[0]}
                    </p>
                    <p class="text-[10px] md:text-xs text-blue-600 font-bold mt-1">Rp ${row[2].toLocaleString('id-ID')}</p>
                </td>
                <td class="p-3 md:p-4 text-center whitespace-nowrap">
                    <span class="px-2.5 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black shadow-sm border ${row[1] < 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}">
                        ${row[1]}
                    </span>
                </td>
                <td class="p-3 md:p-4 pr-3 md:pr-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5 md:gap-2">
                        <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <button onclick="window.minQty('qty-${row[4]}')" class="w-7 h-7 md:w-8 md:h-8 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 font-black">-</button>
                            <input id="qty-${row[4]}" type="number" value="1" min="1" max="${row[1]}" class="w-8 md:w-10 h-7 md:h-8 text-center text-[10px] md:text-xs font-black outline-none text-slate-700 bg-white">
                            <button onclick="window.plusQty('qty-${row[4]}', ${row[1]})" class="w-7 h-7 md:w-8 md:h-8 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 font-black">+</button>
                        </div>
                        <button onclick="window.addQtyToCart('${row[4]}', '${row[0].replace(/'/g, "\\'")}', ${row[2]}, ${row[1]}, ${row[3]}, 'qty-${row[4]}')" class="w-8 h-8 md:w-9 md:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shadow-sm transition-transform active:scale-90 border border-blue-700">
                            <span class="text-xs md:text-sm">🛒</span>
                        </button>
                    </div>
                </td>
            </tr>`).join('');
    };

window.renderStokTable = (dataArray) => {
    const tbody = document.getElementById('stok-table-body');

    tbody.innerHTML = dataArray.map(row => {

        const stok = parseInt(row[1]) || 0;

        // 🔥 LOGIC INDIKATOR
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

            <!-- 🔥 INDIKATOR STOK -->
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded-full text-[9px] font-black ${badgeClass}">
                    ${label}
                </span>
            </td>

            <td class="p-3 pr-4 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="window.tambahKeKulakan('${row[4]}')" class="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-90 transition-all">
                        + KULAK
                    </button>
                    <button onclick="window.openEditModal('${row[4]}','${row[0]}',${row[1]},${row[2]},${row[3]},'${row[5]}')" class="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                        ✏️
                    </button>
                </div>
            </td>
        </tr>
        `;

    }).join('');
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
        // Ambil kategori UNIK yang benar-benar ada di tabel barang
        const resBarang = window.db.exec("SELECT DISTINCT kategori FROM barang WHERE kategori IS NOT NULL AND kategori != ''");
        
        // Mulai dengan kategori default
        let kategoriList = ["Semua"];
        
        if (resBarang.length > 0) {
            resBarang[0].values.forEach(row => {
                if (row[0] !== "Semua") {
                    kategoriList.push(row[0]);
                }
            });
        }

        // Render ke dua tempat (Kasir & Stok)
        const containers = ['filter-kategori-kasir', 'filter-kategori-stok'];
        containers.forEach(containerId => {
            const el = document.getElementById(containerId);
            if (!el) return;

            el.innerHTML = kategoriList.map(kat => {
                const isActive = window.currentCategoryFilter === kat;
                return `
                    <button onclick="window.applyCategoryFilter('${kat.replace(/'/g, "\\'")}')" 
                        class="shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border
                        ${isActive 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 shadow-sm'}">
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
            if (count > 0 && document.querySelector('.page-active')?.id === 'menu-kasir') {
                floatingBar.classList.remove('hidden');
            } else {
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

    const input = document.getElementById("input-pelanggan");
    const dropdown = document.getElementById("dropdown-pelanggan");
    const select = document.getElementById("select-pelanggan");

    let pelangganList = [];

    // 🔥 ambil data dari select lama (AMAN)
    function syncPelangganDariSelect() {
    pelangganList = [];

    const options = document.querySelectorAll("#select-pelanggan option");

    options.forEach(opt => {
        if (opt.value !== "") { // skip "Pelanggan Umum"
            pelangganList.push({
                id: opt.value,
                nama: opt.textContent
            });
        }
    });

    
}

    // tampil dropdown saat klik
    // 🔥 jalan sekali aja
input.addEventListener("focus", () => {

input.value = ""; // <--- TAMBAHKAN INI: Begitu diklik langsung kosong
        select.value = ""; // Reset juga ID-nya biar aman

    // 🔥 kalau belum ada data, baru ambil
    if (pelangganList.length === 0) {
        syncPelangganDariSelect();
    }

    renderDropdown(pelangganList);
    dropdown.classList.remove("hidden");
});

    // filter saat ngetik
    let timeout;

input.addEventListener("input", () => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
        const keyword = input.value.toLowerCase();
        const filtered = pelangganList.filter(p =>
            p.nama.toLowerCase().includes(keyword)
        );
        renderDropdown(filtered);
    }, 100); // delay dikit biar ringan
});

    function renderDropdown(list) {
    dropdown.innerHTML = "";

    if (list.length === 0) {
        dropdown.innerHTML = `<div class="p-2 text-slate-400">Tidak ditemukan</div>`;
        return;
    }

    // 🔥 batasi cuma 20 biar ringan
    list.slice(0, 20).forEach(p => {
            const item = document.createElement("div");
            item.className = "p-2 hover:bg-blue-50 cursor-pointer";
            item.innerText = p.nama;

            item.onclick = () => {
                input.value = p.nama;
                select.value = p.id; // 🔥 ini jaga flow lama
                dropdown.classList.add("hidden");
            };

            dropdown.appendChild(item);
        });
    }

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add("hidden");
        }
    });

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
    // 1. Ambil data yang stoknya cuma 0 sampai 5
    const dataKritis = window.masterData.filter(item => (parseInt(item[1]) || 0) <= 5);
    
    // 2. Render ke tabel stok
    window.renderStokTable(dataKritis);

    // 3. Ubah teks counter biar user gak bingung
    const stokCounter = document.getElementById('stok-counter');
    if (stokCounter) {
        stokCounter.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-rose-600">Menampilkan ${dataKritis.length} Barang Kritis</span>
                <button onclick="window.refreshDataUI()" class="text-[8px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase font-black">Reset</button>
            </div>
        `;
    }
};

window.filterStokKritis = () => {
    window.isKritisMode = true; // Aktifkan mode filter
    
    const dataKritis = window.masterData.filter(item => (parseInt(item[1]) || 0) <= 5);
    window.renderStokTable(dataKritis);

    const stokCounter = document.getElementById('stok-counter');
    if (stokCounter) {
        stokCounter.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-rose-600 font-bold">Mode Kulakan (${dataKritis.length} Item)</span>
                <button onclick="window.resetFilterStok()" class="text-[9px] bg-slate-800 px-2 py-1 rounded text-white font-black shadow-sm">KEMBALI</button>
            </div>
        `;
    }
};

// Fungsi khusus buat balikin ke normal
window.resetFilterStok = () => {
    window.isKritisMode = false; // Matikan mode filter
    window.refreshDataUI();      // Refresh tampilan ke semula
};