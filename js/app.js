// Elementos del DOM
const form = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');
const totalExpenseEl = document.getElementById('total-expense');
const ctx = document.getElementById('expense-chart')?.getContext('2d');

// Filtros
const filterDate = document.getElementById('filter-date');
const filterMonth = document.getElementById('filter-month');
const filterCategory = document.getElementById('filter-category');
const clearFiltersBtn = document.getElementById('clear-filters');

// Presupuestos
const budgetInputs = {
  food: document.getElementById('budget-food'),
  transport: document.getElementById('budget-transport'),
  entertainment: document.getElementById('budget-entertainment'),
  health: document.getElementById('budget-health'),
  housing: document.getElementById('budget-housing'),
  mobile: document.getElementById('budget-mobile'),
  clothing: document.getElementById('budget-clothing'),
  other: document.getElementById('budget-other')
};

// Ingreso mensual
const monthlyIncomeInput = document.getElementById('monthly-income');
const saveIncomeBtn = document.getElementById('save-income');
const remainingBudgetEl = document.getElementById('remaining-budget');

const saveBudgetsBtn = document.getElementById('save-budgets');

// Tema
const themeBtn = document.getElementById('theme-btn');

// Exportar PDF
const exportPdfBtn = document.getElementById('export-pdf');

let myChart = null;

// === Cargar datos desde localStorage ===
function loadExpenses() {
  const expenses = localStorage.getItem('expenses');
  return expenses ? JSON.parse(expenses) : [];
}

function saveExpenses(expenses) {
  localStorage.setItem('expenses', JSON.stringify(expenses));
}

function loadBudgets() {
  const budgets = localStorage.getItem('budgets');
  return budgets ? JSON.parse(budgets) : {
    food: 20000,
    transport: 10000,
    entertainment: 5000,
    health: 8000,
    housing: 15000,
    mobile: 10000,
    clothing: 8000,
    other: 5000
  };
}

function saveBudgets(budgets) {
  localStorage.setItem('budgets', JSON.stringify(budgets));
}

function loadIncome() {
  const income = localStorage.getItem('monthlyIncome');
  return income ? parseFloat(income) : 0;
}

function saveIncome(income) {
  localStorage.setItem('monthlyIncome', income);
}

// === Modo Oscuro ===
function initTheme() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
    themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// === Presupuestos ===
function loadBudgetInputs() {
  const budgets = loadBudgets();
  Object.keys(budgets).forEach(key => {
    if (budgetInputs[key]) budgetInputs[key].value = budgets[key];
  });
}

saveBudgetsBtn.addEventListener('click', () => {
  const newBudgets = {};
  Object.keys(budgetInputs).forEach(key => {
    const value = budgetInputs[key].value;
    newBudgets[key] = value ? parseFloat(value) : 0;
  });
  saveBudgets(newBudgets);
  updateSummary();
  updateChart();
  showToast('✅ Presupuestos guardados', 'success');
});

saveIncomeBtn.addEventListener('click', () => {
  const income = parseFloat(monthlyIncomeInput.value) || 0;
  saveIncome(income);
  updateSummary();
  showToast('✅ Ingreso mensual guardado', 'success');
});

// === Filtros ===
function getFilteredExpenses() {
  const expenses = loadExpenses();
  const dateFilter = filterDate.value;
  const monthFilter = filterMonth.value; // formato YYYY-MM
  const categoryFilter = filterCategory.value;

  return expenses.filter(exp => {
    if (dateFilter && exp.date !== dateFilter) return false;
    if (monthFilter && exp.date.slice(0, 7) !== monthFilter) return false;
    if (categoryFilter && exp.category !== categoryFilter) return false;
    return true;
  });
}

filterDate.addEventListener('change', renderExpenses);
filterMonth.addEventListener('change', renderExpenses);
filterCategory.addEventListener('change', renderExpenses);
clearFiltersBtn.addEventListener('click', () => {
  filterDate.value = '';
  filterMonth.value = '';
  filterCategory.value = '';
  renderExpenses();
});

// === Añadir Gasto ===
document.getElementById('date').valueAsDate = new Date();

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();
  const date = document.getElementById('date').value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Monto inválido', 'error');
    return;
  }

  const newExpense = {
    id: Date.now(),
    amount,
    category,
    description: description || 'Sin descripción',
    date
  };

  const expenses = loadExpenses();
  expenses.unshift(newExpense);
  saveExpenses(expenses);

  form.reset();
  document.getElementById('date').valueAsDate = new Date();

  renderExpenses();
  updateSummary();
  updateChart();
  showToast('✅ Gasto añadido', 'success');
});

