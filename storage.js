/**
 * storage.js
 * Manages the state, calculations, LocalStorage persistence,
 * multi-profile management, mock data, and CSV/JSON importing/exporting.
 */

const STORAGE_KEYS = {
    STATE: 'bettrack_profiles_state',
    HAS_INITIALIZED: 'bettrack_has_initialized_v2',
    EXCLUDE_UNCONVERTED: 'bettrack_exclude_unconverted'
};

// State holders
let activeProfileId = '';
let profiles = {}; // Maps profileId -> { id, name, bets, transactions }

// Global references to current active profile's data
let bets = [];
let transactions = [];

// Floating-point safety utility
function roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Realistic Mock Data
const MOCK_TRANSACTIONS = [
    { id: 'tx-1', date: '2026-05-10', type: 'deposit', amount: 150.00, notes: 'Initial deposit' },
    { id: 'tx-2', date: '2026-05-15', type: 'deposit', amount: 100.00, notes: 'Reload bonus trigger deposit' },
    { id: 'tx-3', date: '2026-05-15', type: 'bonus_grant', amount: 50.00, notes: '100% Reload Bonus' },
    { id: 'tx-4', date: '2026-05-20', type: 'free_bet_grant', amount: 20.00, notes: 'Loyalty reward free bet' },
    { id: 'tx-5', date: '2026-05-28', type: 'withdrawal', amount: 80.00, notes: 'Cashed out some profits' },
    { id: 'tx-6', date: '2026-06-01', type: 'free_bet_grant', amount: 10.00, notes: 'Weekly free bet club' }
];

const MOCK_BETS = [
    {
        id: 'bet-1',
        date: '2026-05-11',
        sport: 'Football',
        backedTeam: 'Real Madrid',
        opposingTeam: 'Manchester City',
        notes: '',
        odds: 2.45,
        stake: 30.00,
        stakeType: 'real',
        status: 'won',
        payout: 73.50,
        settledDate: '2026-05-11'
    },
    {
        id: 'bet-2',
        date: '2026-05-12',
        sport: 'CS2',
        backedTeam: 'Natus Vincere',
        opposingTeam: 'FaZe Clan',
        notes: '',
        odds: 1.85,
        stake: 25.00,
        stakeType: 'real',
        status: 'lost',
        payout: 0.00,
        settledDate: '2026-05-12'
    },
    {
        id: 'bet-3',
        date: '2026-05-16',
        sport: 'Basketball',
        backedTeam: 'Celtics',
        opposingTeam: 'Lakers',
        notes: 'Handicap -4.5',
        odds: 1.90,
        stake: 20.00,
        stakeType: 'real',
        status: 'cashout',
        payout: 12.00,
        settledDate: '2026-05-16'
    },
    {
        id: 'bet-4',
        date: '2026-05-17',
        sport: 'CS2',
        backedTeam: 'Vitality',
        opposingTeam: 'G2 Esports',
        notes: '',
        odds: 2.10,
        stake: 20.00,
        stakeType: 'bonus',
        status: 'won',
        payout: 42.00,
        settledDate: '2026-05-17'
    },
    {
        id: 'bet-5',
        date: '2026-05-21',
        sport: 'Tennis',
        backedTeam: 'Alcaraz',
        opposingTeam: 'Djokovic',
        notes: '',
        odds: 2.20,
        stake: 20.00,
        stakeType: 'free_bet',
        status: 'won',
        payout: 24.00,
        settledDate: '2026-05-21'
    },
    {
        id: 'bet-6',
        date: '2026-05-23',
        sport: 'Football',
        backedTeam: 'Arsenal',
        opposingTeam: 'Chelsea',
        notes: 'Over 2.5 goals line',
        odds: 1.75,
        stake: 25.00,
        stakeType: 'real',
        status: 'won',
        payout: 43.75,
        settledDate: '2026-05-23'
    },
    {
        id: 'bet-7',
        date: '2026-05-25',
        sport: 'CS2',
        backedTeam: 'Spirit',
        opposingTeam: 'MOUZ',
        notes: '',
        odds: 1.65,
        stake: 15.00,
        stakeType: 'bonus',
        status: 'lost',
        payout: 0.00,
        settledDate: '2026-05-25'
    },
    {
        id: 'bet-8',
        date: '2026-05-29',
        sport: 'Basketball',
        backedTeam: 'Warriors',
        opposingTeam: 'Mavericks',
        notes: '',
        odds: 1.80,
        stake: 10.00,
        stakeType: 'free_bet',
        status: 'lost',
        payout: 0.00,
        settledDate: '2026-05-29'
    },
    {
        id: 'bet-9',
        date: '2026-06-03',
        sport: 'CS2',
        backedTeam: 'FaZe Clan',
        opposingTeam: 'Natus Vincere',
        notes: '',
        odds: 1.95,
        stake: 25.00,
        stakeType: 'real',
        status: 'pending',
        payout: 0.00,
        settledDate: null
    },
    {
        id: 'bet-10',
        date: '2026-06-04',
        sport: 'Football',
        backedTeam: 'Real Madrid',
        opposingTeam: 'Liverpool',
        notes: '',
        odds: 2.30,
        stake: 15.00,
        stakeType: 'bonus',
        status: 'pending',
        payout: 0.00,
        settledDate: null
    }
];

