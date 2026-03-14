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
    this.exchangeRate = null; // EUR → JPY レート
    this.currencyRateEl = document.getElementById('currencyRate');

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
