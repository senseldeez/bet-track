/**
 * app.js
 * Main UI coordinator for the sports betting tracker application.
 * Manages views, modals, multi-profile management, autocompletes,
 * settlements, and Chart.js integrations.
 */

// Global Chart References
let profitChartInstance = null;
let outcomesChartInstance = null;
let analyticsDetailChartInstance = null;

// Active Navigation Tab
let activeTab = 'dashboard';

const statusLabels = {
    pending: 'Pending',
    won: 'Won',
    won_freebet: 'Won (Freebet)',
    lost: 'Lost',
    cashout: 'Cashed Out',
    void: 'Void'
};

function formatDate(dateVal) {
    if (!dateVal) return '-';
    let dateStr = typeof dateVal === 'string' ? dateVal : new Date(dateVal).toISOString();
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString();
    }
    return cleanDate;
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage & profiles
    window.BetStorage.init();
    
    // Set up Lucide Icons
    lucide.createIcons();

    // Event Listeners for Tab Switching
    document.querySelectorAll('.sidebar .nav-menu .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Mobile Sidebar Toggle event listeners
    const sidebarToggle = document.getElementById('btn-sidebar-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebarOverlay && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Quick Action Buttons
    document.getElementById('btn-quick-transaction').addEventListener('click', () => openModal('transaction'));
    document.getElementById('btn-quick-bet').addEventListener('click', () => openModal('bet'));
    document.getElementById('btn-add-bet-main').addEventListener('click', () => openModal('bet'));
    document.getElementById('btn-add-tx-main').addEventListener('click', () => openModal('transaction'));



    // Dynamic Filter Inputs
    document.getElementById('filter-bet-status').addEventListener('change', renderBetsTable);
    document.getElementById('filter-bet-sport').addEventListener('change', renderBetsTable);

    // Initialize inputs to current local dates
    initDateTimeInputs();

    // Autocomplete suggestion event listeners
    setupAutocompleteSuggestions();

    // Set the initial checkbox states
    const excludeVal = window.BetStorage.isExcludeUnconverted();
    const dbCheckbox = document.getElementById('db-exclude-unconverted');
    const analyticsCheckbox = document.getElementById('analytics-exclude-unconverted');
    if (dbCheckbox) dbCheckbox.checked = excludeVal;
    if (analyticsCheckbox) analyticsCheckbox.checked = excludeVal;

    // Perform initial render
    renderAll();
});

// Switch Active View
function switchTab(tabId) {
    activeTab = tabId;
    
    // Toggle active classes on sidebar items
    document.querySelectorAll('.sidebar .nav-menu .nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle active classes on content containers
    document.querySelectorAll('.content-container').forEach(container => {
        if (container.id === `tab-${tabId}`) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    });

    // Update Header Text dynamically
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    
    if (tabId === 'dashboard') {
        title.innerText = 'Dashboard';
        subtitle.innerText = 'Track, analyze, and optimize your betting strategy';
        renderDashboard(); 
    } else if (tabId === 'bets') {
        title.innerText = 'Bets Manager';
        subtitle.innerText = 'View and update your complete sports betting ledger';
        renderBets();
    } else if (tabId === 'transactions') {
        title.innerText = 'Transactions Manager';
        subtitle.innerText = 'Manage deposits, withdrawals, bonus balances, and CSV exports';
        renderTransactions();
    } else if (tabId === 'analytics') {
        title.innerText = 'Strategy Analytics';
        subtitle.innerText = 'Uncover ROI, success rates, and performance patterns';
        renderAnalytics();
    }

    // Close responsive sidebar on mobile when switching tabs
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebarOverlay) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    lucide.createIcons();
}

// Preset DateTime formatting for HTML inputs
function initDateTimeInputs() {
    const now = new Date();
    const localISOTime = now.toISOString().slice(0, 10);
    
    document.getElementById('tx-date').value = localISOTime;
    document.getElementById('bet-date').value = localISOTime;
}


// Global Modal handlers
function openModal(modalId) {
    initDateTimeInputs();
    
    // Custom hooks for open event
    if (modalId === 'profiles') {
        renderProfilesManagerList();
    }
    
    // Restore default texts/labels if opening log forms
    if (modalId === 'bet') {
        document.getElementById('bet-edit-id').value = '';
        document.getElementById('bet-modal-title').innerText = 'Log Sports Bet';
        document.getElementById('btn-bet-submit').innerText = 'Submit Bet';
        document.getElementById('bet-status').value = 'pending';
        document.getElementById('bet-payout-group').style.display = 'none';
        document.getElementById('bet-payout').value = '';
        document.getElementById('bet-stake').value = '1.00';
    } else if (modalId === 'transaction') {
        document.getElementById('tx-edit-id').value = '';
        document.getElementById('transaction-modal-title').innerText = 'Log Wallet Transaction';
        document.getElementById('btn-tx-submit').innerText = 'Submit Transaction';
        document.getElementById('tx-correction-group').style.display = 'none';
        document.getElementById('tx-correction-wallet').value = 'real';
        document.getElementById('tx-correction-direction').value = 'add';
    }
    
    document.getElementById(`modal-${modalId}`).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(`modal-${modalId}`).classList.remove('active');
    
    // Reset forms when closing
    if (modalId === 'bet') {
        document.getElementById('form-bet').reset();
        document.getElementById('bet-edit-id').value = '';
    } else if (modalId === 'transaction') {
        document.getElementById('form-transaction').reset();
        document.getElementById('tx-edit-id').value = '';
    } else if (modalId === 'settle') {
        document.getElementById('form-settle').reset();
    } else if (modalId === 'profiles') {
        document.getElementById('form-create-profile').reset();
    }
}

function toggleTxCorrectionFields() {
    const type = document.getElementById('tx-type').value;
    const group = document.getElementById('tx-correction-group');
    if (type === 'correction') {
        group.style.display = 'block';
    } else {
        group.style.display = 'none';
    }
}

// Core Toast Alerts Coordinator
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'info') iconName = 'info';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.5s ease';
    }, 3500);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Form Submissions: Transactions
function handleTransactionSubmit(event) {
    event.preventDefault();
    
    const type = document.getElementById('tx-type').value;
    const amount = Number(document.getElementById('tx-amount').value);
    const date = document.getElementById('tx-date').value;
    const notes = document.getElementById('tx-notes').value;

    const correctionWallet = type === 'correction' ? document.getElementById('tx-correction-wallet').value : '';
    const correctionDirection = type === 'correction' ? document.getElementById('tx-correction-direction').value : '';

    const balances = window.BetStorage.getBalances();
    const editId = document.getElementById('tx-edit-id').value;

    let calculatedNotes = notes;
    if (!notes) {
        if (type === 'bonus_to_real') {
            calculatedNotes = 'Transfer Bonus to Cash';
        } else if (type === 'bonus_expired') {
            calculatedNotes = 'Bonus Expired / Removed';
        } else if (type === 'correction') {
            calculatedNotes = `Balance Correction (${correctionDirection === 'add' ? '+' : '-'} ${correctionWallet.toUpperCase()})`;
        } else {
            calculatedNotes = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
        }
    }

    if (editId) {
        window.BetStorage.updateTransaction({
            id: editId,
            date,
            type,
            amount,
            notes: calculatedNotes,
            correctionWallet,
            correctionDirection
        });
        closeModal('transaction');
        showToast('Transaction updated successfully.');
        renderAll();
        return;
    }

    // Wallet safety check for withdrawals & transfers (only for new items)
    if (type === 'withdrawal' && amount > balances.real) {
        showToast(`Insufficient cash funds! Current available cash is €${balances.real.toFixed(2)}`, 'error');
        return;
    }
    
    if (type === 'bonus_to_real' && amount > balances.bonus) {
        showToast(`Insufficient bonus funds! Available bonus is €${balances.bonus.toFixed(2)}`, 'error');
        return;
    }

    if (type === 'bonus_expired' && amount > balances.bonus) {
        showToast(`Insufficient bonus funds to expire! Available bonus is €${balances.bonus.toFixed(2)}`, 'error');
        return;
    }

    if (type === 'correction' && correctionDirection === 'sub') {
        if (correctionWallet === 'real' && amount > balances.real) {
            showToast(`Insufficient cash funds for correction! Available cash is €${balances.real.toFixed(2)}`, 'error');
            return;
        }
        if (correctionWallet === 'bonus' && amount > balances.bonus) {
            showToast(`Insufficient bonus funds for correction! Available bonus is €${balances.bonus.toFixed(2)}`, 'error');
            return;
        }
        if (correctionWallet === 'free' && amount > balances.freeBet) {
            showToast(`Insufficient free bet funds for correction! Available free bet balance is €${balances.freeBet.toFixed(2)}`, 'error');
            return;
        }
    }

    window.BetStorage.addTransaction({
        date,
        type,
        amount,
        notes: calculatedNotes,
        correctionWallet,
        correctionDirection
    });

    closeModal('transaction');
    
    if (type === 'bonus_to_real') {
        showToast(`Successfully transferred €${amount.toFixed(2)} from bonus to cash balance.`);
    } else {
        showToast(`Successfully logged ${type.replace(/_/g, ' ')} of €${amount.toFixed(2)}`);
    }
    renderAll();
}