// Initialize Multi-Profile Storage System
function initStorage() {
    const initialized = localStorage.getItem(STORAGE_KEYS.HAS_INITIALIZED);
    let rawState = localStorage.getItem(STORAGE_KEYS.STATE);

    if (!initialized || !rawState) {
        // Setup initial profiles
        profiles = {
            'profile-mock': {
                id: 'profile-mock',
                name: 'Mock Demo Account',
                bets: MOCK_BETS,
                transactions: MOCK_TRANSACTIONS
            },
            'profile-test': {
                id: 'profile-test',
                name: 'Test Account',
                bets: [],
                transactions: []
            }
        };
        activeProfileId = 'profile-mock';

        // Check if old data from Phase 1 exists and migrate it
        const oldBets = localStorage.getItem('bettrack_bets');
        const oldTx = localStorage.getItem('bettrack_transactions');
        
        if (oldBets || oldTx) {
            let parsedBets = [];
            let parsedTx = [];
            try {
                parsedBets = JSON.parse(oldBets) || [];
                parsedTx = JSON.parse(oldTx) || [];
            } catch (e) {}

            // Map old structure to new structure if required
            const migratedBets = parsedBets.map(b => {
                if (b.event && !b.backedTeam) {
                    const parts = b.event.split(/\s+vs\s+|\s+vs\.\s+|\s+@\s+|\s+-\s+/i).map(t => t.trim());
                    return {
                        id: b.id,
                        date: b.date ? b.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
                        sport: b.sport,
                        backedTeam: parts[0] || 'Unknown',
                        opposingTeam: parts[1] || 'Opponent',
                        notes: b.notes || b.selection || '',
                        odds: Number(b.odds) || 1.0,
                        stake: Number(b.stake) || 0,
                        stakeType: b.stakeType || 'real',
                        status: b.status || 'pending',
                        payout: Number(b.payout) || 0,
                        settledDate: b.settledDate ? b.settledDate.slice(0, 10) : null
                    };
                }
                return b;
            });

            profiles['profile-default'] = {
                id: 'profile-default',
                name: 'Default Account',
                bets: migratedBets,
                transactions: parsedTx
            };
            activeProfileId = 'profile-default';

            // Remove deprecated keys
            localStorage.removeItem('bettrack_bets');
            localStorage.removeItem('bettrack_transactions');
        }

        saveData();
        localStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
    } else {
        loadData();
    }
}

function loadData() {
    try {
        const state = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATE));
        profiles = state.profiles || {};
        activeProfileId = state.activeProfileId || '';

        // If active profile doesn't exist, fallback to first available or create one
        if (!profiles[activeProfileId]) {
            const keys = Object.keys(profiles);
            if (keys.length > 0) {
                activeProfileId = keys[0];
            } else {
                // Emergency fallback
                profiles['profile-test'] = { id: 'profile-test', name: 'Test Account', bets: [], transactions: [] };
                activeProfileId = 'profile-test';
            }
        }

        bets = profiles[activeProfileId].bets;
        transactions = profiles[activeProfileId].transactions;
    } catch (e) {
        console.error('Error loading state from localStorage', e);
    }
}

function saveData() {
    // Update currently active arrays into profile mapping
    if (profiles[activeProfileId]) {
        profiles[activeProfileId].bets = bets;
        profiles[activeProfileId].transactions = transactions;
    }

    const state = {
        activeProfileId,
        profiles
    };
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
}

// PROFILE ACTIONS API
function getProfilesList() {
    return Object.keys(profiles).map(id => ({
        id,
        name: profiles[id].name,
        betsCount: profiles[id].bets.length,
        txCount: profiles[id].transactions.length
    }));
}