// === Renderizar Gastos ===
function renderExpenses() {
  const expenses = getFilteredExpenses();
  expenseList.innerHTML = '';

  if (expenses.length === 0) {
    expenseList.innerHTML = '<li class="expense-item"><em>No hay gastos que coincidan.</em></li>';
    return;
  }

  const categoryNames = {
    food: 'Alimentación',
    transport: 'Transporte',
    entertainment: 'Entretenimiento',
    health: 'Salud',
    housing: 'Vivienda',
    mobile: 'Móvil',
    clothing: 'Vestimenta',
    other: 'Otros'
  };

  expenses.forEach(exp => {
    const item = document.createElement('li');
    item.className = 'expense-item';

    item.innerHTML = `
      <div class="info">
        <strong>${exp.description}</strong>
        <span>${categoryNames[exp.category]} • ${exp.date}</span>
      </div>
      <span class="amount">${exp.amount.toFixed(2)}€</span>
      <div class="actions">
        <button class="btn btn-danger btn-sm" onclick="deleteExpense(${exp.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    expenseList.appendChild(item);
  });
}

function deleteExpense(id) {
  if (confirm('¿Eliminar este gasto?')) {
    const expenses = loadExpenses().filter(e => e.id !== id);
    saveExpenses(expenses);
    renderExpenses();
    updateSummary();
    updateChart();
  }
}

// === Resumen y Gráfico ===
function updateSummary() {
  const expenses = getFilteredExpenses();
  const budgets = loadBudgets();
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  totalExpenseEl.textContent = `${total.toFixed(2)}€`;

  const income = loadIncome();
  const remaining = income - total;
  remainingBudgetEl.textContent = `Disponible: ${remaining.toFixed(2)}€`;
  remainingBudgetEl.style.color = remaining >= 0 ? '#2e7d32' : '#c62828';

  // Actualizar barras de progreso por categoría
  Object.keys(budgets).forEach(cat => {
    const spent = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    const budget = budgets[cat];
    const progressEl = document.getElementById(`progress-${cat}`);
    const textEl = document.getElementById(`progress-text-${cat}`);

    if (budget > 0) {
      const percent = Math.min((spent / budget) * 100, 100);
      progressEl.style.width = `${percent}%`;

      if (percent < 70) {
        progressEl.className = 'progress-fill';
      } else if (percent < 100) {
        progressEl.className = 'progress-fill warning';
      } else {
        progressEl.className = 'progress-fill danger';
      }

      textEl.textContent = `${percent.toFixed(0)}%`;
      textEl.style.color = percent >= 100 ? '#f44336' : '#555';
    } else {
      progressEl.style.width = '0%';
      textEl.textContent = '0%';
    }
  });
}

function updateChart() {
  const expenses = getFilteredExpenses();
  const categories = {
    food: { label: 'Alimentación', total: 0, color: '#FF6384' },
    transport: { label: 'Transporte', total: 0, color: '#36A2EB' },
    entertainment: { label: 'Entretenimiento', total: 0, color: '#FFCE56' },
    health: { label: 'Salud', total: 0, color: '#4BC0C0' },
    housing: { label: 'Vivienda', total: 0, color: '#9966FF' },
    mobile: { label: 'Móvil', total: 0, color: '#FF9F40' },
    clothing: { label: 'Vestimenta', total: 0, color: '#4CC9F0' },
    other: { label: 'Otros', total: 0, color: '#C9CBCF' }
  };

  expenses.forEach(exp => {
    categories[exp.category].total += exp.amount;
  });

  const labels = Object.values(categories).map(c => c.label);
  const data = Object.values(categories).map(c => c.total);
  const colors = Object.values(categories).map(c => c.color);

  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// === Exportar a PDF ===
exportPdfBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text("Informe de Gastos", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`Modo: ${document.body.classList.contains('dark-mode') ? 'Oscuro' : 'Claro'}`, 14, 36);

  const expenses = getFilteredExpenses();
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  doc.setFontSize(16);
  doc.setTextColor(220, 50, 50);
  doc.text(`Total Gastado: ${total.toFixed(2)}€`, 14, 50);
  doc.setDrawColor(200, 0, 0);
  doc.line(14, 54, 80, 54);

  doc.setFontSize(12);
  doc.setTextColor(0);

  let y = 60;
  if (expenses.length === 0) {
    doc.text("No hay gastos registrados.", 14, y);
  } else {
    expenses.forEach((exp, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.text("Continuación:", 14, y);
        y += 10;
      }

      const categoryNames = {
        food: 'Alimentación',
        transport: 'Transporte',
        entertainment: 'Entretenimiento',
        health: 'Salud',
        housing: 'Vivienda',
        mobile: 'Móvil',
        clothing: 'Vestimenta',
        other: 'Otros'
      };

      const desc = `${index + 1}. ${exp.description}`;
      const amount = `${exp.amount.toFixed(2)}€`;
      const date = `(${exp.date})`;

      doc.setFont("helvetica", "normal");
      doc.text(desc, 14, y);

      const pageWidth = doc.internal.pageSize.width;
      const amountX = pageWidth - 60;
      doc.setFont("helvetica", "bold");
      doc.text(amount, amountX, y);

      const dateX = amountX - 40;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.text(date, dateX, y);

      y += 8;
      doc.setTextColor(0);
    });
  }

  y += 10;
  if (y < 280) {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generado con 'Mis Gastos Diarios'", 14, y);
  }

  const income = loadIncome();
  if (income > 0) {
    const remaining = income - total;
    const color = remaining >= 0 ? [0, 100, 0] : [150, 0, 0];
    doc.setTextColor(...color);
    doc.setFontSize(14);
    doc.text(`Saldo final: ${remaining.toFixed(2)}€`, 14, y + 10);
  }

  doc.save(`Informe-Gastos-${new Date().toISOString().slice(0, 10)}.pdf`);
});

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// === Inicializar ===
function init() {
  initTheme();
  loadBudgetInputs();
  renderExpenses();
  updateSummary();
  monthlyIncomeInput.value = loadIncome();
  if (ctx) updateChart();
}

init();