function handleBetSubmit(event) {
    event.preventDefault();

    const sport = document.getElementById('bet-sport-input').value.trim();
    const backedTeam = document.getElementById('bet-backed-team-input').value.trim();
    const opposingTeam = document.getElementById('bet-opposing-team-input').value.trim();
    const notes = document.getElementById('bet-notes').value.trim();
    const odds = Number(document.getElementById('bet-odds').value);
    const stakeType = document.getElementById('bet-stake-type').value;
    const stake = Number(document.getElementById('bet-stake').value);
    const date = document.getElementById('bet-date').value;
    const status = document.getElementById('bet-status').value;

    const balances = window.BetStorage.getBalances();
    const editId = document.getElementById('bet-edit-id').value;

    let payout = 0;
    let settledDate = null;

    if (editId) {
        const rawBets = window.BetStorage.getRawBets();
        const existingBet = rawBets.find(b => b.id === editId);
        if (existingBet) {
            settledDate = existingBet.settledDate;
            if (status !== 'pending' && !settledDate) {
                settledDate = date;
            } else if (status === 'pending') {
                settledDate = null;
            }

            if (status === 'won' || status === 'won_freebet') {
                if (stakeType === 'free_bet' || status === 'won_freebet') {
                    payout = (stake * odds) - stake;
                } else {
                    payout = stake * odds;
                }
            } else if (status === 'lost') {
                payout = 0;
            } else if (status === 'void') {
                payout = stakeType === 'free_bet' ? 0 : stake;
            } else if (status === 'cashout') {
                payout = Number(document.getElementById('bet-payout').value) || 0;
            }

            window.BetStorage.updateBet({
                id: editId,
                date,
                sport,
                backedTeam,
                opposingTeam,
                notes,
                odds,
                stake,
                stakeType,
                status,
                payout,
                settledDate
            });
            closeModal('bet');
            showToast('Bet updated successfully.');
            renderAll();
            return;
        }
    }

    // Wager bankroll checks (only for new bets)
    if (stakeType === 'real' && stake > balances.real) {
        showToast(`Insufficient cash funds! Available cash is €${balances.real.toFixed(2)}`, 'error');
        return;
    }
    if (stakeType === 'bonus' && stake > balances.bonus) {
        showToast(`Insufficient bonus funds! Available bonus is €${balances.bonus.toFixed(2)}`, 'error');
        return;
    }
    if (stakeType === 'free_bet' && stake > balances.freeBet) {
        showToast(`No Free Bets available! Available Free Bet balance is €${balances.freeBet.toFixed(2)}`, 'error');
        return;
    }

    if (status !== 'pending') {
        settledDate = date;
        if (status === 'won' || status === 'won_freebet') {
            if (stakeType === 'free_bet' || status === 'won_freebet') {
                payout = (stake * odds) - stake;
            } else {
                payout = stake * odds;
            }
        } else if (status === 'lost') {
            payout = 0;
        } else if (status === 'void') {
            payout = stakeType === 'free_bet' ? 0 : stake;
        } else if (status === 'cashout') {
            payout = Number(document.getElementById('bet-payout').value) || 0;
        }
    }

    window.BetStorage.addBet({
        date,
        sport,
        backedTeam,
        opposingTeam,
        notes,
        odds,
        stake,
        stakeType,
        status,
        payout,
        settledDate
    });

    closeModal('bet');
    showToast('Wager logged successfully! Good luck.');
    renderAll();
}

// Settle active bet handling
function openSettleModal(id) {
    const rawBets = window.BetStorage.getRawBets();
    const bet = rawBets.find(b => b.id === id);
    if (!bet) return;

    document.getElementById('settle-bet-id').value = bet.id;
    document.getElementById('settle-bet-sport').innerText = bet.sport;
    document.getElementById('settle-bet-event').innerText = `${bet.backedTeam} vs ${bet.opposingTeam}`;
    
    let walletText = 'Real Cash';
    if (bet.stakeType === 'bonus') walletText = 'Bonus Balance';
    if (bet.stakeType === 'free_bet') walletText = 'Free Bet Token';
    
    const selectionDisplay = `Winner: ${bet.backedTeam}`;
    document.getElementById('settle-bet-details').innerText = `${selectionDisplay} @ ${bet.odds.toFixed(2)} | Stake: €${bet.stake.toFixed(2)} (${walletText})`;
    
    // Customize settle options dynamically
    const settleStatusSelect = document.getElementById('settle-status');
    settleStatusSelect.innerHTML = '';
    
    if (bet.stakeType === 'free_bet') {
        const potentialWinnings = (bet.stake * bet.odds) - bet.stake;
        settleStatusSelect.innerHTML = `
            <option value="won_freebet">Won (Freebet - Net Winnings to Bonus: €${potentialWinnings.toFixed(2)})</option>
            <option value="lost">Lost (Token is used, return is €0)</option>
            <option value="cashout">Cashed Out Early (Partial return)</option>
            <option value="void">Void / Refund (Free Bet token returned)</option>
        `;
        document.getElementById('settle-status').value = 'won_freebet';
    } else {
        const potentialPayout = bet.stake * bet.odds;
        const potentialWinnings = (bet.stake * bet.odds) - bet.stake;
        settleStatusSelect.innerHTML = `
            <option value="won">Won (Pays stake &times; odds: €${potentialPayout.toFixed(2)})</option>
            <option value="won_freebet">Won (Freebet - Net Winnings to Bonus: €${potentialWinnings.toFixed(2)})</option>
            <option value="lost">Lost (Return is €0)</option>
            <option value="cashout">Cashed Out Early (Partial return)</option>
            <option value="void">Void / Refund (Return is stake: €${bet.stake.toFixed(2)})</option>
        `;
        document.getElementById('settle-status').value = 'won';
    }
    
    // Render Quick Settle buttons
    const quickActionsContainer = document.getElementById('quick-settle-actions');
    if (bet.stakeType === 'free_bet') {
        quickActionsContainer.innerHTML = `
            <button class="btn-quick-settle won" type="button" onclick="quickSettleBet('won_freebet')">
                <i data-lucide="check-circle"></i>
                <span>Won (Freebet)</span>
            </button>
            <button class="btn-quick-settle lost" type="button" onclick="quickSettleBet('lost')">
                <i data-lucide="x-circle"></i>
                <span>Lost</span>
            </button>
        `;
    } else {
        quickActionsContainer.innerHTML = `
            <button class="btn-quick-settle won" type="button" onclick="quickSettleBet('won')">
                <i data-lucide="check-circle"></i>
                <span>Won</span>
            </button>
            <button class="btn-quick-settle lost" type="button" onclick="quickSettleBet('lost')">
                <i data-lucide="x-circle"></i>
                <span>Lost</span>
            </button>
        `;
    }
    lucide.createIcons();
    
    document.getElementById('settle-payout-group').style.display = 'none';
    openModal('settle');
}

function toggleSettlePayoutInput() {
    const status = document.getElementById('settle-status').value;
    const payoutGroup = document.getElementById('settle-payout-group');
    
    if (status === 'cashout') {
        payoutGroup.style.display = 'block';
        document.getElementById('settle-payout').setAttribute('required', 'true');
    } else {
        payoutGroup.style.display = 'none';
        document.getElementById('settle-payout').removeAttribute('required');
    }
}

function toggleBetStatusPayoutInput() {
    const status = document.getElementById('bet-status').value;
    const payoutGroup = document.getElementById('bet-payout-group');
    
    if (status === 'cashout') {
        payoutGroup.style.display = 'block';
        document.getElementById('bet-payout').setAttribute('required', 'true');
    } else {
        payoutGroup.style.display = 'none';
        document.getElementById('bet-payout').removeAttribute('required');
    }
}

function handleSettleSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('settle-bet-id').value;
    const status = document.getElementById('settle-status').value;
    let payout = 0;

    const rawBets = window.BetStorage.getRawBets();
    const bet = rawBets.find(b => b.id === id);
    if (!bet) return;

    const odds = Number(bet.odds);
    const stake = Number(bet.stake);

    if (status === 'won' || status === 'won_freebet') {
        if (bet.stakeType === 'free_bet' || status === 'won_freebet') {
            payout = (stake * odds) - stake;
        } else {
            payout = stake * odds;
        }
    } else if (status === 'lost') {
        payout = 0;
    } else if (status === 'cashout') {
        payout = Number(document.getElementById('settle-payout').value);
    } else if (status === 'void') {
        if (bet.stakeType === 'free_bet' || status === 'won_freebet') {
            payout = 0;
        } else {
            payout = stake;
        }
    }

    window.BetStorage.updateBet({
        id,
        status,
        payout,
        settledDate: new Date().toISOString().split('T')[0]
    });

    closeModal('settle');
    showToast(`Bet settled as ${statusLabels[status] || status.toUpperCase()} (Payout: €${payout.toFixed(2)})`);
    renderAll();
}

function quickSettleBet(status) {
    const id = document.getElementById('settle-bet-id').value;
    if (!id) return;

    const rawBets = window.BetStorage.getRawBets();
    const bet = rawBets.find(b => b.id === id);
    if (!bet) return;

    const odds = Number(bet.odds);
    const stake = Number(bet.stake);
    let payout = 0;

    if (status === 'won' || status === 'won_freebet') {
        if (bet.stakeType === 'free_bet' || status === 'won_freebet') {
            payout = (stake * odds) - stake;
        } else {
            payout = stake * odds;
        }
    } else if (status === 'lost') {
        payout = 0;
    }

    window.BetStorage.updateBet({
        id,
        status,
        payout,
        settledDate: new Date().toISOString().split('T')[0]
    });

    closeModal('settle');
    showToast(`Bet settled as ${statusLabels[status] || status.toUpperCase()} (Payout: €${payout.toFixed(2)})`);
    renderAll();
}