function getActiveProfileId() {
    return activeProfileId;
}

function selectProfile(profileId) {
    if (profiles[profileId]) {
        // Save current active variables first
        if (profiles[activeProfileId]) {
            profiles[activeProfileId].bets = bets;
            profiles[activeProfileId].transactions = transactions;
        }

        activeProfileId = profileId;
        bets = profiles[profileId].bets;
        transactions = profiles[profileId].transactions;

        // Persist active tab profile selection
        saveData();
        return true;
    }
    return false;
}

function createProfile(name) {
    const id = 'profile-' + Date.now();
    profiles[id] = {
        id,
        name: name.trim() || 'Unnamed Account',
        bets: [],
        transactions: []
    };
    saveData();
    return id;
}

function renameProfile(profileId, newName) {
    if (profiles[profileId] && newName.trim()) {
        profiles[profileId].name = newName.trim();
        saveData();
        return true;
    }
    return false;
}

function deleteProfile(profileId) {
    // Prevent deleting active profile
    if (profileId === activeProfileId) return false;
    
    if (profiles[profileId]) {
        delete profiles[profileId];
        saveData();
        return true;
    }
    return false;
}

// Reset Database (Clears current active profile wagers/tx)
function clearAllData() {
    bets = [];
    transactions = [];
    saveData();
}

// Balance calculations (Identical logic, runs on active references)
function getBalances() {
    let deposits = 0;
    let withdrawals = 0;
    let bonusGranted = 0;
    let freeBetGranted = 0;
    let bonusToRealTransfers = 0;
    let bonusExpired = 0;
    let realCorrection = 0;
    let bonusCorrection = 0;
    let freeCorrection = 0;

    transactions.forEach(t => {
        if (t.type === 'deposit') deposits += Number(t.amount);
        if (t.type === 'withdrawal') withdrawals += Number(t.amount);
        if (t.type === 'bonus_grant') bonusGranted += Number(t.amount);
        if (t.type === 'free_bet_grant') freeBetGranted += Number(t.amount);
        if (t.type === 'bonus_to_real') bonusToRealTransfers += Number(t.amount);
        if (t.type === 'bonus_expired') bonusExpired += Number(t.amount);
        
        if (t.type === 'correction') {
            const amt = Number(t.amount);
            const wallet = t.correctionWallet || 'real';
            const direction = t.correctionDirection || 'add';
            const sign = direction === 'add' ? 1 : -1;
            
            if (wallet === 'real') realCorrection += (amt * sign);
            if (wallet === 'bonus') bonusCorrection += (amt * sign);
            if (wallet === 'free') freeCorrection += (amt * sign);
        }
    });

    let realStakes = 0;
    let realWinnings = 0;
    let bonusStakes = 0;
    let bonusWinnings = 0;
    let bonusRefunds = 0;
    let freeBetStakes = 0;
    let freeBetWinnings = 0;
    let freeBetRefunds = 0;

    bets.forEach(b => {
        const stake = Number(b.stake);
        const payout = Number(b.payout);

        if (b.status === 'won_freebet') {
            freeBetWinnings += payout;
            if (b.stakeType === 'real') {
                realStakes += stake;
            } else if (b.stakeType === 'bonus') {
                bonusStakes += stake;
            } else if (b.stakeType === 'free_bet') {
                freeBetStakes += stake;
            }
        } else if (b.stakeType === 'real') {
            realStakes += stake;
            if (b.status !== 'pending') {
                realWinnings += payout;
            }
        } else if (b.stakeType === 'bonus') {
            bonusStakes += stake;
            if (b.status === 'won' || b.status === 'cashout') {
                realWinnings += payout;
                bonusWinnings += payout;
            } else if (b.status === 'void') {
                bonusRefunds += stake;
            }
        } else if (b.stakeType === 'free_bet') {
            freeBetStakes += stake;
            if (b.status === 'won' || b.status === 'cashout') {
                // Free bet winnings convert to BONUS balance in this system
                freeBetWinnings += payout;
            } else if (b.status === 'void') {
                freeBetRefunds += stake;
            }
        }
    });

    const realBalance = deposits - withdrawals - realStakes + realWinnings + bonusToRealTransfers + realCorrection;
    const bonusBalance = bonusGranted - bonusStakes + bonusRefunds + freeBetWinnings - bonusToRealTransfers - bonusExpired + bonusCorrection;
    const freeBetBalance = freeBetGranted - freeBetStakes + freeBetRefunds + freeCorrection;

    return {
        real: Math.max(0, roundToTwo(realBalance)),
        bonus: Math.max(0, roundToTwo(bonusBalance)),
        freeBet: Math.max(0, roundToTwo(freeBetBalance)),
        totalDeposits: roundToTwo(deposits),
        totalWithdrawals: roundToTwo(withdrawals),
        totalBonusGranted: roundToTwo(bonusGranted),
        totalFreeBetGranted: roundToTwo(freeBetGranted),
        bonusConverted: roundToTwo(bonusWinnings),
        freeBetConverted: roundToTwo(freeBetWinnings)
    };
}

