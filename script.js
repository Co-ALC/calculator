class Calculator {
  constructor() {
    this.expressionEl = document.getElementById('expression');
    this.resultEl = document.getElementById('result');
    this.historyPanel = document.getElementById('historyPanel');
    this.historyList = document.getElementById('historyList');
    this.historyToggle = document.getElementById('historyToggle');
    this.historyClear = document.getElementById('historyClear');
    this.currentValue = '0';
    this.previousValue = '';
    this.operator = null;
    this.shouldResetDisplay = false;
    this.lastResult = null;
    this.history = this.loadHistory();
    this.savedSessions = this.loadSavedSessions();
    this.exchangeRate = null; // EUR → JPY レート
    this.currencyRateEl = document.getElementById('currencyRate');

    // 保存機能のDOM要素
    this.saveModal = document.getElementById('saveModal');
    this.saveNoteInput = document.getElementById('saveNote');
    this.saveModalInfo = document.getElementById('saveModalInfo');
    this.savedListEl = document.getElementById('savedList');

    // GitHub Gist連携
    this.githubToken = localStorage.getItem('githubToken') || '';
    this.gistId = localStorage.getItem('gistId') || '';
    this.githubModal = document.getElementById('githubModal');
    this.githubStatusEl = document.getElementById('githubStatus');

    this.init();
    this.fetchExchangeRate();
  }

  init() {
    document.querySelectorAll('.btn').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        const value = button.dataset.value;

        switch (action) {
          case 'number':
            this.inputNumber(value);
            break;
          case 'operator':
            this.inputOperator(value);
            break;
          case 'equals':
            this.calculate();
            break;
          case 'clear':
            this.clear();
            break;
          case 'decimal':
            this.inputDecimal();
            break;
          case 'sign':
            this.toggleSign();
            break;
          case 'percent':
            this.percent();
            break;
        }

        this.updateDisplay();
      });
    });

    // 履歴パネルの開閉
    this.historyToggle.addEventListener('click', () => this.toggleHistory());
    this.historyClear.addEventListener('click', () => this.clearHistory());
    this.renderHistory();

    // タブ切り替え
    document.getElementById('tabHistory').addEventListener('click', () => this.switchTab('history'));
    document.getElementById('tabSaved').addEventListener('click', () => this.switchTab('saved'));

    // 保存機能
    document.getElementById('historySave').addEventListener('click', () => this.openSaveModal());
    document.getElementById('saveCancelBtn').addEventListener('click', () => this.closeSaveModal());
    document.getElementById('saveConfirmBtn').addEventListener('click', () => this.confirmSave());
    this.saveModal.addEventListener('click', (e) => {
      if (e.target === this.saveModal) this.closeSaveModal();
    });
    this.saveNoteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirmSave();
      e.stopPropagation(); // キーボード操作が計算機に影響しないようにする
    });
    this.saveNoteInput.addEventListener('keyup', (e) => e.stopPropagation());
    this.renderSavedSessions();

    // GitHub Gist連携
    document.getElementById('githubSyncBtn').addEventListener('click', () => this.syncWithGist());
    document.getElementById('githubSettingsBtn').addEventListener('click', () => this.openGithubModal());
    document.getElementById('githubCancelBtn').addEventListener('click', () => this.closeGithubModal());
    document.getElementById('githubSaveTokenBtn').addEventListener('click', () => this.saveGithubToken());
    this.githubModal.addEventListener('click', (e) => {
      if (e.target === this.githubModal) this.closeGithubModal();
    });
    const tokenInput = document.getElementById('githubTokenInput');
    tokenInput.addEventListener('keydown', (e) => e.stopPropagation());
    tokenInput.addEventListener('keyup', (e) => e.stopPropagation());
    this.updateGithubStatus();

    // 通貨換算ボタン
    document.getElementById('toEur').addEventListener('click', () => this.convertToEur());
    document.getElementById('toJpy').addEventListener('click', () => this.convertToJpy());

    // キーボード対応
    document.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') {
        this.inputNumber(e.key);
      } else if (e.key === '+') {
        this.inputOperator('+');
      } else if (e.key === '-') {
        this.inputOperator('−');
      } else if (e.key === '*') {
        this.inputOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        this.inputOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        this.calculate();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        this.clear();
      } else if (e.key === '.') {
        this.inputDecimal();
      } else if (e.key === 'Backspace') {
        this.backspace();
      } else if (e.key === '%') {
        this.percent();
      } else {
        return; // 上記以外のキーは無視
      }

      this.updateDisplay();
    });
  }

  inputNumber(num) {
    if (this.shouldResetDisplay) {
      this.currentValue = num;
      this.shouldResetDisplay = false;
    } else {
      if (this.currentValue === '0') {
        this.currentValue = num;
      } else if (this.currentValue.replace(/[^0-9]/g, '').length < 12) {
        this.currentValue += num;
      }
    }
  }

  inputOperator(op) {
    if (this.operator && !this.shouldResetDisplay) {
      this.calculate();
    }

    this.previousValue = this.currentValue;
    this.operator = op;
    this.shouldResetDisplay = true;

    this.highlightOperator(op);
  }

  calculate() {
    if (!this.operator || this.previousValue === '') return;

    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);
    let result;

    switch (this.operator) {
      case '+':
        result = prev + current;
        break;
      case '−':
        result = prev - current;
        break;
      case '×':
        result = prev * current;
        break;
      case '÷':
        if (current === 0) {
          this.expressionEl.textContent = 'エラー';
          this.currentValue = '0';
          this.previousValue = '';
          this.operator = null;
          this.shouldResetDisplay = true;
          this.clearOperatorHighlight();
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    // 浮動小数点の丸め
    result = Math.round(result * 1e10) / 1e10;

    const expression = `${this.formatNumber(prev)} ${this.operator} ${this.formatNumber(current)} =`;
    this.expressionEl.textContent = expression;

    this.currentValue = String(result);
    this.lastResult = result;
    this.addHistory(expression.replace(' =', ''), result);
    this.previousValue = '';
    this.operator = null;
    this.shouldResetDisplay = true;

    this.clearOperatorHighlight();
  }

  clear() {
    this.currentValue = '0';
    this.previousValue = '';
    this.operator = null;
    this.shouldResetDisplay = false;
    this.lastResult = null;
    this.expressionEl.textContent = '';
    this.clearOperatorHighlight();
  }

  inputDecimal() {
    if (this.shouldResetDisplay) {
      this.currentValue = '0';
      this.shouldResetDisplay = false;
    }

    if (!this.currentValue.includes('.')) {
      this.currentValue += '.';
    }
  }

  toggleSign() {
    if (this.currentValue !== '0') {
      if (this.currentValue.startsWith('-')) {
        this.currentValue = this.currentValue.slice(1);
      } else {
        this.currentValue = '-' + this.currentValue;
      }
    }
  }

  percent() {
    this.currentValue = String(parseFloat(this.currentValue) / 100);
  }

  backspace() {
    if (this.shouldResetDisplay) return;

    if (this.currentValue.length > 1) {
      this.currentValue = this.currentValue.slice(0, -1);
    } else {
      this.currentValue = '0';
    }
  }

  formatNumber(num) {
    const str = String(num);
    if (str.includes('.')) {
      const [intPart, decPart] = str.split('.');
      return Number(intPart).toLocaleString('ja-JP') + '.' + decPart;
    }
    return Number(str).toLocaleString('ja-JP');
  }

  updateDisplay() {
    const num = parseFloat(this.currentValue);
    const displayValue = isNaN(num)
      ? this.currentValue
      : this.currentValue.endsWith('.')
        ? this.formatNumber(num) + '.'
        : this.formatNumber(num);

    this.resultEl.textContent = displayValue;

    // 長い数値の場合はフォントサイズを縮小
    if (displayValue.length > 10) {
      this.resultEl.classList.add('small');
    } else {
      this.resultEl.classList.remove('small');
    }

    if (this.operator && this.previousValue !== '') {
      const prev = parseFloat(this.previousValue);
      this.expressionEl.textContent = `${this.formatNumber(prev)} ${this.operator}`;
    }
  }

  // 通貨換算
  async fetchExchangeRate() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/EUR');
      const data = await res.json();
      if (data.result === 'success' && data.rates.JPY) {
        this.exchangeRate = data.rates.JPY;
        this.currencyRateEl.textContent = `1 EUR = ${this.exchangeRate.toFixed(2)} JPY`;
      } else {
        throw new Error('Invalid response');
      }
    } catch {
      this.exchangeRate = 160;
      this.currencyRateEl.textContent = `1 EUR ≈ ${this.exchangeRate} JPY (オフライン)`;
    }
  }

  convertToEur() {
    const jpy = parseFloat(this.currentValue);
    if (isNaN(jpy) || !this.exchangeRate) return;
    const eur = Math.round((jpy / this.exchangeRate) * 100) / 100;
    this.expressionEl.textContent = `¥${this.formatNumber(jpy)} → €`;
    this.currentValue = String(eur);
    this.shouldResetDisplay = true;
    this.updateDisplay();
  }

  convertToJpy() {
    const eur = parseFloat(this.currentValue);
    if (isNaN(eur) || !this.exchangeRate) return;
    const jpy = Math.round(eur * this.exchangeRate);
    this.expressionEl.textContent = `€${this.formatNumber(eur)} → ¥`;
    this.currentValue = String(jpy);
    this.shouldResetDisplay = true;
    this.updateDisplay();
  }

  // 履歴関連
  toggleHistory() {
    this.historyPanel.classList.toggle('open');
    this.historyToggle.classList.toggle('active');
  }

  addHistory(expression, result) {
    this.history.unshift({ expression, result });
    if (this.history.length > 50) this.history.pop();
    this.saveHistory();
    this.renderHistory();
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">履歴はありません</div>';
      return;
    }

    this.historyList.innerHTML = this.history.map((item, i) =>
      `<div class="history-item" data-index="${i}">
        <div class="history-expr">${item.expression}</div>
        <div class="history-result">${this.formatNumber(item.result)}</div>
      </div>`
    ).join('');

    this.historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index);
        this.currentValue = String(this.history[index].result);
        this.shouldResetDisplay = false;
        this.updateDisplay();
      });
    });
  }

  loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('calcHistory')) || [];
    } catch {
      return [];
    }
  }

  saveHistory() {
    localStorage.setItem('calcHistory', JSON.stringify(this.history));
  }

  // タブ切り替え
  switchTab(tab) {
    const tabHistory = document.getElementById('tabHistory');
    const tabSaved = document.getElementById('tabSaved');
    const contentHistory = document.getElementById('tabContentHistory');
    const contentSaved = document.getElementById('tabContentSaved');

    if (tab === 'history') {
      tabHistory.classList.add('active');
      tabSaved.classList.remove('active');
      contentHistory.classList.remove('hidden');
      contentSaved.classList.add('hidden');
    } else {
      tabSaved.classList.add('active');
      tabHistory.classList.remove('active');
      contentSaved.classList.remove('hidden');
      contentHistory.classList.add('hidden');
      this.renderSavedSessions();
    }
  }

  // 保存モーダル
  openSaveModal() {
    if (this.history.length === 0) {
      return; // 履歴がなければ何もしない
    }
    this.saveModalInfo.textContent = `${this.history.length}件の計算履歴を保存します`;
    this.saveNoteInput.value = '';
    // GitHub連携状態に応じてメッセージを変える
    const notice = document.getElementById('saveModalNotice');
    if (this.githubToken) {
      notice.innerHTML = '&#x2601; 端末 + GitHub Gist に保存されます';
    } else {
      notice.innerHTML = '&#x1f512; データは端末内にのみ保存されます';
    }
    this.saveModal.classList.remove('hidden');
    setTimeout(() => this.saveNoteInput.focus(), 100);
  }

  closeSaveModal() {
    this.saveModal.classList.add('hidden');
  }

  confirmSave() {
    const note = this.saveNoteInput.value.trim() || '無題';
    const session = {
      id: Date.now(),
      note,
      date: new Date().toISOString(),
      entries: [...this.history].reverse() // 古い順に保存
    };

    this.savedSessions.unshift(session);
    if (this.savedSessions.length > 20) this.savedSessions.pop();
    this.saveSavedSessions();
    this.closeSaveModal();

    // 保存後、履歴をクリアしてリセット状態にする
    this.history = [];
    this.saveHistory();
    this.renderHistory();

    // 保存済みタブに切り替えて結果を見せる
    this.switchTab('saved');

    // GitHub Gist にも自動同期
    if (this.githubToken) {
      this.pushToGist();
    }
  }

  // 保存済みセッションの管理
  loadSavedSessions() {
    try {
      return JSON.parse(localStorage.getItem('calcSavedSessions')) || [];
    } catch {
      return [];
    }
  }

  saveSavedSessions() {
    localStorage.setItem('calcSavedSessions', JSON.stringify(this.savedSessions));
  }

  deleteSavedSession(id) {
    this.savedSessions = this.savedSessions.filter(s => s.id !== id);
    this.saveSavedSessions();
    this.renderSavedSessions();
    // Gistにも反映
    if (this.githubToken) this.pushToGist();
  }

  renderSavedSessions() {
    if (this.savedSessions.length === 0) {
      this.savedListEl.innerHTML = '<div class="history-empty">保存データはありません</div>';
      return;
    }

    this.savedListEl.innerHTML = this.savedSessions.map(session => {
      const date = new Date(session.date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      const entries = session.entries.map(e =>
        `<div class="saved-item-entry">
          <span class="saved-item-entry-expr">${e.expression}</span>
          <span class="saved-item-entry-result">${this.formatNumber(e.result)}</span>
        </div>`
      ).join('');

      return `<div class="saved-item" data-id="${session.id}">
        <div class="saved-item-header">
          <span class="saved-item-note">${this.escapeHtml(session.note)}</span>
          <span class="saved-item-date">${dateStr}</span>
          <button class="saved-item-delete" data-id="${session.id}" title="削除">&times;</button>
        </div>
        <div class="saved-item-count">${session.entries.length}件の計算 ▼</div>
        <div class="saved-item-entries">${entries}</div>
      </div>`;
    }).join('');

    // 展開/折りたたみ
    this.savedListEl.querySelectorAll('.saved-item-count').forEach(el => {
      el.addEventListener('click', () => {
        const item = el.closest('.saved-item');
        item.classList.toggle('expanded');
        el.textContent = item.classList.contains('expanded')
          ? `${el.textContent.replace(/ [▼▲]/, '')} ▲`
          : `${el.textContent.replace(/ [▼▲]/, '')} ▼`;
      });
    });

    // 削除ボタン
    this.savedListEl.querySelectorAll('.saved-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        this.deleteSavedSession(id);
      });
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================
  // GitHub Gist 連携
  // ==========================================

  openGithubModal() {
    const tokenInput = document.getElementById('githubTokenInput');
    tokenInput.value = this.githubToken ? '••••••••••••••••' : '';
    this.updateGithubCurrentStatus();
    this.githubModal.classList.remove('hidden');
    if (!this.githubToken) {
      setTimeout(() => tokenInput.focus(), 100);
    }
  }

  closeGithubModal() {
    this.githubModal.classList.add('hidden');
  }

  saveGithubToken() {
    const tokenInput = document.getElementById('githubTokenInput');
    const value = tokenInput.value.trim();

    // マスク表示のままなら変更なし
    if (value === '••••••••••••••••') {
      this.closeGithubModal();
      return;
    }

    if (value === '') {
      // トークン削除
      this.githubToken = '';
      this.gistId = '';
      localStorage.removeItem('githubToken');
      localStorage.removeItem('gistId');
      this.updateGithubStatus();
      this.closeGithubModal();
      return;
    }

    // トークンを保存
    this.githubToken = value;
    localStorage.setItem('githubToken', value);
    this.updateGithubStatus();
    this.closeGithubModal();

    // 接続テスト
    this.testGithubToken();
  }

  async testGithubToken() {
    this.setGithubStatus('接続テスト中...', '');
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${this.githubToken}` }
      });
      if (res.ok) {
        const user = await res.json();
        this.setGithubStatus(`${user.login} 接続OK`, 'success');
      } else {
        this.setGithubStatus('トークン無効', 'error');
        this.githubToken = '';
        localStorage.removeItem('githubToken');
      }
    } catch {
      this.setGithubStatus('接続エラー', 'error');
    }
  }

  async syncWithGist() {
    if (!this.githubToken) {
      this.openGithubModal();
      return;
    }

    const syncBtn = document.getElementById('githubSyncBtn');
    syncBtn.classList.add('syncing');
    syncBtn.textContent = '... 同期中';

    try {
      if (this.gistId) {
        // 既存Gistからデータを取得
        await this.pullFromGist();
      } else {
        // Gistがなければ作成してプッシュ
        await this.pushToGist();
      }
    } catch (err) {
      this.setGithubStatus('同期失敗', 'error');
    } finally {
      syncBtn.classList.remove('syncing');
      syncBtn.textContent = '☁ 同期';
    }
  }

  async pushToGist() {
    if (!this.githubToken) return;

    this.setGithubStatus('アップロード中...', '');

    const content = JSON.stringify(this.savedSessions, null, 2);
    const body = {
      description: '計算機アプリ - 保存データ',
      public: false,
      files: {
        'calculator-data.json': { content }
      }
    };

    try {
      let res;
      if (this.gistId) {
        // 既存Gistを更新
        res = await fetch(`https://api.github.com/gists/${this.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      } else {
        // 新規Gistを作成
        res = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      this.gistId = data.id;
      localStorage.setItem('gistId', this.gistId);

      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.setGithubStatus(`${timeStr} 同期済`, 'success');
    } catch (err) {
      this.setGithubStatus('保存失敗', 'error');
    }
  }

  async pullFromGist() {
    if (!this.githubToken || !this.gistId) return;

    this.setGithubStatus('ダウンロード中...', '');

    try {
      const res = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: { 'Authorization': `token ${this.githubToken}` }
      });

      if (res.status === 404) {
        // Gistが削除されている場合、IDをクリアして新規作成
        this.gistId = '';
        localStorage.removeItem('gistId');
        await this.pushToGist();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const file = data.files['calculator-data.json'];
      if (!file) throw new Error('データファイルが見つかりません');

      const remoteSessions = JSON.parse(file.content);

      // ローカルとリモートをマージ（IDベースで重複排除）
      const localIds = new Set(this.savedSessions.map(s => s.id));
      const merged = [...this.savedSessions];
      for (const session of remoteSessions) {
        if (!localIds.has(session.id)) {
          merged.push(session);
        }
      }
      // 日付で降順ソート
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      // 最大20件
      this.savedSessions = merged.slice(0, 20);
      this.saveSavedSessions();
      this.renderSavedSessions();

      // マージ後のデータをGistにも反映
      await this.pushToGist();
    } catch (err) {
      this.setGithubStatus('取得失敗', 'error');
    }
  }

  setGithubStatus(text, type) {
    this.githubStatusEl.textContent = text;
    this.githubStatusEl.className = 'github-status' + (type ? ` ${type}` : '');
  }

  updateGithubStatus() {
    if (this.githubToken) {
      this.setGithubStatus('連携済', 'success');
    } else {
      this.setGithubStatus('', '');
    }
  }

  updateGithubCurrentStatus() {
    const el = document.getElementById('githubCurrentStatus');
    if (this.githubToken && this.gistId) {
      el.innerHTML = `<span style="color:#2ecc71">&#x2714;</span> 連携中 (Gist: ${this.gistId.slice(0, 8)}...)`;
    } else if (this.githubToken) {
      el.innerHTML = `<span style="color:#ffa500">&#x25cf;</span> トークン設定済（未同期）`;
    } else {
      el.textContent = '未設定';
    }
  }

  highlightOperator(op) {
    this.clearOperatorHighlight();
    document.querySelectorAll('.btn.operator').forEach(btn => {
      if (btn.dataset.value === op) {
        btn.classList.add('active');
      }
    });
  }

  clearOperatorHighlight() {
    document.querySelectorAll('.btn.operator').forEach(btn => {
      btn.classList.remove('active');
    });
  }
}

// 起動
new Calculator();

// Service Worker 登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