// Deleting items
function deleteBetItem(id) {
    if (confirm('Are you sure you want to delete this bet log?')) {
        window.BetStorage.deleteBet(id);
        showToast('Bet record deleted.', 'info');
        renderAll();
    }
}

// Delete transaction
function deleteTxItem(id) {
    if (confirm('Are you sure you want to delete this transaction record?')) {
        window.BetStorage.deleteTransaction(id);
        showToast('Transaction deleted.', 'info');
        renderAll();
    }
}

function openEditBetModal(id) {
    const rawBets = window.BetStorage.getRawBets();
    const bet = rawBets.find(b => b.id === id);
    if (!bet) return;
    
    openModal('bet');
    
    // Override modal header and action button
    document.getElementById('bet-modal-title').innerText = 'Edit Sports Bet';
    document.getElementById('btn-bet-submit').innerText = 'Save Changes';
    
    // Populate form fields
    document.getElementById('bet-edit-id').value = bet.id;
    document.getElementById('bet-sport-input').value = bet.sport;
    document.getElementById('bet-date').value = bet.date;
    document.getElementById('bet-backed-team-input').value = bet.backedTeam;
    document.getElementById('bet-opposing-team-input').value = bet.opposingTeam;
    document.getElementById('bet-notes').value = bet.notes;
    document.getElementById('bet-odds').value = bet.odds;
    document.getElementById('bet-stake-type').value = bet.stakeType;
    document.getElementById('bet-stake').value = bet.stake;

    // Populate outcome / status fields
    document.getElementById('bet-status').value = bet.status || 'pending';
    if (bet.status === 'cashout') {
        document.getElementById('bet-payout-group').style.display = 'block';
        document.getElementById('bet-payout').value = bet.payout;
        document.getElementById('bet-payout').setAttribute('required', 'true');
    } else {
        document.getElementById('bet-payout-group').style.display = 'none';
        document.getElementById('bet-payout').value = '';
        document.getElementById('bet-payout').removeAttribute('required');
    }
}

function openEditTxModal(id) {
    const rawTx = window.BetStorage.getRawTransactions();
    const tx = rawTx.find(t => t.id === id);
    if (!tx) return;
    
    openModal('transaction');
    
    // Override modal header and action button
    document.getElementById('transaction-modal-title').innerText = 'Edit Wallet Transaction';
    document.getElementById('btn-tx-submit').innerText = 'Save Changes';
    
    // Populate form fields
    document.getElementById('tx-edit-id').value = tx.id;
    document.getElementById('tx-type').value = tx.type;
    document.getElementById('tx-amount').value = tx.amount;
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-notes').value = tx.notes;

    if (tx.type === 'correction') {
        document.getElementById('tx-correction-group').style.display = 'block';
        document.getElementById('tx-correction-wallet').value = tx.correctionWallet || 'real';
        document.getElementById('tx-correction-direction').value = tx.correctionDirection || 'add';
    } else {
        document.getElementById('tx-correction-group').style.display = 'none';
    }
}

// CSV imports
function handleCSVImport(fileInput, type) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const res = window.BetStorage.importCSV(text, type);
        if (res.success) {
            showToast(`Import Successful! Loaded ${res.count} records.`, 'success');
            renderAll();
        } else {
            showToast(`Import Failed: ${res.error}`, 'error');
        }
        fileInput.value = '';
    };
    reader.readAsText(file);
}

// PROFILE ACTIONS CONTROLLERS
function handleProfileSelectChange(profileId) {
    window.BetStorage.selectProfile(profileId);
    showToast(`Switched active account to: ${getCurrentProfileName()}`, 'info');
    renderAll();
    // Re-render chart explicitly to prevent width collapse
    if (activeTab === 'dashboard') {
        const stats = window.BetStorage.getStats(window.BetStorage.isExcludeUnconverted());
        renderCharts(stats);
    }
}

function handleCreateProfileSubmit(event) {
    event.preventDefault();
    const nameInput = document.getElementById('new-profile-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const id = window.BetStorage.createProfile(name);
    window.BetStorage.selectProfile(id);
    
    nameInput.value = '';
    showToast(`Created and switched to profile: ${name}`);
    
    renderProfilesManagerList();
    renderAll();
}

function handleJSONProfileImport(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const res = window.BetStorage.importProfileJSON(text);
        if (res.success) {
            window.BetStorage.selectProfile(res.id);
            showToast(`Imported account: ${res.name}`, 'success');
            closeModal('profiles');
            renderAll();
        } else {
            showToast(`Import Failed: ${res.error}`, 'error');
        }
        fileInput.value = '';
    };
    reader.readAsText(file);
}

function handleRenameProfile(profileId, currentName) {
    const newName = prompt(`Enter a new name for profile "${currentName}":`, currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
        window.BetStorage.renameProfile(profileId, newName);
        showToast(`Profile renamed to "${newName.trim()}"`);
        renderProfilesManagerList();
        renderProfileSelectors();
        renderAll();
    }
}

function handleDeleteProfile(profileId, name) {
    // 1st Confirm check
    if (!confirm(`Are you absolutely sure you want to delete profile "${name}"? ALL wagers and wallet transaction records inside will be permanently deleted.`)) {
        return;
    }
    
    // 2nd Verify check
    const typedName = prompt(`⚠️ TO CONFIRM DELETION: Please type the profile name exactly: "${name}"`);
    if (typedName !== name) {
        showToast('Profile name did not match. Deletion cancelled.', 'error');
        return;
    }

    const success = window.BetStorage.deleteProfile(profileId);
    if (success) {
        showToast(`Successfully deleted profile "${name}"`, 'info');
        renderProfilesManagerList();
        renderProfileSelectors();
        renderAll();
    } else {
        showToast('Could not delete profile (active profile cannot be deleted)', 'error');
    }
}

function getCurrentProfileName() {
    const activeId = window.BetStorage.getActiveProfileId();
    const list = window.BetStorage.getProfilesList();
    const p = list.find(pr => pr.id === activeId);
    return p ? p.name : 'Default Account';
}

// Profiles DOM Renderers
function renderProfileSelectors() {
    const list = window.BetStorage.getProfilesList();
    const activeId = window.BetStorage.getActiveProfileId();
    
    const sidebarSelect = document.getElementById('sidebar-profile-select');
    sidebarSelect.innerHTML = '';

    list.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        if (p.id === activeId) opt.selected = true;
        sidebarSelect.appendChild(opt);
    });
}

function renderProfilesManagerList() {
    const list = window.BetStorage.getProfilesList();
    const activeId = window.BetStorage.getActiveProfileId();
    const container = document.getElementById('profiles-manager-list');
    
    container.innerHTML = '';
    
    list.forEach(p => {
        const isActive = p.id === activeId;
        const div = document.createElement('div');
        div.className = `profile-list-item ${isActive ? 'active' : ''}`;
        
        let actionsHTML = '';
        if (isActive) {
            actionsHTML = `
                <span class="badge badge-won">Active</span>
                <button class="btn btn-secondary btn-small" onclick="window.BetStorage.exportProfileJSON('${p.id}')" title="Export Backup"><i data-lucide="download" style="width:12px; height:12px;"></i></button>
                <button class="btn btn-secondary btn-small" onclick="handleRenameProfile('${p.id}', '${p.name}')"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
            `;
        } else {
            actionsHTML = `
                <button class="btn btn-primary btn-small" onclick="handleProfileSelectChange('${p.id}'); renderProfilesManagerList();">Activate</button>
                <button class="btn btn-secondary btn-small" onclick="window.BetStorage.exportProfileJSON('${p.id}')" title="Export Backup"><i data-lucide="download" style="width:12px; height:12px;"></i></button>
                <button class="btn btn-secondary btn-small" onclick="handleRenameProfile('${p.id}', '${p.name}')"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
                <button class="btn btn-danger-light btn-small" onclick="handleDeleteProfile('${p.id}', '${p.name}')"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
            `;
        }

        div.innerHTML = `
            <div class="profile-item-details">
                <span class="profile-item-name">${p.name}</span>
                <span class="profile-item-stats">${p.betsCount} bets logged • ${p.txCount} transactions</span>
            </div>
            <div class="profile-item-actions">
                ${actionsHTML}
            </div>
        `;
        container.appendChild(div);
    });
    
    lucide.createIcons();
}