// Fetch stats and metrics
function getStats(excludeUnconverted = false) {
    let settledBets = bets.filter(b => b.status !== 'pending' && b.status !== 'void');
    
    let convertedBonusTotal = 0;
    if (excludeUnconverted) {
        settledBets = settledBets.filter(b => b.stakeType === 'real');
        convertedBonusTotal = transactions
            .filter(t => t.type === 'bonus_to_real')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }
    
    const totalSettledCount = settledBets.length;
    
    let totalRealStake = 0;
    let totalBonusStake = 0;
    let totalFreeBetStake = 0;
    let totalStake = 0;
    let totalReturn = 0;
    let totalProfit = 0;

    let winsCount = 0;
    let lossesCount = 0;
    let cashoutCount = 0;

    let biggestWin = { amount: 0, bet: null };
    let biggestLoss = { amount: 0, bet: null };

    const sportStats = {};
    const teamStats = {};

    settledBets.forEach(b => {
        const stake = Number(b.stake);
        const payout = Number(b.payout);
        totalStake += stake;
        totalReturn += payout;

        if (b.stakeType === 'real') totalRealStake += stake;
        if (b.stakeType === 'bonus') totalBonusStake += stake;
        if (b.stakeType === 'free_bet') totalFreeBetStake += stake;

        const isFree = (b.stakeType === 'free_bet' || b.status === 'won_freebet');
        let profit = 0;

        if (b.status === 'won' || b.status === 'won_freebet') {
            winsCount++;
            profit = isFree ? payout : (payout - stake);
            if (profit > biggestWin.amount) {
                biggestWin = { amount: profit, bet: b };
            }
        } else if (b.status === 'lost') {
            lossesCount++;
            profit = isFree ? 0 : -stake;
            if (!isFree && stake > biggestLoss.amount) {
                biggestLoss = { amount: stake, bet: b };
            }
        } else if (b.status === 'cashout') {
            cashoutCount++;
            profit = isFree ? payout : (payout - stake);
            if (profit > 0 && profit > biggestWin.amount) {
                biggestWin = { amount: profit, bet: b };
            } else if (profit < 0 && Math.abs(profit) > biggestLoss.amount) {
                biggestLoss = { amount: Math.abs(profit), bet: b };
            }
        }

        totalProfit += profit;

        // Sport breakdown
        if (!sportStats[b.sport]) {
            sportStats[b.sport] = { stake: 0, returns: 0, profit: 0, won: 0, lost: 0, cashout: 0, total: 0 };
        }
        const sStat = sportStats[b.sport];
        sStat.stake += stake;
        sStat.returns += payout;
        sStat.profit += profit;
        sStat.total++;
        if (b.status === 'won' || b.status === 'won_freebet') sStat.won++;
        if (b.status === 'lost') sStat.lost++;
        if (b.status === 'cashout') sStat.cashout++;

        // Team/Player breakdown
        const team = b.backedTeam;
        if (team) {
            const key = team + '_' + b.sport;
            if (!teamStats[key]) {
                teamStats[key] = { team: team, sport: b.sport, stake: 0, returns: 0, profit: 0, won: 0, lost: 0, total: 0 };
            }
            const tStat = teamStats[key];
            tStat.total++;
            tStat.stake += stake;
            tStat.returns += payout;
            tStat.profit += profit;

            if (b.status === 'won' || b.status === 'won_freebet') tStat.won++;
            if (b.status === 'lost') tStat.lost++;
        }
    });
    
    if (excludeUnconverted) {
        totalProfit += convertedBonusTotal;
        totalReturn += convertedBonusTotal;
    }

    const netProfit = totalProfit;
    const roi = totalStake > 0 ? (netProfit / totalStake) * 100 : 0;
    const winRate = totalSettledCount > 0 ? ((winsCount + (cashoutCount * 0.5)) / totalSettledCount) * 100 : 0;

    const sportsData = Object.keys(sportStats).map(sport => {
        const s = sportStats[sport];
        const sNet = s.profit;
        const sRoi = s.stake > 0 ? (sNet / s.stake) * 100 : 0;
        const sWinRate = s.total > 0 ? (s.won / s.total) * 100 : 0;
        return {
            name: sport,
            wagered: s.stake,
            returns: s.returns,
            profit: sNet,
            roi: sRoi,
            winRate: sWinRate,
            total: s.total,
            won: s.won
        };
    }).sort((a, b) => b.profit - a.profit);

    const teamsData = Object.keys(teamStats).map(key => {
        const t = teamStats[key];
        const tNet = t.profit;
        const tRoi = t.stake > 0 ? (tNet / t.stake) * 100 : 0;
        const tWinRate = t.total > 0 ? (t.won / t.total) * 100 : 0;
        return {
            name: t.team,
            sport: t.sport,
            wagered: t.stake,
            returns: t.returns,
            profit: tNet,
            roi: tRoi,
            winRate: tWinRate,
            total: t.total
        };
    }).filter(t => t.total >= 1)
      .sort((a, b) => b.profit - a.profit);

    return {
        totalSettledCount,
        totalStake,
        totalReturn,
        netProfit,
        roi,
        winRate,
        winsCount,
        lossesCount,
        cashoutCount,
        biggestWin,
        biggestLoss,
        sportsData,
        teamsData
    };
}

// Preset Recommendations
function getPresets() {
    const sports = new Set();
    const teamMap = {};

    bets.forEach(b => {
        sports.add(b.sport);

        if (!teamMap[b.sport]) teamMap[b.sport] = new Set();
        if (b.backedTeam) teamMap[b.sport].add(b.backedTeam);
        if (b.opposingTeam) teamMap[b.sport].add(b.opposingTeam);
    });

    const formattedTeamMap = {};
    for (let s in teamMap) {
        formattedTeamMap[s] = Array.from(teamMap[s]);
    }

    return {
        sports: Array.from(sports),
        teams: formattedTeamMap
    };
}

// Database API
function addBet(bet) {
    bet.id = 'bet-' + Date.now();
    bet.payout = Number(bet.payout) || 0;
    bet.stake = Number(bet.stake);
    bet.odds = Number(bet.odds);
    bets.unshift(bet);
    saveData();
    return bet;
}

function updateBet(updatedBet) {
    const index = bets.findIndex(b => b.id === updatedBet.id);
    if (index !== -1) {
        bets[index] = { ...bets[index], ...updatedBet };
        saveData();
        return true;
    }
    return false;
}

// Deletes bet from active profile
function deleteBet(id) {
    bets = bets.filter(b => b.id !== id);
    saveData();
}

function addTransaction(tx) {
    tx.id = 'tx-' + Date.now();
    tx.amount = Number(tx.amount);
    transactions.unshift(tx);
    saveData();
    return tx;
}

function updateTransaction(updatedTx) {
    const index = transactions.findIndex(t => t.id === updatedTx.id);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updatedTx };
        saveData();
        return true;
    }
    return false;
}

// Deletes transaction from active profile
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
}