// Preset Recommendations / Autocomplete Logic (Updated)
function setupAutocompleteSuggestions() {
    const sportInput = document.getElementById('bet-sport-input');
    const backedTeamInput = document.getElementById('bet-backed-team-input');
    const opposingTeamInput = document.getElementById('bet-opposing-team-input');
    
    const sportSugBox = document.getElementById('suggestion-sport');
    const backedTeamSugBox = document.getElementById('suggestion-backed-team');
    const opposingTeamSugBox = document.getElementById('suggestion-opposing-team');

    // Sport Recommendations
    sportInput.addEventListener('focus', () => {
        const presets = window.BetStorage.getPresets();
        showSuggestions(presets.sports, sportInput, sportSugBox);
    });

    sportInput.addEventListener('input', () => {
        const presets = window.BetStorage.getPresets();
        const inputVal = sportInput.value.toLowerCase();
        const filtered = presets.sports.filter(s => s.toLowerCase().includes(inputVal));
        showSuggestions(filtered, sportInput, sportSugBox);
    });

    // Backed Team Recommendations
    backedTeamInput.addEventListener('focus', () => {
        const sportSelected = sportInput.value.trim();
        const presets = window.BetStorage.getPresets();
        const teams = presets.teams[sportSelected] || [];
        showSuggestions(teams, backedTeamInput, backedTeamSugBox);
    });

    backedTeamInput.addEventListener('input', () => {
        const sportSelected = sportInput.value.trim();
        const presets = window.BetStorage.getPresets();
        const teams = presets.teams[sportSelected] || [];
        const inputVal = backedTeamInput.value.toLowerCase();
        const filtered = teams.filter(t => t.toLowerCase().includes(inputVal));
        showSuggestions(filtered, backedTeamInput, backedTeamSugBox);
    });

    // Opponent Recommendations
    opposingTeamInput.addEventListener('focus', () => {
        const sportSelected = sportInput.value.trim();
        const presets = window.BetStorage.getPresets();
        const teams = presets.teams[sportSelected] || [];
        showSuggestions(teams, opposingTeamInput, opposingTeamSugBox);
    });

    opposingTeamInput.addEventListener('input', () => {
        const sportSelected = sportInput.value.trim();
        const presets = window.BetStorage.getPresets();
        const teams = presets.teams[sportSelected] || [];
        const inputVal = opposingTeamInput.value.toLowerCase();
        const filtered = teams.filter(t => t.toLowerCase().includes(inputVal));
        showSuggestions(filtered, opposingTeamInput, opposingTeamSugBox);
    });

    // Close recommendations on clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== sportInput && !sportSugBox.contains(e.target)) {
            sportSugBox.classList.remove('active');
        }
        if (e.target !== backedTeamInput && !backedTeamSugBox.contains(e.target)) {
            backedTeamSugBox.classList.remove('active');
        }
        if (e.target !== opposingTeamInput && !opposingTeamSugBox.contains(e.target)) {
            opposingTeamSugBox.classList.remove('active');
        }
    });
}

function showSuggestions(list, inputEl, menuEl) {
    if (list.length === 0) {
        menuEl.classList.remove('active');
        return;
    }

    menuEl.innerHTML = '';
    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerText = item;
        div.addEventListener('click', () => {
            inputEl.value = item;
            menuEl.classList.remove('active');
            
            // Focus next logical input
            if (inputEl.id === 'bet-sport-input') {
                document.getElementById('bet-backed-team-input').focus();
            } else if (inputEl.id === 'bet-backed-team-input') {
                document.getElementById('bet-opposing-team-input').focus();
            }
        });
        menuEl.appendChild(div);
    });
    
    menuEl.classList.add('active');
}

// Global renderer function
function renderAll() {
    renderProfileSelectors();
    renderBalances();
    
    if (activeTab === 'dashboard') {
        renderDashboard();
    } else if (activeTab === 'bets') {
        renderBets();
    } else if (activeTab === 'transactions') {
        renderTransactions();
    } else if (activeTab === 'analytics') {
        renderAnalytics();
    }
}

// Wallet and Balances Updates
function renderBalances() {
    const b = window.BetStorage.getBalances();
    const total = b.real + b.bonus + b.freeBet;

    document.getElementById('sidebar-total-balance').innerText = `€${total.toFixed(2)}`;
    document.getElementById('wallet-real').innerText = `€${b.real.toFixed(2)}`;
    document.getElementById('wallet-bonus').innerText = `€${b.bonus.toFixed(2)}`;
    document.getElementById('wallet-free').innerText = `€${b.freeBet.toFixed(2)}`;
}

// DASHBOARD RENDERER
function renderDashboard() {
    const stats = window.BetStorage.getStats(window.BetStorage.isExcludeUnconverted());
    const rawBets = window.BetStorage.getRawBets();
    const balances = window.BetStorage.getBalances();

    // KPIs
    document.getElementById('card-net-profit').innerText = `${stats.netProfit >= 0 ? '+' : ''}€${stats.netProfit.toFixed(2)}`;
    const netProfitCard = document.getElementById('card-net-profit').parentElement;
    if (stats.netProfit > 0) {
        netProfitCard.querySelector('.card-value').style.color = 'var(--success)';
        document.getElementById('card-profit-indicator').className = 'card-subtext positive';
        document.getElementById('card-profit-indicator').innerHTML = `<i data-lucide="trending-up"></i> <span>Winnings are yielding profits</span>`;
    } else if (stats.netProfit < 0) {
        netProfitCard.querySelector('.card-value').style.color = 'var(--danger)';
        document.getElementById('card-profit-indicator').className = 'card-subtext negative';
        document.getElementById('card-profit-indicator').innerHTML = `<i data-lucide="trending-down"></i> <span>Currently running a loss</span>`;
    } else {
        netProfitCard.querySelector('.card-value').style.color = 'var(--text-primary)';
        document.getElementById('card-profit-indicator').className = 'card-subtext';
        document.getElementById('card-profit-indicator').innerHTML = `<span>Even margin</span>`;
    }

    // ROI
    const roiEl = document.getElementById('card-roi');
    roiEl.innerText = `${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}%`;
    if (stats.roi > 0) {
        roiEl.style.color = 'var(--success)';
    } else if (stats.roi < 0) {
        roiEl.style.color = 'var(--danger)';
    } else {
        roiEl.style.color = 'var(--text-primary)';
    }

    // Win Rate
    document.getElementById('card-winrate').innerText = `${stats.winRate.toFixed(1)}%`;

    // Total bets
    document.getElementById('card-total-bets').innerText = rawBets.length;
    const pendingCount = rawBets.filter(b => b.status === 'pending').length;
    document.getElementById('card-pending-count').innerText = `${pendingCount} active bets in ledger`;

    // Pending bets table
    const pendingTableBody = document.querySelector('#dashboard-pending-table tbody');
    const pendingEmpty = document.getElementById('dashboard-pending-empty');
    pendingTableBody.innerHTML = '';
    
    const pendingBetsList = rawBets.filter(b => b.status === 'pending').slice(0, 5);
    
    if (pendingBetsList.length === 0) {
        pendingEmpty.style.display = 'flex';
        document.getElementById('dashboard-pending-table').style.display = 'none';
    } else {
        pendingEmpty.style.display = 'none';
        document.getElementById('dashboard-pending-table').style.display = 'table';

        pendingBetsList.forEach(b => {
            const tr = document.createElement('tr');
            const selectionDisplay = `Winner: ${b.backedTeam}`;
            const notesDisplay = b.notes ? ` <span style="font-size:11px; color:var(--text-muted); font-style:italic;">(${b.notes})</span>` : '';
            const badgeClass = b.stakeType === 'free_bet' ? 'free' : b.stakeType;
            const badgeText = b.stakeType.replace('_', ' ');
            tr.innerHTML = `
                <td>${formatDate(b.date)}</td>
                <td style="font-weight: 600;">${b.sport}</td>
                <td>${b.backedTeam} vs ${b.opposingTeam}</td>
                <td><span style="color: var(--text-primary); font-weight: 500;">${selectionDisplay}${notesDisplay}</span></td>
                <td>${b.odds.toFixed(2)}</td>
                <td>€${b.stake.toFixed(2)}</td>
                <td><span class="badge badge-stake-${badgeClass}">${badgeText}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-success btn-small" onclick="openSettleModal('${b.id}')">Settle</button>
                    <button class="btn btn-secondary btn-small" onclick="openEditBetModal('${b.id}')" title="Edit Bet"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
                    <button class="btn btn-secondary btn-small" onclick="deleteBetItem('${b.id}')" title="Delete Bet"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
                </td>
            `;
            pendingTableBody.appendChild(tr);
        });
    }

    // Render Charts
    renderCharts(stats);
    lucide.createIcons();
}