// JSON Backup Utilities (Multi-Profile Backups)
function exportProfileJSON(profileId) {
    const p = profiles[profileId];
    if (!p) return;

    const dataStr = JSON.stringify({
        version: 'bettrack_v2',
        name: p.name,
        bets: p.bets,
        transactions: p.transactions
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `edgetrack_profile_${p.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importProfileJSON(jsonText) {
    try {
        const parsed = JSON.parse(jsonText);
        if (!parsed.name || !Array.isArray(parsed.bets) || !Array.isArray(parsed.transactions)) {
            throw new Error('Invalid JSON format: Profile must contain name, bets list, and transactions list.');
        }

        const id = 'profile-' + Date.now();
        profiles[id] = {
            id,
            name: parsed.name + ' (Imported)',
            bets: parsed.bets,
            transactions: parsed.transactions
        };
        saveData();
        return { success: true, id, name: profiles[id].name };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// CSV Export Utilities
function convertToCSV(data) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) {
                return '""';
            }
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function exportBets() {
    const csv = convertToCSV(bets);
    downloadCSV(csv, `bettrack_${profiles[activeProfileId].name.replace(/\s+/g, '_')}_bets.csv`);
}

function exportTransactions() {
    const csv = convertToCSV(transactions);
    downloadCSV(csv, `bettrack_${profiles[activeProfileId].name.replace(/\s+/g, '_')}_wallet.csv`);
}

// CSV Import Utilities
function parseCSV(csvString) {
    const lines = csvString.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = [];
    const firstLine = lines[0];
    
    let currentHeader = '';
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
        const char = firstLine[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            headers.push(currentHeader.trim().replace(/^"|"$/g, ''));
            currentHeader = '';
        } else {
            currentHeader += char;
        }
    }
    headers.push(currentHeader.trim().replace(/^"|"$/g, ''));

    const result = [];
    for (let l = 1; l < lines.length; l++) {
        const line = lines[l].trim();
        if (!line) continue;

        const row = {};
        let currentVal = '';
        let colIndex = 0;
        inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i+1] === '"') {
                    currentVal += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                const header = headers[colIndex];
                if (header) row[header] = currentVal.trim();
                currentVal = '';
                colIndex++;
            } else {
                currentVal += char;
            }
        }
        const header = headers[colIndex];
        if (header) row[header] = currentVal.trim();

        result.push(row);
    }
    return result;
}

function importCSV(csvText, type) {
    try {
        const parsed = parseCSV(csvText);
        if (parsed.length === 0) throw new Error('No valid rows found in CSV.');

        if (type === 'bets') {
            // Validate headers
            const requiredHeaders = ['sport', 'backedTeam', 'opposingTeam', 'odds', 'stake', 'stakeType', 'status'];
            const missing = requiredHeaders.filter(h => !(h in parsed[0]));
            if (missing.length > 0) {
                throw new Error('Missing columns in Bets CSV: ' + missing.join(', '));
            }

            const importedBets = parsed.map(row => ({
                id: row.id || ('bet-' + Math.random().toString(36).substr(2, 9)),
                date: row.date ? row.date.split(/[ T]/)[0] : new Date().toISOString().split('T')[0],
                sport: row.sport,
                backedTeam: row.backedTeam,
                opposingTeam: row.opposingTeam,
                notes: row.notes || '',
                odds: Number(row.odds) || 1.0,
                stake: Number(row.stake) || 0,
                stakeType: row.stakeType || 'real',
                status: row.status || 'pending',
                payout: Number(row.payout) || 0,
                settledDate: row.settledDate || null
            }));

            importedBets.forEach(ib => {
                const existingIndex = bets.findIndex(b => b.id === ib.id);
                if (existingIndex !== -1) {
                    bets[existingIndex] = ib;
                } else {
                    bets.push(ib);
                }
            });
            bets.sort((a, b) => new Date(b.date) - new Date(a.date));
            saveData();
            return { success: true, count: importedBets.length };

        } else if (type === 'transactions') {
            const requiredHeaders = ['type', 'amount'];
            const missing = requiredHeaders.filter(h => !(h in parsed[0]));
            if (missing.length > 0) {
                throw new Error('Missing columns in Transactions CSV: ' + missing.join(', '));
            }

            const importedTx = parsed.map(row => ({
                id: row.id || ('tx-' + Math.random().toString(36).substr(2, 9)),
                date: row.date ? row.date.split(/[ T]/)[0] : new Date().toISOString().split('T')[0],
                type: row.type,
                amount: Number(row.amount) || 0,
                notes: row.notes || '',
                correctionWallet: row.correctionWallet || '',
                correctionDirection: row.correctionDirection || ''
            }));

            importedTx.forEach(it => {
                const existingIndex = transactions.findIndex(t => t.id === it.id);
                if (existingIndex !== -1) {
                    transactions[existingIndex] = it;
                } else {
                    transactions.push(it);
                }
            });
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            saveData();
            return { success: true, count: importedTx.length };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function isExcludeUnconverted() {
    return localStorage.getItem(STORAGE_KEYS.EXCLUDE_UNCONVERTED) === 'true';
}

function setExcludeUnconverted(val) {
    localStorage.setItem(STORAGE_KEYS.EXCLUDE_UNCONVERTED, val ? 'true' : 'false');
}

// Export modules to window object for global access
window.BetStorage = {
    init: initStorage,
    load: loadData,
    save: saveData,
    clearAll: clearAllData,
    getBalances,
    getStats,
    getPresets,
    addBet,
    updateBet,
    deleteBet,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    exportBets,
    exportTransactions,
    importCSV,
    
    // Profile Management Exports
    getProfilesList,
    getActiveProfileId,
    selectProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    exportProfileJSON,
    importProfileJSON,
    
    getRawBets: () => bets,
    getRawTransactions: () => transactions,
    
    // Exclude Unconverted Exports
    isExcludeUnconverted,
    setExcludeUnconverted
};