// RENDER CHARTS
function renderCharts(stats) {
    const excludeUnconverted = window.BetStorage.isExcludeUnconverted();
    const rawBets = window.BetStorage.getRawBets();
    const rawTx = window.BetStorage.getRawTransactions();

    let timelineItems = [];

    // Filter and add bets
    const settledBets = rawBets.filter(b => b.status !== 'pending' && b.status !== 'void');

    settledBets.forEach(b => {
        if (excludeUnconverted && b.stakeType !== 'real') return;

        const stake = Number(b.stake);
        const payout = Number(b.payout);
        let profit = 0;

        const isFree = (b.stakeType === 'free_bet' || b.status === 'won_freebet');

        if (b.status === 'won' || b.status === 'won_freebet') {
            profit = isFree ? payout : (payout - stake);
        } else if (b.status === 'lost') {
            profit = isFree ? 0 : -stake;
        } else if (b.status === 'cashout') {
            profit = isFree ? payout : (payout - stake);
        }

        timelineItems.push({
            date: b.date,
            amount: profit
        });
    });

    // Filter and add conversions if excluding unconverted
    if (excludeUnconverted) {
        const conversions = rawTx.filter(t => t.type === 'bonus_to_real');
        conversions.forEach(t => {
            timelineItems.push({
                date: t.date,
                amount: Number(t.amount)
            });
        });
    }

    // Sort timeline items chronologically
    timelineItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 1. Profit trend Line chart
    let cumulativeProfit = 0;
    const chartLabels = ['Start'];
    const chartDataPoints = [0];

    timelineItems.forEach(item => {
        cumulativeProfit += item.amount;
        chartLabels.push(formatDate(item.date));
        chartDataPoints.push(cumulativeProfit);
    });

    if (profitChartInstance) profitChartInstance.destroy();
    
    const trendCtx = document.getElementById('profitTrendChart').getContext('2d');
    
    const lineColor = cumulativeProfit >= 0 ? '#0f766e' : '#e11d48';

    profitChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Running Profit (€)',
                data: chartDataPoints,
                borderColor: lineColor,
                borderWidth: 2.5,
                fill: false,
                tension: 0.3,
                pointBackgroundColor: lineColor,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#64748b', font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#64748b', font: { family: 'Inter' } }
                }
            }
        }
    });

    // 2. Wager Outcomes Doughnut Chart
    if (outcomesChartInstance) outcomesChartInstance.destroy();

    let wonCount = 0;
    let lostCount = 0;
    let cashoutCount = 0;
    let pendingCount = 0;
    let voidCount = 0;

    rawBets.forEach(b => {
        if (b.status === 'won' || b.status === 'won_freebet') wonCount++;
        else if (b.status === 'lost') lostCount++;
        else if (b.status === 'cashout') cashoutCount++;
        else if (b.status === 'pending') pendingCount++;
        else if (b.status === 'void') voidCount++;
    });

    const categories = [];
    const counts = [];
    const colors = [];

    if (wonCount > 0) {
        categories.push('Won');
        counts.push(wonCount);
        colors.push('#0f766e');
    }
    if (lostCount > 0) {
        categories.push('Lost');
        counts.push(lostCount);
        colors.push('#e11d48');
    }
    if (cashoutCount > 0) {
        categories.push('Cashed Out');
        counts.push(cashoutCount);
        colors.push('#b45309');
    }
    if (pendingCount > 0) {
        categories.push('Pending');
        counts.push(pendingCount);
        colors.push('#64748b');
    }
    if (voidCount > 0) {
        categories.push('Void');
        counts.push(voidCount);
        colors.push('#cbd5e1');
    }

    const hasData = counts.length > 0;
    const finalLabels = hasData ? categories : ['No Bets'];
    const finalData = hasData ? counts : [1];
    const finalColors = hasData ? colors : ['#cbd5e1'];

    const outcomesCanvas = document.getElementById('wagerOutcomesChart');
    if (outcomesCanvas) {
        const distCtx = outcomesCanvas.getContext('2d');
        outcomesChartInstance = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: finalLabels,
                datasets: [{
                    data: finalData,
                    backgroundColor: finalColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#64748b', font: { family: 'Inter', size: 12 } }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

// BETS MANAGER VIEW RENDERER
function renderBets() {
    const rawBets = window.BetStorage.getRawBets();
    const presets = window.BetStorage.getPresets();

    const sportFilter = document.getElementById('filter-bet-sport');
    const previousSelection = sportFilter.value;
    sportFilter.innerHTML = '<option value="all">All Sports</option>';
    
    presets.sports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.innerText = sport;
        sportFilter.appendChild(option);
    });
    
    if (presets.sports.includes(previousSelection)) {
        sportFilter.value = previousSelection;
    }

    renderBetsTable();
}

function renderBetsTable() {
    const rawBets = window.BetStorage.getRawBets();
    const statusVal = document.getElementById('filter-bet-status').value;
    const sportVal = document.getElementById('filter-bet-sport').value;

    const tbody = document.querySelector('#bets-table tbody');
    const emptyState = document.getElementById('bets-empty');
    tbody.innerHTML = '';

    const filteredBets = rawBets.filter(b => {
        const matchesStatus = statusVal === 'all' || b.status === statusVal;
        const matchesSport = sportVal === 'all' || b.sport.toLowerCase() === sportVal.toLowerCase();
        return matchesStatus && matchesSport;
    });

    if (filteredBets.length === 0) {
        emptyState.style.display = 'flex';
        document.getElementById('bets-table').style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        document.getElementById('bets-table').style.display = 'table';

        filteredBets.forEach(b => {
            const tr = document.createElement('tr');
            
            let actionsHTML = '';
            if (b.status === 'pending') {
                actionsHTML = `
                    <button class="btn btn-success btn-small" onclick="openSettleModal('${b.id}')">Settle</button>
                    <button class="btn btn-secondary btn-small" onclick="openEditBetModal('${b.id}')" title="Edit Bet"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
                    <button class="btn btn-secondary btn-small" onclick="deleteBetItem('${b.id}')" title="Delete Bet"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
                `;
            } else {
                actionsHTML = `
                    <button class="btn btn-secondary btn-small" onclick="openEditBetModal('${b.id}')" title="Edit Bet"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
                    <button class="btn btn-secondary btn-small" onclick="deleteBetItem('${b.id}')" title="Delete Bet"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
                `;
            }

            const selectionDisplay = `Winner: ${b.backedTeam}`;
            const notesDisplay = b.notes ? ` <span style="font-size:11px; color:var(--text-muted); font-style:italic;">(${b.notes})</span>` : '';
            const badgeClass = b.stakeType === 'free_bet' ? 'free' : b.stakeType;
            const badgeText = b.stakeType.replace('_', ' ');

            tr.innerHTML = `
                <td>${formatDate(b.date)}</td>
                <td style="font-weight: 600;">${b.sport}</td>
                <td>${b.backedTeam} vs ${b.opposingTeam}</td>
                <td><span style="color: var(--text-primary); font-weight: 500;">${selectionDisplay}${notesDisplay}</span></td>
                <td>${b.odds.toFixed(2)}</td>
                <td>€${b.stake.toFixed(2)}</td>
                <td><span class="badge badge-stake-${badgeClass}">${badgeText}</span></td>
                <td><span class="badge badge-${b.status}">${statusLabels[b.status] || b.status}</span></td>
                <td style="font-weight: 600;" class="${b.payout > 0 ? 'positive' : b.status === 'lost' ? 'negative' : ''}">
                    ${b.status === 'pending' ? '-' : `€${b.payout.toFixed(2)}`}
                </td>
                <td class="actions-cell">
                    ${actionsHTML}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    lucide.createIcons();
}

// TRANSACTIONS VIEW RENDERER
function renderTransactions() {
    const rawTx = window.BetStorage.getRawTransactions();
    const tbody = document.querySelector('#transactions-table tbody');
    const emptyState = document.getElementById('transactions-empty');
    tbody.innerHTML = '';

    if (rawTx.length === 0) {
        emptyState.style.display = 'flex';
        document.getElementById('transactions-table').style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        document.getElementById('transactions-table').style.display = 'table';

        rawTx.forEach(t => {
            const tr = document.createElement('tr');
            
            let valClass = '';
            let amountPrefix = '';
            let badgeTypeClass = 'badge-stake-real';
            let badgeText = t.type.replace(/_/g, ' ');

            if (t.type === 'deposit') {
                valClass = 'positive';
                amountPrefix = '+';
            } else if (t.type === 'withdrawal') {
                valClass = 'negative';
                amountPrefix = '-';
            } else if (t.type === 'bonus_grant') {
                valClass = 'positive';
                amountPrefix = '+';
                badgeTypeClass = 'badge-stake-bonus';
            } else if (t.type === 'free_bet_grant') {
                valClass = 'positive';
                amountPrefix = '+';
                badgeTypeClass = 'badge-stake-free';
            } else if (t.type === 'bonus_to_real') {
                valClass = 'positive';
                amountPrefix = '→ ';
                badgeTypeClass = 'badge-stake-bonus';
            } else if (t.type === 'bonus_expired') {
                valClass = 'negative';
                amountPrefix = '-';
                badgeTypeClass = 'badge-stake-bonus';
            } else if (t.type === 'correction') {
                const direction = t.correctionDirection || 'add';
                valClass = direction === 'add' ? 'positive' : 'negative';
                amountPrefix = direction === 'add' ? '+' : '-';
                
                const wallet = t.correctionWallet || 'real';
                if (wallet === 'real') {
                    badgeTypeClass = 'badge-stake-real';
                    badgeText = 'correction (cash)';
                } else if (wallet === 'bonus') {
                    badgeTypeClass = 'badge-stake-bonus';
                    badgeText = 'correction (bonus)';
                } else if (wallet === 'free') {
                    badgeTypeClass = 'badge-stake-free';
                    badgeText = 'correction (free bet)';
                }
            }

            tr.innerHTML = `
                <td>${formatDate(t.date)}</td>
                <td><span class="badge ${badgeTypeClass}">${badgeText}</span></td>
                <td class="stats-value ${valClass}" style="font-size: 15px;">${amountPrefix}€${t.amount.toFixed(2)}</td>
                <td style="font-style: italic; color: var(--text-muted);">${t.notes}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-small" onclick="openEditTxModal('${t.id}')" title="Edit Transaction"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
                    <button class="btn btn-secondary btn-small" onclick="deleteTxItem('${t.id}')" title="Delete Transaction"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    lucide.createIcons();
}

// DETAILED ANALYTICS RENDERER
function renderAnalytics() {
    const stats = window.BetStorage.getStats(window.BetStorage.isExcludeUnconverted());
    const balances = window.BetStorage.getBalances();

    // Populate selectors first
    populateAnalyticsSelectors();

    // Global summary cards at the bottom
    document.getElementById('stats-bonus-granted').innerText = `€${balances.totalBonusGranted.toFixed(2)}`;
    document.getElementById('stats-bonus-converted').innerText = `€${balances.bonusConverted.toFixed(2)}`;
    document.getElementById('stats-free-granted').innerText = `€${balances.totalFreeBetGranted.toFixed(2)}`;
    document.getElementById('stats-free-converted').innerText = `€${balances.freeBetConverted.toFixed(2)}`;

    // Records
    const winRef = stats.biggestWin;
    if (winRef && winRef.bet) {
        document.getElementById('stats-biggest-win').innerText = `+€${winRef.amount.toFixed(2)}`;
        document.getElementById('stats-biggest-win-details').innerText = `${winRef.bet.sport} | ${winRef.bet.backedTeam} vs ${winRef.bet.opposingTeam}`;
    } else {
        document.getElementById('stats-biggest-win').innerText = '€0.00';
        document.getElementById('stats-biggest-win-details').innerText = '-';
    }

    const lossRef = stats.biggestLoss;
    if (lossRef && lossRef.bet) {
        document.getElementById('stats-biggest-loss').innerText = `-€${lossRef.amount.toFixed(2)}`;
        document.getElementById('stats-biggest-loss-details').innerText = `${lossRef.bet.sport} | ${lossRef.bet.backedTeam} vs ${lossRef.bet.opposingTeam}`;
    } else {
        document.getElementById('stats-biggest-loss').innerText = '€0.00';
        document.getElementById('stats-biggest-loss-details').innerText = '-';
    }

    // Totals
    document.getElementById('stats-total-deposits').innerText = `€${balances.totalDeposits.toFixed(2)}`;
    document.getElementById('stats-total-withdrawals').innerText = `€${balances.totalWithdrawals.toFixed(2)}`;
    document.getElementById('stats-total-turnover').innerText = `€${stats.totalStake.toFixed(2)}`;

    // Perform filter calculations based on selection
    renderAnalyticsDetailedContent(stats);
    
    lucide.createIcons();
}

// Populate Sport & Team select dropdowns dynamically
function populateAnalyticsSelectors() {
    const rawBets = window.BetStorage.getRawBets();
    const sportSelect = document.getElementById('analytics-sport-select');
    const teamSelect = document.getElementById('analytics-team-select');

    if (!sportSelect || !teamSelect) return;

    const prevSport = sportSelect.value;
    const prevTeam = teamSelect.value;

    // Gather unique sports
    const sportsSet = new Set();
    rawBets.forEach(b => {
        if (b.sport) sportsSet.add(b.sport);
    });
    const sortedSports = Array.from(sportsSet).sort();

    sportSelect.innerHTML = '<option value="all">All Sports</option>';
    sortedSports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.innerText = sport;
        sportSelect.appendChild(option);
    });

    if (sortedSports.includes(prevSport)) {
        sportSelect.value = prevSport;
    } else {
        sportSelect.value = 'all';
    }

    // Gather unique teams based on selected sport
    const selectedSport = sportSelect.value;
    const teamsSet = new Set();
    rawBets.forEach(b => {
        if (selectedSport === 'all' || b.sport === selectedSport) {
            if (b.backedTeam) teamsSet.add(b.backedTeam);
            if (b.opposingTeam) teamsSet.add(b.opposingTeam);
        }
    });
    const sortedTeams = Array.from(teamsSet).sort();

    teamSelect.innerHTML = '<option value="all">All Teams</option>';
    sortedTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.innerText = team;
        teamSelect.appendChild(option);
    });

    if (sortedTeams.includes(prevTeam)) {
        teamSelect.value = prevTeam;
    } else {
        teamSelect.value = 'all';
    }
}

// Triggered when selectors are updated
function handleAnalyticsFilterChange() {
    // Re-populate selectors in case teams list needs to filter
    const sportSelect = document.getElementById('analytics-sport-select');
    const teamSelect = document.getElementById('analytics-team-select');
    const prevTeam = teamSelect.value;

    populateAnalyticsSelectors();

    // If the team select value got reset but was valid, try to keep it (or reset if it's no longer associated with the selected sport)
    if (teamSelect.querySelector(`option[value="${prevTeam}"]`)) {
        teamSelect.value = prevTeam;
    }

    const stats = window.BetStorage.getStats(window.BetStorage.isExcludeUnconverted());
    renderAnalyticsDetailedContent(stats);
    lucide.createIcons();
}

// Render dynamic components for selected focus
function renderAnalyticsDetailedContent(stats) {
    const rawBets = window.BetStorage.getRawBets();
    const excludeUnconverted = window.BetStorage.isExcludeUnconverted();

    const selectedSport = document.getElementById('analytics-sport-select').value;
    const selectedTeam = document.getElementById('analytics-team-select').value;

    // Filter bets for analytics calculations
    let filteredBets = rawBets.filter(b => b.status !== 'pending' && b.status !== 'void');

    if (excludeUnconverted) {
        filteredBets = filteredBets.filter(b => b.stakeType === 'real');
    }
    if (selectedSport !== 'all') {
        filteredBets = filteredBets.filter(b => b.sport === selectedSport);
    }
    if (selectedTeam !== 'all') {
        filteredBets = filteredBets.filter(b => b.backedTeam === selectedTeam || b.opposingTeam === selectedTeam);
    }

    // 1. Calculations
    let selectionStake = 0;
    let selectionReturn = 0;
    let selectionProfit = 0;
    let winsCount = 0;
    let lossesCount = 0;
    let cashoutCount = 0;

    filteredBets.forEach(b => {
        const stake = Number(b.stake);
        const payout = Number(b.payout);
        selectionStake += stake;
        selectionReturn += payout;

        const isFree = (b.stakeType === 'free_bet' || b.status === 'won_freebet');
        let profit = 0;
        if (b.status === 'won' || b.status === 'won_freebet') {
            winsCount++;
            profit = isFree ? payout : (payout - stake);
        } else if (b.status === 'lost') {
            lossesCount++;
            profit = isFree ? 0 : -stake;
        } else if (b.status === 'cashout') {
            cashoutCount++;
            profit = isFree ? payout : (payout - stake);
        }
        selectionProfit += profit;
    });

    // Add conversions if viewing overall and excluding unconverted wagers
    if (selectedSport === 'all' && selectedTeam === 'all' && excludeUnconverted) {
        const convertedBonusTotal = window.BetStorage.getRawTransactions()
            .filter(t => t.type === 'bonus_to_real')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        selectionProfit += convertedBonusTotal;
        selectionReturn += convertedBonusTotal;
    }

    const selectionRoi = selectionStake > 0 ? (selectionProfit / selectionStake) * 100 : 0;
    const selectionWinRate = filteredBets.length > 0 ? ((winsCount + cashoutCount * 0.5) / filteredBets.length) * 100 : 0;

    // Active pending bets count
    let selectionPendingCount = rawBets.filter(b => b.status === 'pending').length;
    if (selectedSport !== 'all') {
        selectionPendingCount = rawBets.filter(b => b.status === 'pending' && b.sport === selectedSport).length;
    }
    if (selectedTeam !== 'all') {
        selectionPendingCount = rawBets.filter(
            b => b.status === 'pending' && 
            (b.sport === selectedSport || selectedSport === 'all') && 
            (b.backedTeam === selectedTeam || b.opposingTeam === selectedTeam)
        ).length;
    }

    // 2. Render KPIs
    const kpiContainer = document.getElementById('analytics-kpi-grid');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="card">
                <div class="card-header-icon"><i data-lucide="dollar-sign"></i></div>
                <div class="card-title">Selection Profit</div>
                <div class="card-value ${selectionProfit >= 0 ? 'positive' : 'negative'}">${selectionProfit >= 0 ? '+' : ''}€${selectionProfit.toFixed(2)}</div>
                <div class="card-subtext">
                    <span>${selectionStake > 0 ? ((selectionReturn / selectionStake) * 100).toFixed(0) : 0}% of stakes returned</span>
                </div>
            </div>
            <div class="card">
                <div class="card-header-icon"><i data-lucide="percent"></i></div>
                <div class="card-title">Selection ROI</div>
                <div class="card-value ${selectionRoi >= 0 ? 'positive' : 'negative'}">${selectionRoi >= 0 ? '+' : ''}${selectionRoi.toFixed(2)}%</div>
                <div class="card-subtext">
                    <span>Return on selection wagers</span>
                </div>
            </div>
            <div class="card">
                <div class="card-header-icon"><i data-lucide="award"></i></div>
                <div class="card-title">Selection Win Rate</div>
                <div class="card-value">${selectionWinRate.toFixed(1)}%</div>
                <div class="card-subtext">
                    <span>${winsCount} Wins, ${lossesCount} Losses, ${cashoutCount} Cashouts</span>
                </div>
            </div>
            <div class="card">
                <div class="card-header-icon"><i data-lucide="hash"></i></div>
                <div class="card-title">Selection Bets</div>
                <div class="card-value">${filteredBets.length}</div>
                <div class="card-subtext">
                    <span>${selectionPendingCount} bets active for selection</span>
                </div>
            </div>
        `;
    }

    // 3. Render Detail Chart
    renderAnalyticsCharts(filteredBets, excludeUnconverted, selectedSport, selectedTeam);

    // 4. Calculate Advanced Metrics
    renderAnalyticsExtraStats(filteredBets);

    // 5. Render Contextual Tables
    renderAnalyticsTables(selectedSport, selectedTeam, filteredBets, stats);
}

// Render dynamic trend line graph for selection
function renderAnalyticsCharts(filteredBets, excludeUnconverted, selectedSport, selectedTeam) {
    const timelineItems = [];
    filteredBets.forEach(b => {
        const stake = Number(b.stake);
        const payout = Number(b.payout);
        const isFree = (b.stakeType === 'free_bet' || b.status === 'won_freebet');
        let profit = 0;
        if (b.status === 'won' || b.status === 'won_freebet') {
            profit = isFree ? payout : (payout - stake);
        } else if (b.status === 'lost') {
            profit = isFree ? 0 : -stake;
        } else if (b.status === 'cashout') {
            profit = isFree ? payout : (payout - stake);
        }
        timelineItems.push({ date: b.date, amount: profit });
    });

    if (selectedSport === 'all' && selectedTeam === 'all' && excludeUnconverted) {
        const conversions = window.BetStorage.getRawTransactions().filter(t => t.type === 'bonus_to_real');
        conversions.forEach(t => {
            timelineItems.push({ date: t.date, amount: Number(t.amount) });
        });
    }

    timelineItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    let selectionCumulativeProfit = 0;
    const chartLabels = ['Start'];
    const chartDataPoints = [0];

    timelineItems.forEach(item => {
        selectionCumulativeProfit += item.amount;
        chartLabels.push(formatDate(item.date));
        chartDataPoints.push(selectionCumulativeProfit);
    });

    const titleEl = document.getElementById('analytics-chart-title');
    if (titleEl) {
        if (selectedSport === 'all' && selectedTeam === 'all') {
            titleEl.innerText = 'Overall Profit Trend';
        } else if (selectedSport !== 'all' && selectedTeam === 'all') {
            titleEl.innerText = `Profit Trend: ${selectedSport}`;
        } else if (selectedSport === 'all' && selectedTeam !== 'all') {
            titleEl.innerText = `Profit Trend: ${selectedTeam}`;
        } else {
            titleEl.innerText = `Profit Trend: ${selectedTeam} (${selectedSport})`;
        }
    }

    if (analyticsDetailChartInstance) analyticsDetailChartInstance.destroy();

    const analyticsDetailCanvas = document.getElementById('analyticsDetailChart');
    if (analyticsDetailCanvas) {
        const trendCtx = analyticsDetailCanvas.getContext('2d');
        const lineColor = selectionCumulativeProfit >= 0 ? '#0f766e' : '#e11d48';

        analyticsDetailChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Running Profit (€)',
                    data: chartDataPoints,
                    borderColor: lineColor,
                    borderWidth: 2.5,
                    fill: false,
                    tension: 0.3,
                    pointBackgroundColor: lineColor,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#64748b', font: { family: 'Inter' } }
                    },
                    y: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#64748b', font: { family: 'Inter' } }
                    }
                }
            }
        });
    }
}

// Calculate streaks, average odds, and favorites vs underdogs performance
function renderAnalyticsExtraStats(filteredBets) {
    const extraStatsContainer = document.getElementById('analytics-extra-stats');
    if (!extraStatsContainer) return;

    // Segment Favorites vs Underdogs
    const favoriteBets = filteredBets.filter(b => Number(b.odds) <= 1.87);
    const underdogBets = filteredBets.filter(b => Number(b.odds) > 1.87);

    function getSubsetStats(subset) {
        let subsetStake = 0;
        let subsetProfit = 0;
        let subsetWins = 0;
        subset.forEach(b => {
            const stake = Number(b.stake);
            const payout = Number(b.payout);
            const isFree = (b.stakeType === 'free_bet' || b.status === 'won_freebet');
            let profit = 0;
            if (b.status === 'won' || b.status === 'won_freebet') {
                subsetWins++;
                profit = isFree ? payout : (payout - stake);
            } else if (b.status === 'lost') {
                profit = isFree ? 0 : -stake;
            } else if (b.status === 'cashout') {
                profit = isFree ? payout : (payout - stake);
            }
            subsetStake += stake;
            subsetProfit += profit;
        });
        const roi = subsetStake > 0 ? (subsetProfit / subsetStake) * 100 : 0;
        const winRate = subset.length > 0 ? (subsetWins / subset.length) * 100 : 0;
        return { count: subset.length, profit: subsetProfit, roi, winRate };
    }

    const favStats = getSubsetStats(favoriteBets);
    const dogStats = getSubsetStats(underdogBets);

    // Avg Odds
    const wonBets = filteredBets.filter(b => b.status === 'won' || b.status === 'won_freebet');
    const lostBets = filteredBets.filter(b => b.status === 'lost');

    const avgWonOdds = wonBets.length > 0 ? (wonBets.reduce((sum, b) => sum + Number(b.odds), 0) / wonBets.length) : 0;
    const avgLostOdds = lostBets.length > 0 ? (lostBets.reduce((sum, b) => sum + Number(b.odds), 0) / lostBets.length) : 0;

    // Streaks
    const chronologicalBets = [...filteredBets].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let currentStreakType = null;
    let currentStreakCount = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    chronologicalBets.forEach(b => {
        if (b.status === 'won' || b.status === 'won_freebet') {
            tempWinStreak++;
            tempLossStreak = 0;
            if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
        } else if (b.status === 'lost') {
            tempLossStreak++;
            tempWinStreak = 0;
            if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
        }
    });

    if (chronologicalBets.length > 0) {
        const lastBetStatus = chronologicalBets[chronologicalBets.length - 1].status;
        if (lastBetStatus === 'won' || lastBetStatus === 'won_freebet') {
            currentStreakType = 'Won';
            for (let i = chronologicalBets.length - 1; i >= 0; i--) {
                const status = chronologicalBets[i].status;
                if (status === 'won' || status === 'won_freebet') {
                    currentStreakCount++;
                } else {
                    break;
                }
            }
        } else if (lastBetStatus === 'lost') {
            currentStreakType = 'Lost';
            for (let i = chronologicalBets.length - 1; i >= 0; i--) {
                const status = chronologicalBets[i].status;
                if (status === 'lost') {
                    currentStreakCount++;
                } else {
                    break;
                }
            }
        }
    }

    extraStatsContainer.innerHTML = `
        <div class="section-header" style="margin-bottom: 16px;">
            <span class="section-title" style="font-size: 16px;">Advanced Wager Metrics</span>
        </div>
        
        <!-- Streaks -->
        <div class="stats-row">
            <span class="stats-label">Current Streak</span>
            <span class="stats-value ${currentStreakType === 'Won' ? 'positive' : currentStreakType === 'Lost' ? 'negative' : ''}">
                ${currentStreakCount > 0 ? `${currentStreakCount} ${currentStreakType}` : '-'}
            </span>
        </div>
        <div class="stats-row">
            <span class="stats-label">Longest Winning Streak</span>
            <span class="stats-value positive">${maxWinStreak} Wins</span>
        </div>
        <div class="stats-row">
            <span class="stats-label">Longest Losing Streak</span>
            <span class="stats-value negative">${maxLossStreak} Losses</span>
        </div>

        <!-- Average Odds -->
        <div class="stats-row">
            <span class="stats-label">Avg. Winning Odds</span>
            <span class="stats-value">${avgWonOdds > 0 ? avgWonOdds.toFixed(2) : '-'}</span>
        </div>
        <div class="stats-row">
            <span class="stats-label">Avg. Losing Odds</span>
            <span class="stats-value">${avgLostOdds > 0 ? avgLostOdds.toFixed(2) : '-'}</span>
        </div>

        <!-- Favorites vs Underdogs -->
        <div class="stats-row" style="border-bottom: none; margin-top: 8px;">
            <span class="stats-label" style="font-weight: 600;">Favorites (Odds &le; 1.87)</span>
            <span class="stats-value ${favStats.profit >= 0 ? 'positive' : 'negative'}">
                ${favStats.winRate.toFixed(0)}% WR | ${favStats.profit >= 0 ? '+' : ''}${favStats.roi.toFixed(0)}% ROI
            </span>
        </div>
        <div class="stats-row" style="border-bottom: none;">
            <span class="stats-label" style="font-weight: 600;">Underdogs (Odds > 1.87)</span>
            <span class="stats-value ${dogStats.profit >= 0 ? 'positive' : 'negative'}">
                ${dogStats.winRate.toFixed(0)}% WR | ${dogStats.profit >= 0 ? '+' : ''}${dogStats.roi.toFixed(0)}% ROI
            </span>
        </div>
    `;
}

// Render dynamic tables depending on selector values
function renderAnalyticsTables(selectedSport, selectedTeam, filteredBets, stats) {
    const tableHeader = document.querySelector('#analytics-tables-header .section-title');
    const tableContainer1 = document.getElementById('analytics-table-container-1');
    const tableContainer2 = document.getElementById('analytics-table-container-2');

    if (!tableHeader || !tableContainer1 || !tableContainer2) return;

    tableContainer1.innerHTML = '';
    tableContainer2.innerHTML = '';
    tableContainer2.style.display = 'block';

    if (selectedSport === 'all' && selectedTeam === 'all') {
        tableHeader.innerText = 'Performance Breakdowns (All Portfolio)';
        
        tableContainer1.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">ROI & Success Rates by Sport / Game</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sport / Game</th>
                        <th>Bets Logged</th>
                        <th>Total Wagered</th>
                        <th>Net Profit</th>
                        <th>Win Rate</th>
                        <th>ROI</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.sportsData.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Log bets to review sport performance breakdown.</td></tr>' : 
                      stats.sportsData.map(s => `
                        <tr>
                            <td style="font-weight: 600;">${s.name}</td>
                            <td>${s.total}</td>
                            <td>€${s.wagered.toFixed(2)}</td>
                            <td class="${s.profit >= 0 ? 'positive' : 'negative'}">${s.profit >= 0 ? '+' : ''}€${s.profit.toFixed(2)}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>${s.winRate.toFixed(1)}%</span>
                                    <div class="progress-container" style="width: 60px; margin-top: 0;">
                                        <div class="progress-bar" style="width: ${s.winRate}%"></div>
                                    </div>
                                </div>
                            </td>
                            <td class="${s.roi >= 0 ? 'positive' : 'negative'}">${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(1)}%</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;

        tableContainer2.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">ROI & Success Rates by Team / Competitor</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Team / Player</th>
                        <th>Sport</th>
                        <th>Appearances</th>
                        <th>Attributed Wagered</th>
                        <th>Net Profit</th>
                        <th>ROI</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.teamsData.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Log bets to review competitor / team details.</td></tr>' :
                      stats.teamsData.slice(0, 15).map(t => `
                        <tr>
                            <td style="font-weight: 600; color: var(--text-primary);">${t.name}</td>
                            <td>${t.sport}</td>
                            <td>${t.total}</td>
                            <td>€${t.wagered.toFixed(2)}</td>
                            <td class="${t.profit >= 0 ? 'positive' : 'negative'}">${t.profit >= 0 ? '+' : ''}€${t.profit.toFixed(2)}</td>
                            <td class="${t.roi >= 0 ? 'positive' : 'negative'}">${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(1)}%</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;
    }
    else if (selectedSport !== 'all' && selectedTeam === 'all') {
        tableHeader.innerText = `Performance Breakdowns for ${selectedSport}`;

        const sportTeams = stats.teamsData.filter(t => t.sport === selectedSport);

        tableContainer1.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">Teams competing in ${selectedSport}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Team / Player</th>
                        <th>Appearances</th>
                        <th>Attributed Wagered</th>
                        <th>Net Profit</th>
                        <th>ROI</th>
                    </tr>
                </thead>
                <tbody>
                    ${sportTeams.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No competitors logged for this sport yet.</td></tr>' :
                      sportTeams.slice(0, 10).map(t => `
                        <tr>
                            <td style="font-weight: 600; color: var(--text-primary);">${t.name}</td>
                            <td>${t.total}</td>
                            <td>€${t.wagered.toFixed(2)}</td>
                            <td class="${t.profit >= 0 ? 'positive' : 'negative'}">${t.profit >= 0 ? '+' : ''}€${t.profit.toFixed(2)}</td>
                            <td class="${t.roi >= 0 ? 'positive' : 'negative'}">${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(1)}%</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;

        const recentBets = [...filteredBets].sort((a, b) => new Date(b.date) - new Date(a.date));

        tableContainer2.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">Recent wagers in ${selectedSport}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Match / Event</th>
                        <th>Selection</th>
                        <th>Odds</th>
                        <th>Stake</th>
                        <th>Status</th>
                        <th>Payout</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentBets.length === 0 ? '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No settled bets logged for this sport.</td></tr>' :
                      recentBets.slice(0, 10).map(b => `
                        <tr>
                          <td>${formatDate(b.date)}</td>
                          <td>${b.backedTeam} vs ${b.opposingTeam}</td>
                          <td style="font-weight: 500;">${b.backedTeam}</td>
                          <td>${Number(b.odds).toFixed(2)}</td>
                          <td>€${Number(b.stake).toFixed(2)} <span class="badge ${b.stakeType === 'bonus' ? 'badge-stake-bonus' : b.stakeType === 'free_bet' ? 'badge-stake-free' : 'badge-stake-real'}" style="font-size: 9px; padding: 2px 5px;">${b.stakeType.replace(/_/g, ' ')}</span></td>
                          <td><span class="badge badge-${b.status}">${b.status.replace(/_/g, ' ')}</span></td>
                          <td class="${b.payout > 0 ? 'positive' : ''}">€${Number(b.payout).toFixed(2)}</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;
    }
    else if (selectedSport === 'all' && selectedTeam !== 'all') {
        tableHeader.innerText = `Performance Breakdowns for ${selectedTeam}`;

        const teamSports = stats.teamsData.filter(t => t.name === selectedTeam);

        tableContainer1.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">Games / Sports played by ${selectedTeam}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sport / Game</th>
                        <th>Appearances</th>
                        <th>Attributed Wagered</th>
                        <th>Net Profit</th>
                        <th>ROI</th>
                    </tr>
                </thead>
                <tbody>
                    ${teamSports.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No games logged for this competitor yet.</td></tr>' :
                      teamSports.map(t => `
                        <tr>
                            <td style="font-weight: 600;">${t.sport}</td>
                            <td>${t.total}</td>
                            <td>€${t.wagered.toFixed(2)}</td>
                            <td class="${t.profit >= 0 ? 'positive' : 'negative'}">${t.profit >= 0 ? '+' : ''}€${t.profit.toFixed(2)}</td>
                            <td class="${t.roi >= 0 ? 'positive' : 'negative'}">${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(1)}%</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;

        const recentBets = [...filteredBets].sort((a, b) => new Date(b.date) - new Date(a.date));

        tableContainer2.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">Recent wagers on ${selectedTeam}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Sport</th>
                        <th>Match / Event</th>
                        <th>Selection</th>
                        <th>Odds</th>
                        <th>Stake</th>
                        <th>Status</th>
                        <th>Payout</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentBets.length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No settled bets logged for this competitor.</td></tr>' :
                      recentBets.slice(0, 10).map(b => `
                        <tr>
                          <td>${formatDate(b.date)}</td>
                          <td>${b.sport}</td>
                          <td>${b.backedTeam} vs ${b.opposingTeam}</td>
                          <td style="font-weight: 500;">${b.backedTeam}</td>
                          <td>${Number(b.odds).toFixed(2)}</td>
                          <td>€${Number(b.stake).toFixed(2)} <span class="badge ${b.stakeType === 'bonus' ? 'badge-stake-bonus' : b.stakeType === 'free_bet' ? 'badge-stake-free' : 'badge-stake-real'}" style="font-size: 9px; padding: 2px 5px;">${b.stakeType.replace(/_/g, ' ')}</span></td>
                          <td><span class="badge badge-${b.status}">${b.status.replace(/_/g, ' ')}</span></td>
                          <td class="${b.payout > 0 ? 'positive' : ''}">€${Number(b.payout).toFixed(2)}</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;
    }
    else {
        tableHeader.innerText = `Performance details for ${selectedTeam} in ${selectedSport}`;

        const recentBets = [...filteredBets].sort((a, b) => new Date(b.date) - new Date(a.date));

        tableContainer1.innerHTML = `
            <h4 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: var(--text-muted);">Wagers history for ${selectedTeam} in ${selectedSport}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Match / Event</th>
                        <th>Selection</th>
                        <th>Odds</th>
                        <th>Stake</th>
                        <th>Status</th>
                        <th>Payout</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentBets.length === 0 ? '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No settled wagers logged for this competitor in this sport.</td></tr>' :
                      recentBets.map(b => `
                        <tr>
                          <td>${formatDate(b.date)}</td>
                          <td>${b.backedTeam} vs ${b.opposingTeam}</td>
                          <td style="font-weight: 500;">${b.backedTeam}</td>
                          <td>${Number(b.odds).toFixed(2)}</td>
                          <td>€${Number(b.stake).toFixed(2)} <span class="badge ${b.stakeType === 'bonus' ? 'badge-stake-bonus' : b.stakeType === 'free_bet' ? 'badge-stake-free' : 'badge-stake-real'}" style="font-size: 9px; padding: 2px 5px;">${b.stakeType.replace(/_/g, ' ')}</span></td>
                          <td><span class="badge badge-${b.status}">${b.status.replace(/_/g, ' ')}</span></td>
                          <td class="${b.payout > 0 ? 'positive' : ''}">€${Number(b.payout).toFixed(2)}</td>
                        </tr>
                      `).join('')
                    }
                </tbody>
            </table>
        `;

        tableContainer2.style.display = 'none';
    }
}

// Global Exclude Unconverted Toggle Handler
function handleExcludeToggle(checked) {
    window.BetStorage.setExcludeUnconverted(checked);
    
    // Sync checkboxes
    const dbCheckbox = document.getElementById('db-exclude-unconverted');
    const analyticsCheckbox = document.getElementById('analytics-exclude-unconverted');
    if (dbCheckbox) dbCheckbox.checked = checked;
    if (analyticsCheckbox) analyticsCheckbox.checked = checked;
    
    // Refresh GUI
    renderAll();
}
